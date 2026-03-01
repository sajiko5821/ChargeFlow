import { useState } from 'react';
import { Car, Save, Edit3, RotateCcw } from 'lucide-react';
import type { CarData } from '../types';
import { useI18n } from '../i18n/I18nContext';

interface CarTabProps {
    carData: CarData;
    onSave: (data: CarData) => void | Promise<void>;
}

const DEFAULT_CAR: CarData = {
    name: '',
    batteryCapacityKWh: 0,
    maxDCChargingKW: 0,
    maxACChargingKW: 0,
};

export function CarTab({ carData, onSave }: CarTabProps) {
    const [editing, setEditing] = useState(!carData.name);
    const [form, setForm] = useState<CarData>(carData.name ? carData : DEFAULT_CAR);
    const { t } = useI18n();

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
        </div>
    );
}
