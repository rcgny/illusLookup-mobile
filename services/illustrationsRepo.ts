import { getDb, initializeDatabase } from '../db/database';
import {
	CreateIllustrationInput,
	Illustration,
	UpdateIllustrationInput,
} from '../types/illustration';

export type ListIllustrationsOptions = {
	topic?: string | null;
	searchText?: string;
	sortBy?: 'topic' | 'createdAt' | 'updatedAt';
	sortDir?: 'ASC' | 'DESC';
};

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
 * - Phase 2.7 Step 1: Support optional DB-level filtering and sorting.
 *
 * @returns {Promise<Illustration[]>} A promise containing the list data.
 */
export async function listIllustrations(
	options: ListIllustrationsOptions = {},
): Promise<Illustration[]> {
	await initializeDatabase();
	const db = await getDb();
	const topic = options.topic?.trim() ?? '';
	const searchText = options.searchText?.trim() ?? '';

	const orderColumns: Record<
		NonNullable<ListIllustrationsOptions['sortBy']>,
		string
	> = {
		topic: 'topic COLLATE NOCASE',
		createdAt: 'createdAt',
		updatedAt: 'updatedAt',
	};

	const requestedSortBy = options.sortBy ?? 'topic';
	const orderColumn = orderColumns[requestedSortBy] ?? orderColumns.topic;
	const requestedSortDir = options.sortDir ?? 'ASC';
	const orderDirection = requestedSortDir === 'DESC' ? 'DESC' : 'ASC';

	const whereClauses: string[] = [];
	const params: (string | number)[] = [];

	if (topic) {
		whereClauses.push('topic = ? COLLATE NOCASE');
		params.push(topic);
	}

	if (searchText) {
		const likePattern = `%${searchText}%`;
		whereClauses.push(
			'(topic LIKE ? COLLATE NOCASE OR illus LIKE ? COLLATE NOCASE OR application LIKE ? COLLATE NOCASE)',
		);
		params.push(likePattern, likePattern, likePattern);
	}

	// Phase 2.7 Step 1: Optional DB-level filtering/sorting for Home findability.
	const whereSql = whereClauses.length
		? `WHERE ${whereClauses.join(' AND ')}`
		: '';

	const rows = await db.getAllAsync<Illustration>(
		`SELECT id, topic, illus, application, sourceLink, createdAt, updatedAt
		 FROM illustrations
		 ${whereSql}
		 ORDER BY ${orderColumn} ${orderDirection}`,
		params,
	);

	return rows;
}

/**
 * Returns one illustration by id.
 *
 * Phase 2.6.1 Step 1:
 * - Adds read-only detail lookup for the fullscreen illustration card route.
 *
 * @param {number} id Illustration id to fetch.
 * @returns {Promise<Illustration | null>} Matching row or null when not found.
 */
export async function getIllustrationById(
	id: number,
): Promise<Illustration | null> {
	await initializeDatabase();
	const db = await getDb();

	if (!Number.isFinite(id) || id <= 0) {
		throw new Error('A valid illustration id is required.');
	}

	const row = await db.getFirstAsync<Illustration>(
		`SELECT id, topic, illus, application, sourceLink, createdAt, updatedAt
		 FROM illustrations
		 WHERE id = ?`,
		[id],
	);

	return row ?? null;
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

/**
 * Updates an existing illustration and returns the saved row.
 *
 * Phase 2.3 implementation notes:
 * - Validates id and required fields before writing.
 * - Updates updatedAt timestamp in repository layer.
 * - Reloads row from SQLite to return canonical saved state.
 *
 * @param {number} id Illustration id to update.
 * @param {UpdateIllustrationInput} input Updated field values.
 * @returns {Promise<Illustration>} Updated row from SQLite.
 */
export async function updateIllustration(
	id: number,
	input: UpdateIllustrationInput,
): Promise<Illustration> {
	await initializeDatabase();
	const db = await getDb();

	if (!Number.isFinite(id) || id <= 0) {
		throw new Error('A valid illustration id is required for update.');
	}

	const topic = input.topic.trim();
	const illus = input.illus.trim();
	const application = input.application.trim();
	const sourceLink = input.sourceLink.trim();

	if (!topic || !illus || !application || !sourceLink) {
		throw new Error('All fields are required to update an illustration.');
	}

	const now = new Date().toISOString();
	const result = await db.runAsync(
		`UPDATE illustrations
		 SET topic = ?, illus = ?, application = ?, sourceLink = ?, updatedAt = ?
		 WHERE id = ?`,
		[topic, illus, application, sourceLink, now, id],
	);

	if (result.changes === 0) {
		throw new Error('Illustration not found. It may have been removed.');
	}

	const row = await db.getFirstAsync<Illustration>(
		`SELECT id, topic, illus, application, sourceLink, createdAt, updatedAt
		 FROM illustrations
		 WHERE id = ?`,
		[id],
	);

	if (!row) {
		throw new Error('Illustration was updated but could not be reloaded.');
	}

	return row;
}

/**
 * Deletes an illustration by id.
 *
 * Phase 2.3 implementation notes:
 * - Validates target id before delete.
 * - Throws when no row was deleted (already removed or invalid id).
 *
 * @param {number} id Illustration id to delete.
 * @returns {Promise<void>} Resolves when deletion succeeds.
 */
export async function deleteIllustration(id: number): Promise<void> {
	await initializeDatabase();
	const db = await getDb();

	if (!Number.isFinite(id) || id <= 0) {
		throw new Error('A valid illustration id is required for deletion.');
	}

	const result = await db.runAsync(`DELETE FROM illustrations WHERE id = ?`, [
		id,
	]);

	if (result.changes === 0) {
		throw new Error(
			'Illustration not found. It may have already been deleted.',
		);
	}
}
