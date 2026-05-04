/**
 * AdminUsersScreen — Phase 7 (AC-13).
 *
 * Searchable list of Delegate users. Backed by GET /api/admin/users
 * (requires CS_AGENT+ server-side).
 *
 * testIDs:
 *   - `admin-users`
 *   - `admin-users-search`
 *   - `admin-users-list`
 *   - `admin-users-row-{id}`
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { EmptyState, LoadingState } from '../../components/ui';
import { useAppContext } from '../../contexts/AppContext';
import { useNativeStackModalHeader } from '../../hooks/useNativeStackModalHeader';
import {
  listAdminUsers,
  type AdminUserRow,
} from '../../services/delegate-admin';
import { useAppTheme } from '../../theme';
import { FontSize, FontWeight, Radius, Space } from '../../theme/tokens';
import type { ConsoleStackParamList } from './ConsoleTab';

type AdminUsersNavigation = NativeStackNavigationProp<ConsoleStackParamList, 'AdminUsers'>;

export function AdminUsersScreen(): React.JSX.Element {
  const navigation = useNavigation<AdminUsersNavigation>();
  const { gateway } = useAppContext();
  const { theme } = useAppTheme();
  const { t } = useTranslation('console');
  const styles = useMemo(() => createStyles(theme.colors), [theme]);

  const [query, setQuery] = useState('');
  const [rows, setRows] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useNativeStackModalHeader({
    navigation,
    title: t('Users'),
    onClose: () => navigation.goBack(),
  });

  const load = useCallback(
    async (mode: 'initial' | 'refresh', q?: string) => {
      const dc = gateway.getDelegateConfig();
      if (!dc) {
        setError(t('Delegate backend is not configured.'));
        setLoading(false);
        return;
      }
      if (mode === 'initial') setLoading(true);
      if (mode === 'refresh') setRefreshing(true);
      try {
        const result = await listAdminUsers(dc, { limit: 50, q: q ?? undefined });
        setRows(result.items);
        setError(null);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : t('Failed to load users');
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
      void load('initial', query);
    }, [load, query]),
  );

  const handleSearchSubmit = useCallback(() => {
    void load('refresh', query);
  }, [load, query]);

  const renderItem = useCallback(
    ({ item }: { item: AdminUserRow }) => (
      <View style={styles.row} testID={`admin-users-row-${item.id}`}>
        <View style={styles.rowMain}>
          <Text style={styles.email} numberOfLines={1}>
            {item.email ?? '(no email)'}
          </Text>
          <Text style={styles.name} numberOfLines={1}>
            {item.name ?? t('(no name)')}
          </Text>
        </View>
        <View style={styles.badges}>
          {item.adminRole ? (
            <Text style={[styles.badge, styles.badgeRole]}>{item.adminRole}</Text>
          ) : null}
          {item.isDisabled ? (
            <Text style={[styles.badge, styles.badgeDisabled]}>{t('Disabled')}</Text>
          ) : null}
        </View>
      </View>
    ),
    [styles, t],
  );

  return (
    <View style={styles.root} testID="admin-users">
      <View style={styles.searchRow}>
        <TextInput
          testID="admin-users-search"
          style={styles.search}
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={handleSearchSubmit}
          placeholder={t('Search users…')}
          placeholderTextColor={theme.colors.textSubtle}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
      </View>
      {loading ? (
        <LoadingState message={t('Loading users...')} />
      ) : error ? (
        <EmptyState icon="⚠️" title={t('Error')} subtitle={error} />
      ) : rows.length === 0 ? (
        <EmptyState icon="👤" title={t('No users')} subtitle={t('No results for this query.')} />
      ) : (
        <FlatList
          testID="admin-users-list"
          data={rows}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load('refresh', query)}
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
    searchRow: {
      padding: Space.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.surface,
    },
    search: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: Radius.md,
      paddingHorizontal: Space.md,
      paddingVertical: 10,
      color: colors.text,
      fontSize: FontSize.base,
      backgroundColor: colors.background,
    },
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
    email: {
      fontSize: FontSize.base,
      color: colors.text,
      fontWeight: FontWeight.semibold,
    },
    name: {
      marginTop: 2,
      fontSize: FontSize.sm,
      color: colors.textMuted,
    },
    badges: {
      flexDirection: 'row',
      gap: Space.xs,
    },
    badge: {
      fontSize: FontSize.xs,
      fontWeight: FontWeight.semibold,
      paddingHorizontal: Space.sm,
      paddingVertical: 2,
      borderRadius: Radius.sm,
      overflow: 'hidden',
    },
    badgeRole: {
      color: colors.primaryText,
      backgroundColor: colors.primary,
    },
    badgeDisabled: {
      color: colors.error,
      backgroundColor: colors.surface,
    },
  });
}
