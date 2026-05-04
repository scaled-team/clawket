/**
 * CreateBoardMeetingScreen — Phase 6 (AC-10).
 *
 * Form scaffold for creating a new board meeting. The Delegate API route
 * `POST /api/board-meetings` exists server-side, but the Phase 1 adapter
 * `services/delegate-board-meetings.ts` does not yet export a
 * `createBoardMeeting` wrapper. Per the Phase 6 plan, we ship the form
 * + testIDs with the Save button disabled; wiring the adapter is deferred
 * to Phase 7 (any remaining Delegate-side gaps).
 *
 * testIDs:
 *   - `create-board-meeting`                — root
 *   - `create-board-meeting-name-input`     — title field
 *   - `create-board-meeting-description-input`
 *   - `create-board-meeting-schedule-input` — ISO date string (scaffold)
 *   - `create-board-meeting-submit`         — Save button (disabled until adapter exists)
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '../../contexts/AppContext';
import { useNativeStackModalHeader } from '../../hooks/useNativeStackModalHeader';
import { createBoardMeeting } from '../../services/delegate-board-meetings';
import { useAppTheme } from '../../theme';
import { FontSize, FontWeight, Radius, Space } from '../../theme/tokens';
import type { ConsoleStackParamList } from './ConsoleTab';

type CreateBoardMeetingNavigation = NativeStackNavigationProp<
  ConsoleStackParamList,
  'CreateBoardMeeting'
>;

export function CreateBoardMeetingScreen(): React.JSX.Element {
  const navigation = useNavigation<CreateBoardMeetingNavigation>();
  const { gateway } = useAppContext();
  const { theme } = useAppTheme();
  const { t } = useTranslation('console');
  const { t: tCommon } = useTranslation('common');
  const styles = useMemo(() => createStyles(theme.colors), [theme]);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [schedule, setSchedule] = useState('');
  const [saving, setSaving] = useState(false);

  useNativeStackModalHeader({
    navigation,
    title: t('New Board Meeting'),
    onClose: () => navigation.goBack(),
  });

  const canSubmit = title.trim().length > 0 && !saving;

  // workspace-scope: not-scoped (write path) — POST /api/board-meetings
  // resolves the owner workspace server-side from the authenticated user.
  // Adding workspaceId on the wire would require schema + API changes that
  // are out of scope for Phase B.
  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;
    const dc = gateway.getDelegateConfig();
    if (!dc) {
      Alert.alert(tCommon('Error'), t('Delegate backend is not configured.'));
      return;
    }
    setSaving(true);
    try {
      await createBoardMeeting(dc, {
        title: title.trim(),
        description: description.trim() || undefined,
        scheduledAt: schedule.trim() || undefined,
      });
      navigation.goBack();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('Failed to create meeting');
      Alert.alert(tCommon('Error'), message);
    } finally {
      setSaving(false);
    }
  }, [canSubmit, description, gateway, navigation, schedule, t, tCommon, title]);

  return (
    <View style={styles.root} testID="create-board-meeting">
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.fieldLabel}>{t('Title')}</Text>
        <TextInput
          testID="create-board-meeting-name-input"
          style={styles.textInput}
          value={title}
          onChangeText={setTitle}
          placeholder={t('Meeting title')}
          placeholderTextColor={theme.colors.textSubtle}
          autoCapitalize="sentences"
          autoCorrect
        />

        <Text style={styles.fieldLabel}>{t('Description')}</Text>
        <TextInput
          testID="create-board-meeting-description-input"
          style={[styles.textInput, styles.multiline]}
          value={description}
          onChangeText={setDescription}
          placeholder={t('Agenda / background')}
          placeholderTextColor={theme.colors.textSubtle}
          multiline
          numberOfLines={4}
        />

        <Text style={styles.fieldLabel}>{t('Scheduled for (ISO)')}</Text>
        <TextInput
          testID="create-board-meeting-schedule-input"
          style={styles.textInput}
          value={schedule}
          onChangeText={setSchedule}
          placeholder="2026-05-01T14:00:00Z"
          placeholderTextColor={theme.colors.textSubtle}
          autoCapitalize="none"
          autoCorrect={false}
        />

        <TouchableOpacity
          testID="create-board-meeting-submit"
          accessibilityState={{ disabled: !canSubmit }}
          disabled={!canSubmit}
          onPress={handleSubmit}
          style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
        >
          <Text style={styles.submitText}>{saving ? t('Saving…') : t('Save')}</Text>
        </TouchableOpacity>

        <Text style={styles.helperText}>
          {t('Creates a new board meeting via POST /api/board-meetings.')}
        </Text>
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
    fieldLabel: {
      color: colors.textMuted,
      fontSize: FontSize.sm,
      fontWeight: FontWeight.semibold,
      marginTop: Space.md,
      marginBottom: Space.xs,
    },
    textInput: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: Radius.md,
      paddingHorizontal: Space.md,
      paddingVertical: 10,
      color: colors.text,
      fontSize: FontSize.md,
      backgroundColor: colors.surface,
    },
    multiline: {
      minHeight: 96,
      textAlignVertical: 'top',
    },
    submitButton: {
      marginTop: Space.lg,
      backgroundColor: colors.primary,
      borderRadius: Radius.md,
      paddingVertical: Space.md,
      alignItems: 'center',
    },
    submitButtonDisabled: {
      opacity: 0.5,
    },
    submitText: {
      color: colors.primaryText,
      fontSize: FontSize.base,
      fontWeight: FontWeight.semibold,
    },
    helperText: {
      color: colors.textMuted,
      fontSize: FontSize.sm,
      marginTop: Space.md,
    },
  });
}
