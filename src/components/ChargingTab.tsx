import { useState, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
    Plus,
    Zap,
    TrendingUp,
    Edit3,
    Trash2,
    X,
} from 'lucide-react';
import type { ChargingSession } from '../types';
import { useI18n } from '../i18n/I18nContext';

interface ChargingTabProps {
    sessions: ChargingSession[];
    onAddSession: (session: ChargingSession) => Promise<void>;
    onUpdateSession: (session: ChargingSession) => Promise<void>;
    onDeleteSession: (id: string) => Promise<void>;
}

export function ChargingTab({ sessions, onAddSession, onUpdateSession, onDeleteSession }: ChargingTabProps) {
    const [showForm, setShowForm] = useState(false);
    const [kWh, setKWh] = useState('');
    const [pricePerKWh, setPricePerKWh] = useState('');
    const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
    const [note, setNote] = useState('');
    const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
    const [editKWh, setEditKWh] = useState('');
    const [editPricePerKWh, setEditPricePerKWh] = useState('');
    const [editDate, setEditDate] = useState('');
    const [editNote, setEditNote] = useState('');
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const { t, locale } = useI18n();

    const localeTag = locale === 'de' ? 'de-DE' : 'en-US';

    const formatCurrency = (value: number): string =>
        value.toLocaleString(localeTag, { style: 'currency', currency: 'EUR' });

    const formatDate = (isoDate: string): string =>
        new Date(isoDate).toLocaleDateString(localeTag, { day: '2-digit', month: '2-digit', year: 'numeric' });

    // Current month stats
    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const currentMonthLabel = `${t.months[now.getMonth()]} ${now.getFullYear()}`;

    const currentMonthStats = useMemo(() => {
        const monthSessions = sessions.filter((s) => {
            const d = new Date(s.date);
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` === currentMonthKey;
        });
        const totalCost = monthSessions.reduce((sum, s) => sum + s.totalCost, 0);
        const totalKWh = monthSessions.reduce((sum, s) => sum + s.kWhCharged, 0);
        return { totalCost, totalKWh, count: monthSessions.length };
    }, [sessions, currentMonthKey]);

    const handleAddSession = async () => {
        const kWhNum = parseFloat(kWh);
        const priceNum = parseFloat(pricePerKWh);
        if (isNaN(kWhNum) || isNaN(priceNum) || kWhNum <= 0 || priceNum <= 0) return;

        const totalCost = Math.round(kWhNum * priceNum * 100) / 100;

        const newSession: ChargingSession = {
            id: uuidv4(),
            date,
            kWhCharged: kWhNum,
            pricePerKWh: priceNum,
            totalCost,
            note: note.trim() || undefined,
        };

        try {
            await onAddSession(newSession);
            setKWh('');
            setPricePerKWh('');
            setDate(new Date().toISOString().slice(0, 10));
            setNote('');
            setShowForm(false);
        } catch (err) {
            console.error('Error saving:', err);
            alert(t.errorSavingSession);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await onDeleteSession(id);
        } catch (err) {
            console.error('Error deleting:', err);
        }
        if (editingSessionId === id) {
            setEditingSessionId(null);
        }
        setDeleteConfirm(null);
    };

    const startEdit = (session: ChargingSession) => {
        setEditingSessionId(session.id);
        setEditDate(session.date);
        setEditKWh(String(session.kWhCharged));
        setEditPricePerKWh(String(session.pricePerKWh));
        setEditNote(session.note ?? '');
        setDeleteConfirm(null);
    };

    const cancelEdit = () => {
        setEditingSessionId(null);
        setEditDate('');
        setEditKWh('');
        setEditPricePerKWh('');
        setEditNote('');
    };

    const handleUpdateSession = async (id: string) => {
        const kWhNum = parseFloat(editKWh);
        const priceNum = parseFloat(editPricePerKWh);
        if (isNaN(kWhNum) || isNaN(priceNum) || kWhNum <= 0 || priceNum <= 0 || !editDate) return;

        const updatedSession: ChargingSession = {
            id,
            date: editDate,
            kWhCharged: kWhNum,
            pricePerKWh: priceNum,
            totalCost: Math.round(kWhNum * priceNum * 100) / 100,
            note: editNote.trim() || undefined,
        };

        try {
            await onUpdateSession(updatedSession);
            cancelEdit();
        } catch (err) {
            console.error('Error updating:', err);
            alert(t.errorSavingSession);
        }
    };

    return (
        <div className="p-4 space-y-5 pb-24">
            {/* Current Month Summary Cards */}
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-[var(--color-card)] rounded-2xl p-4 shadow-sm border border-[var(--color-border)]">
                    <div className="flex items-center gap-2 mb-1">
                        <TrendingUp size={16} className="text-[var(--color-primary)]" />
                        <span className="text-xs text-[var(--color-text-muted)]">{t.total}</span>
                    </div>
                    <p className="text-lg font-bold">{formatCurrency(currentMonthStats.totalCost)}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">{currentMonthLabel} · {currentMonthStats.count} {t.charges}</p>
                </div>
                <div className="bg-[var(--color-card)] rounded-2xl p-4 shadow-sm border border-[var(--color-border)]">
                    <div className="flex items-center gap-2 mb-1">
                        <Zap size={16} className="text-[var(--color-accent)]" />
                        <span className="text-xs text-[var(--color-text-muted)]">{t.energy}</span>
                    </div>
                    <p className="text-lg font-bold">{currentMonthStats.totalKWh.toFixed(1)} kWh</p>
                    <p className="text-xs text-[var(--color-text-muted)]">
                        ⌀ {currentMonthStats.totalKWh > 0 ? (currentMonthStats.totalCost / currentMonthStats.totalKWh).toFixed(2) : '0.00'} €/kWh
                    </p>
                </div>
            </div>

            {/* Add Button */}
            {!showForm && (
                <button
                    onClick={() => setShowForm(true)}
                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-[var(--color-primary)] text-white font-medium shadow-sm active:scale-[0.98] transition-transform"
                >
                    <Plus size={20} />
                    {t.addChargingSession}
                </button>
            )}

            {/* Add Form */}
            {showForm && (
                <div className="bg-[var(--color-card)] rounded-2xl p-5 shadow-sm border border-[var(--color-border)] space-y-4">
                    <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold text-base">{t.newChargingSession}</h3>
                        <button onClick={() => setShowForm(false)} className="p-1 text-[var(--color-text-muted)]">
                            <X size={20} />
                        </button>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1.5">
                            {t.date}
                        </label>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="w-full min-w-0 appearance-none px-4 py-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] text-base focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1.5">
                                {t.charged}
                            </label>
                            <input
                                type="number"
                                inputMode="decimal"
                                value={kWh}
                                onChange={(e) => setKWh(e.target.value)}
                                placeholder={t.chargedPlaceholder}
                                className="w-full px-4 py-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] text-base focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1.5">
                                {t.pricePerKWh}
                            </label>
                            <input
                                type="number"
                                inputMode="decimal"
                                value={pricePerKWh}
                                onChange={(e) => setPricePerKWh(e.target.value)}
                                placeholder={t.pricePerKWhPlaceholder}
                                step="0.01"
                                className="w-full px-4 py-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] text-base focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                            />
                        </div>
                    </div>

                    {kWh && pricePerKWh && (
                        <div className="bg-[var(--color-highlight)] rounded-xl p-3 text-center">
                            <span className="text-sm text-[var(--color-text-muted)]">{t.cost}: </span>
                            <span className="font-bold text-[var(--color-primary)]">
                                {formatCurrency((parseFloat(kWh) || 0) * (parseFloat(pricePerKWh) || 0))}
                            </span>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1.5">
                            {t.noteOptional}
                        </label>
                        <input
                            type="text"
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder={t.notePlaceholder}
                            className="w-full px-4 py-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] text-base focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                        />
                    </div>

                    <button
                        onClick={handleAddSession}
                        disabled={!kWh || !pricePerKWh || parseFloat(kWh) <= 0 || parseFloat(pricePerKWh) <= 0}
                        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[var(--color-accent)] text-white font-medium disabled:opacity-40 active:scale-95 transition-transform"
                    >
                        <Zap size={18} />
                        {t.save}
                    </button>
                </div>
            )}

            {/* Recent Sessions */}
            {sessions.length > 0 && (
                <div className="space-y-3">
                    <h3 className="font-semibold text-base">{t.recentSessions}</h3>
                    {sessions.slice(0, 20).map((session) => (
                        <div
                            key={session.id}
                            className="bg-[var(--color-card)] rounded-xl p-4 shadow-sm border border-[var(--color-border)]"
                        >
                            {editingSessionId === session.id ? (
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1.5">
                                            {t.date}
                                        </label>
                                        <input
                                            type="date"
                                            value={editDate}
                                            onChange={(e) => setEditDate(e.target.value)}
                                            className="w-full px-4 py-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] text-base focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1.5">
                                                {t.charged}
                                            </label>
                                            <input
                                                type="number"
                                                inputMode="decimal"
                                                value={editKWh}
                                                onChange={(e) => setEditKWh(e.target.value)}
                                                placeholder={t.chargedPlaceholder}
                                                className="w-full px-4 py-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] text-base focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1.5">
                                                {t.pricePerKWh}
                                            </label>
                                            <input
                                                type="number"
                                                inputMode="decimal"
                                                value={editPricePerKWh}
                                                onChange={(e) => setEditPricePerKWh(e.target.value)}
                                                placeholder={t.pricePerKWhPlaceholder}
                                                step="0.01"
                                                className="w-full px-4 py-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] text-base focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1.5">
                                            {t.noteOptional}
                                        </label>
                                        <input
                                            type="text"
                                            value={editNote}
                                            onChange={(e) => setEditNote(e.target.value)}
                                            placeholder={t.notePlaceholder}
                                            className="w-full px-4 py-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] text-base focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                                        />
                                    </div>

                                    <div className="flex gap-2">
                                        <button
                                            onClick={cancelEdit}
                                            className="flex-1 py-2.5 rounded-xl border border-[var(--color-border)] text-[var(--color-text)] font-medium active:scale-95 transition-transform"
                                        >
                                            {t.cancel}
                                        </button>
                                        <button
                                            onClick={() => handleUpdateSession(session.id)}
                                            disabled={!editDate || !editKWh || !editPricePerKWh || parseFloat(editKWh) <= 0 || parseFloat(editPricePerKWh) <= 0}
                                            className="flex-1 py-2.5 rounded-xl bg-[var(--color-primary)] text-white font-medium disabled:opacity-40 active:scale-95 transition-transform"
                                        >
                                            {t.save}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-medium">{formatDate(session.date)}</span>
                                            <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--color-highlight)] text-[var(--color-primary)]">
                                                {session.kWhCharged} kWh
                                            </span>
                                        </div>
                                        <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                                            {session.pricePerKWh.toFixed(2)} €/kWh
                                            {session.note && ` · ${session.note}`}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold text-sm whitespace-nowrap">
                                            {formatCurrency(session.totalCost)}
                                        </span>
                                        <button
                                            onClick={() => startEdit(session)}
                                            className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-highlight-muted)] active:scale-90 transition-transform"
                                        >
                                            <Edit3 size={14} />
                                        </button>
                                        {deleteConfirm === session.id ? (
                                            <div className="flex gap-1">
                                                <button
                                                    onClick={() => handleDelete(session.id)}
                                                    className="p-1.5 rounded-lg bg-[var(--color-highlight-danger)] text-[var(--color-danger)] active:scale-90 transition-transform"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                                <button
                                                    onClick={() => setDeleteConfirm(null)}
                                                    className="p-1.5 rounded-lg bg-[var(--color-highlight-muted)] text-[var(--color-text-muted)] active:scale-90 transition-transform"
                                                >
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => setDeleteConfirm(session.id)}
                                                className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-highlight-muted)] active:scale-90 transition-transform"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {sessions.length === 0 && !showForm && (
                <div className="text-center py-12 text-[var(--color-text-muted)]">
                    <Zap size={48} className="mx-auto mb-3 opacity-30" />
                    <p className="font-medium">{t.noSessionsYet}</p>
                    <p className="text-sm mt-1">{t.addFirstSession}</p>
                </div>
            )}
        </div>
    );
}
