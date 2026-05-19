import { getDb, initializeDatabase } from '../db/database';
import { Illustration } from '../types/illustration';

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
