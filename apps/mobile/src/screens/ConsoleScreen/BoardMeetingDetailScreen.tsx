/**
 * BoardMeetingDetailScreen — Phase 6 (AC-10).
 *
 * Tabs: Overview, Rounds, Decisions, Actions.
 * Header actions:
 *   - Start  (visible when status === 'SCHEDULED')
 *   - Cancel (visible when status === 'IN_PROGRESS')
 *
 * testIDs:
 *   - `board-meeting-detail`                — root
 *   - `board-meeting-tab-{overview|rounds|decisions|actions}`
 *   - `board-meeting-start`                 — Start action
 *   - `board-meeting-cancel`                — Cancel action
 *   - `board-meeting-round-row-{id}`
 *   - `board-meeting-decision-row-{id}`
 *   - `board-meeting-action-row-{id}`
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { EmptyState, LoadingState } from '../../components/ui';
import { useAppContext } from '../../contexts/AppContext';
import { useNativeStackModalHeader } from '../../hooks/useNativeStackModalHeader';
import {
  cancelBoardMeeting,
  getBoardMeeting,
  startBoardMeeting,
  type BoardMeetingDetail,
} from '../../services/delegate-board-meetings';
import { useAppTheme } from '../../theme';
import { FontSize, FontWeight, Radius, Space } from '../../theme/tokens';
import type { ConsoleStackParamList } from './ConsoleTab';

type BoardMeetingDetailNavigation = NativeStackNavigationProp<
  ConsoleStackParamList,
  'BoardMeetingDetail'
>;
type BoardMeetingDetailRoute = RouteProp<ConsoleStackParamList, 'BoardMeetingDetail'>;

type TabKey = 'overview' | 'rounds' | 'decisions' | 'actions';
const TABS: TabKey[] = ['overview', 'rounds', 'decisions', 'actions'];

export function BoardMeetingDetailScreen(): React.JSX.Element {
  const { gateway } = useAppContext();
  const navigation = useNavigation<BoardMeetingDetailNavigation>();
  const route = useRoute<BoardMeetingDetailRoute>();
  const { meetingId } = route.params;
  const { theme } = useAppTheme();
  const { t } = useTranslation('console');
  const { t: tCommon } = useTranslation('common');
  const styles = useMemo(() => createStyles(theme.colors), [theme]);

  const [tab, setTab] = useState<TabKey>('overview');
  const [detail, setDetail] = useState<BoardMeetingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mutating, setMutating] = useState(false);

  // workspace-scope: not-scoped — getBoardMeeting fetches by id; the API
  // already enforces ownership/workspace access on the server. Wiring
  // workspaceId here would over-constrain the lookup.
  const loadDetail = useCallback(
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
        const next = await getBoardMeeting(dc, meetingId);
        setDetail(next);
        setError(null);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : t('Failed to load meeting');
        setError(message);
      } finally {
        if (mode === 'initial') setLoading(false);
        if (mode === 'refresh') setRefreshing(false);
      }
    },
    [gateway, meetingId, t],
  );

  useFocusEffect(
    useCallback(() => {
      void loadDetail('initial');
    }, [loadDetail]),
  );

  const handleStart = useCallback(async () => {
    if (!detail || mutating) return;
    const dc = gateway.getDelegateConfig();
    if (!dc) return;
    setMutating(true);
    try {
      await startBoardMeeting(dc, detail.id);
      await loadDetail('refresh');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('Failed to start meeting');
      Alert.alert(tCommon('Error'), message);
    } finally {
      setMutating(false);
    }
  }, [detail, gateway, loadDetail, mutating, t, tCommon]);

  const handleCancel = useCallback(async () => {
    if (!detail || mutating) return;
    const dc = gateway.getDelegateConfig();
    if (!dc) return;
    setMutating(true);
    try {
      await cancelBoardMeeting(dc, detail.id);
      await loadDetail('refresh');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('Failed to cancel meeting');
      Alert.alert(tCommon('Error'), message);
    } finally {
      setMutating(false);
    }
  }, [detail, gateway, loadDetail, mutating, t, tCommon]);

  const headerRight = useMemo(() => {
    if (!detail) return undefined;
    if (detail.status === 'SCHEDULED') {
      return (
        <TouchableOpacity
          testID="board-meeting-start"
          onPress={handleStart}
          disabled={mutating}
          style={styles.headerActionPrimary}
        >
          <Text style={styles.headerActionPrimaryText}>{t('Start')}</Text>
        </TouchableOpacity>
      );
    }
    if (detail.status === 'IN_PROGRESS') {
      return (
        <TouchableOpacity
          testID="board-meeting-cancel"
          onPress={handleCancel}
          disabled={mutating}
          style={styles.headerActionDestructive}
        >
          <Text style={styles.headerActionDestructiveText}>{t('Cancel')}</Text>
        </TouchableOpacity>
      );
    }
    return undefined;
  }, [detail, handleCancel, handleStart, mutating, styles, t]);

  useNativeStackModalHeader({
    navigation,
    title: detail?.title || t('Board Meeting'),
    rightContent: headerRight,
    onClose: () => navigation.goBack(),
  });

  if (loading) {
    return (
      <View style={styles.root} testID="board-meeting-detail">
        <LoadingState message={t('Loading meeting...')} />
      </View>
    );
  }

  if (error || !detail) {
    return (
      <View style={styles.root} testID="board-meeting-detail">
        <EmptyState icon="🏛️" title={error ?? t('Meeting not found.')} />
      </View>
    );
  }

  const renderTabBar = () => (
    <View style={styles.tabBar}>
      {TABS.map((key) => {
        const active = tab === key;
        return (
          <Pressable
            key={key}
            testID={`board-meeting-tab-${key}`}
            onPress={() => setTab(key)}
            style={[
              styles.tabItem,
              {
                backgroundColor: active ? theme.colors.surfaceElevated : 'transparent',
                borderColor: active ? theme.colors.borderStrong : 'transparent',
              },
            ]}
          >
            <Text
              style={[
                styles.tabLabel,
                { color: active ? theme.colors.text : theme.colors.textMuted },
              ]}
            >
              {t(key)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  return (
    <View style={styles.root} testID="board-meeting-detail">
      {renderTabBar()}
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadDetail('refresh')}
            tintColor={theme.colors.primary}
          />
        }
      >
        {tab === 'overview' ? (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>{t('Overview')}</Text>
            <Text style={styles.infoLabel}>{t('Status')}</Text>
            <Text style={styles.infoValue}>{detail.status}</Text>
            {detail.scheduledFor ? (
              <>
                <Text style={styles.infoLabel}>{t('Scheduled')}</Text>
                <Text style={styles.infoValue}>{detail.scheduledFor}</Text>
              </>
            ) : null}
            {detail.description ? (
              <>
                <Text style={styles.infoLabel}>{t('Description')}</Text>
                <Text style={styles.infoValue}>{detail.description}</Text>
              </>
            ) : null}
          </View>
        ) : null}

        {tab === 'rounds' ? (
          <View>
            {(detail.rounds ?? []).length === 0 ? (
              <EmptyState icon="🎙️" title={t('No rounds yet')} />
            ) : (
              (detail.rounds ?? []).map((round) => (
                <View
                  key={round.id}
                  style={styles.sectionCard}
                  testID={`board-meeting-round-row-${round.id}`}
                >
                  <Text style={styles.infoValue}>
                    {t('Round')} {round.roundNumber} · {round.status}
                  </Text>
                </View>
              ))
            )}
          </View>
        ) : null}

        {tab === 'decisions' ? (
          <View>
            {(detail.decisions ?? []).length === 0 ? (
              <EmptyState icon="🧭" title={t('No decisions yet')} />
            ) : (
              (detail.decisions ?? []).map((d) => (
                <View
                  key={d.id}
                  style={styles.sectionCard}
                  testID={`board-meeting-decision-row-${d.id}`}
                >
                  <Text style={styles.infoValue}>{d.content}</Text>
                </View>
              ))
            )}
          </View>
        ) : null}

        {tab === 'actions' ? (
          <View>
            {(detail.actions ?? []).length === 0 ? (
              <EmptyState icon="✅" title={t('No actions yet')} />
            ) : (
              (detail.actions ?? []).map((a) => (
                <View
                  key={a.id}
                  style={styles.sectionCard}
                  testID={`board-meeting-action-row-${a.id}`}
                >
                  <Text style={styles.infoValue}>{a.description}</Text>
                  {a.assignedTo ? (
                    <Text style={styles.infoLabel}>{t('Assigned to')}: {a.assignedTo}</Text>
                  ) : null}
                </View>
              ))
            )}
          </View>
        ) : null}
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
    tabBar: {
      flexDirection: 'row',
      gap: Space.xs,
      paddingHorizontal: Space.lg,
      paddingTop: Space.sm,
      paddingBottom: Space.xs,
    },
    tabItem: {
      paddingHorizontal: Space.md,
      paddingVertical: 6,
      borderRadius: Radius.full,
      borderWidth: 1,
    },
    tabLabel: {
      fontSize: FontSize.sm,
      fontWeight: FontWeight.semibold,
    },
    sectionCard: {
      backgroundColor: colors.surface,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      padding: Space.md,
      marginBottom: Space.sm,
    },
    sectionTitle: {
      color: colors.text,
      fontSize: FontSize.base,
      fontWeight: FontWeight.bold,
      marginBottom: Space.sm,
    },
    infoLabel: {
      color: colors.textMuted,
      fontSize: FontSize.sm,
      fontWeight: FontWeight.semibold,
      marginTop: Space.xs,
    },
    infoValue: {
      color: colors.text,
      fontSize: FontSize.md,
      lineHeight: 19,
    },
    headerActionPrimary: {
      paddingHorizontal: Space.md,
      paddingVertical: Space.xs + 2,
      backgroundColor: colors.primary,
      borderRadius: Radius.md,
    },
    headerActionPrimaryText: {
      color: colors.primaryText,
      fontSize: FontSize.sm,
      fontWeight: FontWeight.semibold,
    },
    headerActionDestructive: {
      paddingHorizontal: Space.md,
      paddingVertical: Space.xs + 2,
      backgroundColor: colors.error,
      borderRadius: Radius.md,
    },
    headerActionDestructiveText: {
      color: colors.primaryText,
      fontSize: FontSize.sm,
      fontWeight: FontWeight.semibold,
    },
  });
}
