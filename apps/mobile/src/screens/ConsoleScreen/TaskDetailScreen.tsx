import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Edit3, Trash2 } from 'lucide-react-native';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import {
  EmptyState,
  HeaderActionButton,
  LoadingState,
} from '../../components/ui';
import { useAppContext } from '../../contexts/AppContext';
import { useNativeStackModalHeader } from '../../hooks/useNativeStackModalHeader';
import {
  addTaskComment,
  deleteDelegateTask,
  getDelegateTask,
  listTaskComments,
  listTaskSubtasks,
  startTaskWorkflow,
  type DelegateTaskDetail,
  type TaskComment,
  type TaskSubtask,
} from '../../services/delegate-tasks';
import { useAppTheme } from '../../theme';
import { FontSize, FontWeight, Radius, Space } from '../../theme/tokens';
import type { ConsoleStackParamList } from './ConsoleTab';

type TaskDetailNavigation = NativeStackNavigationProp<ConsoleStackParamList, 'TaskDetail'>;
type TaskDetailRoute = RouteProp<ConsoleStackParamList, 'TaskDetail'>;

type TabKey = 'overview' | 'subtasks' | 'comments' | 'workflow';
const TABS: TabKey[] = ['overview', 'subtasks', 'comments', 'workflow'];

export function TaskDetailScreen(): React.JSX.Element {
  const { gateway } = useAppContext();
  const navigation = useNavigation<TaskDetailNavigation>();
  const route = useRoute<TaskDetailRoute>();
  const taskId = route.params?.taskId;
  const { theme } = useAppTheme();
  const { t } = useTranslation('console');
  const { t: tCommon } = useTranslation('common');
  const styles = useMemo(() => createStyles(theme.colors), [theme]);

  const [tab, setTab] = useState<TabKey>('overview');
  const [task, setTask] = useState<DelegateTaskDetail | null>(null);
  const [subtasks, setSubtasks] = useState<TaskSubtask[]>([]);
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [commentDraft, setCommentDraft] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [delegating, setDelegating] = useState(false);
  const [workflowStatus, setWorkflowStatus] = useState<string | null>(null);

  const openEdit = useCallback(() => {
    if (!taskId) return;
    navigation.navigate('CreateTask', { taskId });
  }, [navigation, taskId]);

  const handleDelete = useCallback(() => {
    if (!taskId) return;
    Alert.alert(
      t('Delete task?'),
      t('This cannot be undone.'),
      [
        { text: tCommon('Cancel'), style: 'cancel' },
        {
          text: tCommon('Delete'),
          style: 'destructive',
          onPress: async () => {
            const dc = gateway.getDelegateConfig();
            if (!dc) return;
            try {
              await deleteDelegateTask(dc, taskId);
              navigation.goBack();
            } catch (err: unknown) {
              const message = err instanceof Error ? err.message : t('Delete failed');
              Alert.alert(tCommon('Error'), message);
            }
          },
        },
      ],
    );
  }, [gateway, navigation, t, tCommon, taskId]);

  const headerRight = useMemo(
    () => (
      <View style={styles.headerActions}>
        <HeaderActionButton
          icon={Edit3}
          onPress={openEdit}
          size={18}
          testID="task-detail-edit"
        />
        <HeaderActionButton
          icon={Trash2}
          onPress={handleDelete}
          size={18}
          testID="task-detail-delete"
        />
      </View>
    ),
    [handleDelete, openEdit, styles.headerActions],
  );

  useNativeStackModalHeader({
    navigation,
    title: t('Task'),
    rightContent: headerRight,
    onClose: () => navigation.goBack(),
  });

  const loadAll = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      if (!taskId) return;
      const dc = gateway.getDelegateConfig();
      if (!dc) return;
      if (mode === 'initial') setLoading(true);
      if (mode === 'refresh') setRefreshing(true);
      try {
        const [detail, subs, cmts] = await Promise.all([
          getDelegateTask(dc, taskId),
          listTaskSubtasks(dc, taskId).catch(() => ({ subtasks: [] })),
          listTaskComments(dc, taskId).catch(() => ({ comments: [] })),
        ]);
        setTask(detail);
        setSubtasks(subs.subtasks);
        setComments(cmts.comments);
        setError(null);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : t('Failed to load task');
        setError(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [gateway, t, taskId],
  );

  useFocusEffect(
    useCallback(() => {
      void loadAll('initial');
    }, [loadAll]),
  );

  const handleSendComment = useCallback(async () => {
    const body = commentDraft.trim();
    if (!body || !taskId) return;
    const dc = gateway.getDelegateConfig();
    if (!dc) return;
    setSubmittingComment(true);
    try {
      const created = await addTaskComment(dc, taskId, body);
      setComments((prev) => [...prev, created]);
      setCommentDraft('');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('Comment failed');
      Alert.alert(tCommon('Error'), message);
    } finally {
      setSubmittingComment(false);
    }
  }, [commentDraft, gateway, t, tCommon, taskId]);

  const handleDelegate = useCallback(async () => {
    if (!taskId) return;
    const dc = gateway.getDelegateConfig();
    if (!dc) return;
    setDelegating(true);
    setWorkflowStatus(t('Starting delegation...'));
    try {
      const res = await startTaskWorkflow(dc, taskId);
      setWorkflowStatus(
        res.workflowId
          ? t('Workflow started: {{id}}', { id: res.workflowId })
          : t('Workflow started'),
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('Failed to start delegation');
      setWorkflowStatus(message);
    } finally {
      setDelegating(false);
    }
  }, [gateway, t, taskId]);

  if (loading) {
    return (
      <View style={styles.root}>
        <LoadingState message={t('Loading task...')} />
      </View>
    );
  }

  if (!task) {
    return (
      <View style={styles.root}>
        <EmptyState icon="📋" title={error ?? t('Task not found')} />
      </View>
    );
  }

  return (
    <View style={styles.root} testID="task-detail">
      <View style={styles.tabBar}>
        {TABS.map((key) => {
          const active = tab === key;
          return (
            <Pressable
              key={key}
              testID={`task-detail-tab-${key}`}
              onPress={() => setTab(key)}
              style={[
                styles.tab,
                {
                  borderBottomColor: active ? theme.colors.primary : 'transparent',
                },
              ]}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: active ? theme.colors.primary : theme.colors.textMuted },
                ]}
              >
                {t(capitalize(key))}
              </Text>
            </Pressable>
          );
        })}
      </View>

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
        {tab === 'overview' ? (
          <View>
            <Text style={styles.title}>{task.title}</Text>
            <View style={[styles.statusBadge, { backgroundColor: theme.colors.surfaceMuted }]}>
              <Text style={[styles.statusBadgeText, { color: theme.colors.textMuted }]}>
                {task.status}
                {task.priority ? ` · ${task.priority}` : ''}
              </Text>
            </View>
            {task.description ? (
              <Text style={styles.description}>{task.description}</Text>
            ) : (
              <Text style={styles.descriptionEmpty}>{t('No description.')}</Text>
            )}
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>{t('Created')}</Text>
              <Text style={styles.metaValue}>{formatDate(task.createdAt)}</Text>
            </View>
            {task.assignedAgentId ? (
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>{t('Agent')}</Text>
                <Text style={styles.metaValue}>{task.assignedAgentId}</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {tab === 'subtasks' ? (
          subtasks.length === 0 ? (
            <EmptyState icon="✅" title={t('No subtasks')} />
          ) : (
            <View>
              {subtasks.map((s) => (
                <View
                  key={s.id}
                  testID={`subtask-row-${s.id}`}
                  style={[styles.subtaskRow, { borderColor: theme.colors.border }]}
                >
                  <View
                    style={[
                      styles.checkbox,
                      {
                        borderColor: theme.colors.border,
                        backgroundColor: s.done ? theme.colors.primary : 'transparent',
                      },
                    ]}
                  />
                  <Text
                    style={[
                      styles.subtaskText,
                      { color: theme.colors.text, opacity: s.done ? 0.6 : 1 },
                    ]}
                  >
                    {s.title}
                  </Text>
                </View>
              ))}
            </View>
          )
        ) : null}

        {tab === 'comments' ? (
          <View>
            {comments.length === 0 ? (
              <EmptyState icon="💬" title={t('No comments yet')} />
            ) : (
              comments.map((c) => (
                <View
                  key={c.id}
                  testID={`comment-row-${c.id}`}
                  style={[styles.commentRow, { borderColor: theme.colors.border }]}
                >
                  <Text style={[styles.commentAuthor, { color: theme.colors.textMuted }]}>
                    {c.authorName ?? t('Unknown')}
                  </Text>
                  <Text style={[styles.commentBody, { color: theme.colors.text }]}>{c.body}</Text>
                </View>
              ))
            )}
          </View>
        ) : null}

        {tab === 'workflow' ? (
          <View>
            <Text style={[styles.description, { color: theme.colors.textMuted }]}>
              {t('Start the delegation runner to hand this task off to an agent.')}
            </Text>
            <TouchableOpacity
              testID="task-detail-delegate-now"
              style={[
                styles.delegateButton,
                {
                  backgroundColor: theme.colors.primary,
                  opacity: delegating ? 0.6 : 1,
                },
              ]}
              onPress={handleDelegate}
              disabled={delegating}
              activeOpacity={0.85}
            >
              {delegating ? (
                <ActivityIndicator color={theme.colors.primaryText} />
              ) : (
                <Text style={[styles.delegateText, { color: theme.colors.primaryText }]}>
                  {t('Start delegation')}
                </Text>
              )}
            </TouchableOpacity>
            {workflowStatus ? (
              <Text
                testID="task-detail-workflow-status"
                style={[styles.workflowStatus, { color: theme.colors.textMuted }]}
              >
                {workflowStatus}
              </Text>
            ) : null}
          </View>
        ) : null}
      </ScrollView>

      {tab === 'comments' ? (
        <View style={[styles.composer, { borderTopColor: theme.colors.border }]}>
          <TextInput
            testID="comment-composer-input"
            value={commentDraft}
            onChangeText={setCommentDraft}
            placeholder={t('Add a comment...')}
            placeholderTextColor={theme.colors.textSubtle}
            style={[
              styles.composerInput,
              {
                color: theme.colors.text,
                backgroundColor: theme.colors.inputBackground,
                borderColor: theme.colors.border,
              },
            ]}
            multiline
            editable={!submittingComment}
          />
          <TouchableOpacity
            testID="comment-send"
            style={[
              styles.sendButton,
              {
                backgroundColor: theme.colors.primary,
                opacity: !commentDraft.trim() || submittingComment ? 0.5 : 1,
              },
            ]}
            onPress={handleSendComment}
            disabled={!commentDraft.trim() || submittingComment}
          >
            {submittingComment ? (
              <ActivityIndicator color={theme.colors.primaryText} />
            ) : (
              <Text style={[styles.sendButtonText, { color: theme.colors.primaryText }]}>
                {tCommon('Send')}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function createStyles(colors: ReturnType<typeof import('../../theme').useAppTheme>['theme']['colors']) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.background,
    },
    headerActions: {
      flexDirection: 'row',
      gap: 4,
    },
    tabBar: {
      flexDirection: 'row',
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    tab: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: Space.md,
      borderBottomWidth: 2,
    },
    tabText: {
      fontSize: FontSize.sm,
      fontWeight: FontWeight.semibold,
    },
    content: {
      padding: Space.lg,
      paddingBottom: Space.xxxl,
    },
    title: {
      fontSize: FontSize.xl,
      fontWeight: FontWeight.bold,
      color: colors.text,
      marginBottom: Space.sm,
    },
    statusBadge: {
      alignSelf: 'flex-start',
      paddingHorizontal: Space.sm,
      paddingVertical: 4,
      borderRadius: Radius.full,
      marginBottom: Space.md,
    },
    statusBadgeText: {
      fontSize: FontSize.xs,
      fontWeight: FontWeight.semibold,
    },
    description: {
      fontSize: FontSize.base,
      lineHeight: 22,
      color: colors.text,
      marginBottom: Space.lg,
    },
    descriptionEmpty: {
      fontSize: FontSize.sm,
      color: colors.textSubtle,
      fontStyle: 'italic',
      marginBottom: Space.lg,
    },
    metaRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: Space.xs,
    },
    metaLabel: {
      fontSize: FontSize.sm,
      color: colors.textMuted,
    },
    metaValue: {
      fontSize: FontSize.sm,
      color: colors.text,
      fontWeight: FontWeight.medium,
    },
    subtaskRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: Space.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      gap: Space.md,
    },
    checkbox: {
      width: 18,
      height: 18,
      borderRadius: 4,
      borderWidth: 1.5,
    },
    subtaskText: {
      flex: 1,
      fontSize: FontSize.base,
    },
    commentRow: {
      paddingVertical: Space.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    commentAuthor: {
      fontSize: FontSize.xs,
      fontWeight: FontWeight.semibold,
      marginBottom: 2,
    },
    commentBody: {
      fontSize: FontSize.base,
      lineHeight: 20,
    },
    composer: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: Space.sm,
      padding: Space.md,
      borderTopWidth: StyleSheet.hairlineWidth,
    },
    composerInput: {
      flex: 1,
      minHeight: 40,
      maxHeight: 120,
      borderWidth: 1,
      borderRadius: Radius.md,
      paddingHorizontal: Space.md,
      paddingVertical: Space.sm,
      fontSize: FontSize.base,
    },
    sendButton: {
      paddingHorizontal: Space.md,
      paddingVertical: 10,
      borderRadius: Radius.md,
    },
    sendButtonText: {
      fontSize: FontSize.sm,
      fontWeight: FontWeight.semibold,
    },
    delegateButton: {
      marginTop: Space.lg,
      paddingVertical: 13,
      borderRadius: Radius.md,
      alignItems: 'center',
    },
    delegateText: {
      fontSize: FontSize.base,
      fontWeight: FontWeight.semibold,
    },
    workflowStatus: {
      marginTop: Space.md,
      fontSize: FontSize.sm,
      textAlign: 'center',
    },
  });
}
