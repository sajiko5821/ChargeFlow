export interface CarData {
    name: string;
    batteryCapacityKWh: number;
    maxDCChargingKW: number;
    maxACChargingKW: number;
}

export interface ChargingSession {
    id: string;
    date: string; // ISO date string
    kWhCharged: number;
    pricePerKWh: number; // in EUR cents
    totalCost: number; // in EUR
    chargerDealId?: string;
    chargerDealName?: string;
    priceSource?: 'deal' | 'custom';
    note?: string;
}

export interface ChargerDeal {
    id: string;
    name: string;
    pricePerKWh: number;
    chargeType: 'ac' | 'dc' | 'both';
}

export interface MonthlyOverview {
    month: string; // YYYY-MM
    label: string; // e.g. "Januar 2026"
    totalKWh: number;
    totalCost: number;
    sessionCount: number;
    avgPricePerKWh: number;
}

export interface YearlyOverview {
    year: number;
    totalKWh: number;
    totalCost: number;
    sessionCount: number;
    avgPricePerKWh: number;
    months: MonthlyOverview[];
}

export type TabId = 'car' | 'charging' | 'calculator' | 'statistics';

/** Single source of truth for tab order. Used for navigation, URL routing, and validation. */
export const TAB_ORDER: TabId[] = ['charging', 'statistics', 'calculator', 'car'];

