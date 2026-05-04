/**
 * WorkspaceSwitcher — chip + ModalSheet picker for the active Delegate
 * workspace. Inert when the backend is not Delegate or when no workspaces
 * are loaded (returns null), so OpenClaw and Hermes screens never render
 * this surface.
 */

import React, { useMemo, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react-native';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ModalSheet } from '../ui';
import { useAppTheme } from '../../theme';
import { FontSize, FontWeight, Radius, Space } from '../../theme/tokens';
import { useDelegateWorkspace } from '../../contexts/WorkspaceContext';

export function WorkspaceSwitcher(): React.JSX.Element | null {
  const { theme } = useAppTheme();
  const { t } = useTranslation('console');
  const { workspaces, activeWorkspace, setActiveWorkspaceId } = useDelegateWorkspace();
  const [open, setOpen] = useState(false);
  const styles = useMemo(() => createStyles(theme.colors), [theme]);

  if (workspaces.length === 0) return null;

  const label = activeWorkspace?.name ?? t('Select Workspace');
  const icon = activeWorkspace?.icon ?? '🏢';

  return (
    <View style={styles.wrap}>
      <TouchableOpacity
        accessibilityRole="button"
        testID="workspace-switcher-chip"
        style={styles.chip}
        onPress={() => setOpen(true)}
        activeOpacity={0.7}
      >
        <Text style={styles.chipIcon}>{icon}</Text>
        <Text style={styles.chipLabel} numberOfLines={1}>{label}</Text>
        <ChevronDown size={14} color={theme.colors.textMuted} strokeWidth={2} />
      </TouchableOpacity>
      <ModalSheet
        visible={open}
        onClose={() => setOpen(false)}
        title={t('Workspace')}
        maxHeight="60%"
      >
        <ScrollView contentContainerStyle={styles.list}>
          {workspaces.map((ws) => {
            const isActive = ws.id === activeWorkspace?.id;
            return (
              <TouchableOpacity
                key={ws.id}
                testID={`workspace-switcher-row-${ws.id}`}
                style={styles.row}
                onPress={() => {
                  setActiveWorkspaceId(ws.id);
                  setOpen(false);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.rowIcon}>{ws.icon ?? '🏢'}</Text>
                <View style={styles.rowText}>
                  <Text style={styles.rowName} numberOfLines={1}>{ws.name}</Text>
                  <Text style={styles.rowMeta} numberOfLines={1}>
                    {ws.isOwner ? t('Owner') : (ws.role ?? t('Member'))}
                    {' · '}
                    {t('{{count}} members', { count: ws.memberCount })}
                  </Text>
                </View>
                {isActive ? (
                  <Check size={18} color={theme.colors.primary} strokeWidth={2.5} />
                ) : null}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </ModalSheet>
    </View>
  );
}

function createStyles(colors: ReturnType<typeof import('../../theme').useAppTheme>['theme']['colors']) {
  return StyleSheet.create({
    wrap: {
      paddingHorizontal: Space.lg,
      paddingTop: Space.sm,
      paddingBottom: Space.sm,
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: Space.sm,
      paddingHorizontal: Space.md,
      paddingVertical: Space.sm,
      backgroundColor: colors.surface,
      borderRadius: Radius.full,
      borderWidth: 1,
      borderColor: colors.border,
      maxWidth: '100%',
    },
    chipIcon: {
      fontSize: FontSize.base,
    },
    chipLabel: {
      fontSize: FontSize.md,
      fontWeight: FontWeight.semibold,
      color: colors.text,
      flexShrink: 1,
    },
    list: {
      paddingVertical: Space.sm,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Space.md,
      paddingHorizontal: Space.lg,
      paddingVertical: Space.md,
    },
    rowIcon: {
      fontSize: FontSize.xxl,
    },
    rowText: {
      flex: 1,
      minWidth: 0,
    },
    rowName: {
      fontSize: FontSize.base,
      fontWeight: FontWeight.semibold,
      color: colors.text,
    },
    rowMeta: {
      fontSize: FontSize.sm,
      color: colors.textMuted,
      marginTop: 2,
    },
  });
}
