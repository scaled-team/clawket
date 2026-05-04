/**
 * Pure presentational run-history list, reused by both the OpenClaw and
 * Delegate detail views. Callers pass pre-fetched runs + an optional
 * `onRefresh` callback (pull-to-refresh is wired in the parent).
 *
 * testIDs:
 *   - `cron-run-row-{id}`   → one per run row (id = runId or runAtMs)
 *   - `cron-run-list-refresh` → refresh button
 */

import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '../../../theme';
import { FontSize, FontWeight, Radius, Space } from '../../../theme/tokens';
import type { CronRunLogEntry } from '../../../types';
import { formatDurationMs, formatRunStatusSymbol, formatTimestamp } from '../../../utils/cron';

type CronRunListProps = {
  runs: CronRunLogEntry[];
  onRefresh?: () => void;
};

function runKey(run: CronRunLogEntry): string {
  return String(run.runAtMs ?? run.ts ?? `${run.jobId}-${run.action}`);
}

export function CronRunList({ runs, onRefresh }: CronRunListProps): React.JSX.Element {
  const { theme } = useAppTheme();
  const { t } = useTranslation('console');
  const styles = useMemo(() => createStyles(theme.colors), [theme]);

  return (
    <View style={styles.root} testID="cron-run-list">
      {onRefresh ? (
        <TouchableOpacity
          testID="cron-run-list-refresh"
          accessibilityRole="button"
          style={styles.refresh}
          onPress={onRefresh}
          activeOpacity={0.7}
        >
          <Text style={styles.refreshText}>{t('common:Refresh')}</Text>
        </TouchableOpacity>
      ) : null}
      {runs.length === 0 ? (
        <View style={styles.empty} testID="cron-run-list-empty">
          <Text style={styles.emptyText}>{t('No runs yet.')}</Text>
        </View>
      ) : (
        runs.map((run) => {
          const key = runKey(run);
          const statusColor = run.status === 'ok'
            ? theme.colors.success
            : run.status === 'error'
              ? theme.colors.error
              : theme.colors.textSubtle;
          return (
            <View key={key} style={styles.row} testID={`cron-run-row-${key}`}>
              <View style={styles.rowHead}>
                <Text style={styles.time}>{formatTimestamp(run.ts)}</Text>
                <Text style={[styles.status, { color: statusColor }]}>
                  {formatRunStatusSymbol(run.status)} {run.status ?? 'unknown'}
                </Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>{t('Duration')}</Text>
                <Text style={styles.metaValue}>{formatDurationMs(run.durationMs)}</Text>
              </View>
              {run.error ? (
                <Text style={styles.error} numberOfLines={2}>{run.error}</Text>
              ) : null}
            </View>
          );
        })
      )}
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useAppTheme>['theme']['colors']) {
  return StyleSheet.create({
    root: { gap: Space.sm },
    refresh: {
      alignSelf: 'flex-end',
      paddingHorizontal: Space.sm,
      paddingVertical: 4,
      borderRadius: Radius.sm,
      borderWidth: 1,
      borderColor: colors.border,
    },
    refreshText: {
      color: colors.primary,
      fontSize: FontSize.sm,
      fontWeight: FontWeight.semibold,
    },
    empty: {
      paddingVertical: Space.lg,
      alignItems: 'center',
    },
    emptyText: {
      color: colors.textMuted,
      fontSize: FontSize.md,
    },
    row: {
      borderRadius: Radius.sm + 2,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceMuted,
      padding: Space.md - 2,
      gap: 6,
    },
    rowHead: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: Space.sm,
    },
    time: {
      color: colors.text,
      fontSize: FontSize.sm,
      fontWeight: FontWeight.semibold,
      flex: 1,
    },
    status: {
      fontSize: FontSize.xs,
      fontWeight: FontWeight.bold,
      textTransform: 'lowercase',
    },
    metaRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: Space.sm,
    },
    metaLabel: {
      color: colors.textSubtle,
      fontSize: FontSize.sm,
    },
    metaValue: {
      color: colors.textMuted,
      fontSize: FontSize.sm,
    },
    error: {
      color: colors.error,
      fontSize: FontSize.sm,
    },
  });
}
