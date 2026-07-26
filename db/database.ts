import * as SQLite from 'expo-sqlite';

/**
 * Central database module for the learning project.
 *
 * Why this module exists:
 * - Keeps SQLite setup in one place.
 * - Gives repository files a single import for DB access.
 * - Initializes schema and starter rows exactly once.
 */

export const DB_NAME = 'illuslookup.db';
let dbInstance: SQLite.SQLiteDatabase | null = null;
let initializationPromise: Promise<void> | null = null;

/**
 * Returns a shared database connection.
 *
 * Reusing one connection keeps DB access predictable and avoids repeatedly
 * opening new handles from multiple screens.
 *
 * @returns {Promise<SQLite.SQLiteDatabase>} Open SQLite database instance.
 */
export async function getDb(): Promise<SQLite.SQLiteDatabase> {
	if (dbInstance) return dbInstance;
	dbInstance = await SQLite.openDatabaseAsync(DB_NAME);
	return dbInstance;
}

/**
 * Creates required tables if they do not yet exist.
 *
 * @returns {Promise<void>} Resolves when schema is ready.
 */
async function createSchema(): Promise<void> {
	const db = await getDb();

	await db.execAsync(`
		PRAGMA journal_mode = WAL;
		CREATE TABLE IF NOT EXISTS illustrations (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			topic TEXT NOT NULL,
			illus TEXT NOT NULL,
			application TEXT NOT NULL,
			sourceLink TEXT NOT NULL,
			createdAt TEXT NOT NULL,
			updatedAt TEXT NOT NULL
		);
		CREATE TABLE IF NOT EXISTS app_meta (
			key TEXT PRIMARY KEY,
			value TEXT NOT NULL
		);
		CREATE INDEX IF NOT EXISTS idx_illustrations_topic
		ON illustrations(topic);
	`);
}

/**
 * Seeds starter rows only when the table is empty.
 *
 * This keeps first-run UX friendly while avoiding duplicate seed inserts.
 *
 * @returns {Promise<void>} Resolves when seeding is complete or skipped.
 */
async function seedIfEmpty(): Promise<void> {
	const db = await getDb();
	const countRow = await db.getFirstAsync<{ count: number }>(
		'SELECT COUNT(*) as count FROM illustrations',
	);

	if (countRow && countRow.count > 0) {
		return;
	}

	const now = new Date().toISOString();
	await db.runAsync(
		`INSERT INTO illustrations
		(topic, illus, application, sourceLink, createdAt, updatedAt)
		VALUES (?, ?, ?, ?, ?, ?)`,
		[
			'Grace Under Pressure',
			'Calm, controlled response under stress.',
			'Team lead de-escalates a production incident.',
			'Seed data',
			now,
			now,
		],
	);

	await db.runAsync(
		`INSERT INTO illustrations
		(topic, illus, application, sourceLink, createdAt, updatedAt)
		VALUES (?, ?, ?, ?, ?, ?)`,
		[
			'Incremental Learning',
			'Small improvements compound over time.',
			'Daily coding practice with reflection notes.',
			'Seed data',
			now,
			now,
		],
	);
}

/**
 * One-time migration to remove duplicate topics caused by earlier init races.
 *
 * Dedup strategy keeps the earliest row (smallest id) for each normalized topic,
 * then deletes later duplicates. A meta flag ensures this runs only once.
 *
 * @returns {Promise<void>} Resolves when cleanup is complete or already applied.
 */
async function cleanupDuplicateTopicsOnce(): Promise<void> {
	const db = await getDb();

	const alreadyRan = await db.getFirstAsync<{ value: string }>(
		`SELECT value FROM app_meta WHERE key = ?`,
		['cleanup_duplicate_topics_v1'],
	);

	if (alreadyRan?.value === 'done') {
		return;
	}

	await db.execAsync(`
		DELETE FROM illustrations
		WHERE id NOT IN (
			SELECT MIN(id)
			FROM illustrations
			GROUP BY LOWER(TRIM(topic))
		);
	`);

	await db.runAsync(
		`INSERT INTO app_meta (key, value)
		 VALUES (?, ?)
		 ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
		['cleanup_duplicate_topics_v1', 'done'],
	);
}

/**
 * Initializes schema + starter seed once per app process.
 *
 * Safe to call repeatedly. After first successful run, later calls no-op.
 *
 * @returns {Promise<void>} Resolves when DB is ready to query.
 */
export async function initializeDatabase(): Promise<void> {
	if (!initializationPromise) {
		initializationPromise = (async () => {
			await createSchema();
			await seedIfEmpty();
			await cleanupDuplicateTopicsOnce();
		})();
	}

	await initializationPromise;
}
