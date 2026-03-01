import type { CarData, ChargingSession } from '../types';

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

export async function deleteSessionAndPersist(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/sessions/${id}`, {
        method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete session');
}

// ── Init (no-op, kept for compatibility) ──
export async function initDatabase(): Promise<void> {
    // Nothing to init – the server handles the database
}
