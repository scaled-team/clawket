/**
 * AdminWorkspacesScreen — Phase 7 (AC-13).
 *
 * Paginated list of workspaces with entitlement/tier/member info.
 * Backed by GET /api/admin/workspaces (CS_AGENT+).
 *
 * testIDs:
 *   - `admin-workspaces`
 *   - `admin-workspaces-list`
 *   - `admin-workspaces-row-{id}`
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { EmptyState, LoadingState } from '../../components/ui';
import { useAppContext } from '../../contexts/AppContext';
import { useNativeStackModalHeader } from '../../hooks/useNativeStackModalHeader';
import {
  listAdminWorkspaces,
  type AdminWorkspaceRow,
} from '../../services/delegate-admin';
import { useAppTheme } from '../../theme';
import { FontSize, FontWeight, Radius, Space } from '../../theme/tokens';
import type { ConsoleStackParamList } from './ConsoleTab';

type AdminWorkspacesNavigation = NativeStackNavigationProp<
  ConsoleStackParamList,
  'AdminWorkspaces'
>;

export function AdminWorkspacesScreen(): React.JSX.Element {
  const navigation = useNavigation<AdminWorkspacesNavigation>();
  const { gateway } = useAppContext();
  const { theme } = useAppTheme();
  const { t } = useTranslation('console');
  const styles = useMemo(() => createStyles(theme.colors), [theme]);

  const [rows, setRows] = useState<AdminWorkspaceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useNativeStackModalHeader({
    navigation,
    title: t('Workspaces'),
    onClose: () => navigation.goBack(),
  });

  const load = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      const dc = gateway.getDelegateConfig();
      if (!dc) {
        setError(t('Delegate backend is not configured.'));
        setLoading(false);
        return;
      }
      if (mode === 'initial') setLoading(true);
      if (mode === 'refresh') setRefreshing(true);
      try {
        const result = await listAdminWorkspaces(dc, { limit: 50 });
        setRows(result.items);
        setError(null);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : t('Failed to load workspaces');
        setError(message);
      } finally {
        if (mode === 'initial') setLoading(false);
        if (mode === 'refresh') setRefreshing(false);
      }
    },
    [gateway, t],
  );

  useFocusEffect(
    useCallback(() => {
      void load('initial');
    }, [load]),
  );

  const renderItem = useCallback(
    ({ item }: { item: AdminWorkspaceRow }) => {
      const tier = item.entitlement?.tier ?? t('No tier');
      const members = item._count?.members ?? 0;
      return (
        <View style={styles.row} testID={`admin-workspaces-row-${item.id}`}>
          <View style={styles.rowMain}>
            <Text style={styles.name} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.sub} numberOfLines={1}>
              {item.slug ?? item.id}
              {' · '}
              {t('{{count}} members', { count: members })}
            </Text>
          </View>
          <Text style={styles.tier}>{tier}</Text>
        </View>
      );
    },
    [styles, t],
  );

  return (
    <View style={styles.root} testID="admin-workspaces">
      {loading ? (
        <LoadingState message={t('Loading workspaces...')} />
      ) : error ? (
        <EmptyState icon="⚠️" title={t('Error')} subtitle={error} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon="🏢"
          title={t('No workspaces')}
          subtitle={t('No workspaces exist yet.')}
        />
      ) : (
        <FlatList
          testID="admin-workspaces-list"
          data={rows}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load('refresh')}
              tintColor={theme.colors.primary}
            />
          }
        />
      )}
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useAppTheme>['theme']['colors']) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    listContent: { paddingBottom: Space.xxxl },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: Space.lg,
      paddingVertical: Space.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    rowMain: { flex: 1 },
    name: {
      fontSize: FontSize.base,
      color: colors.text,
      fontWeight: FontWeight.semibold,
    },
    sub: {
      marginTop: 2,
      fontSize: FontSize.sm,
      color: colors.textMuted,
    },
    tier: {
      fontSize: FontSize.xs,
      fontWeight: FontWeight.semibold,
      color: colors.primaryText,
      backgroundColor: colors.primary,
      paddingHorizontal: Space.sm,
      paddingVertical: 2,
      borderRadius: Radius.sm,
      overflow: 'hidden',
    },
  });
}
