/**
 * DelegateServerListScreen — workspace-scoped DelegateAgentServer list.
 *
 * Behavior:
 *   - Loads `delegate-agent-servers` for the active workspace (falls back to
 *     the user-wide list when no workspace is selected).
 *   - Masks `apiToken` to the last 6 chars; never logs the raw value.
 *   - Subscribes to `agent.created / agent.updated / agent.message.new`
 *     LiveEvents and re-fetches with a 500ms debounce — no polling.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '../../contexts/AppContext';
import { useDelegateLiveEvents } from '../../contexts/DelegateLiveEventsContext';
import { useDelegateWorkspace } from '../../contexts/WorkspaceContext';
import { useNativeStackModalHeader } from '../../hooks/useNativeStackModalHeader';
import {
  Card,
  EmptyState,
  LoadingState,
  createListContentStyle,
} from '../../components/ui';
import { useAppTheme } from '../../theme';
import { FontSize, FontWeight, Radius, Space } from '../../theme/tokens';
import {
  listDelegateAgentServers,
  maskApiToken,
  type DelegateAgentServer,
} from '../../services/delegate-agent-servers';
import type { ConsoleStackParamList } from './ConsoleTab';

type Nav = NativeStackNavigationProp<ConsoleStackParamList, 'ConsoleMenu'>;

const REFRESH_DEBOUNCE_MS = 500;

export function DelegateServerListScreen(): React.JSX.Element {
  const { gateway } = useAppContext();
  const { activeWorkspace } = useDelegateWorkspace();
  const liveEvents = useDelegateLiveEvents();
  const { theme } = useAppTheme();
  const { t } = useTranslation('console');
  const navigation = useNavigation<Nav>();
  const styles = useMemo(() => createStyles(theme.colors), [theme]);

  const [servers, setServers] = useState<DelegateAgentServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const refreshDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useNativeStackModalHeader({
    navigation,
    title: t('Delegate Servers'),
    onClose: () => navigation.goBack(),
  });

  const load = useCallback(async (mode: 'initial' | 'refresh' | 'background') => {
    if (mode === 'initial') setLoading(true);
    if (mode === 'refresh') setRefreshing(true);
    try {
      const dc = gateway.getDelegateConfig();
      if (!dc) {
        setServers([]);
        setHasLoadedOnce(true);
        return;
      }
      const list = await listDelegateAgentServers(
        dc,
        activeWorkspace?.id ? { workspaceId: activeWorkspace.id } : undefined,
      );
      setServers(list);
      setHasLoadedOnce(true);
    } catch {
      // Empty state will render.
    } finally {
      if (mode === 'initial') setLoading(false);
      if (mode === 'refresh') setRefreshing(false);
    }
  }, [gateway, activeWorkspace?.id]);

  useFocusEffect(
    useCallback(() => {
      void load(hasLoadedOnce ? 'background' : 'initial');
    }, [hasLoadedOnce, load]),
  );

  useEffect(() => {
    const debounced = () => {
      if (refreshDebounceRef.current) clearTimeout(refreshDebounceRef.current);
      refreshDebounceRef.current = setTimeout(() => {
        void load('background');
      }, REFRESH_DEBOUNCE_MS);
    };
    const offs = [
      liveEvents.subscribe('agent.created', debounced),
      liveEvents.subscribe('agent.updated', debounced),
      liveEvents.subscribe('agent.message.new', debounced),
    ];
    return () => {
      offs.forEach((off) => off());
      if (refreshDebounceRef.current) {
        clearTimeout(refreshDebounceRef.current);
        refreshDebounceRef.current = null;
      }
    };
  }, [liveEvents, load]);

  const renderItem = ({ item }: { item: DelegateAgentServer }) => {
    const healthColor = item.health === 'healthy'
      ? theme.colors.success
      : item.health === 'unhealthy'
        ? theme.colors.error
        : theme.colors.textSubtle;
    const healthLabel = item.health === 'healthy'
      ? t('Healthy')
      : item.health === 'unhealthy'
        ? t('Unhealthy')
        : t('Unknown');
    return (
      <Card style={styles.card} testID={`delegate-server-row-${item.id}`}>
        <View style={styles.row}>
          <View style={styles.textWrap}>
            <View style={styles.titleRow}>
              <Text style={styles.title} numberOfLines={1}>{item.name}</Text>
              {item.isDefault ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{t('Default')}</Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.url} numberOfLines={1}>{item.url}</Text>
            <Text style={styles.meta} numberOfLines={1}>
              {t('Token')}: {maskApiToken(item.apiToken)}
              {' · '}
              {t('{{count}} agents', { count: item.agentProfileCount })}
            </Text>
          </View>
          <View style={[styles.healthDot, { backgroundColor: healthColor }]} />
          <Text style={[styles.healthLabel, { color: healthColor }]}>{healthLabel}</Text>
        </View>
      </Card>
    );
  };

  return (
    <View style={styles.root}>
      {loading ? (
        <LoadingState message={t('Loading servers...')} />
      ) : (
        <FlatList
          data={servers}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          testID="delegate-server-list"
          contentContainerStyle={[styles.content, { flexGrow: 1 }]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load('refresh')}
              tintColor={theme.colors.primary}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon="🛰️"
              title={t('No DelegateAgent servers')}
              subtitle={t('Servers connected to this workspace will appear here.')}
            />
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
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Space.sm,
    },
    textWrap: {
      flex: 1,
      minWidth: 0,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Space.sm,
    },
    title: {
      fontSize: FontSize.base,
      fontWeight: FontWeight.semibold,
      color: colors.text,
      flexShrink: 1,
    },
    url: {
      fontSize: FontSize.sm,
      color: colors.textMuted,
      marginTop: 2,
    },
    meta: {
      fontSize: FontSize.xs,
      color: colors.textSubtle,
      marginTop: 2,
    },
    badge: {
      borderRadius: Radius.sm,
      borderWidth: 1,
      borderColor: colors.borderStrong,
      backgroundColor: colors.surfaceMuted,
      paddingHorizontal: Space.sm,
      paddingVertical: 2,
    },
    badgeText: {
      color: colors.textMuted,
      fontSize: FontSize.xs,
      fontWeight: FontWeight.semibold,
    },
    healthDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    healthLabel: {
      fontSize: FontSize.sm,
      fontWeight: FontWeight.semibold,
    },
  });
}
