import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { fetchDelegateProgress, type DelegateConnectionConfig } from '../../../services/delegate-http-adapter';
import { useAppTheme } from '../../../theme';
import { FontSize, FontWeight, Radius, Space } from '../../../theme/tokens';

type ProgressEvent = {
  id: string;
  stage?: string;
  message?: string;
  timestamp: string;
};

type Props = {
  jid: string;
  config: DelegateConnectionConfig | null;
  isRunActive: boolean;
};

const PROGRESS_POLL_INTERVAL_MS = 2_500;

/**
 * Phase 2 — AC-2 progress strip.
 *
 * While `isRunActive` is true, polls `/api/agent/channel/progress` every
 * 2.5s and renders the most recent event's `stage · message`. This is the
 * Clawket-wide explicit carve-out to the "no sub-second polling" rule —
 * the progress stream IS the realtime surface for an active agent run.
 *
 * When `isRunActive` flips to false (run finished / aborted) the strip
 * hides itself and stops the interval. When the run is not active, the
 * strip also hides (it has no value without a running agent).
 */
export function ChatProgressStrip({ jid, config, isRunActive }: Props): React.JSX.Element | null {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme.colors), [theme]);
  const [latestEvent, setLatestEvent] = useState<ProgressEvent | null>(null);
  const latestTimestampRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isRunActive || !config || !jid) {
      // Stop polling + clear latest event so the strip hides once the run
      // completes. We intentionally reset between runs so stale progress
      // from a previous task doesn't leak into a fresh one.
      setLatestEvent(null);
      latestTimestampRef.current = null;
      return;
    }

    let cancelled = false;

    async function poll(): Promise<void> {
      if (!config) return;
      try {
        const result = await fetchDelegateProgress(
          config,
          jid,
          latestTimestampRef.current ?? undefined,
        );
        if (cancelled) return;
        const events = Array.isArray(result?.events) ? result.events : [];
        if (events.length > 0) {
          const last = events[events.length - 1] as ProgressEvent;
          setLatestEvent(last);
          latestTimestampRef.current = last.timestamp ?? latestTimestampRef.current;
        }
      } catch {
        // Swallow errors silently — progress is advisory. A transient
        // network blip should not tear down the chat screen or the poll.
      }
    }

    // Kick off an immediate fetch so the strip can appear within a second
    // of send, then continue polling at the sanctioned interval.
    void poll();
    // poll-interval-ok: chat progress stream (AC-17 exception)
    const interval = setInterval(() => void poll(), PROGRESS_POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [isRunActive, config, jid]);

  if (!latestEvent) return null;

  const stage = latestEvent.stage?.trim();
  const message = latestEvent.message?.trim();
  if (!stage && !message) return null;

  const label = stage && message ? `${stage} · ${message}` : (stage || message || '');

  return (
    <View style={styles.container} testID="chat-progress-strip">
      <View style={styles.pill}>
        <View style={styles.dot} />
        <Text style={styles.text} numberOfLines={1} ellipsizeMode="tail">
          {label}
        </Text>
      </View>
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useAppTheme>['theme']['colors']) {
  return StyleSheet.create({
    container: {
      alignItems: 'stretch',
      paddingHorizontal: Space.md,
      paddingVertical: Space.xs,
    },
    pill: {
      alignItems: 'center',
      backgroundColor: colors.surfaceMuted,
      borderColor: colors.border,
      borderRadius: Radius.full,
      borderWidth: 1,
      flexDirection: 'row',
      paddingHorizontal: Space.sm,
      paddingVertical: 4,
    },
    dot: {
      backgroundColor: colors.primary,
      borderRadius: Radius.full,
      height: 6,
      marginRight: Space.xs + 2,
      width: 6,
    },
    text: {
      color: colors.textMuted,
      flexShrink: 1,
      fontSize: FontSize.xs,
      fontWeight: FontWeight.medium,
    },
  });
}
