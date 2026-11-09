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
const SEED_COMPLETE_KEY = 'seed_complete_v1';
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
 *     app_meta is a small key-value metadata table
 *     in your local SQLite database
 * What it is used for in your app:
 * - One-time flags for internal app behavior
 *   Example: seed completion marker seed_complete_v1 (one-time seed strategy)
 * - One-time migration markers
 *   Example: cleanup_duplicate_topics_v1 so duplicate cleanup runs once
 * With the current logic in database.ts, deleting all topics/illustrations from inside the app will not re-add seed rows, 
 * because the seed marker stays set in app_meta.
 * Re-seed happens only when the seed marker is missing and illustrations is empty at initialization.
 * 
 * Why this table exists:
 *
 * - It stores app state about the database itself, not user illustration content.
 * - It lets you run “do this once” logic safely across app restarts and upgrades.
 * - Think of it as the database’s settings/history notebook, while illustrations is the actual user data table.
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
 * Marks one-time seed completion in app_meta.
 *
 * @returns {Promise<void>} Resolves when the seed-complete marker is written.
 */
async function markSeedComplete(): Promise<void> {
	const db = await getDb();
	await db.runAsync(
		`INSERT INTO app_meta (key, value)
		 VALUES (?, ?)
		 ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
		[SEED_COMPLETE_KEY, 'done'],
	);
}

/**
 * Seeds starter rows once per database lifecycle.
 *
 * Phase 2.9.3 Step 1: Seed runs only when the seed-complete marker is absent.
 * Phase 2.9.3 Step 2: Legacy DBs with existing rows get marker backfill only.
 *
 * @returns {Promise<void>} Resolves when seeding is complete or skipped.
 */
async function seedOncePerDatabaseLifecycle(): Promise<void> {
	const db = await getDb();
	const seedState = await db.getFirstAsync<{ value: string }>(
		`SELECT value FROM app_meta WHERE key = ?`,
		[SEED_COMPLETE_KEY],
	);

	if (seedState?.value === 'done') {
		return;
	}

	const countRow = await db.getFirstAsync<{ count: number }>(
		'SELECT COUNT(*) as count FROM illustrations',
	);

	if (countRow && countRow.count > 0) {
		// Phase 2.9.3 Step 2: backfill marker for legacy installs without reseeding rows.
		await markSeedComplete();
		return;
	}

	const now = new Date().toISOString();
	await db.runAsync(
		`INSERT INTO illustrations
		(topic, illus, application, sourceLink, createdAt, updatedAt)
		VALUES (?, ?, ?, ?, ?, ?)`,
		[
			'Comparing',
			'If we fill 3 glasses with water all at different levels and view them straight on\n' +
			'we might compare ourselves to one of the glasses maybe the one that has the lowest level...' +
			'and think the other glasses are more valuable since they are higher level.\n' + 
			'But its just a viewpoint issue.' + 
			'However if viewed from top of the glasses, theay appear filled to the same height.',
			'Jehovah views from above, sees us all at the same level.' +
			'Jehovah views us equally as we do what we can.',
			'Morning worship',
			now,
			now,
		],
	);

	await db.runAsync(
		`INSERT INTO illustrations
		(topic, illus, application, sourceLink, createdAt, updatedAt)
		VALUES (?, ?, ?, ?, ?, ?)`,
		[
			'Confidence',
			'Jehovah is like a grand chessmaster, no matter what moves Jehovah\'s opponent the Devil has\n' +
			'Jehovah has countless superior moves and can change world events in a heartbeat.',
			'For Example before  Britain was a world power, there were more powerful nations like the Netherlands\n' +
			'Spain and France, but Britain defeated all these 3 nations. \n' +
			'This victory was prophesied, in the Bible, at Daniel 7:8,24. \n' + 
			'So we can have confidence in Jehovah\'s future chess moves as He destroys this old system to His praise.',
			'Morning worship 9/6/22',
			now,
			now,
		],
	);

	await db.runAsync(
		`INSERT INTO illustrations
		(topic, illus, application, sourceLink, createdAt, updatedAt)
		VALUES (?, ?, ?, ?, ?, ?)`,
		[
			'Resurrection',
			'Leonardo DaVinci started the Mona Lisa in 1503... but not finished by 1517\n' +
			'so for 14 yrs...technically unfinished, but he did complete it \n' +
			'and it is the highest valued painting in the world',
			'We are each like a painting, each one unique, \n' +
			'and when we die we are like that unfinished Mona Lisa painting. \n' + 
			'but Jehovah the greatest artist will not leave it unfinished. Think of it, we are more valuable to jehovah then the Mona Lisa' + 
			'He will finish our portrait when we are resurrected.',
			'A Memorial talk',
			now,
			now,
		],
	);

	await db.runAsync(
		`INSERT INTO illustrations
		(topic, illus, application, sourceLink, createdAt, updatedAt)
		VALUES (?, ?, ?, ?, ?, ?)`,
		[
			'Meditation',
			'If you write something in the sand near the ocean\'s edge,\n' +
			'the waves will soon wash it away.\n' +
			'Or if you write a message in the condensation of a bathroom mirror, it will soon disappear as well.',
			'Quickly reading the Bible, without meditating on it, is like writing in the sand or on a foggy mirror.\n' +
			'By contrast, taking time to meditate, is like carving that message in stone.\n' +
			'This illustrates the importance of meditation and reflection on spiritual matters, which have lasting value.',
			'MW 01-22-24, PS 119:103',
			now,
			now,
		],
	);

	await db.runAsync(
		`INSERT INTO illustrations
		(topic, illus, application, sourceLink, createdAt, updatedAt)
		VALUES (?, ?, ?, ?, ?, ?)`,
		[
			'Unity',
			'When rowing teams are racing, their best chance of winning is related to achieving the "swing".\n' +
			'The swing is a hard-to-define feeling when near-perfect synchronization of motion\n' +
		    'occurs in the shell,or racing boat enhancing the performance and speed.\n' +
			'It only happens when all eight oarsmen are rowing in  perfect unison.\n' +
			'Only then will the shell glide unchecked across the water, fluidly and gracefully carrying its momentum\n' + 			
			'between each pull of the oars.\n',
			'We can achieve \"spiritual swing\" by:  Thinking in agreement, Having unity, and remembering who\'s  in charge: the Christ',
			'Talk:  "The Spiritual Swing"',
			now,
			now,
		],
	);

	await markSeedComplete();
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
			await seedOncePerDatabaseLifecycle();
			await cleanupDuplicateTopicsOnce();
		})();
	}

	await initializationPromise;
}
