import { useState } from 'react';
import { Car, Save, Edit3, RotateCcw, Trash2, Plus, Tag } from 'lucide-react';
import type { CarData, ChargerDeal } from '../types';
import { useI18n } from '../i18n/I18nContext';

interface CarTabProps {
    carData: CarData;
    deals: ChargerDeal[];
    onSave: (data: CarData) => void | Promise<void>;
    onAddDeal: (deal: Omit<ChargerDeal, 'id'>) => Promise<void>;
    onUpdateDeal: (deal: ChargerDeal) => Promise<void>;
    onDeleteDeal: (id: string) => Promise<void>;
}

const DEFAULT_CAR: CarData = {
    name: '',
    batteryCapacityKWh: 0,
    maxDCChargingKW: 0,
    maxACChargingKW: 0,
};

export function CarTab({ carData, deals, onSave, onAddDeal, onUpdateDeal, onDeleteDeal }: CarTabProps) {
    const [editing, setEditing] = useState(!carData.name);
    const [form, setForm] = useState<CarData>(carData.name ? carData : DEFAULT_CAR);
    const [dealName, setDealName] = useState('');
    const [dealPricePerKWh, setDealPricePerKWh] = useState('');
    const [dealChargeType, setDealChargeType] = useState<'ac' | 'dc' | 'both'>('both');
    const [editingDealId, setEditingDealId] = useState<string | null>(null);
    const { t } = useI18n();

    const resetDealForm = () => {
        setDealName('');
        setDealPricePerKWh('');
        setDealChargeType('both');
        setEditingDealId(null);
    };

    const handleSave = async () => {
        if (!form.name.trim()) return;
        try {
            await onSave(form);
            setEditing(false);
        } catch (err) {
            console.error('Error saving:', err);
            alert(t.errorSavingCar);
        }
    };

    const handleEdit = () => {
        setForm(carData);
        setEditing(true);
    };

    const handleReset = async () => {
        try {
            await onSave(DEFAULT_CAR);
            setForm(DEFAULT_CAR);
            setEditing(true);
        } catch (err) {
            console.error('Error resetting:', err);
        }
    };

    const updateField = (field: keyof CarData, value: string | number) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    const handleEditDeal = (deal: ChargerDeal) => {
        setEditingDealId(deal.id);
        setDealName(deal.name);
        setDealPricePerKWh(String(deal.pricePerKWh));
        setDealChargeType(deal.chargeType);
    };

    const handleSaveDeal = async () => {
        const normalizedPrice = dealPricePerKWh.replace(/,/g, '.');
        const parsedPrice = Number(normalizedPrice);
        if (!dealName.trim() || !Number.isFinite(parsedPrice) || parsedPrice <= 0) {
            return;
        }

        try {
            if (editingDealId) {
                await onUpdateDeal({
                    id: editingDealId,
                    name: dealName.trim(),
                    pricePerKWh: parsedPrice,
                    chargeType: dealChargeType,
                });
            } else {
                await onAddDeal({
                    name: dealName.trim(),
                    pricePerKWh: parsedPrice,
                    chargeType: dealChargeType,
                });
            }
            resetDealForm();
        } catch (err) {
            console.error('Error saving deal:', err);
            alert(t.errorSavingDeal);
        }
    };

    const handleDeleteDeal = async (id: string) => {
        try {
            await onDeleteDeal(id);
            if (editingDealId === id) {
                resetDealForm();
            }
        } catch (err) {
            console.error('Error deleting deal:', err);
            alert(t.errorSavingDeal);
        }
    };

    const chargeTypeLabel = (type: 'ac' | 'dc' | 'both'): string => {
        if (type === 'ac') return t.chargeTypeAc;
        if (type === 'dc') return t.chargeTypeDc;
        return t.chargeTypeBoth;
    };

    const dealsSection = (
        <section className="space-y-3">
            <div className="flex items-center gap-2">
                <Tag size={16} className="text-[var(--color-primary)]" />
                <h3 className="text-base font-semibold text-[var(--color-text)]">{t.chargerDeals}</h3>
            </div>

            <div className="bg-[var(--color-card)] rounded-2xl p-4 shadow-sm border border-[var(--color-border)] space-y-3">
                {deals.length === 0 ? (
                    <p className="text-sm text-[var(--color-text-muted)]">{t.noDealsYet}</p>
                ) : (
                    deals.map((deal) => (
                        <div
                            key={deal.id}
                            className="flex items-center justify-between gap-3 py-2 border-b border-[var(--color-border)] last:border-b-0"
                        >
                            <div className="min-w-0 flex-1">
                                <p className="font-medium truncate">{deal.name}</p>
                                <p className="text-xs text-[var(--color-text-muted)]">
                                    {deal.pricePerKWh.toFixed(2)} €/kWh · {chargeTypeLabel(deal.chargeType)}
                                </p>
                            </div>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => handleEditDeal(deal)}
                                    className="p-2 rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-highlight-muted)] active:scale-90 transition-transform"
                                    aria-label={t.editDeal}
                                >
                                    <Edit3 size={14} />
                                </button>
                                <button
                                    onClick={() => handleDeleteDeal(deal.id)}
                                    className="p-2 rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-highlight-muted)] active:scale-90 transition-transform"
                                    aria-label={t.deleteDeal}
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className="bg-[var(--color-card)] rounded-2xl p-4 shadow-sm border border-[var(--color-border)] space-y-3">
                <h4 className="font-medium text-sm text-[var(--color-text)]">
                    {editingDealId ? t.editDeal : t.addDeal}
                </h4>
                <div>
                    <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1.5">{t.dealName}</label>
                    <input
                        type="text"
                        value={dealName}
                        onChange={(e) => setDealName(e.target.value)}
                        placeholder={t.dealNamePlaceholder}
                        className="w-full px-4 py-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] text-base focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                    />
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1.5">{t.pricePerKWh}</label>
                        <input
                            type="number"
                            inputMode="decimal"
                            value={dealPricePerKWh}
                            onChange={(e) => setDealPricePerKWh(e.target.value)}
                            placeholder={t.pricePerKWhPlaceholder}
                            step="0.01"
                            className="w-full px-4 py-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] text-base focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1.5">{t.chargeType}</label>
                        <select
                            value={dealChargeType}
                            onChange={(e) => setDealChargeType(e.target.value as 'ac' | 'dc' | 'both')}
                            className="w-full px-4 py-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] text-base focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                        >
                            <option value="both">{t.chargeTypeBoth}</option>
                            <option value="ac">{t.chargeTypeAc}</option>
                            <option value="dc">{t.chargeTypeDc}</option>
                        </select>
                    </div>
                </div>

                <div className="flex gap-2">
                    {editingDealId && (
                        <button
                            onClick={resetDealForm}
                            className="flex-1 py-3 rounded-xl border border-[var(--color-border)] text-[var(--color-text)] font-medium active:scale-95 transition-transform"
                        >
                            {t.cancel}
                        </button>
                    )}
                    <button
                        onClick={handleSaveDeal}
                        disabled={!dealName.trim() || !dealPricePerKWh || parseFloat(dealPricePerKWh) <= 0}
                        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-[var(--color-primary)] text-white font-medium disabled:opacity-40 active:scale-95 transition-transform"
                    >
                        {editingDealId ? <Save size={16} /> : <Plus size={16} />}
                        {editingDealId ? t.save : t.addDeal}
                    </button>
                </div>
            </div>
        </section>
    );

    if (!editing && carData.name) {
        return (
            <div className="p-4 space-y-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-[var(--color-text)]">{t.myCar}</h2>
                    <div className="flex gap-2">
                        <button
                            onClick={handleEdit}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[var(--color-primary)] text-white text-sm font-medium active:scale-95 transition-transform"
                        >
                            <Edit3 size={16} />
                            {t.edit}
                        </button>
                    </div>
                </div>

                <div className="bg-[var(--color-card)] rounded-2xl p-5 shadow-sm border border-[var(--color-border)]">
                    <div className="flex items-center gap-3 mb-5">
                        <div className="w-12 h-12 rounded-xl bg-[var(--color-highlight)] flex items-center justify-center">
                            <Car size={24} className="text-[var(--color-primary)]" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-lg">{carData.name}</h3>
                            <p className="text-sm text-[var(--color-text-muted)]">{t.vehicleData}</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex justify-between items-center py-3 border-b border-[var(--color-border)]">
                            <span className="text-[var(--color-text-muted)]">{t.batteryCapacity}</span>
                            <span className="font-semibold">{carData.batteryCapacityKWh} kWh</span>
                        </div>
                        <div className="flex justify-between items-center py-3 border-b border-[var(--color-border)]">
                            <span className="text-[var(--color-text-muted)]">{t.maxDCCharging}</span>
                            <span className="font-semibold">{carData.maxDCChargingKW} kW</span>
                        </div>
                        <div className="flex justify-between items-center py-3">
                            <span className="text-[var(--color-text-muted)]">{t.maxACCharging}</span>
                            <span className="font-semibold">{carData.maxACChargingKW} kW</span>
                        </div>
                    </div>
                </div>

                <button
                    onClick={handleReset}
                    className="flex items-center gap-1.5 mx-auto text-sm text-[var(--color-text-muted)] active:scale-95 transition-transform"
                >
                    <RotateCcw size={14} />
                    {t.resetVehicle}
                </button>

                {dealsSection}
            </div>
        );
    }

    return (
        <div className="p-4 space-y-6">
            <h2 className="text-xl font-bold text-[var(--color-text)]">
                {carData.name ? t.editVehicle : t.setupVehicle}
            </h2>

            <div className="bg-[var(--color-card)] rounded-2xl p-5 shadow-sm border border-[var(--color-border)] space-y-5">
                <div>
                    <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1.5">
                        {t.vehicleName}
                    </label>
                    <input
                        type="text"
                        value={form.name}
                        onChange={(e) => updateField('name', e.target.value)}
                        placeholder={t.vehicleNamePlaceholder}
                        className="w-full px-4 py-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] text-base focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1.5">
                        {t.batteryCapacityLabel}
                    </label>
                    <input
                        type="number"
                        inputMode="decimal"
                        value={form.batteryCapacityKWh || ''}
                        onChange={(e) => updateField('batteryCapacityKWh', parseFloat(e.target.value) || 0)}
                        placeholder={t.batteryCapacityPlaceholder}
                        className="w-full px-4 py-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] text-base focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1.5">
                        {t.maxDCLabel}
                    </label>
                    <input
                        type="number"
                        inputMode="decimal"
                        value={form.maxDCChargingKW || ''}
                        onChange={(e) => updateField('maxDCChargingKW', parseFloat(e.target.value) || 0)}
                        placeholder={t.maxDCPlaceholder}
                        className="w-full px-4 py-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] text-base focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1.5">
                        {t.maxACLabel}
                    </label>
                    <input
                        type="number"
                        inputMode="decimal"
                        value={form.maxACChargingKW || ''}
                        onChange={(e) => updateField('maxACChargingKW', parseFloat(e.target.value) || 0)}
                        placeholder={t.maxACPlaceholder}
                        className="w-full px-4 py-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] text-base focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition"
                    />
                </div>
            </div>

            <div className="flex gap-3">
                {carData.name && (
                    <button
                        onClick={() => setEditing(false)}
                        className="flex-1 py-3 rounded-xl border border-[var(--color-border)] text-[var(--color-text)] font-medium active:scale-95 transition-transform"
                    >
                        {t.cancel}
                    </button>
                )}
                <button
                    onClick={handleSave}
                    disabled={!form.name.trim()}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-[var(--color-primary)] text-white font-medium disabled:opacity-40 active:scale-95 transition-transform"
                >
                    <Save size={18} />
                    {t.save}
                </button>
            </div>

            {dealsSection}
        </div>
    );
}
