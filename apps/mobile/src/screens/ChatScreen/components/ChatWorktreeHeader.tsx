import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { fetchDelegateWorktree, type DelegateConnectionConfig } from '../../../services/delegate-http-adapter';
import { useAppTheme } from '../../../theme';
import { FontSize, FontWeight, Radius, Space } from '../../../theme/tokens';

type WorktreeInfo = {
  repo?: string;
  branch?: string;
  commit?: string;
  dirty?: boolean;
};

type Props = {
  jid: string;
  config: DelegateConnectionConfig | null;
  enabled: boolean;
};

/**
 * Phase 2 — AC-2 worktree header.
 *
 * Fetches `/api/agent/channel/worktree` once on mount (no polling — worktree
 * metadata changes rarely enough that a pull-to-refresh on the chat list is
 * sufficient to rehydrate). Renders a single pill with `{branch} · {commit} ·
 * {clean|dirty}`. Hides itself when the backend returns no data (null or
 * missing branch).
 */
export function ChatWorktreeHeader({ jid, config, enabled }: Props): React.JSX.Element | null {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme.colors), [theme]);
  const [worktree, setWorktree] = useState<WorktreeInfo | null>(null);

  useEffect(() => {
    if (!enabled || !config || !jid) {
      setWorktree(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const result = await fetchDelegateWorktree(config, jid);
        if (!cancelled) setWorktree(result ?? null);
      } catch {
        // Silent — a missing worktree is a non-fatal signal; the header just
        // stays hidden. Network/server errors don't block the chat itself.
        if (!cancelled) setWorktree(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled, config, jid]);

  if (!worktree || !worktree.branch) return null;

  const commitShort = worktree.commit ? worktree.commit.slice(0, 7) : '';
  const dirtyLabel = worktree.dirty ? 'dirty' : 'clean';
  const parts = [worktree.branch, commitShort, dirtyLabel].filter(Boolean);

  return (
    <View style={styles.container} testID="chat-worktree-header">
      <View style={styles.pill}>
        <Text style={styles.text} numberOfLines={1} ellipsizeMode="middle">
          {parts.join(' · ')}
        </Text>
      </View>
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useAppTheme>['theme']['colors']) {
  return StyleSheet.create({
    container: {
      alignItems: 'flex-start',
      paddingHorizontal: Space.md,
      paddingVertical: Space.xs,
    },
    pill: {
      backgroundColor: colors.surfaceMuted,
      borderColor: colors.border,
      borderRadius: Radius.full,
      borderWidth: 1,
      paddingHorizontal: Space.sm,
      paddingVertical: 4,
    },
    text: {
      color: colors.textMuted,
      fontSize: FontSize.xs,
      fontWeight: FontWeight.medium,
    },
  });
}
