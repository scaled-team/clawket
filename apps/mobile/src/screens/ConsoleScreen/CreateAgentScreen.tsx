import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { EmptyState, LoadingState } from '../../components/ui';
import { useAppContext } from '../../contexts/AppContext';
import { useDelegateWorkspace } from '../../contexts/WorkspaceContext';
import { useNativeStackModalHeader } from '../../hooks/useNativeStackModalHeader';
import {
  createAgentFromTemplate,
  listAgentTemplates,
  type AgentTemplateRow,
} from '../../services/delegate-agents';
import { useAppTheme } from '../../theme';
import { FontSize, FontWeight, Radius, Space } from '../../theme/tokens';
import type { ConsoleStackParamList } from './ConsoleTab';

type CreateAgentNavigation = NativeStackNavigationProp<ConsoleStackParamList, 'CreateAgent'>;

/**
 * Create a DelegateAgent profile by picking a template and choosing a name.
 * Backed by GET /api/agents/templates + POST /api/agents/from-template.
 *
 * Only rendered for the Delegate backend (the OpenClaw path uses CreateAgentModal).
 */
export function CreateAgentScreen(): React.JSX.Element {
  const { gateway } = useAppContext();
  const { activeWorkspace } = useDelegateWorkspace();
  const navigation = useNavigation<CreateAgentNavigation>();
  const { theme } = useAppTheme();
  const { t } = useTranslation('console');
  const { t: tCommon } = useTranslation('common');
  const styles = useMemo(() => createStyles(theme.colors), [theme]);

  const [templates, setTemplates] = useState<AgentTemplateRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useNativeStackModalHeader({
    navigation,
    title: t('Create Agent'),
    onClose: () => navigation.goBack(),
  });

  const loadTemplates = useCallback(async () => {
    const dc = gateway.getDelegateConfig();
    if (!dc) {
      setError(t('Delegate backend is not configured.'));
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { templates: rows } = await listAgentTemplates(
        dc,
        activeWorkspace?.id ? { workspaceId: activeWorkspace.id } : undefined,
      );
      setTemplates(rows);
      if (rows.length > 0 && !selectedId) {
        setSelectedId(rows[0].id);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('Failed to load templates');
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [gateway, selectedId, t, activeWorkspace?.id]);

  useEffect(() => {
    void loadTemplates();
  }, [loadTemplates]);

  const handleSubmit = useCallback(async () => {
    const trimmed = name.trim();
    if (!selectedId) {
      Alert.alert(tCommon('Error'), t('Please select a template.'));
      return;
    }
    if (!trimmed) {
      Alert.alert(tCommon('Error'), t('Please enter a name for the agent.'));
      return;
    }
    const dc = gateway.getDelegateConfig();
    if (!dc) {
      Alert.alert(tCommon('Error'), t('Delegate backend is not configured.'));
      return;
    }
    setSubmitting(true);
    try {
      await createAgentFromTemplate(dc, selectedId, trimmed);
      // Navigate back to the list; AgentListScreen re-fetches on focus.
      navigation.goBack();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('Failed to create agent');
      Alert.alert(tCommon('Error'), message);
    } finally {
      setSubmitting(false);
    }
  }, [gateway, name, navigation, selectedId, t, tCommon]);

  const renderTemplate = ({ item }: { item: AgentTemplateRow }) => {
    const isSelected = item.id === selectedId;
    return (
      <Pressable
        testID={`create-agent-template-${item.id}`}
        onPress={() => setSelectedId(item.id)}
        style={({ pressed }) => [
          styles.templateCard,
          {
            backgroundColor: isSelected ? theme.colors.primarySoft : theme.colors.surface,
            borderColor: isSelected ? theme.colors.primary : theme.colors.border,
            opacity: pressed ? 0.9 : 1,
          },
        ]}
      >
        <View style={styles.templateHeader}>
          <Text
            style={[
              styles.templateName,
              { color: isSelected ? theme.colors.primary : theme.colors.text },
            ]}
            numberOfLines={1}
          >
            {item.name}
          </Text>
          {item.category ? (
            <View style={[styles.categoryBadge, { backgroundColor: theme.colors.surfaceMuted }]}>
              <Text style={[styles.categoryBadgeText, { color: theme.colors.textMuted }]}>
                {item.category}
              </Text>
            </View>
          ) : null}
        </View>
        {item.role ? (
          <Text style={[styles.templateRole, { color: theme.colors.textMuted }]} numberOfLines={1}>
            {item.role}
          </Text>
        ) : null}
        {item.description ? (
          <Text
            style={[styles.templateDescription, { color: theme.colors.textMuted }]}
            numberOfLines={3}
          >
            {item.description}
          </Text>
        ) : null}
      </Pressable>
    );
  };

  if (loading) {
    return (
      <View style={styles.root}>
        <LoadingState message={t('Loading templates...')} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <FlatList
        data={templates}
        keyExtractor={(item) => item.id}
        renderItem={renderTemplate}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <>
            {error ? (
              <Text style={[styles.errorText, { color: theme.colors.error }]}>{error}</Text>
            ) : null}
            <Text style={styles.fieldLabel}>{t('Name')}</Text>
            <View style={styles.fieldRow}>
              <TextInput
                testID="create-agent-name-input"
                style={styles.textInput}
                value={name}
                onChangeText={setName}
                placeholder={t('Agent name')}
                placeholderTextColor={theme.colors.textSubtle}
                editable={!submitting}
                maxLength={50}
                autoCapitalize="words"
                autoCorrect={false}
              />
            </View>
            <Text style={styles.sectionLabel}>{t('Template')}</Text>
          </>
        }
        ListEmptyComponent={
          !error ? <EmptyState icon="📋" title={t('No templates available')} /> : null
        }
      />
      <View style={styles.footer}>
        <TouchableOpacity
          testID="create-agent-submit"
          style={[
            styles.submitButton,
            (!selectedId || submitting || !name.trim()) && styles.buttonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={!selectedId || submitting || !name.trim()}
          activeOpacity={0.85}
        >
          {submitting ? (
            <ActivityIndicator color={theme.colors.primaryText} />
          ) : (
            <Text style={styles.submitButtonText}>{t('Create Agent')}</Text>
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
    listContent: {
      padding: Space.lg,
      paddingBottom: Space.xxxl + 80,
    },
    errorText: {
      fontSize: FontSize.sm,
      lineHeight: 18,
      marginBottom: Space.md,
    },
    fieldLabel: {
      fontSize: FontSize.md,
      fontWeight: FontWeight.medium,
      color: colors.textMuted,
      marginBottom: Space.xs,
    },
    fieldRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.inputBackground,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: Radius.md,
      paddingHorizontal: Space.md,
      paddingVertical: Space.sm + 4,
    },
    textInput: {
      flex: 1,
      fontSize: FontSize.base,
      color: colors.text,
      paddingVertical: 0,
    },
    sectionLabel: {
      fontSize: FontSize.md,
      fontWeight: FontWeight.semibold,
      color: colors.text,
      marginTop: Space.lg,
      marginBottom: Space.sm,
    },
    templateCard: {
      borderWidth: 1,
      borderRadius: Radius.md,
      padding: Space.md,
      marginBottom: Space.sm,
      gap: 4,
    },
    templateHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: Space.sm,
    },
    templateName: {
      flex: 1,
      fontSize: FontSize.base,
      fontWeight: FontWeight.semibold,
    },
    categoryBadge: {
      borderRadius: Radius.full,
      paddingHorizontal: Space.sm,
      paddingVertical: 2,
    },
    categoryBadgeText: {
      fontSize: FontSize.xs,
      fontWeight: FontWeight.medium,
    },
    templateRole: {
      fontSize: FontSize.sm,
      fontWeight: FontWeight.medium,
    },
    templateDescription: {
      fontSize: FontSize.sm,
      lineHeight: 18,
      marginTop: 2,
    },
    footer: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      padding: Space.lg,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
      backgroundColor: colors.background,
    },
    submitButton: {
      backgroundColor: colors.primary,
      borderRadius: Radius.md,
      paddingVertical: 13,
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonDisabled: {
      opacity: 0.55,
    },
    submitButtonText: {
      color: colors.primaryText,
      fontSize: FontSize.base,
      fontWeight: FontWeight.semibold,
    },
  });
}
