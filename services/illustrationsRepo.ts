import { getDb, initializeDatabase } from '../db/database';
import { CreateIllustrationInput, Illustration } from '../types/illustration';

/**
 * Learning-project repository boundary for illustration queries.
 *
 * Why this file exists:
 * - Screens call this module instead of embedding data access logic.
 * - The implementation can be swapped from mock data to SQLite with minimal UI changes.
 */

/**
 * Returns all illustrations ordered by topic.
 *
 * Phase 2.1 implementation notes:
 * - Ensure schema is initialized before querying.
 * - Read directly from SQLite instead of in-memory demo rows.
 *
 * @returns {Promise<Illustration[]>} A promise containing the list data.
 */
export async function listIllustrations(): Promise<Illustration[]> {
	await initializeDatabase();
	const db = await getDb();

	const rows = await db.getAllAsync<Illustration>(
		`SELECT id, topic, illus, application, sourceLink, createdAt, updatedAt
		 FROM illustrations
		 ORDER BY topic COLLATE NOCASE ASC`,
	);

	return rows;
}

/**
 * Creates and returns a new illustration row.
 *
 * Phase 2.2 implementation notes:
 * - Validates required fields before writing to DB.
 * - Generates createdAt/updatedAt timestamps in repository layer.
 * - Returns the inserted row so UI can react to the created data.
 *
 * @param {CreateIllustrationInput} input New illustration payload from form state.
 * @returns {Promise<Illustration>} Newly created row from SQLite.
 */
export async function createIllustration(
	input: CreateIllustrationInput,
): Promise<Illustration> {
	await initializeDatabase();
	const db = await getDb();

	const topic = input.topic.trim();
	const illus = input.illus.trim();
	const application = input.application.trim();
	const sourceLink = input.sourceLink.trim();

	if (!topic || !illus || !application || !sourceLink) {
		throw new Error('All fields are required to create an illustration.');
	}

	const now = new Date().toISOString();
	const result = await db.runAsync(
		`INSERT INTO illustrations
		(topic, illus, application, sourceLink, createdAt, updatedAt)
		VALUES (?, ?, ?, ?, ?, ?)`,
		[topic, illus, application, sourceLink, now, now],
	);

	const insertedId = result.lastInsertRowId;
	const row = await db.getFirstAsync<Illustration>(
		`SELECT id, topic, illus, application, sourceLink, createdAt, updatedAt
		 FROM illustrations
		 WHERE id = ?`,
		[insertedId],
	);

	if (!row) {
		throw new Error('Illustration was inserted but could not be reloaded.');
	}

	return row;
}
