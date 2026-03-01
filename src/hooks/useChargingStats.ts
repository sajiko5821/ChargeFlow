import { useMemo } from 'react';
import type { ChargingSession, MonthlyOverview, YearlyOverview } from '../types';

export function useChargingStats(sessions: ChargingSession[], monthNames: string[]) {
    const monthlyOverviews = useMemo((): MonthlyOverview[] => {
        const map = new Map<string, { totalKWh: number; totalCost: number; count: number }>();

        for (const session of sessions) {
            const d = new Date(session.date);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            const entry = map.get(key) || { totalKWh: 0, totalCost: 0, count: 0 };
            entry.totalKWh += session.kWhCharged;
            entry.totalCost += session.totalCost;
            entry.count += 1;
            map.set(key, entry);
        }

        return Array.from(map.entries())
            .sort(([a], [b]) => b.localeCompare(a))
            .map(([key, data]) => {
                const [year, month] = key.split('-');
                return {
                    month: key,
                    label: `${monthNames[parseInt(month) - 1]} ${year}`,
                    totalKWh: Math.round(data.totalKWh * 100) / 100,
                    totalCost: Math.round(data.totalCost * 100) / 100,
                    sessionCount: data.count,
                    avgPricePerKWh:
                        data.totalKWh > 0
                            ? Math.round((data.totalCost / data.totalKWh) * 100) / 100
                            : 0,
                };
            });
    }, [sessions, monthNames]);

    const yearlyOverviews = useMemo((): YearlyOverview[] => {
        const yearMap = new Map<number, MonthlyOverview[]>();
        for (const mo of monthlyOverviews) {
            const year = parseInt(mo.month.split('-')[0]);
            const arr = yearMap.get(year) || [];
            arr.push(mo);
            yearMap.set(year, arr);
        }

        return Array.from(yearMap.entries())
            .sort(([a], [b]) => b - a)
            .map(([year, months]) => {
                const totalKWh = months.reduce((s, m) => s + m.totalKWh, 0);
                const totalCost = months.reduce((s, m) => s + m.totalCost, 0);
                const sessionCount = months.reduce((s, m) => s + m.sessionCount, 0);
                return {
                    year,
                    totalKWh: Math.round(totalKWh * 100) / 100,
                    totalCost: Math.round(totalCost * 100) / 100,
                    sessionCount,
                    avgPricePerKWh:
                        totalKWh > 0 ? Math.round((totalCost / totalKWh) * 100) / 100 : 0,
                    months,
                };
            });
    }, [monthlyOverviews]);

    return { monthlyOverviews, yearlyOverviews };
}
