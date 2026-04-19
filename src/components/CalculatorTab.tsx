import { useState } from 'react';
import { Calculator, Zap, Clock, CreditCard, BatteryCharging } from 'lucide-react';
import type { CarData } from '../types';
import { useI18n } from '../i18n/I18nContext';

interface CalculatorTabProps {
    carData: CarData;
}

type ChargingType = 'dc' | 'ac';

export function CalculatorTab({ carData }: CalculatorTabProps) {
    const [chargingType, setChargingType] = useState<ChargingType>('dc');
    const [currentSoC, setCurrentSoC] = useState('20');
    const [targetSoC, setTargetSoC] = useState('80');
    const [pricePerKWh, setPricePerKWh] = useState('0.49');
    const { t, locale } = useI18n();

    const localeTag = locale === 'de' ? 'de-DE' : 'en-US';
    const hasCarData = carData.name && carData.batteryCapacityKWh > 0;

    if (!hasCarData) {
        return (
            <div className="p-4 flex flex-col items-center justify-center min-h-[60vh] text-center text-[var(--color-text-muted)]">
                <Calculator size={48} className="mb-3 opacity-30" />
                <p className="font-medium">{t.noCarSetup}</p>
                <p className="text-sm mt-1">{t.noCarSetupHint}</p>
            </div>
        );
    }

    const chargingPowerKW =
        chargingType === 'dc' ? carData.maxDCChargingKW : carData.maxACChargingKW;

    const currentPercent = parseFloat(currentSoC) || 0;
    const targetPercent = parseFloat(targetSoC) || 0;
    const price = parseFloat(pricePerKWh) || 0;

    const socDiff = Math.max(0, targetPercent - currentPercent);
    const kWhNeeded = (socDiff / 100) * carData.batteryCapacityKWh;

    const chargingHours = chargingPowerKW > 0 ? kWhNeeded / chargingPowerKW : 0;
    const chargingMinutes = chargingHours * 60;

    const totalCost = kWhNeeded * price;

    const formatDuration = (minutes: number): string => {
        if (minutes < 1) return t.lessThan1Min;
        const h = Math.floor(minutes / 60);
        const m = Math.round(minutes % 60);
        if (h === 0) return t.minutes.replace('{m}', String(m));
        if (m === 0) return t.hours.replace('{h}', String(h));
        return t.hoursMinutes.replace('{h}', String(h)).replace('{m}', String(m));
    };

    const formatCurrency = (value: number): string =>
        value.toLocaleString(localeTag, { style: 'currency', currency: 'EUR' });

    return (
        <div className="p-4 space-y-5">
            <h2 className="text-xl font-bold text-[var(--color-text)]">{t.chargingCalculator}</h2>

            {/* Car Info */}
            <div className="bg-[var(--color-highlight)] rounded-xl p-3 flex items-center gap-3">
                <BatteryCharging size={20} className="text-[var(--color-primary)] flex-shrink-0" />
                <div>
                    <p className="text-sm font-medium text-[var(--color-primary)]">{carData.name}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">
                        {carData.batteryCapacityKWh} kWh · DC {carData.maxDCChargingKW} kW · AC{' '}
                        {carData.maxACChargingKW} kW
                    </p>
                </div>
            </div>

            {/* Charging Type Toggle */}
            <div className="bg-[var(--color-card)] rounded-2xl p-1 shadow-sm border border-[var(--color-border)] flex">
                <button
                    onClick={() => setChargingType('dc')}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${chargingType === 'dc'
                        ? 'bg-[var(--color-primary)] text-white shadow-sm'
                        : 'text-[var(--color-text-muted)]'
                        }`}
                >
                    ⚡ {t.dcCharging} ({carData.maxDCChargingKW} kW)
                </button>
                <button
                    onClick={() => setChargingType('ac')}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${chargingType === 'ac'
                        ? 'bg-[var(--color-primary)] text-white shadow-sm'
                        : 'text-[var(--color-text-muted)]'
                        }`}
                >
                    🔌 {t.acCharging} ({carData.maxACChargingKW} kW)
                </button>
            </div>

            {/* Input Form */}
            <div className="bg-[var(--color-card)] rounded-2xl p-5 shadow-sm border border-[var(--color-border)] space-y-5">
                <div>
                    <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-2">
                        {t.currentSoC}: <span className="font-bold text-[var(--color-text)]">{currentSoC}%</span>
                    </label>
                    <input
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        value={currentSoC}
                        onChange={(e) => setCurrentSoC(e.target.value)}
                        className="w-full h-2 rounded-full appearance-none bg-[var(--color-highlight-muted)] accent-[var(--color-primary)]"
                    />
                    <div className="flex justify-between text-xs text-[var(--color-text-muted)] mt-1">
                        <span>0%</span>
                        <span>50%</span>
                        <span>100%</span>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-2">
                        {t.targetSoC}: <span className="font-bold text-[var(--color-text)]">{targetSoC}%</span>
                    </label>
                    <input
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        value={targetSoC}
                        onChange={(e) => setTargetSoC(e.target.value)}
                        className="w-full h-2 rounded-full appearance-none bg-[var(--color-highlight-muted)] accent-[var(--color-accent)]"
                    />
                    <div className="flex justify-between text-xs text-[var(--color-text-muted)] mt-1">
                        <span>0%</span>
                        <span>50%</span>
                        <span>100%</span>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1.5">
                        {t.electricityPrice}
                    </label>
                    <input
                        type="number"
                        inputMode="decimal"
                        value={pricePerKWh}
                        onChange={(e) => setPricePerKWh(e.target.value)}
                        step="0.01"
                        placeholder={t.electricityPricePlaceholder}
                        className="w-full px-4 py-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] text-base focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                    />
                </div>
            </div>

            {/* Results */}
            {socDiff > 0 && (
                <div className="space-y-3">
                    <h3 className="font-semibold text-base flex items-center gap-2">
                        <Calculator size={18} className="text-[var(--color-primary)]" />
                        {t.result}
                    </h3>

                    <div className="grid grid-cols-1 gap-3">
                        <div className="bg-[var(--color-card)] rounded-2xl p-4 shadow-sm border border-[var(--color-border)] flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-[var(--color-highlight)] flex items-center justify-center flex-shrink-0">
                                <Zap size={20} className="text-[var(--color-primary)]" />
                            </div>
                            <div>
                                <p className="text-xs text-[var(--color-text-muted)]">{t.requiredEnergy}</p>
                                <p className="text-lg font-bold">{kWhNeeded.toFixed(1)} kWh</p>
                                <p className="text-xs text-[var(--color-text-muted)]">
                                    {currentPercent}% → {targetPercent}% (+{socDiff}%)
                                </p>
                            </div>
                        </div>

                        <div className="bg-[var(--color-card)] rounded-2xl p-4 shadow-sm border border-[var(--color-border)] flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-[var(--color-highlight)] flex items-center justify-center flex-shrink-0">
                                <Clock size={20} className="text-[var(--color-accent)]" />
                            </div>
                            <div>
                                <p className="text-xs text-[var(--color-text-muted)]">{t.estimatedDuration}</p>
                                <p className="text-lg font-bold">{formatDuration(chargingMinutes)}</p>
                                <p className="text-xs text-[var(--color-text-muted)]">
                                    {t.atPowerKW.replace('{power}', String(chargingPowerKW)).replace('{type}', chargingType === 'dc' ? 'DC' : 'AC')}
                                </p>
                            </div>
                        </div>

                        <div className="bg-[var(--color-card)] rounded-2xl p-4 shadow-sm border border-[var(--color-border)] flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-[var(--color-highlight)] flex items-center justify-center flex-shrink-0">
                                <CreditCard size={20} className="text-amber-500" />
                            </div>
                            <div>
                                <p className="text-xs text-[var(--color-text-muted)]">{t.estimatedCost}</p>
                                <p className="text-lg font-bold">{formatCurrency(totalCost)}</p>
                                <p className="text-xs text-[var(--color-text-muted)]">
                                    {t.atPricePerKWh.replace('{price}', price.toFixed(2))}
                                </p>
                            </div>
                        </div>
                    </div>

                    <p className="text-xs text-[var(--color-text-muted)] text-center mt-2">
                        {t.chargingDisclaimer}
                    </p>
                </div>
            )}

            {socDiff <= 0 && currentPercent > 0 && (
                <div className="text-center py-8 text-[var(--color-text-muted)]">
                    <p className="text-sm">{t.targetMustBeHigher}</p>
                </div>
            )}
        </div>
    );
}
