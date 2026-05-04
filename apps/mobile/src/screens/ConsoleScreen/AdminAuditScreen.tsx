/**
 * AdminAuditScreen — Phase 7 (AC-13).
 *
 * Paginated list of admin audit log entries. Backed by GET /api/admin/audit
 * (CS_ADMIN+ server-side).
 *
 * testIDs:
 *   - `admin-audit`
 *   - `admin-audit-list`
 *   - `admin-audit-row-{id}`
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
  listAdminAudit,
  type AdminAuditEntry,
} from '../../services/delegate-admin';
import { useAppTheme } from '../../theme';
import { FontSize, FontWeight, Space } from '../../theme/tokens';
import type { ConsoleStackParamList } from './ConsoleTab';

type AdminAuditNavigation = NativeStackNavigationProp<ConsoleStackParamList, 'AdminAudit'>;

const PAGE_SIZE = 50;

export function AdminAuditScreen(): React.JSX.Element {
  const navigation = useNavigation<AdminAuditNavigation>();
  const { gateway } = useAppContext();
  const { theme } = useAppTheme();
  const { t } = useTranslation('console');
  const styles = useMemo(() => createStyles(theme.colors), [theme]);

  const [rows, setRows] = useState<AdminAuditEntry[]>([]);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useNativeStackModalHeader({
    navigation,
    title: t('Audit'),
    onClose: () => navigation.goBack(),
  });

  const load = useCallback(
    async (mode: 'initial' | 'refresh' | 'more') => {
      const dc = gateway.getDelegateConfig();
      if (!dc) {
        setError(t('Delegate backend is not configured.'));
        setLoading(false);
        return;
      }
      const nextOffset = mode === 'more' ? offset + PAGE_SIZE : 0;
      if (mode === 'initial') setLoading(true);
      if (mode === 'refresh') setRefreshing(true);
      if (mode === 'more') setLoadingMore(true);
      try {
        const result = await listAdminAudit(dc, { limit: PAGE_SIZE, offset: nextOffset });
        setTotal(result.total);
        setOffset(nextOffset);
        setRows((prev) => (mode === 'more' ? [...prev, ...result.items] : result.items));
        setError(null);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : t('Failed to load audit log');
        setError(message);
      } finally {
        if (mode === 'initial') setLoading(false);
        if (mode === 'refresh') setRefreshing(false);
        if (mode === 'more') setLoadingMore(false);
      }
    },
    [gateway, offset, t],
  );

  useFocusEffect(
    useCallback(() => {
      void load('initial');
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [gateway]),
  );

  const renderItem = useCallback(
    ({ item }: { item: AdminAuditEntry }) => (
      <View style={styles.row} testID={`admin-audit-row-${item.id}`}>
        <Text style={styles.action} numberOfLines={1}>
          {item.action}
        </Text>
        <Text style={styles.sub} numberOfLines={1}>
          {item.adminEmail}
          {item.targetEmail ? ` → ${item.targetEmail}` : ''}
        </Text>
        <Text style={styles.timestamp}>{item.createdAt}</Text>
      </View>
    ),
    [styles],
  );

  const hasMore = rows.length < total;

  return (
    <View style={styles.root} testID="admin-audit">
      {loading ? (
        <LoadingState message={t('Loading audit log...')} />
      ) : error ? (
        <EmptyState icon="⚠️" title={t('Error')} subtitle={error} />
      ) : rows.length === 0 ? (
        <EmptyState icon="📜" title={t('No audit entries')} subtitle={t('Nothing to show.')} />
      ) : (
        <FlatList
          testID="admin-audit-list"
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
          onEndReachedThreshold={0.4}
          onEndReached={() => {
            if (!loadingMore && hasMore) {
              void load('more');
            }
          }}
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
      paddingHorizontal: Space.lg,
      paddingVertical: Space.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    action: {
      fontSize: FontSize.base,
      fontWeight: FontWeight.semibold,
      color: colors.text,
    },
    sub: {
      marginTop: 2,
      fontSize: FontSize.sm,
      color: colors.textMuted,
    },
    timestamp: {
      marginTop: 2,
      fontSize: FontSize.xs,
      color: colors.textSubtle,
    },
  });
}
