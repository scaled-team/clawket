import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { LoadingState } from '../../components/ui';
import { useAppContext } from '../../contexts/AppContext';
import { useNativeStackModalHeader } from '../../hooks/useNativeStackModalHeader';
import {
  createDelegateTask,
  enhanceTaskDraft,
  getDelegateTask,
  startTaskWorkflow,
  updateDelegateTask,
} from '../../services/delegate-tasks';
import { useAppTheme } from '../../theme';
import { FontSize, FontWeight, Radius, Space } from '../../theme/tokens';
import type { ConsoleStackParamList } from './ConsoleTab';

type CreateTaskNavigation = NativeStackNavigationProp<ConsoleStackParamList, 'CreateTask'>;
type CreateTaskRoute = RouteProp<ConsoleStackParamList, 'CreateTask'>;

const PRIORITIES: Array<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'> = [
  'LOW',
  'MEDIUM',
  'HIGH',
  'CRITICAL',
];
const STATUSES: Array<'TODO' | 'IN_PROGRESS' | 'DONE'> = ['TODO', 'IN_PROGRESS', 'DONE'];

export function CreateTaskScreen(): React.JSX.Element {
  const { gateway } = useAppContext();
  const navigation = useNavigation<CreateTaskNavigation>();
  const route = useRoute<CreateTaskRoute>();
  const editingId = route.params?.taskId ?? null;
  const isEdit = !!editingId;
  const { theme } = useAppTheme();
  const { t } = useTranslation('console');
  const { t: tCommon } = useTranslation('common');
  const styles = useMemo(() => createStyles(theme.colors), [theme]);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<(typeof PRIORITIES)[number] | null>(null);
  const [status, setStatus] = useState<(typeof STATUSES)[number] | null>(null);
  const [delegateAfterSave, setDelegateAfterSave] = useState(false);

  const [initialLoading, setInitialLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [enhancing, setEnhancing] = useState(false);

  useNativeStackModalHeader({
    navigation,
    title: isEdit ? t('Edit Task') : t('Create Task'),
    onClose: () => navigation.goBack(),
  });

  // workspace-scope: not-scoped (write path) — POST /api/tasks resolves the
  // owner workspace server-side from the authenticated user; GET by id uses
  // the path param. Workspace-filtered task LISTS live in TaskListScreen.
  useEffect(() => {
    if (!isEdit || !editingId) return;
    const dc = gateway.getDelegateConfig();
    if (!dc) {
      setInitialLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const detail = await getDelegateTask(dc, editingId);
        if (cancelled) return;
        setTitle(detail.title ?? '');
        setDescription(detail.description ?? '');
        if (detail.priority && (PRIORITIES as string[]).includes(detail.priority)) {
          setPriority(detail.priority as (typeof PRIORITIES)[number]);
        }
        if (detail.status && (STATUSES as string[]).includes(detail.status)) {
          setStatus(detail.status as (typeof STATUSES)[number]);
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : t('Failed to load task');
        Alert.alert(tCommon('Error'), message);
      } finally {
        if (!cancelled) setInitialLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [editingId, gateway, isEdit, t, tCommon]);

  const handleEnhance = useCallback(async () => {
    const dc = gateway.getDelegateConfig();
    if (!dc) return;
    if (!title.trim()) {
      Alert.alert(tCommon('Error'), t('Please enter a title first.'));
      return;
    }
    setEnhancing(true);
    try {
      const res = await enhanceTaskDraft(dc, {
        title: title.trim(),
        description: description.trim() || undefined,
      });
      if (res.enhancedDescription) {
        setDescription(res.enhancedDescription);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('Enhancement failed');
      Alert.alert(tCommon('Error'), message);
    } finally {
      setEnhancing(false);
    }
  }, [description, gateway, t, tCommon, title]);

  const handleSave = useCallback(async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      Alert.alert(tCommon('Error'), t('Title is required.'));
      return;
    }
    const dc = gateway.getDelegateConfig();
    if (!dc) {
      Alert.alert(tCommon('Error'), t('Delegate backend is not configured.'));
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        title: trimmedTitle,
        description: description.trim() || undefined,
        priority: priority ?? undefined,
        ...(isEdit && status ? { status } : {}),
      };
      const saved = isEdit && editingId
        ? await updateDelegateTask(dc, editingId, payload)
        : await createDelegateTask(dc, payload);
      if (delegateAfterSave && saved?.id) {
        try {
          await startTaskWorkflow(dc, saved.id);
        } catch (err: unknown) {
          // Non-fatal — surface a warning but still navigate back.
          const message = err instanceof Error ? err.message : t('Delegation failed');
          Alert.alert(t('Saved, but delegation failed'), message);
        }
      }
      navigation.goBack();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('Save failed');
      Alert.alert(tCommon('Error'), message);
    } finally {
      setSubmitting(false);
    }
  }, [
    delegateAfterSave,
    description,
    editingId,
    gateway,
    isEdit,
    navigation,
    priority,
    status,
    t,
    tCommon,
    title,
  ]);

  if (initialLoading) {
    return (
      <View style={styles.root}>
        <LoadingState message={t('Loading task...')} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>{t('Title')}</Text>
        <TextInput
          testID="create-task-title-input"
          style={[
            styles.input,
            {
              color: theme.colors.text,
              backgroundColor: theme.colors.inputBackground,
              borderColor: theme.colors.border,
            },
          ]}
          value={title}
          onChangeText={setTitle}
          placeholder={t('What needs doing?')}
          placeholderTextColor={theme.colors.textSubtle}
          editable={!submitting}
          maxLength={200}
        />

        <View style={styles.descriptionHeader}>
          <Text style={styles.label}>{t('Description')}</Text>
          <TouchableOpacity
            testID="create-task-enhance"
            onPress={handleEnhance}
            disabled={enhancing || submitting || !title.trim()}
            style={[
              styles.enhanceButton,
              {
                borderColor: theme.colors.primary,
                opacity: enhancing || !title.trim() ? 0.5 : 1,
              },
            ]}
          >
            {enhancing ? (
              <ActivityIndicator color={theme.colors.primary} size="small" />
            ) : (
              <Text style={[styles.enhanceText, { color: theme.colors.primary }]}>
                {t('Enhance with AI')}
              </Text>
            )}
          </TouchableOpacity>
        </View>
        <TextInput
          testID="create-task-description-input"
          style={[
            styles.input,
            styles.multiline,
            {
              color: theme.colors.text,
              backgroundColor: theme.colors.inputBackground,
              borderColor: theme.colors.border,
            },
          ]}
          value={description}
          onChangeText={setDescription}
          placeholder={t('Optional context, acceptance criteria, links.')}
          placeholderTextColor={theme.colors.textSubtle}
          editable={!submitting}
          multiline
          textAlignVertical="top"
        />

        <Text style={styles.label}>{t('Priority')}</Text>
        <View testID="create-task-priority-picker" style={styles.chipRow}>
          {PRIORITIES.map((p) => {
            const active = priority === p;
            return (
              <Pressable
                key={p}
                testID={`create-task-priority-${p}`}
                onPress={() => setPriority(active ? null : p)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: active ? theme.colors.primary : theme.colors.surface,
                    borderColor: active ? theme.colors.primary : theme.colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    { color: active ? theme.colors.primaryText : theme.colors.textMuted },
                  ]}
                >
                  {t(p)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {isEdit ? (
          <>
            <Text style={styles.label}>{t('Status')}</Text>
            <View style={styles.chipRow}>
              {STATUSES.map((s) => {
                const active = status === s;
                return (
                  <Pressable
                    key={s}
                    testID={`create-task-status-${s}`}
                    onPress={() => setStatus(active ? null : s)}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: active ? theme.colors.primary : theme.colors.surface,
                        borderColor: active ? theme.colors.primary : theme.colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        { color: active ? theme.colors.primaryText : theme.colors.textMuted },
                      ]}
                    >
                      {t(s)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        ) : null}

        <View style={[styles.toggleRow, { borderColor: theme.colors.border }]}>
          <View style={styles.toggleText}>
            <Text style={[styles.toggleLabel, { color: theme.colors.text }]}>
              {t('Delegate after save')}
            </Text>
            <Text style={[styles.toggleDesc, { color: theme.colors.textMuted }]}>
              {t('Start the workflow runner once the task is created.')}
            </Text>
          </View>
          <Switch
            testID="create-task-delegate-toggle"
            value={delegateAfterSave}
            onValueChange={setDelegateAfterSave}
            disabled={submitting}
          />
        </View>
      </ScrollView>

      <View style={[styles.footer, { borderColor: theme.colors.border }]}>
        <TouchableOpacity
          testID="create-task-save"
          onPress={handleSave}
          disabled={submitting || !title.trim()}
          style={[
            styles.saveButton,
            {
              backgroundColor: theme.colors.primary,
              opacity: submitting || !title.trim() ? 0.55 : 1,
            },
          ]}
          activeOpacity={0.85}
        >
          {submitting ? (
            <ActivityIndicator color={theme.colors.primaryText} />
          ) : (
            <Text style={[styles.saveText, { color: theme.colors.primaryText }]}>
              {isEdit ? t('Save Changes') : t('Create Task')}
            </Text>
          )}
        </TouchableOpacity>
      </View>
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
      paddingBottom: Space.xxxl + 80,
    },
    label: {
      fontSize: FontSize.md,
      fontWeight: FontWeight.semibold,
      color: colors.text,
      marginBottom: Space.xs,
      marginTop: Space.md,
    },
    descriptionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: Space.md,
      marginBottom: Space.xs,
    },
    enhanceButton: {
      borderWidth: 1,
      borderRadius: Radius.full,
      paddingHorizontal: Space.md,
      paddingVertical: 6,
    },
    enhanceText: {
      fontSize: FontSize.xs,
      fontWeight: FontWeight.semibold,
    },
    input: {
      borderWidth: 1,
      borderRadius: Radius.md,
      paddingHorizontal: Space.md,
      paddingVertical: Space.sm + 4,
      fontSize: FontSize.base,
    },
    multiline: {
      minHeight: 120,
      textAlignVertical: 'top',
    },
    chipRow: {
      flexDirection: 'row',
      gap: Space.xs,
      flexWrap: 'wrap',
    },
    chip: {
      paddingHorizontal: Space.md,
      paddingVertical: 6,
      borderRadius: Radius.full,
      borderWidth: 1,
    },
    chipText: {
      fontSize: FontSize.sm,
      fontWeight: FontWeight.semibold,
    },
    toggleRow: {
      marginTop: Space.lg,
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: Space.md,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderBottomWidth: StyleSheet.hairlineWidth,
      gap: Space.md,
    },
    toggleText: {
      flex: 1,
    },
    toggleLabel: {
      fontSize: FontSize.base,
      fontWeight: FontWeight.semibold,
    },
    toggleDesc: {
      fontSize: FontSize.sm,
      marginTop: 2,
    },
    footer: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      padding: Space.lg,
      borderTopWidth: StyleSheet.hairlineWidth,
      backgroundColor: colors.background,
    },
    saveButton: {
      paddingVertical: 13,
      borderRadius: Radius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    saveText: {
      fontSize: FontSize.base,
      fontWeight: FontWeight.semibold,
    },
  });
}
