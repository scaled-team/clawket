/**
 * AdminMenuScreen — Phase 7 (AC-13).
 *
 * Mobile admin command-center landing. Fetches /api/users/me to read the
 * current user's `adminRole` and filters the admin menu entries per role:
 *   - Users:      CS_AGENT+
 *   - Workspaces: CS_AGENT+
 *   - Billing:    CS_ADMIN+
 *   - Audit:      CS_ADMIN+
 *   - Sessions:   CS_ADMIN+ (route also requires SUPER_ADMIN server-side)
 *
 * Non-admins see a gated empty state.
 *
 * testIDs:
 *   - `admin-menu`
 *   - `admin-menu-item-AdminUsers`
 *   - `admin-menu-item-AdminWorkspaces`
 *   - `admin-menu-item-AdminBilling`
 *   - `admin-menu-item-AdminAudit`
 *   - `admin-menu-item-AdminSessions`
 *   - `admin-menu-gated`                  — shown to non-admins
 */

import React, { useCallback, useMemo, useState } from 'react';
import { ChevronRight } from 'lucide-react-native';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { EmptyState, LoadingState } from '../../components/ui';
import { useAppContext } from '../../contexts/AppContext';
import { useNativeStackModalHeader } from '../../hooks/useNativeStackModalHeader';
import { getCurrentUser, type CurrentUserInfo } from '../../services/delegate-admin';
import { useAppTheme } from '../../theme';
import { FontSize, FontWeight, Radius, Space } from '../../theme/tokens';
import { hasMinRole, type AdminRole } from '../../utils/admin-role';
import type { ConsoleStackParamList } from './ConsoleTab';

type AdminMenuNavigation = NativeStackNavigationProp<ConsoleStackParamList, 'AdminMenu'>;

type AdminEntry = {
  key:
    | 'AdminUsers'
    | 'AdminWorkspaces'
    | 'AdminBilling'
    | 'AdminAudit'
    | 'AdminSessions'
    | 'DelegateServerList';
  title: string;
  description: string;
  minRole: AdminRole;
  emoji: string;
};

export function AdminMenuScreen(): React.JSX.Element {
  const navigation = useNavigation<AdminMenuNavigation>();
  const { gateway } = useAppContext();
  const { theme } = useAppTheme();
  const { t } = useTranslation('console');
  const styles = useMemo(() => createStyles(theme.colors), [theme]);

  const [user, setUser] = useState<CurrentUserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useNativeStackModalHeader({
    navigation,
    title: t('Admin'),
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
        const u = await getCurrentUser(dc);
        setUser(u);
        setError(null);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : t('Failed to load admin info');
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

  const entries = useMemo<AdminEntry[]>(
    () => [
      {
        key: 'AdminUsers',
        title: t('Users'),
        description: t('Search, view, and manage user accounts'),
        minRole: 'CS_AGENT',
        emoji: '👤',
      },
      {
        key: 'AdminWorkspaces',
        title: t('Workspaces'),
        description: t('Workspace entitlements, tiers, and billing'),
        minRole: 'CS_AGENT',
        emoji: '🏢',
      },
      {
        key: 'AdminBilling',
        title: t('Billing'),
        description: t('Revenue, subscriptions, tier breakdown'),
        minRole: 'CS_ADMIN',
        emoji: '💳',
      },
      {
        key: 'AdminAudit',
        title: t('Audit'),
        description: t('Admin action history'),
        minRole: 'CS_ADMIN',
        emoji: '📜',
      },
      {
        key: 'AdminSessions',
        title: t('Sessions'),
        description: t('Active user sessions; revoke on demand'),
        minRole: 'CS_ADMIN',
        emoji: '🔐',
      },
      {
        key: 'DelegateServerList',
        title: t('Delegate Servers'),
        description: t('NanoClaw servers connected to this workspace'),
        minRole: 'CS_AGENT',
        emoji: '🛰️',
      },
    ],
    [t],
  );

  const currentRole = user?.adminRole ?? null;
  const visibleEntries = useMemo(
    () => entries.filter((e) => hasMinRole(currentRole, e.minRole)),
    [entries, currentRole],
  );
  const isGated = !loading && visibleEntries.length === 0;

  if (loading) {
    return (
      <View style={styles.root} testID="admin-menu">
        <LoadingState message={t('Loading admin info...')} />
      </View>
    );
  }

  if (error && !user) {
    return (
      <View style={styles.root} testID="admin-menu">
        <EmptyState icon="⚠️" title={t('Error')} subtitle={error} />
      </View>
    );
  }

  return (
    <View style={styles.root} testID="admin-menu">
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load('refresh')}
            tintColor={theme.colors.primary}
          />
        }
      >
        {isGated ? (
          <View testID="admin-menu-gated" style={styles.gated}>
            <EmptyState
              icon="🚫"
              title={t('Admin access required')}
              subtitle={t('Your account does not have permission to view the admin console.')}
            />
          </View>
        ) : (
          <>
            <Text style={styles.role}>
              {t('Signed in as {{role}}', { role: currentRole ?? t('No role') })}
            </Text>
            {visibleEntries.map((entry, index) => (
              <TouchableOpacity
                key={entry.key}
                testID={`admin-menu-item-${entry.key}`}
                onPress={() => navigation.navigate(entry.key as any)}
                activeOpacity={0.7}
                style={[styles.row, index === visibleEntries.length - 1 && styles.rowLast]}
              >
                <Text style={styles.emoji}>{entry.emoji}</Text>
                <View style={styles.text}>
                  <Text style={styles.title}>{entry.title}</Text>
                  <Text style={styles.desc}>{entry.description}</Text>
                </View>
                <ChevronRight size={18} color={theme.colors.textSubtle} strokeWidth={2} />
              </TouchableOpacity>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useAppTheme>['theme']['colors']) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    content: { padding: Space.lg, paddingBottom: Space.xxxl },
    role: {
      fontSize: FontSize.sm,
      color: colors.textMuted,
      marginBottom: Space.md,
    },
    gated: {
      marginTop: Space.xxl,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: Space.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    rowLast: { borderBottomWidth: 0 },
    emoji: { fontSize: 22, width: 32, textAlign: 'center' },
    text: { flex: 1, marginLeft: Space.sm },
    title: {
      fontSize: FontSize.base,
      fontWeight: FontWeight.semibold,
      color: colors.text,
    },
    desc: {
      marginTop: 2,
      fontSize: FontSize.sm,
      color: colors.textMuted,
    },
  });
}
