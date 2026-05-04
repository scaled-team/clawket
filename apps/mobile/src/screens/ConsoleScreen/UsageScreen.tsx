import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Card, EmptyState, LoadingState, createCardContentStyle } from '../../components/ui';
import { useAppContext } from '../../contexts/AppContext';
import { fetchUserUsage, postUsageTopup } from '../../services/delegate-http-adapter';
import { SvgBarChart, SvgRingChart } from '../../components/charts';
import type { BarDataPoint, RingSegment } from '../../components/charts';
import { useTranslation } from 'react-i18next';
import { useNativeStackModalHeader } from '../../hooks/useNativeStackModalHeader';
import { loadGatewayUsageDashboardBundle } from '../../services/gateway-usage-dashboard';
import { resolveUsageCostSummaryDisplay, resolveUsageSessionCostLabel } from '../../services/usage-cost-display';
import { useAppTheme } from '../../theme';
import { FontSize, FontWeight, Radius, Space } from '../../theme/tokens';
import type { CostSummary, UsageDailyEntry, UsageResult } from '../../types';
import { filterModelsByExcludedProvider, formatCost, formatTokens, pct } from '../../utils/usage-format';
import type { ConsoleStackParamList } from './ConsoleTab';

type UsageNavigation = NativeStackNavigationProp<ConsoleStackParamList, 'Usage'>;
type RangeKey = 'today' | 'yesterday' | '3d' | '7d' | '14d' | '30d';

type DashboardState = {
  rangeKey: RangeKey;
  setRangeKey: (rangeKey: RangeKey) => void;
  range: { startDate: string; endDate: string };
  usageResult: UsageResult | null;
  costSummary: CostSummary | null;
  loading: boolean;
  error: string | null;
};

type DateRangeItem = { label: string; key: RangeKey };

function formatIsoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
}

function addDays(d: Date, delta: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + delta);
  return next;
}

function getDateRange(rangeKey: RangeKey): { startDate: string; endDate: string } {
  const today = new Date();
  const end = new Date(today);

  if (rangeKey === 'today') {
    const iso = formatIsoDate(today);
    return { startDate: iso, endDate: iso };
  }

  if (rangeKey === 'yesterday') {
    const yesterday = addDays(today, -1);
    const iso = formatIsoDate(yesterday);
    return { startDate: iso, endDate: iso };
  }

  const days =
    rangeKey === '3d'
      ? 3
      : rangeKey === '7d'
        ? 7
        : rangeKey === '14d'
          ? 14
          : 30;
  const start = addDays(today, -(days - 1));
  return { startDate: formatIsoDate(start), endDate: formatIsoDate(end) };
}

function useUsageDashboard(active: boolean): DashboardState {
  const { gateway, gatewayEpoch, foregroundEpoch } = useAppContext();
  const [rangeKey, setRangeKey] = useState<RangeKey>('today');
  const range = useMemo(() => getDateRange(rangeKey), [rangeKey]);
  const [usageResult, setUsageResult] = useState<UsageResult | null>(null);
  const [costSummary, setCostSummary] = useState<CostSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!active) return;
    let mounted = true;
    setLoading(true);
    setError(null);
    setUsageResult(null);
    setCostSummary(null);
    const { startDate, endDate } = range;

    loadGatewayUsageDashboardBundle(gateway, { startDate, endDate })
      .then(({ usageResult: usage, costSummary: cost }) => {
        if (!mounted) return;
        setUsageResult(usage ?? null);
        setCostSummary(cost ?? null);
      })
      .catch((err: unknown) => {
        if (!mounted) return;
        const message = err instanceof Error ? err.message : 'Failed to load usage dashboard';
        setError(message);
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [active, foregroundEpoch, gateway, gatewayEpoch, range]);

  return { rangeKey, setRangeKey, range, usageResult, costSummary, loading, error };
}

type UserBalance = {
  balance: number;
  used: number;
  limit: number | null;
  periodEnd?: string;
};

type TopupPack = { amount: number; label: string };

const TOPUP_PACKS: TopupPack[] = [
  { amount: 500, label: '100K tokens ($5)' },
  { amount: 2500, label: '500K tokens ($25)' },
  { amount: 10000, label: '2M tokens ($100)' },
];

export function UsageScreen(): React.JSX.Element {
  const { theme } = useAppTheme();
  const { t } = useTranslation('console');
  const { t: tCommon } = useTranslation('common');
  const { gateway } = useAppContext();
  const [balance, setBalance] = useState<UserBalance | null>(null);
  const [balanceError, setBalanceError] = useState<string | null>(null);
  const [topupOpen, setTopupOpen] = useState(false);
  const [topupBusy, setTopupBusy] = useState(false);
  const dateRanges = useMemo<DateRangeItem[]>(() => [
    { label: t('Today'), key: 'today' },
    { label: t('Yesterday'), key: 'yesterday' },
    { label: '3D', key: '3d' },
    { label: '7D', key: '7d' },
    { label: '14D', key: '14d' },
    { label: '30D', key: '30d' },
  ], [t]);
  const navigation = useNavigation<UsageNavigation>();
  const isFocused = useIsFocused();
  const styles = useMemo(() => createStyles(theme.colors), [theme]);

  useNativeStackModalHeader({
    navigation,
    title: t('Usage'),
    onClose: () => navigation.goBack(),
  });

  const { rangeKey, setRangeKey, range, usageResult, costSummary, loading, error } = useUsageDashboard(isFocused);

  const loadBalance = useCallback(async () => {
    const dc = gateway.getDelegateConfig();
    if (!dc) return;
    try {
      const b = await fetchUserUsage(dc);
      if (b) {
        setBalance({
          balance: b.balance ?? 0,
          used: b.used ?? 0,
          limit: b.limit ?? null,
          periodEnd: b.periodEnd,
        });
      }
      setBalanceError(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load balance';
      setBalanceError(message);
    }
  }, [gateway]);

  useEffect(() => {
    if (!isFocused) return;
    void loadBalance();
  }, [isFocused, loadBalance]);

  const handleTopupPack = useCallback(
    async (pack: TopupPack) => {
      const dc = gateway.getDelegateConfig();
      if (!dc || topupBusy) return;
      setTopupBusy(true);
      try {
        const result = await postUsageTopup(dc, pack.amount);
        setTopupOpen(false);
        if (result.checkoutUrl) {
          await Linking.openURL(result.checkoutUrl);
        } else {
          Alert.alert(tCommon('Success'), t('Top up applied.'));
          await loadBalance();
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : t('Failed to top up');
        Alert.alert(tCommon('Error'), message);
      } finally {
        setTopupBusy(false);
      }
    },
    [gateway, loadBalance, t, tCommon, topupBusy],
  );

  const messages = usageResult?.aggregates?.messages;
  const tools = usageResult?.aggregates?.tools;
  const totals = costSummary?.totals ?? usageResult?.totals;

  const totalCost = totals?.totalCost ?? 0;
  const totalTokens = totals?.totalTokens ?? 0;
  const inputTokens = totals?.input ?? 0;
  const cacheReadTokens = totals?.cacheRead ?? 0;
  const outputCost = totals?.outputCost ?? 0;
  const inputCost = totals?.inputCost ?? 0;
  const cacheWriteCost = totals?.cacheWriteCost ?? 0;
  const cacheReadCost = totals?.cacheReadCost ?? 0;

  const cacheHitPct = pct(cacheReadTokens, inputTokens + cacheReadTokens);

  const daily = useMemo<UsageDailyEntry[]>(() => {
    // Prefer usage.cost daily data (authoritative for cost/tokens).
    // Fall back to sessions.usage daily only when cost daily is empty.
    const costDaily = costSummary?.daily ?? [];
    if (costDaily.length > 0) {
      return [...costDaily]
        .map((entry) => ({
          date: entry.date,
          tokens: entry.totalTokens ?? 0,
          cost: entry.totalCost ?? 0,
          messages: 0,
          toolCalls: 0,
          errors: 0,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));
    }
    const usageDaily = usageResult?.aggregates?.daily ?? [];
    return [...usageDaily].sort((a, b) => a.date.localeCompare(b.date));
  }, [costSummary?.daily, usageResult?.aggregates?.daily]);

  const chartUsesCost = useMemo(() => {
    const hasTokenData = daily.some((entry) => entry.tokens > 0);
    const hasCostData = daily.some((entry) => entry.cost > 0);
    return !hasTokenData && hasCostData;
  }, [daily]);

  const topModels = useMemo(() => {
    const models = usageResult?.aggregates?.byModel ?? [];
    return filterModelsByExcludedProvider(models, 'openclaw')
      .sort((a, b) => (b.totals?.totalCost ?? 0) - (a.totals?.totalCost ?? 0))
      .slice(0, 5);
  }, [usageResult?.aggregates?.byModel]);

  const topTools = useMemo(() => {
    const toolEntries = usageResult?.aggregates?.tools?.tools ?? [];
    return [...toolEntries].sort((a, b) => b.count - a.count).slice(0, 8);
  }, [usageResult?.aggregates?.tools?.tools]);

  const topSessions = useMemo(() => {
    const sessions = usageResult?.sessions ?? [];
    return [...sessions]
      .filter((entry) => entry.usage !== null)
      .sort((a, b) => (b.usage?.totalCost ?? 0) - (a.usage?.totalCost ?? 0))
      .slice(0, 20);
  }, [usageResult?.sessions]);

  const breakdownSegments = useMemo(() => {
    const segments = [
      { label: t('Output'), cost: outputCost, color: theme.colors.usageCostOutput },
      { label: t('Input'), cost: inputCost, color: theme.colors.usageCostInput },
      { label: t('Cache Write'), cost: cacheWriteCost, color: theme.colors.usageCostCacheWrite },
      { label: t('Cache Read'), cost: cacheReadCost, color: theme.colors.usageCostCacheRead },
    ];

    const totalSegmentCost = segments.reduce((sum, entry) => sum + entry.cost, 0);
    const fallbackPct = segments.length > 0 ? 1 / segments.length : 0;

    return segments.map((segment) => ({
      ...segment,
      pct: totalSegmentCost > 0 ? segment.cost / totalSegmentCost : fallbackPct,
    }));
  }, [
    t,
    cacheReadCost,
    cacheWriteCost,
    inputCost,
    outputCost,
    theme.colors.usageCostCacheRead,
    theme.colors.usageCostCacheWrite,
    theme.colors.usageCostInput,
    theme.colors.usageCostOutput,
  ]);

  const ringSegments = useMemo<RingSegment[]>(() => breakdownSegments.map((s) => ({
    label: s.label,
    value: s.cost,
    color: s.color,
  })), [breakdownSegments]);

  const barData = useMemo<BarDataPoint[]>(() => daily.map((d) => ({
    date: d.date,
    value: chartUsesCost ? d.cost : d.tokens,
  })), [daily, chartUsesCost]);

  const hasData =
    totalTokens > 0 ||
    totalCost > 0 ||
    (messages?.total ?? 0) > 0 ||
    (tools?.totalCalls ?? 0) > 0 ||
    (usageResult?.sessions?.length ?? 0) > 0 ||
    daily.length > 0;

  const costSummaryDisplay = useMemo(
    () => resolveUsageCostSummaryDisplay({ usageResult, costSummary, t }),
    [costSummary, t, usageResult],
  );

  return (
    <View style={styles.root}>
      <View style={styles.rangeRow}>
        {dateRanges.map((range) => (
          <TouchableOpacity
            key={range.key}
            style={[styles.rangeChip, rangeKey === range.key && styles.rangeChipActive]}
            onPress={() => setRangeKey(range.key)}
            activeOpacity={0.7}
          >
            <Text style={[styles.rangeChipText, rangeKey === range.key && styles.rangeChipTextActive]}>
              {range.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={styles.rangeHint}>{`Range: ${range.startDate} → ${range.endDate}`}</Text>

      {loading && !hasData ? (
        <LoadingState message={t('Loading usage data...')} />
      ) : !hasData ? (
        <EmptyState
          icon="📊"
          title={t('No usage data')}
          subtitle={error ?? t('No data available for the selected date range.')}
        />
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {error ? (
            <Card style={styles.errorCard}>
              <Text style={styles.errorTitle}>{t('Failed to refresh usage data')}</Text>
              <Text style={styles.errorText}>{error}</Text>
            </Card>
          ) : null}

          {balance ? (
            <Card style={styles.balanceCard} testID="usage-balance">
              <View style={styles.balanceHeader}>
                <Text style={styles.balanceLabel}>{t('User balance')}</Text>
                <TouchableOpacity
                  testID="usage-topup-button"
                  onPress={() => setTopupOpen(true)}
                  style={styles.topupButton}
                  activeOpacity={0.7}
                >
                  <Text style={styles.topupButtonText}>{t('Top up')}</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.balanceValue} testID="usage-balance-remaining">
                {formatTokens(balance.balance)} {t('tokens remaining')}
              </Text>
              {balance.periodEnd ? (
                <Text style={styles.balancePeriod}>
                  {t('Period ends {{date}}', { date: balance.periodEnd })}
                </Text>
              ) : null}
              {balanceError ? (
                <Text style={styles.balanceError}>{balanceError}</Text>
              ) : null}
            </Card>
          ) : null}

          <View style={styles.summaryGrid}>
            <Card style={styles.summaryCard}>
              <Text style={styles.summaryValue}>{costSummaryDisplay.valueLabel}</Text>
              <Text style={styles.summarySubtitle}>
                {costSummaryDisplay.subtitle ?? `${formatTokens(totalTokens)} tokens`}
              </Text>
            </Card>

            <Card style={styles.summaryCard}>
              <Text style={styles.summaryValue}>{String(messages?.total ?? 0)}</Text>
              <Text style={styles.summarySubtitle}>
                {`${messages?.user ?? 0} ${t('user')} · ${messages?.assistant ?? 0} ${t('assistant')}`}
              </Text>
            </Card>

            <Card style={styles.summaryCard}>
              <Text style={styles.summaryValue}>{String(tools?.totalCalls ?? 0)}</Text>
              <Text style={styles.summarySubtitle}>{`${tools?.uniqueTools ?? 0} ${t('tool calls')}`}</Text>
            </Card>

            <Card style={styles.summaryCard}>
              <Text style={styles.summaryValue}>{`${cacheHitPct.toFixed(1)}%`}</Text>
              <Text style={styles.summarySubtitle}>{t('Token cache rate')}</Text>
            </Card>
          </View>

          {costSummaryDisplay.bannerTitle && costSummaryDisplay.bannerBody ? (
            <Card style={styles.noticeCard}>
              <Text style={styles.noticeTitle}>{costSummaryDisplay.bannerTitle}</Text>
              <Text style={styles.noticeText}>{costSummaryDisplay.bannerBody}</Text>
            </Card>
          ) : null}

          <Text style={styles.sectionTitle}>{t('Cost Breakdown')}</Text>
          <Card style={styles.sectionCard}>
            <SvgRingChart
              segments={ringSegments}
              totalCost={totalCost}
            />
          </Card>

          <Text style={styles.sectionTitle}>{t('Top Models')}</Text>
          <Card style={styles.sectionCard}>
            {topModels.length === 0 ? (
              <Text style={styles.emptyText}>{t('No model usage data.')}</Text>
            ) : (
              topModels.map((entry, index) => {
                const modelLabel = entry.model ?? entry.provider ?? 'Unknown model';
                const providerPrefix = entry.provider && entry.model ? `${entry.provider} · ` : '';
                const line = `${formatTokens(entry.totals?.totalTokens ?? 0)} tokens · ${entry.count} ${t('messages')}`;
                return (
                  <View
                    key={`${entry.provider ?? 'provider'}:${entry.model ?? 'model'}:${index}`}
                    style={[styles.listItem, index === topModels.length - 1 && styles.listItemLast]}
                  >
                    <View style={styles.listMain}>
                      <Text style={styles.listTitle} numberOfLines={1}>{modelLabel}</Text>
                      <Text style={styles.listSubtitle} numberOfLines={1}>{`${providerPrefix}${line}`}</Text>
                    </View>
                    <Text style={styles.listValue}>{formatCost(entry.totals?.totalCost ?? 0)}</Text>
                  </View>
                );
              })
            )}
          </Card>

          <Text style={styles.sectionTitle}>{t('Daily Usage')}</Text>
          <Card style={styles.sectionCard}>
            <Text style={styles.chartMeta}>{chartUsesCost ? t('Cost per day') : t('Tokens per day')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <SvgBarChart
                data={barData}
                mode={chartUsesCost ? 'cost' : 'tokens'}
              />
            </ScrollView>
          </Card>

          <Text style={styles.sectionTitle}>{t('Top Tools')}</Text>
          <Card style={styles.sectionCard}>
            {topTools.length === 0 ? (
              <Text style={styles.emptyText}>{t('No tool usage data.')}</Text>
            ) : (
              topTools.map((entry, index) => (
                <View key={`${entry.name}:${index}`} style={[styles.listItem, index === topTools.length - 1 && styles.listItemLast]}>
                  <Text style={styles.listTitle} numberOfLines={1}>{entry.name}</Text>
                  <Text style={styles.listValue}>{`${entry.count} calls`}</Text>
                </View>
              ))
            )}
          </Card>

          <Text style={styles.sectionTitle}>{t('Sessions')}</Text>
          <Card style={styles.sectionCard}>
            {topSessions.length === 0 ? (
              <Text style={styles.emptyText}>{t('No sessions found for this range.')}</Text>
            ) : (
              topSessions.map((session, index) => {
                const label = session.label?.trim() || session.key;
                const sessionTokens = session.usage?.totalTokens ?? 0;
                const sessionCost = session.usage?.totalCost ?? 0;
                return (
                  <View key={`${session.key}-${index}`} style={[styles.listItem, index === topSessions.length - 1 && styles.listItemLast]}>
                    <View style={styles.listMain}>
                      <Text style={styles.listTitle} numberOfLines={1}>{label}</Text>
                      <Text style={styles.listSubtitle}>{`${formatTokens(sessionTokens)} tokens`}</Text>
                    </View>
                    <Text style={styles.listValue}>{resolveUsageSessionCostLabel({ session, t })}</Text>
                  </View>
                );
              })
            )}
          </Card>
        </ScrollView>
      )}

      <Modal
        visible={topupOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setTopupOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard} testID="usage-topup-modal">
            <Text style={styles.modalTitle}>{t('Choose a pack')}</Text>
            {TOPUP_PACKS.map((pack) => (
              <TouchableOpacity
                key={pack.amount}
                testID={`usage-topup-pack-${pack.amount}`}
                disabled={topupBusy}
                onPress={() => handleTopupPack(pack)}
                style={[styles.modalPack, topupBusy && styles.modalPackDisabled]}
                activeOpacity={0.7}
              >
                <Text style={styles.modalPackText}>{pack.label}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              onPress={() => setTopupOpen(false)}
              style={styles.modalCancel}
              activeOpacity={0.7}
            >
              <Text style={styles.modalCancelText}>{tCommon('Cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useAppTheme>['theme']['colors']) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      ...createCardContentStyle({ bottom: Space.xxxl }),
    },
    rangeRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Space.sm,
      paddingHorizontal: Space.lg,
      paddingVertical: Space.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.surface,
    },
    rangeHint: {
      paddingHorizontal: Space.lg,
      paddingTop: Space.xs,
      paddingBottom: Space.sm,
      fontSize: FontSize.sm,
      color: colors.textSubtle,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    rangeChip: {
      paddingHorizontal: Space.md,
      paddingVertical: Space.sm - 2,
      borderRadius: Radius.lg,
      backgroundColor: colors.surfaceMuted,
    },
    rangeChipActive: {
      backgroundColor: colors.primary,
    },
    rangeChipText: {
      fontSize: FontSize.sm,
      fontWeight: FontWeight.semibold,
      color: colors.textMuted,
    },
    rangeChipTextActive: {
      color: colors.primaryText,
    },
    errorCard: {
      borderWidth: 1,
      borderColor: colors.error,
      marginTop: Space.lg,
      marginBottom: Space.sm,
      backgroundColor: colors.surface,
    },
    noticeCard: {
      borderWidth: 1,
      borderColor: colors.primary,
      marginTop: Space.lg,
      marginBottom: Space.sm,
      backgroundColor: colors.surface,
    },
    errorTitle: {
      fontSize: FontSize.base,
      fontWeight: FontWeight.semibold,
      color: colors.error,
    },
    errorText: {
      marginTop: Space.xs,
      fontSize: FontSize.sm,
      color: colors.textMuted,
    },
    noticeTitle: {
      fontSize: FontSize.base,
      fontWeight: FontWeight.semibold,
      color: colors.text,
    },
    noticeText: {
      marginTop: Space.xs,
      fontSize: FontSize.sm,
      color: colors.textMuted,
    },
    summaryGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      rowGap: Space.md,
    },
    summaryCard: {
      width: '48%',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: Space.xxl + Space.xxl + Space.sm,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    summaryValue: {
      fontSize: FontSize.xl,
      fontWeight: FontWeight.bold,
      color: colors.text,
    },
    summarySubtitle: {
      marginTop: Space.xs,
      fontSize: FontSize.sm,
      color: colors.textMuted,
      textAlign: 'center',
    },
    sectionTitle: {
      marginTop: Space.xl,
      marginBottom: Space.md,
      fontSize: FontSize.lg,
      fontWeight: FontWeight.semibold,
      color: colors.text,
    },
    sectionCard: {
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      padding: Space.md,
    },
    chartMeta: {
      fontSize: FontSize.sm,
      color: colors.textMuted,
      marginBottom: Space.sm,
    },
    listItem: {
      paddingVertical: Space.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: Space.md,
    },
    listItemLast: {
      borderBottomWidth: 0,
      paddingBottom: Space.xs,
    },
    listMain: {
      flex: 1,
    },
    listTitle: {
      fontSize: FontSize.base,
      fontWeight: FontWeight.medium,
      color: colors.text,
    },
    listSubtitle: {
      marginTop: Space.xs - 1,
      fontSize: FontSize.sm,
      color: colors.textMuted,
    },
    listValue: {
      fontSize: FontSize.base,
      color: colors.text,
      fontWeight: FontWeight.semibold,
    },
    emptyText: {
      fontSize: FontSize.md,
      color: colors.textMuted,
      paddingVertical: Space.sm,
    },
    balanceCard: {
      marginTop: Space.lg,
      marginBottom: Space.sm,
      padding: Space.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    balanceHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: Space.xs,
    },
    balanceLabel: {
      fontSize: FontSize.sm,
      fontWeight: FontWeight.semibold,
      color: colors.textMuted,
    },
    balanceValue: {
      fontSize: FontSize.lg,
      fontWeight: FontWeight.bold,
      color: colors.text,
    },
    balancePeriod: {
      marginTop: Space.xs,
      fontSize: FontSize.sm,
      color: colors.textMuted,
    },
    balanceError: {
      marginTop: Space.xs,
      fontSize: FontSize.sm,
      color: colors.error,
    },
    topupButton: {
      paddingHorizontal: Space.md,
      paddingVertical: Space.sm - 2,
      borderRadius: Radius.md,
      backgroundColor: colors.primary,
    },
    topupButtonText: {
      color: colors.primaryText,
      fontSize: FontSize.sm,
      fontWeight: FontWeight.semibold,
    },
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: Space.lg,
    },
    modalCard: {
      width: '100%',
      maxWidth: 360,
      backgroundColor: colors.surface,
      borderRadius: Radius.lg,
      padding: Space.lg,
      borderWidth: 1,
      borderColor: colors.border,
    },
    modalTitle: {
      fontSize: FontSize.lg,
      fontWeight: FontWeight.bold,
      color: colors.text,
      marginBottom: Space.md,
    },
    modalPack: {
      paddingVertical: Space.md,
      paddingHorizontal: Space.md,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: Space.sm,
      backgroundColor: colors.background,
    },
    modalPackDisabled: { opacity: 0.5 },
    modalPackText: {
      fontSize: FontSize.base,
      fontWeight: FontWeight.semibold,
      color: colors.text,
    },
    modalCancel: {
      paddingVertical: Space.md,
      alignItems: 'center',
      marginTop: Space.xs,
    },
    modalCancelText: {
      fontSize: FontSize.base,
      fontWeight: FontWeight.semibold,
      color: colors.textMuted,
    },
  });
}
