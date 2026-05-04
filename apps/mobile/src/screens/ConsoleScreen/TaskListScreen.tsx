import React, { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
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
  listDelegateTasks,
  type DelegateTaskRow,
} from '../../services/delegate-tasks';
import { useAppTheme } from '../../theme';
import { FontSize, FontWeight, Radius, Space } from '../../theme/tokens';
import type { ConsoleStackParamList } from './ConsoleTab';

type TaskListNavigation = NativeStackNavigationProp<ConsoleStackParamList, 'TaskList'>;

type StatusFilter = 'ALL' | 'TODO' | 'IN_PROGRESS' | 'DONE';

const FILTERS: StatusFilter[] = ['ALL', 'TODO', 'IN_PROGRESS', 'DONE'];
const PAGE_SIZE = 50;

export function TaskListScreen(): React.JSX.Element {
  const { gateway } = useAppContext();
  const { activeWorkspace } = useDelegateWorkspace();
  const navigation = useNavigation<TaskListNavigation>();
  const { theme } = useAppTheme();
  const { t } = useTranslation('console');
  const styles = useMemo(() => createStyles(theme.colors), [theme]);

  const [tasks, setTasks] = useState<DelegateTaskRow[]>([]);
  const [filter, setFilter] = useState<StatusFilter>('ALL');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const openCreate = useCallback(() => {
    navigation.navigate('CreateTask');
  }, [navigation]);

  const headerRight = useMemo(
    () => (
      <HeaderActionButton
        icon={Plus}
        onPress={openCreate}
        size={22}
        testID="task-list-create-button"
      />
    ),
    [openCreate],
  );

  useNativeStackModalHeader({
    navigation,
    title: t('Tasks'),
    rightContent: headerRight,
    onClose: () => navigation.goBack(),
  });

  const loadTasks = useCallback(
    async (mode: 'initial' | 'refresh' | 'more') => {
      const dc = gateway.getDelegateConfig();
      if (!dc) {
        setTasks([]);
        setLoading(false);
        return;
      }
      if (mode === 'initial') setLoading(true);
      if (mode === 'refresh') setRefreshing(true);
      if (mode === 'more') setLoadingMore(true);

      const nextOffset = mode === 'more' ? offset : 0;
      try {
        const { tasks: rows } = await listDelegateTasks(dc, {
          scope: 'mine',
          limit: PAGE_SIZE,
          offset: nextOffset,
          ...(activeWorkspace?.id ? { workspaceId: activeWorkspace.id } : {}),
          ...(filter === 'ALL' ? {} : { status: filter }),
        });
        setError(null);
        if (mode === 'more') {
          setTasks((prev) => [...prev, ...rows]);
        } else {
          setTasks(rows);
        }
        setHasMore(rows.length >= PAGE_SIZE);
        setOffset(nextOffset + rows.length);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : t('Failed to load tasks');
        setError(message);
      } finally {
        if (mode === 'initial') setLoading(false);
        if (mode === 'refresh') setRefreshing(false);
        if (mode === 'more') setLoadingMore(false);
      }
    },
    [filter, gateway, offset, t, activeWorkspace?.id],
  );

  useFocusEffect(
    useCallback(() => {
      void loadTasks('initial');
      // Reset offset on focus so we always start fresh.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filter, activeWorkspace?.id]),
  );

  const onEndReached = useCallback(() => {
    if (loading || refreshing || loadingMore || !hasMore) return;
    void loadTasks('more');
  }, [hasMore, loadTasks, loading, loadingMore, refreshing]);

  const renderItem = ({ item }: { item: DelegateTaskRow }) => (
    <Card
      style={styles.card}
      onPress={() => navigation.navigate('TaskDetail', { taskId: item.id })}
      testID={`task-list-row-${item.id}`}
    >
      <View style={styles.cardRow}>
        <View style={styles.cardTextWrap}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.cardSubtitle} numberOfLines={1}>
            {item.status}
            {item.priority ? ` · ${item.priority}` : ''}
          </Text>
        </View>
        <ChevronRight size={16} color={theme.colors.textSubtle} strokeWidth={2} />
      </View>
    </Card>
  );

  return (
    <View style={styles.root}>
      <View style={styles.filterRow}>
        {FILTERS.map((f) => {
          const active = f === filter;
          return (
            <Pressable
              key={f}
              testID={`task-list-filter-${f}`}
              onPress={() => setFilter(f)}
              style={[
                styles.filterChip,
                {
                  backgroundColor: active ? theme.colors.primary : theme.colors.surface,
                  borderColor: active ? theme.colors.primary : theme.colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.filterChipText,
                  { color: active ? theme.colors.primaryText : theme.colors.textMuted },
                ]}
              >
                {t(f)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {loading ? (
        <LoadingState message={t('Loading tasks...')} />
      ) : (
        <FlatList
          data={tasks}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          testID="task-list"
          contentContainerStyle={[styles.content, { flexGrow: 1 }]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadTasks('refresh')}
              tintColor={theme.colors.primary}
            />
          }
          onEndReached={onEndReached}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <EmptyState
                icon="📋"
                title={error ?? t('No tasks found')}
                subtitle={error ? undefined : t('Create a task to get started.')}
              />
              {!error ? (
                <TouchableOpacity
                  testID="task-list-empty-create"
                  onPress={openCreate}
                  style={[styles.emptyCta, { backgroundColor: theme.colors.primary }]}
                >
                  <Text style={[styles.emptyCtaText, { color: theme.colors.primaryText }]}>
                    {t('Create task')}
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
          }
        />
      )}
    </View>
  );
}

function createStyles(colors: ReturnType<typeof import('../../theme').useAppTheme>['theme']['colors']) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.background,
    },
    filterRow: {
      flexDirection: 'row',
      gap: Space.xs,
      paddingHorizontal: Space.lg,
      paddingVertical: Space.sm,
    },
    filterChip: {
      paddingHorizontal: Space.md,
      paddingVertical: 6,
      borderRadius: Radius.full,
      borderWidth: 1,
    },
    filterChipText: {
      fontSize: FontSize.sm,
      fontWeight: FontWeight.semibold,
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
