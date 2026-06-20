import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export const defaultDataDir = resolve(rootDir, 'data');
export const defaultDbPath = resolve(defaultDataDir, 'loadhub.sqlite');
export const defaultWhatsappProfileDir = resolve(defaultDataDir, 'whatsapp-profile');

export function nowIso() {
  return new Date().toISOString();
}

function toBool(value) {
  return Boolean(Number(value));
}

function ensureColumn(db, table, column, definition) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all().map((row) => row.name);
  if (!columns.includes(column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

function hashMessage({ groupName, whatsappMessageId, text, messageTime }) {
  return createHash('sha256')
    .update([groupName, whatsappMessageId ?? '', text, messageTime ?? ''].join('|'))
    .digest('hex');
}

export function openDatabase(dbPath = defaultDbPath) {
  mkdirSync(dirname(dbPath), { recursive: true });
  const db = new DatabaseSync(dbPath);
  db.exec('PRAGMA foreign_keys = ON');
  db.exec('PRAGMA journal_mode = WAL');
  migrate(db);
  seedDefaultSettings(db);
  return db;
}

export function migrate(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      whatsapp_id TEXT UNIQUE,
      name TEXT NOT NULL UNIQUE,
      is_active INTEGER NOT NULL DEFAULT 0,
      last_sync_at TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
      whatsapp_message_id TEXT,
      author TEXT,
      text TEXT NOT NULL,
      message_time TEXT,
      captured_at TEXT NOT NULL,
      hash TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS loads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      message_id INTEGER NOT NULL UNIQUE REFERENCES messages(id) ON DELETE CASCADE,
      load_city TEXT,
      unload_city TEXT,
      load_country TEXT,
      unload_country TEXT,
      load_city_verified INTEGER NOT NULL DEFAULT 0,
      unload_city_verified INTEGER NOT NULL DEFAULT 0,
      load_lat REAL,
      load_lon REAL,
      unload_lat REAL,
      unload_lon REAL,
      load_date TEXT,
      truck_type TEXT,
      weight_tons REAL,
      price TEXT,
      contact TEXT,
      detected_language TEXT,
      translated_text TEXT,
      ai_summary TEXT,
      ai_provider TEXT,
      confidence REAL NOT NULL DEFAULT 0,
      is_manual INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS saved_searches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      query TEXT NOT NULL UNIQUE,
      notifications_enabled INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS places (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      geoname_id INTEGER UNIQUE,
      name TEXT NOT NULL,
      ascii_name TEXT,
      country_code TEXT NOT NULL,
      country_name TEXT NOT NULL,
      lat REAL,
      lon REAL,
      population INTEGER,
      aliases TEXT NOT NULL DEFAULT '[]',
      normalized_aliases TEXT NOT NULL DEFAULT '',
      source TEXT NOT NULL DEFAULT 'manual',
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_places_country_code ON places(country_code);
    CREATE INDEX IF NOT EXISTS idx_places_population ON places(population);

    CREATE VIRTUAL TABLE IF NOT EXISTS loads_fts USING fts5(
      load_id UNINDEXED,
      original_text,
      route,
      truck_type,
      group_name,
      tokenize = 'unicode61 remove_diacritics 2'
    );

    CREATE VIRTUAL TABLE IF NOT EXISTS places_fts USING fts5(
      place_id UNINDEXED,
      name,
      ascii_name,
      country_name,
      aliases,
      tokenize = 'unicode61 remove_diacritics 2'
    );
  `);

  ensureColumn(db, 'loads', 'load_city_verified', 'INTEGER NOT NULL DEFAULT 0');
  ensureColumn(db, 'loads', 'unload_city_verified', 'INTEGER NOT NULL DEFAULT 0');
  ensureColumn(db, 'loads', 'load_lat', 'REAL');
  ensureColumn(db, 'loads', 'load_lon', 'REAL');
  ensureColumn(db, 'loads', 'unload_lat', 'REAL');
  ensureColumn(db, 'loads', 'unload_lon', 'REAL');
  ensureColumn(db, 'loads', 'detected_language', 'TEXT');
  ensureColumn(db, 'loads', 'translated_text', 'TEXT');
  ensureColumn(db, 'loads', 'ai_summary', 'TEXT');
  ensureColumn(db, 'loads', 'ai_provider', 'TEXT');
  ensureColumn(db, 'loads', 'analysis_version', 'TEXT');
}

function seedDefaultSettings(db) {
  const defaults = {
    notificationsEnabled: true,
    compactCards: false,
    aiEnabled: false,
    aiMode: 'local',
    aiEndpoint: '',
    aiModel: '',
    aiApiKey: '',
    translateLanguage: 'ro',
    analysisVersion: '',
    geotransEnabled: false,
    geotransLastSyncAt: null,
    geotransLastSyncCount: 0,
    geotransLastSyncError: '',
    placesImportedAt: null,
    placesImportedCount: 0
  };
  const stmt = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
  for (const [key, value] of Object.entries(defaults)) {
    stmt.run(key, JSON.stringify(value));
  }
}

export function getSettings(db) {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  return Object.fromEntries(rows.map((row) => [row.key, JSON.parse(row.value)]));
}

export function updateSettings(db, patch) {
  const current = getSettings(db);
  const next = { ...current, ...patch };
  const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
  for (const [key, value] of Object.entries(next)) {
    stmt.run(key, JSON.stringify(value));
  }
  return getSettings(db);
}

function mapGroup(row) {
  return {
    id: row.id,
    whatsappId: row.whatsapp_id,
    name: row.name,
    isActive: toBool(row.is_active),
    lastSyncAt: row.last_sync_at,
    createdAt: row.created_at
  };
}

export function upsertGroup(db, { name, whatsappId = null, isActive = null }) {
  const cleanName = String(name ?? '').trim();
  if (!cleanName) throw new Error('Numele grupului lipseste.');

  const existing = db.prepare('SELECT * FROM groups WHERE name = ? OR (whatsapp_id IS NOT NULL AND whatsapp_id = ?)').get(cleanName, whatsappId);
  if (existing) {
    db.prepare(`
      UPDATE groups
      SET whatsapp_id = COALESCE(?, whatsapp_id),
          is_active = CASE WHEN ? IS NULL THEN is_active ELSE ? END
      WHERE id = ?
    `).run(whatsappId, isActive, isActive == null ? null : Number(Boolean(isActive)), existing.id);
    return mapGroup(db.prepare('SELECT * FROM groups WHERE id = ?').get(existing.id));
  }

  const createdAt = nowIso();
  const result = db.prepare(`
    INSERT INTO groups (whatsapp_id, name, is_active, created_at)
    VALUES (?, ?, ?, ?)
  `).run(whatsappId, cleanName, Number(Boolean(isActive)), createdAt);
  return mapGroup(db.prepare('SELECT * FROM groups WHERE id = ?').get(Number(result.lastInsertRowid)));
}

export function listGroups(db) {
  return db.prepare('SELECT * FROM groups ORDER BY is_active DESC, name COLLATE NOCASE ASC').all().map(mapGroup);
}

export function updateGroup(db, id, patch) {
  const fields = [];
  const values = [];
  if ('isActive' in patch) {
    fields.push('is_active = ?');
    values.push(Number(Boolean(patch.isActive)));
  }
  if ('lastSyncAt' in patch) {
    fields.push('last_sync_at = ?');
    values.push(patch.lastSyncAt);
  }
  if (fields.length > 0) {
    values.push(id);
    db.prepare(`UPDATE groups SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  }
  const row = db.prepare('SELECT * FROM groups WHERE id = ?').get(id);
  return row ? mapGroup(row) : null;
}

export function saveParsedMessage(db, message, parsed) {
  const group = upsertGroup(db, {
    name: message.groupName,
    whatsappId: message.groupWhatsappId ?? null
  });
  const capturedAt = message.capturedAt ?? nowIso();
  const hash = hashMessage({
    groupName: group.name,
    whatsappMessageId: message.whatsappMessageId,
    text: message.text,
    messageTime: message.messageTime
  });

  try {
    const messageResult = db.prepare(`
      INSERT INTO messages (group_id, whatsapp_message_id, author, text, message_time, captured_at, hash)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(group.id, message.whatsappMessageId ?? null, message.author ?? null, message.text, message.messageTime ?? null, capturedAt, hash);

    const messageId = Number(messageResult.lastInsertRowid);
    const createdAt = nowIso();
    const loadResult = db.prepare(`
      INSERT INTO loads (
        message_id, load_city, unload_city, load_country, unload_country, load_date,
        load_city_verified, unload_city_verified, load_lat, load_lon, unload_lat, unload_lon,
        truck_type, weight_tons, price, contact, detected_language, translated_text,
        ai_summary, ai_provider, analysis_version, confidence, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      messageId,
      parsed.loadCity,
      parsed.unloadCity,
      parsed.loadCountry,
      parsed.unloadCountry,
      parsed.loadDate,
      Number(Boolean(parsed.loadCityVerified)),
      Number(Boolean(parsed.unloadCityVerified)),
      parsed.loadLat ?? null,
      parsed.loadLon ?? null,
      parsed.unloadLat ?? null,
      parsed.unloadLon ?? null,
      parsed.truckType,
      parsed.weightTons,
      parsed.price,
      parsed.contact,
      parsed.detectedLanguage ?? null,
      parsed.translatedText ?? null,
      parsed.aiSummary ?? null,
      parsed.aiProvider ?? null,
      parsed.analysisVersion ?? null,
      parsed.confidence,
      createdAt,
      createdAt
    );

    const load = getLoad(db, Number(loadResult.lastInsertRowid));
    indexLoad(db, load);
    return { inserted: true, group, load };
  } catch (error) {
    if (String(error.message).includes('UNIQUE')) {
      const existing = db.prepare('SELECT id FROM messages WHERE hash = ?').get(hash);
      const load = existing ? getLoadByMessageId(db, existing.id) : null;
      return { inserted: false, group, load };
    }
    throw error;
  }
}

const loadSelect = `
  SELECT
    l.id,
    l.message_id,
    m.group_id,
    g.name AS group_name,
    m.text AS original_text,
    m.message_time,
    m.captured_at,
    l.load_city,
    l.unload_city,
    l.load_country,
    l.unload_country,
    l.load_city_verified,
    l.unload_city_verified,
    l.load_lat,
    l.load_lon,
    l.unload_lat,
    l.unload_lon,
    l.load_date,
    l.truck_type,
    l.weight_tons,
    l.price,
    l.contact,
    l.detected_language,
    l.translated_text,
    l.ai_summary,
    l.ai_provider,
    l.analysis_version,
    l.confidence,
    l.is_manual,
    l.created_at,
    l.updated_at
  FROM loads l
  JOIN messages m ON m.id = l.message_id
  JOIN groups g ON g.id = m.group_id
`;

function mapLoad(row) {
  return {
    id: row.id,
    messageId: row.message_id,
    groupId: row.group_id,
    groupName: row.group_name,
    originalText: row.original_text,
    messageTime: row.message_time,
    capturedAt: row.captured_at,
    loadCity: row.load_city,
    unloadCity: row.unload_city,
    loadCountry: row.load_country,
    unloadCountry: row.unload_country,
    loadCityVerified: toBool(row.load_city_verified),
    unloadCityVerified: toBool(row.unload_city_verified),
    loadLat: row.load_lat,
    loadLon: row.load_lon,
    unloadLat: row.unload_lat,
    unloadLon: row.unload_lon,
    loadDate: row.load_date,
    truckType: row.truck_type,
    weightTons: row.weight_tons,
    price: row.price,
    contact: row.contact,
    detectedLanguage: row.detected_language,
    translatedText: row.translated_text,
    aiSummary: row.ai_summary,
    aiProvider: row.ai_provider,
    analysisVersion: row.analysis_version,
    confidence: row.confidence,
    isManual: toBool(row.is_manual),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function getLoad(db, id) {
  const row = db.prepare(`${loadSelect} WHERE l.id = ?`).get(id);
  return row ? mapLoad(row) : null;
}

export function getLoadByMessageId(db, messageId) {
  const row = db.prepare(`${loadSelect} WHERE l.message_id = ?`).get(messageId);
  return row ? mapLoad(row) : null;
}

export function listLoads(db, { limit = 200, candidateIds = null } = {}) {
  let rows;
  if (Array.isArray(candidateIds) && candidateIds.length > 0) {
    const placeholders = candidateIds.map(() => '?').join(', ');
    rows = db.prepare(`${loadSelect} WHERE l.id IN (${placeholders}) ORDER BY m.captured_at DESC LIMIT ?`).all(...candidateIds, limit);
  } else {
    rows = db.prepare(`${loadSelect} ORDER BY m.captured_at DESC LIMIT ?`).all(limit);
  }
  return rows.map(mapLoad);
}

export function listAllLoads(db) {
  return db.prepare(`${loadSelect} ORDER BY m.captured_at DESC`).all().map(mapLoad);
}

export function findFtsCandidateIds(db, ftsQuery, limit = 300) {
  if (!ftsQuery) return [];
  try {
    return db.prepare('SELECT load_id FROM loads_fts WHERE loads_fts MATCH ? LIMIT ?').all(ftsQuery, limit).map((row) => row.load_id);
  } catch {
    return [];
  }
}

function indexLoad(db, load) {
  if (!load) return;
  db.prepare('DELETE FROM loads_fts WHERE load_id = ?').run(load.id);
  db.prepare(`
    INSERT INTO loads_fts (load_id, original_text, route, truck_type, group_name)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    load.id,
    [load.originalText, load.translatedText, load.aiSummary].filter(Boolean).join('\n'),
    [load.loadCity, load.loadCountry, load.unloadCity, load.unloadCountry].filter(Boolean).join(' '),
    load.truckType ?? '',
    load.groupName
  );
}

export function updateLoad(db, id, patch, options = {}) {
  const { markManual = true } = options;
  const allowed = {
    loadCity: 'load_city',
    unloadCity: 'unload_city',
    loadCountry: 'load_country',
    unloadCountry: 'unload_country',
    loadCityVerified: 'load_city_verified',
    unloadCityVerified: 'unload_city_verified',
    loadLat: 'load_lat',
    loadLon: 'load_lon',
    unloadLat: 'unload_lat',
    unloadLon: 'unload_lon',
    loadDate: 'load_date',
    truckType: 'truck_type',
    weightTons: 'weight_tons',
    price: 'price',
    contact: 'contact',
    detectedLanguage: 'detected_language',
    translatedText: 'translated_text',
    aiSummary: 'ai_summary',
    aiProvider: 'ai_provider',
    analysisVersion: 'analysis_version'
  };
  const fields = [];
  const values = [];

  for (const [apiKey, column] of Object.entries(allowed)) {
    if (apiKey in patch) {
      fields.push(`${column} = ?`);
      const value = patch[apiKey] === '' ? null : patch[apiKey];
      if (apiKey.endsWith('Verified')) {
        values.push(Number(Boolean(value)));
      } else {
        values.push(value);
      }
    }
  }

  if (fields.length === 0) return getLoad(db, id);
  if (markManual && 'loadCity' in patch && !('loadCityVerified' in patch)) {
    fields.push('load_city_verified = 1');
  }
  if (markManual && 'unloadCity' in patch && !('unloadCityVerified' in patch)) {
    fields.push('unload_city_verified = 1');
  }
  if (markManual) fields.push('is_manual = 1');
  fields.push('updated_at = ?');
  values.push(nowIso(), id);
  db.prepare(`UPDATE loads SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  const load = getLoad(db, id);
  indexLoad(db, load);
  return load;
}

export function listSavedSearches(db) {
  return db.prepare('SELECT * FROM saved_searches ORDER BY created_at DESC').all().map((row) => ({
    id: row.id,
    query: row.query,
    notificationsEnabled: toBool(row.notifications_enabled),
    createdAt: row.created_at
  }));
}

export function createSavedSearch(db, query, notificationsEnabled = true) {
  const cleanQuery = String(query ?? '').trim();
  if (!cleanQuery) throw new Error('Cautarea salvata nu poate fi goala.');
  db.prepare(`
    INSERT INTO saved_searches (query, notifications_enabled, created_at)
    VALUES (?, ?, ?)
    ON CONFLICT(query) DO UPDATE SET notifications_enabled = excluded.notifications_enabled
  `).run(cleanQuery, Number(Boolean(notificationsEnabled)), nowIso());
  return db.prepare('SELECT * FROM saved_searches WHERE query = ?').get(cleanQuery);
}

export function updateSavedSearch(db, id, patch) {
  if ('query' in patch) {
    const cleanQuery = String(patch.query ?? '').trim();
    if (!cleanQuery) throw new Error('Cautarea salvata nu poate fi goala.');
    db.prepare('UPDATE saved_searches SET query = ? WHERE id = ?').run(cleanQuery, id);
  }
  if ('notificationsEnabled' in patch) {
    db.prepare('UPDATE saved_searches SET notifications_enabled = ? WHERE id = ?').run(Number(Boolean(patch.notificationsEnabled)), id);
  }
  return listSavedSearches(db).find((search) => search.id === Number(id)) ?? null;
}

export function deleteSavedSearch(db, id) {
  db.prepare('DELETE FROM saved_searches WHERE id = ?').run(id);
}

export function clearLocalData(db, { clearWhatsappProfile = false, profileDir = defaultWhatsappProfileDir } = {}) {
  db.exec(`
    DELETE FROM loads_fts;
    DELETE FROM loads;
    DELETE FROM messages;
    DELETE FROM groups;
    DELETE FROM saved_searches;
  `);
  updateSettings(db, { notificationsEnabled: false, compactCards: false });
  if (clearWhatsappProfile && existsSync(profileDir)) {
    rmSync(profileDir, { recursive: true, force: true });
  }
}
