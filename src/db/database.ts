import type { CarData, ChargerDeal, ChargingSession } from '../types';

const API_BASE = '/api';

// ── Car ──

export async function getCar(): Promise<CarData> {
    const res = await fetch(`${API_BASE}/car`);
    if (!res.ok) throw new Error('Failed to fetch car data');
    return res.json();
}

export async function saveCarAndPersist(car: CarData): Promise<void> {
    const res = await fetch(`${API_BASE}/car`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(car),
    });
    if (!res.ok) throw new Error('Failed to save car data');
}

// ── Sessions ──

export async function getAllSessions(): Promise<ChargingSession[]> {
    const res = await fetch(`${API_BASE}/sessions`);
    if (!res.ok) throw new Error('Failed to fetch sessions');
    return res.json();
}

export async function addSessionAndPersist(session: ChargingSession): Promise<void> {
    const res = await fetch(`${API_BASE}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(session),
    });
    if (!res.ok) throw new Error('Failed to save session');
}

export async function updateSessionAndPersist(session: ChargingSession): Promise<void> {
    const res = await fetch(`${API_BASE}/sessions/${session.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            date: session.date,
            kWhCharged: session.kWhCharged,
            pricePerKWh: session.pricePerKWh,
            totalCost: session.totalCost,
            chargerDealId: session.chargerDealId,
            priceSource: session.priceSource,
            note: session.note,
        }),
    });
    if (!res.ok) throw new Error('Failed to update session');
}

export async function deleteSessionAndPersist(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/sessions/${id}`, {
        method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete session');
}

// ── Charger Deals ──

export async function getAllDeals(): Promise<ChargerDeal[]> {
    const res = await fetch(`${API_BASE}/deals`);
    if (!res.ok) {
        if (res.status === 404) return [];
        throw new Error('Failed to fetch deals');
    }

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
        return [];
    }

    const data = await res.json();
    return Array.isArray(data) ? data : [];
}

export async function addDealAndPersist(deal: Omit<ChargerDeal, 'id'>): Promise<void> {
    const res = await fetch(`${API_BASE}/deals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(deal),
    });
    if (!res.ok) throw new Error('Failed to save deal');
}

export async function updateDealAndPersist(deal: ChargerDeal): Promise<void> {
    const res = await fetch(`${API_BASE}/deals/${deal.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: deal.name,
            pricePerKWh: deal.pricePerKWh,
            chargeType: deal.chargeType,
        }),
    });
    if (!res.ok) throw new Error('Failed to update deal');
}

export async function deleteDealAndPersist(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/deals/${id}`, {
        method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete deal');
}

// ── Init (no-op, kept for compatibility) ──
export async function initDatabase(): Promise<void> {
    // Nothing to init – the server handles the database
}
