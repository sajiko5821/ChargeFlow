import { Car, Zap, Calculator, BarChart3 } from 'lucide-react';
import type { TabId } from '../types';
import { useI18n } from '../i18n/I18nContext';

interface BottomNavProps {
    activeTab: TabId;
    onTabChange: (tab: TabId) => void;
}

const tabIcons: Record<TabId, typeof Car> = {
    charging: Zap,
    statistics: BarChart3,
    calculator: Calculator,
    car: Car,
};

const tabOrder: TabId[] = ['charging', 'statistics', 'calculator', 'car'];

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
    const { t } = useI18n();

    const tabLabels: Record<TabId, string> = {
        charging: t.navCharging,
        statistics: t.navStatistics,
        calculator: t.navCalculator,
        car: t.navCar,
    };

    return (
        <nav className="fixed bottom-0 left-0 right-0 bg-[var(--color-card)] border-t border-[var(--color-border)] z-50 safe-area-bottom">
            <div className="flex items-center justify-around max-w-lg mx-auto">
                {tabOrder.map((id) => {
                    const isActive = activeTab === id;
                    const Icon = tabIcons[id];
                    return (
                        <button
                            key={id}
                            onClick={() => onTabChange(id)}
                            className={`flex flex-col items-center gap-0.5 py-2 px-4 min-w-[64px] transition-colors ${isActive
                                ? 'text-[var(--color-primary)]'
                                : 'text-[var(--color-text-muted)]'
                                }`}
                        >
                            <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                            <span className={`text-[11px] ${isActive ? 'font-semibold' : 'font-medium'}`}>
                                {tabLabels[id]}
                            </span>
                        </button>
                    );
                })}
            </div>
        </nav>
    );
}
