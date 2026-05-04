/**
 * AdminBillingScreen — Phase 7 (AC-13).
 *
 * Read-only billing overview. Backed by GET /api/admin/workspace-billing-stats.
 *
 * testIDs:
 *   - `admin-billing`
 *   - `admin-billing-mrr`
 *   - `admin-billing-tier-{tier}`
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { Card, EmptyState, LoadingState } from '../../components/ui';
import { useAppContext } from '../../contexts/AppContext';
import { useNativeStackModalHeader } from '../../hooks/useNativeStackModalHeader';
import {
  getAdminBillingStats,
  type AdminBillingStats,
} from '../../services/delegate-admin';
import { useAppTheme } from '../../theme';
import { FontSize, FontWeight, Space } from '../../theme/tokens';
import type { ConsoleStackParamList } from './ConsoleTab';

type AdminBillingNavigation = NativeStackNavigationProp<
  ConsoleStackParamList,
  'AdminBilling'
>;

export function AdminBillingScreen(): React.JSX.Element {
  const navigation = useNavigation<AdminBillingNavigation>();
  const { gateway } = useAppContext();
  const { theme } = useAppTheme();
  const { t } = useTranslation('console');
  const styles = useMemo(() => createStyles(theme.colors), [theme]);

  const [stats, setStats] = useState<AdminBillingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useNativeStackModalHeader({
    navigation,
    title: t('Billing'),
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
        const s = await getAdminBillingStats(dc);
        setStats(s);
        setError(null);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : t('Failed to load billing stats');
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

  if (loading) {
    return (
      <View style={styles.root} testID="admin-billing">
        <LoadingState message={t('Loading billing stats...')} />
      </View>
    );
  }

  if (error && !stats) {
    return (
      <View style={styles.root} testID="admin-billing">
        <EmptyState icon="⚠️" title={t('Error')} subtitle={error} />
      </View>
    );
  }

  const tierEntries = stats ? Object.entries(stats.tierCounts) : [];

  return (
    <View style={styles.root} testID="admin-billing">
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
        <Card style={styles.card}>
          <Text style={styles.label}>{t('Active subscriptions')}</Text>
          <Text style={styles.value} testID="admin-billing-mrr">
            {stats?.activeSubscriptions ?? 0}
          </Text>
        </Card>

        <View style={styles.inlineRow}>
          <Card style={[styles.card, styles.cardHalf]}>
            <Text style={styles.label}>{t('Active trials')}</Text>
            <Text style={styles.value}>{stats?.activeTrials ?? 0}</Text>
          </Card>
          <Card style={[styles.card, styles.cardHalf]}>
            <Text style={styles.label}>{t('Expired trials')}</Text>
            <Text style={styles.value}>{stats?.expiredTrials ?? 0}</Text>
          </Card>
        </View>

        <Card style={styles.card}>
          <Text style={styles.label}>{t('Total workspaces')}</Text>
          <Text style={styles.value}>{stats?.totalWorkspaces ?? 0}</Text>
        </Card>

        <Text style={styles.sectionTitle}>{t('Tier breakdown')}</Text>
        <Card style={styles.card}>
          {tierEntries.length === 0 ? (
            <Text style={styles.empty}>{t('No tier data.')}</Text>
          ) : (
            tierEntries.map(([tier, count], index) => (
              <View
                key={tier}
                style={[
                  styles.tierRow,
                  index === tierEntries.length - 1 && styles.tierRowLast,
                ]}
                testID={`admin-billing-tier-${tier}`}
              >
                <Text style={styles.tierName}>{tier}</Text>
                <Text style={styles.tierCount}>{count}</Text>
              </View>
            ))
          )}
        </Card>
      </ScrollView>
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useAppTheme>['theme']['colors']) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    content: { padding: Space.lg, paddingBottom: Space.xxxl, gap: Space.md },
    inlineRow: { flexDirection: 'row', gap: Space.md },
    card: {
      padding: Space.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    cardHalf: { flex: 1 },
    label: {
      fontSize: FontSize.sm,
      color: colors.textMuted,
    },
    value: {
      marginTop: 4,
      fontSize: 28,
      fontWeight: FontWeight.bold,
      color: colors.text,
    },
    sectionTitle: {
      marginTop: Space.md,
      fontSize: FontSize.lg,
      fontWeight: FontWeight.semibold,
      color: colors.text,
    },
    tierRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: Space.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    tierRowLast: { borderBottomWidth: 0 },
    tierName: {
      fontSize: FontSize.base,
      fontWeight: FontWeight.semibold,
      color: colors.text,
    },
    tierCount: {
      fontSize: FontSize.base,
      color: colors.text,
    },
    empty: {
      fontSize: FontSize.sm,
      color: colors.textMuted,
      paddingVertical: Space.sm,
    },
  });
}
