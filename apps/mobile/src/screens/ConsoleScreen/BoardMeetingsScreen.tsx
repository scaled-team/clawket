/**
 * BoardMeetingsScreen — Phase 6 (AC-10).
 *
 * Lists the current user's board meetings from `GET /api/board-meetings`
 * (via `services/delegate-board-meetings.listBoardMeetings`). Tapping a row
 * navigates to `BoardMeetingDetail`. The header "+" button navigates to the
 * `CreateBoardMeeting` modal.
 *
 * testIDs:
 *   - `board-meetings-list`             — FlatList container
 *   - `board-meeting-row-{id}`          — each row
 *   - `board-meeting-create-button`     — header + button
 *   - `board-meeting-empty-create`      — empty-state CTA
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { ChevronRight, Plus } from 'lucide-react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import {
  Card,
  EmptyState,
  HeaderActionButton,
  LoadingState,
  createListContentStyle,
} from '../../components/ui';
import { useAppContext } from '../../contexts/AppContext';
import { useDelegateWorkspace } from '../../contexts/WorkspaceContext';
import { useNativeStackModalHeader } from '../../hooks/useNativeStackModalHeader';
import {
  listBoardMeetings,
  type BoardMeetingRow,
} from '../../services/delegate-board-meetings';
import { useAppTheme } from '../../theme';
import { FontSize, FontWeight, Radius, Space } from '../../theme/tokens';
import type { ConsoleStackParamList } from './ConsoleTab';

type BoardMeetingsNavigation = NativeStackNavigationProp<ConsoleStackParamList, 'BoardMeetings'>;

export function BoardMeetingsScreen(): React.JSX.Element {
  const { gateway } = useAppContext();
  const { activeWorkspace } = useDelegateWorkspace();
  const navigation = useNavigation<BoardMeetingsNavigation>();
  const { theme } = useAppTheme();
  const { t } = useTranslation('console');
  const styles = useMemo(() => createStyles(theme.colors), [theme]);

  const [meetings, setMeetings] = useState<BoardMeetingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openCreate = useCallback(() => {
    navigation.navigate('CreateBoardMeeting');
  }, [navigation]);

  const headerRight = useMemo(
    () => (
      <HeaderActionButton
        icon={Plus}
        onPress={openCreate}
        size={22}
        testID="board-meeting-create-button"
      />
    ),
    [openCreate],
  );

  useNativeStackModalHeader({
    navigation,
    title: t('Board Meetings'),
    rightContent: headerRight,
    onClose: () => navigation.goBack(),
  });

  const loadMeetings = useCallback(
    async (mode: 'initial' | 'refresh') => {
      const dc = gateway.getDelegateConfig();
      if (!dc) {
        setMeetings([]);
        setLoading(false);
        return;
      }
      if (mode === 'initial') setLoading(true);
      if (mode === 'refresh') setRefreshing(true);
      try {
        const { meetings: rows } = await listBoardMeetings(
          dc,
          activeWorkspace?.id ? { workspaceId: activeWorkspace.id } : undefined,
        );
        setMeetings(rows);
        setError(null);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : t('Failed to load board meetings');
        setError(message);
      } finally {
        if (mode === 'initial') setLoading(false);
        if (mode === 'refresh') setRefreshing(false);
      }
    },
    [gateway, t, activeWorkspace?.id],
  );

  useFocusEffect(
    useCallback(() => {
      void loadMeetings('initial');
    }, [loadMeetings]),
  );

  const renderItem = ({ item }: { item: BoardMeetingRow }) => (
    <Card
      style={styles.card}
      onPress={() => navigation.navigate('BoardMeetingDetail', { meetingId: item.id })}
      testID={`board-meeting-row-${item.id}`}
    >
      <View style={styles.cardRow}>
        <View style={styles.cardTextWrap}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.cardSubtitle} numberOfLines={1}>
            {item.status}
            {item.scheduledFor ? ` · ${item.scheduledFor}` : ''}
          </Text>
        </View>
        <ChevronRight size={16} color={theme.colors.textSubtle} strokeWidth={2} />
      </View>
    </Card>
  );

  if (loading) {
    return (
      <View style={styles.root}>
        <LoadingState message={t('Loading board meetings...')} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <FlatList
        data={meetings}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        testID="board-meetings-list"
        contentContainerStyle={[styles.content, { flexGrow: 1 }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadMeetings('refresh')}
            tintColor={theme.colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <EmptyState
              icon="🏛️"
              title={error ?? t('No board meetings yet')}
              subtitle={error ? undefined : t('Schedule a multi-agent discussion.')}
            />
            {!error ? (
              <TouchableOpacity
                testID="board-meeting-empty-create"
                onPress={openCreate}
                style={[styles.emptyCta, { backgroundColor: theme.colors.primary }]}
              >
                <Text style={[styles.emptyCtaText, { color: theme.colors.primaryText }]}>
                  {t('Schedule meeting')}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        }
      />
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
      ...createListContentStyle({ grow: true, bottom: Space.xxxl }),
    },
    card: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: Radius.md,
      padding: Space.lg - 2,
      marginBottom: Space.md - 2,
    },
    cardRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    cardTextWrap: {
      flex: 1,
      minWidth: 0,
    },
    cardTitle: {
      fontSize: FontSize.base,
      fontWeight: FontWeight.semibold,
      color: colors.text,
    },
    cardSubtitle: {
      fontSize: FontSize.sm,
      color: colors.textMuted,
      marginTop: 2,
    },
    emptyWrap: {
      alignItems: 'center',
      paddingTop: Space.xl,
    },
    emptyCta: {
      marginTop: Space.lg,
      paddingHorizontal: Space.lg,
      paddingVertical: 10,
      borderRadius: Radius.md,
    },
    emptyCtaText: {
      fontSize: FontSize.base,
      fontWeight: FontWeight.semibold,
    },
  });
}
