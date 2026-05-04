/**
 * AdminSessionsScreen — Phase 7 (AC-13).
 *
 * Active-session overview backed by GET /api/admin/sessions (SUPER_ADMIN
 * server-side). Each row lets the admin revoke the user's sessions via
 * POST /api/admin/sessions { userId, action: 'revoke' }.
 *
 * testIDs:
 *   - `admin-sessions`
 *   - `admin-sessions-list`
 *   - `admin-sessions-row-{id}`
 *   - `admin-sessions-revoke-{id}`
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { EmptyState, LoadingState } from '../../components/ui';
import { useAppContext } from '../../contexts/AppContext';
import { useNativeStackModalHeader } from '../../hooks/useNativeStackModalHeader';
import {
  listAdminSessions,
  revokeAdminSession,
  type AdminSessionRow,
} from '../../services/delegate-admin';
import { useAppTheme } from '../../theme';
import { FontSize, FontWeight, Radius, Space } from '../../theme/tokens';
import type { ConsoleStackParamList } from './ConsoleTab';

type AdminSessionsNavigation = NativeStackNavigationProp<
  ConsoleStackParamList,
  'AdminSessions'
>;

export function AdminSessionsScreen(): React.JSX.Element {
  const navigation = useNavigation<AdminSessionsNavigation>();
  const { gateway } = useAppContext();
  const { theme } = useAppTheme();
  const { t } = useTranslation('console');
  const { t: tCommon } = useTranslation('common');
  const styles = useMemo(() => createStyles(theme.colors), [theme]);

  const [rows, setRows] = useState<AdminSessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  useNativeStackModalHeader({
    navigation,
    title: t('Sessions'),
    onClose: () => navigation.goBack(),
  });

  const load = useCallback(
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
        const result = await listAdminSessions(dc, { limit: 100 });
        setRows(result.items);
        setError(null);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : t('Failed to load sessions');
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
      void load('initial');
    }, [load]),
  );

  const handleRevoke = useCallback(
    async (row: AdminSessionRow) => {
      const dc = gateway.getDelegateConfig();
      if (!dc) return;
      Alert.alert(
        t('Revoke sessions?'),
        t('All active sessions for {{email}} will be signed out.', {
          email: row.email ?? row.id,
        }),
        [
          { text: tCommon('Cancel'), style: 'cancel' },
          {
            text: t('Revoke'),
            style: 'destructive',
            onPress: async () => {
              setRevokingId(row.id);
              try {
                await revokeAdminSession(dc, row.id);
                await load('refresh');
              } catch (err: unknown) {
                const message =
                  err instanceof Error ? err.message : t('Failed to revoke sessions');
                Alert.alert(tCommon('Error'), message);
              } finally {
                setRevokingId(null);
              }
            },
          },
        ],
      );
    },
    [gateway, load, t, tCommon],
  );

  const renderItem = useCallback(
    ({ item }: { item: AdminSessionRow }) => (
      <View style={styles.row} testID={`admin-sessions-row-${item.id}`}>
        <View style={styles.rowMain}>
          <Text style={styles.email} numberOfLines={1}>
            {item.email ?? '(no email)'}
          </Text>
          <Text style={styles.sub} numberOfLines={1}>
            {item.lastActivityAt
              ? t('Active {{ts}}', { ts: item.lastActivityAt })
              : t('No recent activity')}
          </Text>
        </View>
        <TouchableOpacity
          testID={`admin-sessions-revoke-${item.id}`}
          onPress={() => handleRevoke(item)}
          disabled={revokingId === item.id}
          style={[styles.revoke, revokingId === item.id && styles.revokeDisabled]}
          activeOpacity={0.7}
        >
          <Text style={styles.revokeText}>
            {revokingId === item.id ? t('Revoking…') : t('Revoke')}
          </Text>
        </TouchableOpacity>
      </View>
    ),
    [handleRevoke, revokingId, styles, t],
  );

  return (
    <View style={styles.root} testID="admin-sessions">
      {loading ? (
        <LoadingState message={t('Loading sessions...')} />
      ) : error ? (
        <EmptyState icon="⚠️" title={t('Error')} subtitle={error} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon="🔐"
          title={t('No sessions')}
          subtitle={t('No users have recent activity.')}
        />
      ) : (
        <FlatList
          testID="admin-sessions-list"
          data={rows}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load('refresh')}
              tintColor={theme.colors.primary}
            />
          }
        />
      )}
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useAppTheme>['theme']['colors']) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    listContent: { paddingBottom: Space.xxxl },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: Space.lg,
      paddingVertical: Space.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    rowMain: { flex: 1, marginRight: Space.md },
    email: {
      fontSize: FontSize.base,
      fontWeight: FontWeight.semibold,
      color: colors.text,
    },
    sub: {
      marginTop: 2,
      fontSize: FontSize.sm,
      color: colors.textMuted,
    },
    revoke: {
      paddingHorizontal: Space.md,
      paddingVertical: Space.sm - 2,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: colors.error,
    },
    revokeDisabled: { opacity: 0.5 },
    revokeText: {
      color: colors.error,
      fontSize: FontSize.sm,
      fontWeight: FontWeight.semibold,
    },
  });
}
