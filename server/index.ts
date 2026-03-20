import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import Database from 'better-sqlite3';
import mqtt, { type IClientOptions, type MqttClient } from 'mqtt';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);
const CSV_PATH = process.env.CSV_PATH || '';
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const TOPIC_SEGMENT_REGEX = /^[a-zA-Z0-9_\-/]+$/;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const MQTT_ENV_ENABLED = process.env.MQTT_ENABLED === 'true';
const MQTT_ENV_BROKER_URL = process.env.MQTT_BROKER_URL || '';
const MQTT_ENV_USERNAME = process.env.MQTT_USERNAME || '';
const MQTT_ENV_PASSWORD = process.env.MQTT_PASSWORD || '';
const MQTT_ENV_TOPIC_PREFIX = process.env.MQTT_TOPIC_PREFIX || 'chargeflow';
const MQTT_ENV_DISCOVERY_PREFIX = process.env.MQTT_DISCOVERY_PREFIX || 'homeassistant';
const MQTT_ENV_CLIENT_ID = process.env.MQTT_CLIENT_ID || '';

interface CarData {
    name: string;
    batteryCapacityKWh: number;
    maxDCChargingKW: number;
    maxACChargingKW: number;
}

interface ChargingSession {
    id: string;
    date: string;
    kWhCharged: number;
    pricePerKWh: number;
    totalCost: number;
    chargerDealId?: string;
    chargerDealName?: string;
    priceSource?: 'deal' | 'custom';
    note?: string;
}

interface ChargerDeal {
    id: string;
    name: string;
    pricePerKWh: number;
    chargeType: 'ac' | 'dc' | 'both';
}

interface MqttConfig {
    enabled: boolean;
    brokerUrl: string;
    username: string;
    password: string;
    topicPrefix: string;
    discoveryPrefix: string;
    clientId: string;
}

interface HomeAssistantDiscoverySensor {
    objectId: string;
    name: string;
    uniqueSuffix: string;
    valueTemplate: string;
    unitOfMeasurement?: string;
    deviceClass?: string;
    stateClass?: string;
    icon?: string;
}

let mqttClient: MqttClient | null = null;
let mqttClientConfigKey = '';

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
        charger_deal_id TEXT,
        price_source TEXT,
    note TEXT
  );
`);

db.exec(`
    CREATE TABLE IF NOT EXISTS charger_deal (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        price_per_kwh REAL NOT NULL,
        charge_type TEXT NOT NULL
    );
`);

const sessionColumns = db.prepare(`PRAGMA table_info(charging_session)`).all() as Array<Record<string, unknown>>;
const sessionColumnNames = new Set(sessionColumns.map((column) => String(column.name)));
if (!sessionColumnNames.has('charger_deal_id')) {
    db.exec('ALTER TABLE charging_session ADD COLUMN charger_deal_id TEXT');
}
if (!sessionColumnNames.has('price_source')) {
    db.exec('ALTER TABLE charging_session ADD COLUMN price_source TEXT');
}

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_session_date ON charging_session(date DESC);
`);

db.exec(`
    CREATE TABLE IF NOT EXISTS mqtt_config (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        enabled INTEGER NOT NULL DEFAULT 0,
        broker_url TEXT NOT NULL DEFAULT '',
        username TEXT NOT NULL DEFAULT '',
        password TEXT NOT NULL DEFAULT '',
        topic_prefix TEXT NOT NULL DEFAULT 'chargeflow',
        discovery_prefix TEXT NOT NULL DEFAULT 'homeassistant',
        client_id TEXT NOT NULL DEFAULT ''
    );
`);

db.prepare(`
    INSERT INTO mqtt_config (id, enabled, broker_url, username, password, topic_prefix, discovery_prefix, client_id)
    VALUES (1, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO NOTHING
`).run(
    MQTT_ENV_ENABLED ? 1 : 0,
    MQTT_ENV_BROKER_URL,
    MQTT_ENV_USERNAME,
    MQTT_ENV_PASSWORD,
    MQTT_ENV_TOPIC_PREFIX,
    MQTT_ENV_DISCOVERY_PREFIX,
    MQTT_ENV_CLIENT_ID
);

// ── Middleware ──
app.disable('x-powered-by');
// Trust X-Forwarded-Proto only from loopback (127.0.0.1/::1) and private-network
// addresses (RFC-1918 / ULA). This covers any standard nginx reverse-proxy deployment
// while preventing external clients from spoofing the header to manipulate the CSP.
app.set('trust proxy', ['loopback', 'uniquelocal']);
app.use(
    helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                imgSrc: ["'self'", 'data:'],
                connectSrc: ["'self'"],
                objectSrc: ["'none'"],
                baseUri: ["'self'"],
                frameAncestors: ["'none'"],
                formAction: ["'self'"],
                // Omit upgrade-insecure-requests from the static helmet config; it is
                // added dynamically below only when the request arrives over HTTPS.
                // Without this, helmet's default injects the directive unconditionally,
                // which causes browsers to reload JS/CSS assets over HTTPS even when the
                // server is accessed over plain HTTP — resulting in a blank white page.
                upgradeInsecureRequests: null,
            },
        },
        crossOriginEmbedderPolicy: false,
    })
);
// Append upgrade-insecure-requests only when the connection is HTTPS.
// Because trust proxy is restricted to loopback/private-network addresses,
// req.protocol can only be 'https' when X-Forwarded-Proto is set by a real
// local proxy — external clients cannot spoof it.
app.use((req, res, next) => {
    if (req.protocol === 'https') {
        const csp = res.getHeader('Content-Security-Policy');
        if (typeof csp === 'string') {
            res.setHeader('Content-Security-Policy', `${csp}; upgrade-insecure-requests`);
        }
    }
    next();
});
app.use(express.json({ limit: '100kb' }));

const mutationLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' },
});
const mutationMiddleware = IS_PRODUCTION ? [mutationLimiter] : [];

// ── CSV Export ──

function escapeCsvField(value: string): string {
    let safeValue = value;

    // CSV formula injection mitigation (Excel/Sheets)
    if (/^[=+\-@\t\r]/.test(safeValue)) {
        safeValue = `'${safeValue}`;
    }

    if (safeValue.includes(',') || safeValue.includes('"') || safeValue.includes('\n')) {
        return `"${safeValue.replace(/"/g, '""')}"`;
    }
    return safeValue;
}

function syncCsv(): void {
    if (!CSV_PATH) return;
    try {
        const dir = path.dirname(CSV_PATH);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

        const car = db.prepare('SELECT name, battery_capacity_kwh, max_dc_charging_kw, max_ac_charging_kw FROM car WHERE id = 1').get() as Record<string, unknown> | undefined;
        const sessions = db.prepare(`
            SELECT
                s.id,
                s.date,
                s.kwh_charged,
                s.price_per_kwh,
                s.total_cost,
                s.price_source,
                s.note,
                d.name AS charger_deal_name,
                d.charge_type AS charger_deal_charge_type
            FROM charging_session s
            LEFT JOIN charger_deal d ON d.id = s.charger_deal_id
            ORDER BY s.date DESC
        `).all() as Record<string, unknown>[];
        const deals = db.prepare('SELECT id, name, price_per_kwh, charge_type FROM charger_deal ORDER BY name COLLATE NOCASE ASC').all() as Record<string, unknown>[];

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

        // Section: Charger deals
        lines.push('# Charger Deals');
        lines.push('Name,Price/kWh (EUR),Charge Type');
        for (const deal of deals) {
            lines.push([
                escapeCsvField(String(deal.name)),
                String(deal.price_per_kwh),
                escapeCsvField(String(deal.charge_type)),
            ].join(','));
        }

        lines.push('');

        // Section: Charging sessions
        lines.push('# Charging Sessions');
        lines.push('Date,kWh,Price/kWh (EUR),Price Source,Deal Name,Deal Type,Total Cost (EUR),Note');
        for (const s of sessions) {
            lines.push([
                escapeCsvField(String(s.date)),
                String(s.kwh_charged),
                String(s.price_per_kwh),
                escapeCsvField(String(s.price_source ?? '')),
                escapeCsvField(String(s.charger_deal_name ?? '')),
                escapeCsvField(String(s.charger_deal_charge_type ?? '')),
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

function getCarData(): CarData {
    const row = db.prepare('SELECT name, battery_capacity_kwh, max_dc_charging_kw, max_ac_charging_kw FROM car WHERE id = 1').get() as Record<string, unknown> | undefined;
    if (!row) {
        return { name: '', batteryCapacityKWh: 0, maxDCChargingKW: 0, maxACChargingKW: 0 };
    }
    return {
        name: String(row.name),
        batteryCapacityKWh: Number(row.battery_capacity_kwh),
        maxDCChargingKW: Number(row.max_dc_charging_kw),
        maxACChargingKW: Number(row.max_ac_charging_kw),
    };
}

function getSessionsData(): ChargingSession[] {
    const rows = db.prepare(`
        SELECT
            s.id,
            s.date,
            s.kwh_charged,
            s.price_per_kwh,
            s.total_cost,
            s.price_source,
            s.note,
            s.charger_deal_id,
            d.name AS charger_deal_name
        FROM charging_session s
        LEFT JOIN charger_deal d ON d.id = s.charger_deal_id
        ORDER BY s.date DESC
    `).all() as Record<string, unknown>[];
    return rows.map((row) => ({
        id: String(row.id),
        date: String(row.date),
        kWhCharged: Number(row.kwh_charged),
        pricePerKWh: Number(row.price_per_kwh),
        totalCost: Number(row.total_cost),
        chargerDealId: row.charger_deal_id ? String(row.charger_deal_id) : undefined,
        chargerDealName: row.charger_deal_name ? String(row.charger_deal_name) : undefined,
        priceSource: row.price_source === 'deal' || row.price_source === 'custom'
            ? row.price_source
            : undefined,
        note: row.note ? String(row.note) : undefined,
    }));
}

function getDealsData(): ChargerDeal[] {
    const rows = db.prepare('SELECT id, name, price_per_kwh, charge_type FROM charger_deal ORDER BY name COLLATE NOCASE ASC').all() as Record<string, unknown>[];
    return rows.map((row) => ({
        id: String(row.id),
        name: String(row.name),
        pricePerKWh: Number(row.price_per_kwh),
        chargeType: row.charge_type === 'ac' || row.charge_type === 'dc' || row.charge_type === 'both'
            ? row.charge_type
            : 'both',
    }));
}

function getMqttConfig(): MqttConfig {
    const row = db.prepare('SELECT enabled, broker_url, username, password, topic_prefix, discovery_prefix, client_id FROM mqtt_config WHERE id = 1').get() as Record<string, unknown> | undefined;
    if (!row) {
        return {
            enabled: false,
            brokerUrl: '',
            username: '',
            password: '',
            topicPrefix: 'chargeflow',
            discoveryPrefix: 'homeassistant',
            clientId: '',
        };
    }
    return {
        enabled: Number(row.enabled) === 1,
        brokerUrl: String(row.broker_url),
        username: String(row.username),
        password: String(row.password),
        topicPrefix: String(row.topic_prefix),
        discoveryPrefix: String(row.discovery_prefix),
        clientId: String(row.client_id),
    };
}

function normalizeTopicSegment(input: string): string {
    return input
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_\-/]+/g, '_')
        .replace(/_+/g, '_')
        .replace(/^[_/-]+|[_/-]+$/g, '') || 'chargeflow';
}

function buildMqttDeviceId(carName: string): string {
    const slug = normalizeTopicSegment(carName || 'car');
    return `chargeflow_${slug.replace(/[-/]/g, '_')}`;
}

function getMqttClientConfigKey(config: MqttConfig): string {
    return [config.brokerUrl, config.username, config.password, config.clientId].join('|');
}

function publishMqtt(client: MqttClient, topic: string, payload: string, retain = true): Promise<void> {
    return new Promise((resolve, reject) => {
        client.publish(topic, payload, { qos: 1, retain }, (err) => {
            if (err) {
                reject(err);
                return;
            }
            resolve();
        });
    });
}

function validateMqttConfig(config: MqttConfig): string | null {
    if (typeof config.enabled !== 'boolean') {
        return 'Invalid enabled (boolean required)';
    }
    if (typeof config.brokerUrl !== 'string' || config.brokerUrl.length > 500) {
        return 'Invalid brokerUrl (string, max 500 chars)';
    }
    if (config.enabled && config.brokerUrl.trim().length === 0) {
        return 'brokerUrl is required when MQTT is enabled';
    }
    if (config.enabled && !/^mqtts?:\/\//.test(config.brokerUrl.trim())) {
        return 'brokerUrl must start with mqtt:// or mqtts://';
    }
    if (typeof config.username !== 'string' || config.username.length > 200) {
        return 'Invalid username (max 200 chars)';
    }
    if (typeof config.password !== 'string' || config.password.length > 500) {
        return 'Invalid password (max 500 chars)';
    }
    if (config.enabled && config.username.trim().length === 0) {
        return 'username is required when MQTT is enabled';
    }
    if (config.enabled && config.password.length === 0) {
        return 'password is required when MQTT is enabled';
    }
    if (typeof config.topicPrefix !== 'string' || config.topicPrefix.length === 0 || config.topicPrefix.length > 200) {
        return 'Invalid topicPrefix (string, 1-200 chars)';
    }
    if (!TOPIC_SEGMENT_REGEX.test(config.topicPrefix)) {
        return 'Invalid topicPrefix (allowed: letters, numbers, _, -, /)';
    }
    if (typeof config.discoveryPrefix !== 'string' || config.discoveryPrefix.length === 0 || config.discoveryPrefix.length > 200) {
        return 'Invalid discoveryPrefix (string, 1-200 chars)';
    }
    if (!TOPIC_SEGMENT_REGEX.test(config.discoveryPrefix)) {
        return 'Invalid discoveryPrefix (allowed: letters, numbers, _, -, /)';
    }
    if (typeof config.clientId !== 'string' || config.clientId.length > 200) {
        return 'Invalid clientId (max 200 chars)';
    }
    return null;
}

async function ensureMqttClient(config: MqttConfig): Promise<MqttClient> {
    const configKey = getMqttClientConfigKey(config);
    if (mqttClient && mqttClient.connected && mqttClientConfigKey === configKey) {
        return mqttClient;
    }

    if (mqttClient) {
        mqttClient.end(true);
        mqttClient = null;
        mqttClientConfigKey = '';
    }

    const options: IClientOptions = {
        username: config.username,
        password: config.password,
        reconnectPeriod: 0,
        connectTimeout: 5000,
        clean: true,
        clientId: config.clientId.trim().length > 0
            ? config.clientId.trim()
            : `chargeflow_${Math.random().toString(16).slice(2, 10)}`,
    };

    const client = mqtt.connect(config.brokerUrl.trim(), options);

    await new Promise<void>((resolve, reject) => {
        const onConnect = (): void => {
            client.off('error', onError);
            resolve();
        };
        const onError = (err: Error): void => {
            client.off('connect', onConnect);
            reject(err);
        };

        client.once('connect', onConnect);
        client.once('error', onError);
    });

    mqttClient = client;
    mqttClientConfigKey = configKey;
    return client;
}

function getDiscoverySensors(): HomeAssistantDiscoverySensor[] {
    return [
        {
            objectId: 'car_name',
            name: 'Car Name',
            uniqueSuffix: 'car_name',
            valueTemplate: '{{ value_json.car.name }}',
            icon: 'mdi:car-electric',
        },
        {
            objectId: 'battery_capacity_kwh',
            name: 'Battery Capacity',
            uniqueSuffix: 'battery_capacity_kwh',
            valueTemplate: '{{ value_json.car.batteryCapacityKWh }}',
            unitOfMeasurement: 'kWh',
            stateClass: 'measurement',
            icon: 'mdi:car-battery',
        },
        {
            objectId: 'max_dc_charging_kw',
            name: 'Max DC Charging',
            uniqueSuffix: 'max_dc_charging_kw',
            valueTemplate: '{{ value_json.car.maxDCChargingKW }}',
            unitOfMeasurement: 'kW',
            stateClass: 'measurement',
            icon: 'mdi:lightning-bolt',
        },
        {
            objectId: 'max_ac_charging_kw',
            name: 'Max AC Charging',
            uniqueSuffix: 'max_ac_charging_kw',
            valueTemplate: '{{ value_json.car.maxACChargingKW }}',
            unitOfMeasurement: 'kW',
            stateClass: 'measurement',
            icon: 'mdi:lightning-bolt-outline',
        },
        {
            objectId: 'total_cost',
            name: 'Total Cost',
            uniqueSuffix: 'total_cost',
            valueTemplate: '{{ value_json.statistics.totalCost }}',
            unitOfMeasurement: 'EUR',
            icon: 'mdi:currency-eur',
            stateClass: 'measurement',
        },
        {
            objectId: 'total_kwh',
            name: 'Total Energy',
            uniqueSuffix: 'total_kwh',
            valueTemplate: '{{ value_json.statistics.totalKWh }}',
            unitOfMeasurement: 'kWh',
            deviceClass: 'energy',
            stateClass: 'measurement',
            icon: 'mdi:ev-station',
        },
        {
            objectId: 'session_count',
            name: 'Session Count',
            uniqueSuffix: 'session_count',
            valueTemplate: '{{ value_json.statistics.sessionCount }}',
            stateClass: 'measurement',
            icon: 'mdi:counter',
        },
        {
            objectId: 'avg_price_per_kwh',
            name: 'Avg Price per kWh',
            uniqueSuffix: 'avg_price_per_kwh',
            valueTemplate: '{{ value_json.statistics.avgPricePerKWh }}',
            unitOfMeasurement: 'EUR/kWh',
            stateClass: 'measurement',
            icon: 'mdi:chart-line',
        },
        {
            objectId: 'current_month_kwh',
            name: 'Current Month Energy',
            uniqueSuffix: 'current_month_kwh',
            valueTemplate: '{{ value_json.statistics.currentMonthKWh }}',
            unitOfMeasurement: 'kWh',
            deviceClass: 'energy',
            stateClass: 'measurement',
            icon: 'mdi:calendar-month',
        },
        {
            objectId: 'current_month_cost',
            name: 'Current Month Cost',
            uniqueSuffix: 'current_month_cost',
            valueTemplate: '{{ value_json.statistics.currentMonthCost }}',
            unitOfMeasurement: 'EUR',
            stateClass: 'measurement',
            icon: 'mdi:cash-multiple',
        },
        {
            objectId: 'avg_kwh_per_month',
            name: 'Avg Energy per Month',
            uniqueSuffix: 'avg_kwh_per_month',
            valueTemplate: '{{ value_json.statistics.avgKWhPerMonth }}',
            unitOfMeasurement: 'kWh/month',
            stateClass: 'measurement',
            icon: 'mdi:chart-bar',
        },
        {
            objectId: 'avg_cost_per_month',
            name: 'Avg Cost per Month',
            uniqueSuffix: 'avg_cost_per_month',
            valueTemplate: '{{ value_json.statistics.avgCostPerMonth }}',
            unitOfMeasurement: 'EUR/month',
            stateClass: 'measurement',
            icon: 'mdi:chart-line-variant',
        },
    ];
}

async function pushMqttSnapshot(): Promise<void> {
    const config = getMqttConfig();
    if (!config.enabled) return;

    const validationError = validateMqttConfig(config);
    if (validationError) {
        throw new Error(validationError);
    }

    const car = getCarData();
    const sessions = getSessionsData();
    const deals = getDealsData();
    const deviceName = car.name.trim() || 'ChargeFlow Car';
    const deviceId = buildMqttDeviceId(deviceName);
    const topicPrefix = normalizeTopicSegment(config.topicPrefix);
    const discoveryPrefix = normalizeTopicSegment(config.discoveryPrefix);
    const stateTopic = `${topicPrefix}/${deviceId}/state`;
    const discoveryBase = `${discoveryPrefix}/sensor/${deviceId}`;

    const sessionCount = sessions.length;
    const totalKWh = sessions.reduce((sum, session) => sum + session.kWhCharged, 0);
    const totalCost = sessions.reduce((sum, session) => sum + session.totalCost, 0);
    const avgPricePerKWh = totalKWh > 0 ? totalCost / totalKWh : 0;

    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const monthlyTotals = new Map<string, { kWh: number; cost: number }>();

    for (const session of sessions) {
        const key = session.date.slice(0, 7);
        const entry = monthlyTotals.get(key) || { kWh: 0, cost: 0 };
        entry.kWh += session.kWhCharged;
        entry.cost += session.totalCost;
        monthlyTotals.set(key, entry);
    }

    const currentMonth = monthlyTotals.get(currentMonthKey) || { kWh: 0, cost: 0 };
    const monthCount = monthlyTotals.size;
    const avgKWhPerMonth = monthCount > 0
        ? Array.from(monthlyTotals.values()).reduce((sum, value) => sum + value.kWh, 0) / monthCount
        : 0;
    const avgCostPerMonth = monthCount > 0
        ? Array.from(monthlyTotals.values()).reduce((sum, value) => sum + value.cost, 0) / monthCount
        : 0;

    const statePayload = JSON.stringify({
        updatedAt: new Date().toISOString(),
        car,
        deals,
        sessions,
        statistics: {
            sessionCount,
            totalKWh,
            totalCost,
            avgPricePerKWh,
            currentMonthKWh: currentMonth.kWh,
            currentMonthCost: currentMonth.cost,
            avgKWhPerMonth,
            avgCostPerMonth,
            monthCount,
        },
    });

    const discoverySensors = getDiscoverySensors();

    const client = await ensureMqttClient(config);
    for (const sensor of discoverySensors) {
        const discoveryTopic = `${discoveryBase}/${sensor.objectId}/config`;
        const discoveryPayload = JSON.stringify({
            name: sensor.name,
            unique_id: `${deviceId}_${sensor.uniqueSuffix}`,
            state_topic: stateTopic,
            value_template: sensor.valueTemplate,
            unit_of_measurement: sensor.unitOfMeasurement,
            device_class: sensor.deviceClass,
            state_class: sensor.stateClass,
            icon: sensor.icon,
            json_attributes_topic: stateTopic,
            device: {
                identifiers: [deviceId],
                name: deviceName,
                manufacturer: 'ChargeFlow',
                model: 'EV Charging Tracker',
            },
        });
        await publishMqtt(client, discoveryTopic, discoveryPayload, true);
    }
    await publishMqtt(client, stateTopic, statePayload, true);
}

async function syncExternalTargets(): Promise<void> {
    // Keep CSV export synchronous (part of the core write path)
    syncCsv();
    // Trigger MQTT snapshot asynchronously so API writes don't block on broker health
    void pushMqttSnapshot().catch((err) => {
        console.error('MQTT push error:', err);
    });
}

// Initial sync on startup
syncCsv();
void pushMqttSnapshot().catch((err) => {
    console.error('Initial MQTT push error:', err);
});

// ── Car Routes ──

app.get('/api/car', (_req, res) => {
    res.json(getCarData());
});

app.put('/api/car', ...mutationMiddleware, async (req, res) => {
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
    await syncExternalTargets();
    res.json({ ok: true });
});

// ── Session Routes ──

function validateDealFields(input: {
    name: unknown;
    pricePerKWh: unknown;
    chargeType: unknown;
}): string | null {
    const { name, pricePerKWh, chargeType } = input;

    if (typeof name !== 'string' || name.trim().length === 0 || name.length > 200) {
        return 'Invalid name (string, 1-200 chars)';
    }
    if (typeof pricePerKWh !== 'number' || !isFinite(pricePerKWh) || pricePerKWh <= 0 || pricePerKWh > 100) {
        return 'Invalid pricePerKWh (must be > 0 and <= 100)';
    }
    if (chargeType !== 'ac' && chargeType !== 'dc' && chargeType !== 'both') {
        return 'Invalid chargeType (must be ac, dc or both)';
    }

    return null;
}

app.get('/api/deals', (_req, res) => {
    res.json(getDealsData());
});

app.post('/api/deals', ...mutationMiddleware, async (req, res) => {
    const { name, pricePerKWh, chargeType } = req.body;
    const validationError = validateDealFields({ name, pricePerKWh, chargeType });
    if (validationError) {
        res.status(400).json({ error: validationError });
        return;
    }

    db.prepare(`
        INSERT INTO charger_deal (id, name, price_per_kwh, charge_type)
        VALUES (?, ?, ?, ?)
    `).run(randomUUID(), name.trim(), pricePerKWh, chargeType);

    await syncExternalTargets();
    res.json({ ok: true });
});

app.put('/api/deals/:id', ...mutationMiddleware, async (req, res) => {
    const { id } = req.params;
    if (typeof id !== 'string' || id.trim().length === 0 || id.length > 200) {
        res.status(400).json({ error: 'Invalid id' });
        return;
    }

    const { name, pricePerKWh, chargeType } = req.body;
    const validationError = validateDealFields({ name, pricePerKWh, chargeType });
    if (validationError) {
        res.status(400).json({ error: validationError });
        return;
    }

    const result = db.prepare(`
        UPDATE charger_deal
        SET name = ?, price_per_kwh = ?, charge_type = ?
        WHERE id = ?
    `).run(name.trim(), pricePerKWh, chargeType, id);

    if (result.changes === 0) {
        res.status(404).json({ error: 'Deal not found' });
        return;
    }

    await syncExternalTargets();
    res.json({ ok: true });
});

app.delete('/api/deals/:id', ...mutationMiddleware, async (req, res) => {
    const { id } = req.params;
    if (typeof id !== 'string' || id.trim().length === 0 || id.length > 200) {
        res.status(400).json({ error: 'Invalid id' });
        return;
    }

    db.prepare('UPDATE charging_session SET charger_deal_id = NULL WHERE charger_deal_id = ?').run(id);
    const deleteResult = db.prepare('DELETE FROM charger_deal WHERE id = ?').run(id);

    if (deleteResult.changes === 0) {
        res.status(404).json({ error: 'Deal not found' });
        return;
    }
    await syncExternalTargets();
    res.json({ ok: true });
});

function validateSessionFields(input: {
    date: unknown;
    kWhCharged: unknown;
    pricePerKWh: unknown;
    totalCost: unknown;
    chargerDealId: unknown;
    priceSource: unknown;
    note: unknown;
}): string | null {
    const { date, kWhCharged, pricePerKWh, totalCost, chargerDealId, priceSource, note } = input;

    if (typeof date !== 'string' || !DATE_REGEX.test(date) || isNaN(Date.parse(date))) {
        return 'Invalid date (YYYY-MM-DD format required)';
    }
    if (typeof kWhCharged !== 'number' || !isFinite(kWhCharged) || kWhCharged <= 0 || kWhCharged > 10000) {
        return 'Invalid kWhCharged (must be > 0 and <= 10000)';
    }
    if (typeof pricePerKWh !== 'number' || !isFinite(pricePerKWh) || pricePerKWh <= 0 || pricePerKWh > 100) {
        return 'Invalid pricePerKWh (must be > 0 and <= 100)';
    }
    if (typeof totalCost !== 'number' || !isFinite(totalCost) || totalCost < 0 || totalCost > 100000) {
        return 'Invalid totalCost (must be >= 0 and <= 100000)';
    }
    if (note !== undefined && note !== null && (typeof note !== 'string' || note.length > 500)) {
        return 'Invalid note (max 500 chars)';
    }
    if (chargerDealId !== undefined && chargerDealId !== null && (typeof chargerDealId !== 'string' || chargerDealId.length > 200)) {
        return 'Invalid chargerDealId';
    }
    if (priceSource !== undefined && priceSource !== null && priceSource !== 'deal' && priceSource !== 'custom') {
        return 'Invalid priceSource (must be deal or custom)';
    }

    return null;
}

app.get('/api/sessions', (_req, res) => {
    res.json(getSessionsData());
});

app.post('/api/sessions', ...mutationMiddleware, async (req, res) => {
    const { id, date, kWhCharged, pricePerKWh, totalCost, chargerDealId, priceSource, note } = req.body;

    // Input validation
    if (typeof id !== 'string' || !UUID_REGEX.test(id)) {
        res.status(400).json({ error: 'Invalid id (UUID v4 format required)' });
        return;
    }

    const sessionFieldsError = validateSessionFields({ date, kWhCharged, pricePerKWh, totalCost, chargerDealId, priceSource, note });
    if (sessionFieldsError) {
        res.status(400).json({ error: sessionFieldsError });
        return;
    }

    let persistedDealId: string | null = null;
    if (typeof chargerDealId === 'string' && chargerDealId.trim().length > 0) {
        const dealExists = db.prepare('SELECT 1 FROM charger_deal WHERE id = ?').get(chargerDealId.trim()) as Record<string, unknown> | undefined;
        if (!dealExists) {
            res.status(400).json({ error: 'Selected charger deal does not exist' });
            return;
        }
        persistedDealId = chargerDealId.trim();
    }

    db.prepare(`
    INSERT INTO charging_session (id, date, kwh_charged, price_per_kwh, total_cost, charger_deal_id, price_source, note)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, date, kWhCharged, pricePerKWh, totalCost, persistedDealId, priceSource ?? null, note ?? null);
    await syncExternalTargets();
    res.json({ ok: true });
});

app.put('/api/sessions/:id', ...mutationMiddleware, async (req, res) => {
    const { id } = req.params;
    const { date, kWhCharged, pricePerKWh, totalCost, chargerDealId, priceSource, note } = req.body;

    if (typeof id !== 'string' || id.trim().length === 0 || id.length > 200) {
        res.status(400).json({ error: 'Invalid id' });
        return;
    }

    const sessionFieldsError = validateSessionFields({ date, kWhCharged, pricePerKWh, totalCost, chargerDealId, priceSource, note });
    if (sessionFieldsError) {
        res.status(400).json({ error: sessionFieldsError });
        return;
    }

    let persistedDealId: string | null = null;
    if (typeof chargerDealId === 'string' && chargerDealId.trim().length > 0) {
        const dealExists = db.prepare('SELECT 1 FROM charger_deal WHERE id = ?').get(chargerDealId.trim()) as Record<string, unknown> | undefined;
        if (!dealExists) {
            res.status(400).json({ error: 'Selected charger deal does not exist' });
            return;
        }
        persistedDealId = chargerDealId.trim();
    }

    const result = db.prepare(`
    UPDATE charging_session
    SET date = ?, kwh_charged = ?, price_per_kwh = ?, total_cost = ?, charger_deal_id = ?, price_source = ?, note = ?
    WHERE id = ?
  `).run(date, kWhCharged, pricePerKWh, totalCost, persistedDealId, priceSource ?? null, note ?? null, id);

    if (result.changes === 0) {
        res.status(404).json({ error: 'Session not found' });
        return;
    }

    await syncExternalTargets();
    res.json({ ok: true });
});

app.delete('/api/sessions/:id', ...mutationMiddleware, async (req, res) => {
    db.prepare('DELETE FROM charging_session WHERE id = ?').run(req.params.id);
    await syncExternalTargets();
    res.json({ ok: true });
});

// ── MQTT Routes ──

app.get('/api/mqtt', (_req, res) => {
    const config = getMqttConfig();
    res.json({
        enabled: config.enabled,
        brokerUrl: config.brokerUrl,
        username: config.username,
        passwordSet: config.password.length > 0,
        topicPrefix: config.topicPrefix,
        discoveryPrefix: config.discoveryPrefix,
        clientId: config.clientId,
    });
});

app.put('/api/mqtt', ...mutationMiddleware, async (req, res) => {
    const current = getMqttConfig();
    const payload = req.body as Record<string, unknown>;

    if (payload.enabled !== undefined && typeof payload.enabled !== 'boolean') {
        res.status(400).json({ error: 'Invalid enabled (boolean required)' });
        return;
    }

    const nextConfig: MqttConfig = {
        enabled: payload.enabled === undefined ? current.enabled : payload.enabled,
        brokerUrl: typeof payload.brokerUrl === 'string' ? payload.brokerUrl.trim() : current.brokerUrl,
        username: typeof payload.username === 'string' ? payload.username.trim() : current.username,
        password: typeof payload.password === 'string' ? payload.password : current.password,
        topicPrefix: typeof payload.topicPrefix === 'string' ? payload.topicPrefix.trim() : current.topicPrefix,
        discoveryPrefix: typeof payload.discoveryPrefix === 'string' ? payload.discoveryPrefix.trim() : current.discoveryPrefix,
        clientId: typeof payload.clientId === 'string' ? payload.clientId.trim() : current.clientId,
    };

    const validationError = validateMqttConfig(nextConfig);
    if (validationError) {
        res.status(400).json({ error: validationError });
        return;
    }

    db.prepare(`
            INSERT INTO mqtt_config (id, enabled, broker_url, username, password, topic_prefix, discovery_prefix, client_id)
            VALUES (1, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        enabled = excluded.enabled,
        broker_url = excluded.broker_url,
        username = excluded.username,
        password = excluded.password,
        topic_prefix = excluded.topic_prefix,
        discovery_prefix = excluded.discovery_prefix,
                client_id = excluded.client_id
    `).run(
        nextConfig.enabled ? 1 : 0,
        nextConfig.brokerUrl,
        nextConfig.username,
        nextConfig.password,
        nextConfig.topicPrefix,
        nextConfig.discoveryPrefix,
        nextConfig.clientId
    );

    if (!nextConfig.enabled && mqttClient) {
        mqttClient.end(true);
        mqttClient = null;
        mqttClientConfigKey = '';
    }

    if (nextConfig.enabled) {
        try {
            await pushMqttSnapshot();
        } catch (err) {
            res.status(502).json({
                error: 'MQTT configuration saved, but push failed',
                details: err instanceof Error ? err.message : 'Unknown MQTT error',
            });
            return;
        }
    }

    res.json({ ok: true });
});

app.post('/api/mqtt/push', ...mutationMiddleware, async (_req, res) => {
    const config = getMqttConfig();
    if (!config.enabled) {
        res.status(400).json({ error: 'MQTT is disabled' });
        return;
    }

    try {
        await pushMqttSnapshot();
        res.json({ ok: true });
    } catch (err) {
        res.status(502).json({
            error: 'MQTT push failed',
            details: err instanceof Error ? err.message : 'Unknown MQTT error',
        });
    }
});

app.use('/api/{*path}', (_req, res) => {
    res.status(404).json({ error: 'API route not found' });
});

// Redirect root to /charging
app.get('/', (_req, res) => {
    res.redirect(301, '/charging');
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