import express from 'express';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);
const CSV_PATH = process.env.CSV_PATH || '';

// ── Database Setup ──
const dbPath = process.env.DB_PATH || path.join(__dirname, 'chargeflow.db');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS car (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    name TEXT NOT NULL,
    battery_capacity_kwh REAL NOT NULL,
    max_dc_charging_kw REAL NOT NULL,
    max_ac_charging_kw REAL NOT NULL
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS charging_session (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    kwh_charged REAL NOT NULL,
    price_per_kwh REAL NOT NULL,
    total_cost REAL NOT NULL,
    note TEXT
  );
`);

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_session_date ON charging_session(date DESC);
`);

// ── Middleware ──
app.use(express.json({ limit: '100kb' }));

// ── CSV Export ──

function escapeCsvField(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
}

function syncCsv(): void {
    if (!CSV_PATH) return;
    try {
        const dir = path.dirname(CSV_PATH);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

        const car = db.prepare('SELECT name, battery_capacity_kwh, max_dc_charging_kw, max_ac_charging_kw FROM car WHERE id = 1').get() as Record<string, unknown> | undefined;
        const sessions = db.prepare('SELECT id, date, kwh_charged, price_per_kwh, total_cost, note FROM charging_session ORDER BY date DESC').all() as Record<string, unknown>[];

        const lines: string[] = [];

        // Section: Car data
        lines.push('# Vehicle');
        lines.push('Name,Battery (kWh),Max DC (kW),Max AC (kW)');
        if (car) {
            lines.push([
                escapeCsvField(String(car.name)),
                String(car.battery_capacity_kwh),
                String(car.max_dc_charging_kw),
                String(car.max_ac_charging_kw),
            ].join(','));
        }

        lines.push('');

        // Section: Charging sessions
        lines.push('# Charging Sessions');
        lines.push('Date,kWh,Price/kWh (EUR),Total Cost (EUR),Note');
        for (const s of sessions) {
            lines.push([
                escapeCsvField(String(s.date)),
                String(s.kwh_charged),
                String(s.price_per_kwh),
                String(s.total_cost),
                escapeCsvField(String(s.note ?? '')),
            ].join(','));
        }

        // Section: Monthly summary
        lines.push('');
        lines.push('# Monthly Summary');
        lines.push('Month,Sessions,Total kWh,Total Cost (EUR),Avg Price/kWh (EUR)');

        const monthMap = new Map<string, { count: number; kwh: number; cost: number }>();
        for (const s of sessions) {
            const d = new Date(String(s.date));
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            const entry = monthMap.get(key) || { count: 0, kwh: 0, cost: 0 };
            entry.count++;
            entry.kwh += Number(s.kwh_charged);
            entry.cost += Number(s.total_cost);
            monthMap.set(key, entry);
        }

        const sortedMonths = Array.from(monthMap.entries()).sort(([a], [b]) => b.localeCompare(a));
        for (const [month, data] of sortedMonths) {
            const avg = data.kwh > 0 ? (data.cost / data.kwh) : 0;
            lines.push([
                month,
                String(data.count),
                data.kwh.toFixed(2),
                data.cost.toFixed(2),
                avg.toFixed(4),
            ].join(','));
        }

        fs.writeFileSync(CSV_PATH, lines.join('\n') + '\n', 'utf-8');
        console.log(`CSV synced → ${CSV_PATH}`);
    } catch (err) {
        console.error('CSV sync error:', err);
    }
}

// Initial sync on startup
syncCsv();

// ── Car Routes ──

app.get('/api/car', (_req, res) => {
    const row = db.prepare('SELECT name, battery_capacity_kwh, max_dc_charging_kw, max_ac_charging_kw FROM car WHERE id = 1').get() as Record<string, unknown> | undefined;
    if (!row) {
        res.json({ name: '', batteryCapacityKWh: 0, maxDCChargingKW: 0, maxACChargingKW: 0 });
        return;
    }
    res.json({
        name: row.name,
        batteryCapacityKWh: row.battery_capacity_kwh,
        maxDCChargingKW: row.max_dc_charging_kw,
        maxACChargingKW: row.max_ac_charging_kw,
    });
});

app.put('/api/car', (req, res) => {
    const { name, batteryCapacityKWh, maxDCChargingKW, maxACChargingKW } = req.body;

    // Input validation
    if (typeof name !== 'string' || name.trim().length === 0 || name.length > 200) {
        res.status(400).json({ error: 'Invalid name (string, 1-200 chars)' });
        return;
    }
    if (typeof batteryCapacityKWh !== 'number' || !isFinite(batteryCapacityKWh) || batteryCapacityKWh < 0 || batteryCapacityKWh > 10000) {
        res.status(400).json({ error: 'Invalid batteryCapacityKWh (0-10000)' });
        return;
    }
    if (typeof maxDCChargingKW !== 'number' || !isFinite(maxDCChargingKW) || maxDCChargingKW < 0 || maxDCChargingKW > 10000) {
        res.status(400).json({ error: 'Invalid maxDCChargingKW (0-10000)' });
        return;
    }
    if (typeof maxACChargingKW !== 'number' || !isFinite(maxACChargingKW) || maxACChargingKW < 0 || maxACChargingKW > 10000) {
        res.status(400).json({ error: 'Invalid maxACChargingKW (0-10000)' });
        return;
    }

    db.prepare(`
    INSERT INTO car (id, name, battery_capacity_kwh, max_dc_charging_kw, max_ac_charging_kw)
    VALUES (1, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      battery_capacity_kwh = excluded.battery_capacity_kwh,
      max_dc_charging_kw = excluded.max_dc_charging_kw,
      max_ac_charging_kw = excluded.max_ac_charging_kw
  `).run(name.trim(), batteryCapacityKWh, maxDCChargingKW, maxACChargingKW);
    syncCsv();
    res.json({ ok: true });
});

// ── Session Routes ──

app.get('/api/sessions', (_req, res) => {
    const rows = db.prepare('SELECT id, date, kwh_charged, price_per_kwh, total_cost, note FROM charging_session ORDER BY date DESC').all() as Record<string, unknown>[];
    const sessions = rows.map((row) => ({
        id: row.id,
        date: row.date,
        kWhCharged: row.kwh_charged,
        pricePerKWh: row.price_per_kwh,
        totalCost: row.total_cost,
        note: row.note || undefined,
    }));
    res.json(sessions);
});

app.post('/api/sessions', (req, res) => {
    const { id, date, kWhCharged, pricePerKWh, totalCost, note } = req.body;

    // Input validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (typeof id !== 'string' || !uuidRegex.test(id)) {
        res.status(400).json({ error: 'Invalid id (UUID v4 format required)' });
        return;
    }
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (typeof date !== 'string' || !dateRegex.test(date) || isNaN(Date.parse(date))) {
        res.status(400).json({ error: 'Invalid date (YYYY-MM-DD format required)' });
        return;
    }
    if (typeof kWhCharged !== 'number' || !isFinite(kWhCharged) || kWhCharged <= 0 || kWhCharged > 10000) {
        res.status(400).json({ error: 'Invalid kWhCharged (must be > 0 and <= 10000)' });
        return;
    }
    if (typeof pricePerKWh !== 'number' || !isFinite(pricePerKWh) || pricePerKWh <= 0 || pricePerKWh > 100) {
        res.status(400).json({ error: 'Invalid pricePerKWh (must be > 0 and <= 100)' });
        return;
    }
    if (typeof totalCost !== 'number' || !isFinite(totalCost) || totalCost < 0 || totalCost > 100000) {
        res.status(400).json({ error: 'Invalid totalCost (must be >= 0 and <= 100000)' });
        return;
    }
    if (note !== undefined && note !== null && (typeof note !== 'string' || note.length > 500)) {
        res.status(400).json({ error: 'Invalid note (max 500 chars)' });
        return;
    }

    db.prepare(`
    INSERT INTO charging_session (id, date, kwh_charged, price_per_kwh, total_cost, note)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, date, kWhCharged, pricePerKWh, totalCost, note ?? null);
    syncCsv();
    res.json({ ok: true });
});

app.delete('/api/sessions/:id', (req, res) => {
    db.prepare('DELETE FROM charging_session WHERE id = ?').run(req.params.id);
    syncCsv();
    res.json({ ok: true });
});

// ── Static Files (production) ──
const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));

// SPA fallback – serve index.html for all non-API routes
app.get('/{*path}', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
});

// ── Start ──
app.listen(PORT, '0.0.0.0', () => {
    console.log(`ChargeFlow running on http://0.0.0.0:${PORT}`);
});
