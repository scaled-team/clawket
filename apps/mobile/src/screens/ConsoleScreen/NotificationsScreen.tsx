/**
 * NotificationsScreen — Phase 6 (AC-12).
 *
 * Two sections:
 *   - Preferences: toggles per channel (email, sms, push, webhook).
 *   - Logs: recent delivery records.
 *
 * Header "Test" button sends a test notification for the first enabled channel
 * (falls back to 'email').
 *
 * testIDs:
 *   - `notifications-prefs`                      — preferences section
 *   - `notifications-prefs-toggle-{channel}`     — per-channel switch
 *   - `notifications-logs`                       — logs FlatList
 *   - `notifications-log-row-{id}`               — each log row
 *   - `notifications-test-button`                — send test notification
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { BellRing } from 'lucide-react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { EmptyState, HeaderActionButton, LoadingState } from '../../components/ui';
import { useAppContext } from '../../contexts/AppContext';
import { useNativeStackModalHeader } from '../../hooks/useNativeStackModalHeader';
import {
  getNotificationPreferences,
  listNotificationLogs,
  testNotification,
  updateNotificationPreferences,
  type NotificationChannel,
  type NotificationLog,
  type NotificationPreferences,
} from '../../services/delegate-notifications';
import { useAppTheme } from '../../theme';
import { FontSize, FontWeight, Radius, Space } from '../../theme/tokens';
import type { ConsoleStackParamList } from './ConsoleTab';

type NotificationsNavigation = NativeStackNavigationProp<ConsoleStackParamList, 'Notifications'>;

const CHANNELS: NotificationChannel[] = ['email', 'sms', 'push', 'webhook'];

function isChannelEnabled(prefs: NotificationPreferences, channel: NotificationChannel): boolean {
  const section = prefs[channel];
  return !!section?.enabled;
}

function withChannelEnabled(
  prefs: NotificationPreferences,
  channel: NotificationChannel,
  enabled: boolean,
): NotificationPreferences {
  const section = prefs[channel] ?? {};
  return {
    ...prefs,
    [channel]: { ...section, enabled },
  } as NotificationPreferences;
}

export function NotificationsScreen(): React.JSX.Element {
  const { gateway } = useAppContext();
  const navigation = useNavigation<NotificationsNavigation>();
  const { theme } = useAppTheme();
  const { t } = useTranslation('console');
  const { t: tCommon } = useTranslation('common');
  const styles = useMemo(() => createStyles(theme.colors), [theme]);

  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [savingChannel, setSavingChannel] = useState<NotificationChannel | null>(null);

  // workspace-scope: not-scoped — notification preferences and logs are
  // user-account-level (NotificationPreference + NotificationLog Prisma models
  // are keyed by userId, not workspaceId). See @prisma/AGENTS.md.
  const loadAll = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      const dc = gateway.getDelegateConfig();
      if (!dc) {
        setError(t('Delegate backend is not configured.'));
        setLoading(false);
        return;
      }
      if (mode === 'initial') setLoading(true);
      if (mode === 'refresh') setRefreshing(true);
      try {
        const [p, l] = await Promise.all([
          getNotificationPreferences(dc),
          listNotificationLogs(dc, { limit: 50 }).catch(() => ({ logs: [] })),
        ]);
        setPrefs(p);
        setLogs(l.logs);
        setError(null);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : t('Failed to load notifications');
        setError(message);
      } finally {
        if (mode === 'initial') setLoading(false);
        if (mode === 'refresh') setRefreshing(false);
      }
    },
    [gateway, t],
  );

  useFocusEffect(
    useCallback(() => {
      void loadAll('initial');
    }, [loadAll]),
  );

  const handleToggleChannel = useCallback(
    async (channel: NotificationChannel, next: boolean) => {
      if (!prefs) return;
      const dc = gateway.getDelegateConfig();
      if (!dc) return;
      const optimistic = withChannelEnabled(prefs, channel, next);
      setPrefs(optimistic);
      setSavingChannel(channel);
      try {
        const updated = await updateNotificationPreferences(dc, optimistic);
        setPrefs(updated);
      } catch (err: unknown) {
        // Revert on failure.
        setPrefs(prefs);
        const message = err instanceof Error ? err.message : t('Failed to update preferences');
        Alert.alert(tCommon('Error'), message);
      } finally {
        setSavingChannel(null);
      }
    },
    [gateway, prefs, t, tCommon],
  );

  const handleTestNotification = useCallback(async () => {
    if (!prefs || testing) return;
    const dc = gateway.getDelegateConfig();
    if (!dc) return;
    const channel: NotificationChannel =
      CHANNELS.find((c) => isChannelEnabled(prefs, c)) ?? 'email';
    setTesting(true);
    try {
      await testNotification(dc, channel);
      Alert.alert(tCommon('Success'), t('Test notification queued via {{channel}}.', { channel }));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('Failed to send test');
      Alert.alert(tCommon('Error'), message);
    } finally {
      setTesting(false);
    }
  }, [gateway, prefs, t, tCommon, testing]);

  const headerRight = useMemo(
    () => (
      <HeaderActionButton
        icon={BellRing}
        onPress={handleTestNotification}
        disabled={testing}
        size={20}
        testID="notifications-test-button"
      />
    ),
    [handleTestNotification, testing],
  );

  useNativeStackModalHeader({
    navigation,
    title: t('Notifications'),
    rightContent: headerRight,
    onClose: () => navigation.goBack(),
  });

  if (loading) {
    return (
      <View style={styles.root}>
        <LoadingState message={t('Loading notifications...')} />
      </View>
    );
  }

  const renderLog = ({ item }: { item: NotificationLog }) => (
    <View
      style={styles.logRow}
      testID={`notifications-log-row-${item.id}`}
    >
      <View style={styles.logRowMain}>
        <Text style={styles.logChannel}>{item.channel}</Text>
        <Text style={styles.logSubject} numberOfLines={1}>
          {item.subject ?? item.body ?? item.recipient ?? t('(no subject)')}
        </Text>
      </View>
      <Text style={styles.logStatus}>{item.status}</Text>
    </View>
  );

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadAll('refresh')}
            tintColor={theme.colors.primary}
          />
        }
      >
        <View style={styles.sectionCard} testID="notifications-prefs">
          <Text style={styles.sectionTitle}>{t('Preferences')}</Text>
          {CHANNELS.map((channel) => {
            const enabled = prefs ? isChannelEnabled(prefs, channel) : false;
            const isSaving = savingChannel === channel;
            return (
              <View key={channel} style={styles.prefRow}>
                <Text style={styles.prefLabel}>{t(channel)}</Text>
                <Switch
                  testID={`notifications-prefs-toggle-${channel}`}
                  value={enabled}
                  disabled={isSaving}
                  onValueChange={(next) => handleToggleChannel(channel, next)}
                  trackColor={{ false: theme.colors.borderStrong, true: theme.colors.primary }}
                  thumbColor={theme.colors.iconOnColor}
                />
              </View>
            );
          })}
        </View>

        <View style={[styles.sectionCard, { paddingBottom: 0 }]}>
          <Text style={styles.sectionTitle}>{t('Recent logs')}</Text>
          <FlatList
            scrollEnabled={false}
            data={logs}
            keyExtractor={(log) => log.id}
            renderItem={renderLog}
            testID="notifications-logs"
            ListEmptyComponent={
              <EmptyState icon="🔔" title={error ?? t('No notifications yet')} />
            }
          />
        </View>

        <TouchableOpacity
          testID="notifications-test-trigger"
          onPress={handleTestNotification}
          disabled={testing}
          style={[styles.testButton, testing && styles.testButtonDisabled]}
        >
          <Text style={styles.testButtonText}>
            {testing ? t('Sending...') : t('Send test notification')}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function createStyles(colors: ReturnType<typeof import('../../theme').useAppTheme>['theme']['colors']) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      padding: Space.lg,
      paddingBottom: Space.xxxl,
    },
    sectionCard: {
      backgroundColor: colors.surface,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      padding: Space.md,
      marginBottom: Space.md,
    },
    sectionTitle: {
      color: colors.text,
      fontSize: FontSize.base,
      fontWeight: FontWeight.bold,
      marginBottom: Space.sm,
    },
    prefRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: Space.sm,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    prefLabel: {
      color: colors.text,
      fontSize: FontSize.md,
      fontWeight: FontWeight.medium,
      textTransform: 'capitalize',
    },
    logRow: {
      paddingVertical: Space.sm,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: Space.sm,
    },
    logRowMain: {
      flex: 1,
      minWidth: 0,
    },
    logChannel: {
      color: colors.textMuted,
      fontSize: FontSize.xs,
      fontWeight: FontWeight.semibold,
      textTransform: 'uppercase',
    },
    logSubject: {
      color: colors.text,
      fontSize: FontSize.sm,
      marginTop: 2,
    },
    logStatus: {
      color: colors.textMuted,
      fontSize: FontSize.xs,
      fontWeight: FontWeight.semibold,
    },
    testButton: {
      marginTop: Space.sm,
      backgroundColor: colors.primary,
      borderRadius: Radius.md,
      paddingVertical: Space.md,
      alignItems: 'center',
    },
    testButtonDisabled: {
      opacity: 0.5,
    },
    testButtonText: {
      color: colors.primaryText,
      fontSize: FontSize.base,
      fontWeight: FontWeight.semibold,
    },
  });
}
