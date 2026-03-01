import { useMemo, useState } from 'react';
import {
    BarChart3,
    TrendingUp,
    Zap,
    Calendar,
    ChevronDown,
    ChevronUp,
} from 'lucide-react';
import type { ChargingSession } from '../types';
import { useChargingStats } from '../hooks/useChargingStats';
import { useI18n } from '../i18n/I18nContext';

interface StatisticsTabProps {
    sessions: ChargingSession[];
}

export function StatisticsTab({ sessions }: StatisticsTabProps) {
    const { t, locale } = useI18n();
    const { monthlyOverviews, yearlyOverviews } = useChargingStats(sessions, t.months);
    const [expandedYears, setExpandedYears] = useState<Set<number>>(new Set());
    const [showAllMonths, setShowAllMonths] = useState(false);

    const localeTag = locale === 'de' ? 'de-DE' : 'en-US';

    const formatCurrency = (value: number): string =>
        value.toLocaleString(localeTag, { style: 'currency', currency: 'EUR' });

    // Average cost and kWh per month
    const averages = useMemo(() => {
        if (monthlyOverviews.length === 0) return { avgCost: 0, avgKWh: 0 };
        const totalCost = monthlyOverviews.reduce((sum, m) => sum + m.totalCost, 0);
        const totalKWh = monthlyOverviews.reduce((sum, m) => sum + m.totalKWh, 0);
        return {
            avgCost: totalCost / monthlyOverviews.length,
            avgKWh: totalKWh / monthlyOverviews.length,
        };
    }, [monthlyOverviews]);

    const maxMonthlyCost = useMemo(() => {
        if (monthlyOverviews.length === 0) return 1;
        return Math.max(...monthlyOverviews.map((m) => m.totalCost));
    }, [monthlyOverviews]);

    const toggleYear = (year: number) => {
        setExpandedYears((prev) => {
            const next = new Set(prev);
            if (next.has(year)) next.delete(year);
            else next.add(year);
            return next;
        });
    };

    if (sessions.length === 0) {
        return (
            <div className="p-4 pb-24">
                <div className="text-center py-12 text-[var(--color-text-muted)]">
                    <BarChart3 size={48} className="mx-auto mb-3 opacity-30" />
                    <p className="font-medium">{t.noStatistics}</p>
                    <p className="text-sm mt-1">{t.noStatisticsHint}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 space-y-5 pb-24">
            {/* Average Cards */}
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-[var(--color-card)] rounded-2xl p-4 shadow-sm border border-[var(--color-border)]">
                    <div className="flex items-center gap-2 mb-1">
                        <TrendingUp size={16} className="text-[var(--color-primary)]" />
                        <span className="text-xs text-[var(--color-text-muted)]">{t.avgCostPerMonth}</span>
                    </div>
                    <p className="text-lg font-bold">{formatCurrency(averages.avgCost)}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">
                        {t.overMonths.replace('{n}', String(monthlyOverviews.length))}
                    </p>
                </div>
                <div className="bg-[var(--color-card)] rounded-2xl p-4 shadow-sm border border-[var(--color-border)]">
                    <div className="flex items-center gap-2 mb-1">
                        <Zap size={16} className="text-[var(--color-accent)]" />
                        <span className="text-xs text-[var(--color-text-muted)]">{t.avgEnergyPerMonth}</span>
                    </div>
                    <p className="text-lg font-bold">{averages.avgKWh.toFixed(1)} kWh</p>
                    <p className="text-xs text-[var(--color-text-muted)]">
                        {t.overMonths.replace('{n}', String(monthlyOverviews.length))}
                    </p>
                </div>
            </div>

            {/* Monthly Cost Bar Chart */}
            <div className="bg-[var(--color-card)] rounded-2xl p-4 shadow-sm border border-[var(--color-border)]">
                <h3 className="font-semibold text-base flex items-center gap-2 mb-4">
                    <BarChart3 size={18} className="text-[var(--color-primary)]" />
                    {t.costPerMonth}
                </h3>
                <div className="space-y-2.5">
                    {(showAllMonths ? monthlyOverviews : monthlyOverviews.slice(0, 3)).map((mo) => {
                        const pct = maxMonthlyCost > 0 ? (mo.totalCost / maxMonthlyCost) * 100 : 0;
                        return (
                            <div key={mo.month}>
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs text-[var(--color-text-muted)]">{mo.label}</span>
                                    <span className="text-xs font-semibold">{formatCurrency(mo.totalCost)}</span>
                                </div>
                                <div className="w-full h-2.5 bg-[var(--color-bar-track)] rounded-full overflow-hidden">
                                    <div
                                        className="h-full rounded-full bg-[var(--color-primary)] transition-all duration-300"
                                        style={{ width: `${Math.max(pct, 2)}%` }}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
                {monthlyOverviews.length > 3 && (
                    <button
                        onClick={() => setShowAllMonths(!showAllMonths)}
                        className="w-full flex items-center justify-center gap-1 mt-3 py-2 text-xs font-medium text-[var(--color-primary)] active:scale-95 transition-transform"
                    >
                        {showAllMonths ? (
                            <>{t.showLess} <ChevronUp size={14} /></>
                        ) : (
                            <>{t.showAllMonths.replace('{n}', String(monthlyOverviews.length))} <ChevronDown size={14} /></>
                        )}
                    </button>
                )}
            </div>

            {/* Yearly Overviews */}
            {yearlyOverviews.length > 0 && (
                <div className="space-y-3">
                    <h3 className="font-semibold text-base flex items-center gap-2">
                        <Calendar size={18} className="text-[var(--color-primary)]" />
                        {t.yearlyOverview}
                    </h3>

                    {yearlyOverviews.map((yearly) => (
                        <div
                            key={yearly.year}
                            className="bg-[var(--color-card)] rounded-2xl shadow-sm border border-[var(--color-border)] overflow-hidden"
                        >
                            <button
                                onClick={() => toggleYear(yearly.year)}
                                className="w-full flex items-center justify-between p-4 text-left"
                            >
                                <div>
                                    <p className="font-bold text-base">{yearly.year}</p>
                                    <p className="text-sm text-[var(--color-text-muted)]">
                                        {yearly.sessionCount} {t.charges} · {yearly.totalKWh.toFixed(1)} kWh
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-[var(--color-primary)]">
                                        {formatCurrency(yearly.totalCost)}
                                    </span>
                                    {expandedYears.has(yearly.year) ? (
                                        <ChevronUp size={18} className="text-[var(--color-text-muted)]" />
                                    ) : (
                                        <ChevronDown size={18} className="text-[var(--color-text-muted)]" />
                                    )}
                                </div>
                            </button>

                            {expandedYears.has(yearly.year) && (
                                <div className="border-t border-[var(--color-border)]">
                                    {yearly.months.map((mo) => (
                                        <div
                                            key={mo.month}
                                            className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)] last:border-b-0"
                                        >
                                            <div>
                                                <p className="text-sm font-medium">{mo.label}</p>
                                                <p className="text-xs text-[var(--color-text-muted)]">
                                                    {mo.sessionCount}x · {mo.totalKWh.toFixed(1)} kWh · ⌀ {mo.avgPricePerKWh.toFixed(2)} €/kWh
                                                </p>
                                            </div>
                                            <span className="font-semibold text-sm">{formatCurrency(mo.totalCost)}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
