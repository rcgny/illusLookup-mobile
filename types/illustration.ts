/**
 * Shared data model for one illustration record.
 *
 * This type mirrors the shape expected by Home/List, Create, Edit, and Delete
 * screens. Keeping the model in one place helps maintain consistency while
 * the app evolves from placeholders to full SQLite CRUD flows.
 */
export interface Illustration {
	id: number;
	topic: string;
	illus: string;
	application: string;
	sourceLink: string;
	createdAt: string;
	updatedAt: string;
}

/**
 * Input payload for creating a new illustration.
 *
 * Fields mirror user-entered form values. Database-managed fields such as
 * id/createdAt/updatedAt are excluded because they are generated during insert.
 */
export interface CreateIllustrationInput {
	topic: string;
	illus: string;
	application: string;
	sourceLink: string;
}

/**
 * Input payload for updating an existing illustration.
 *
 * The editable fields mirror create input values. The target row is selected
 * separately by id in repository operations.
 */
export interface UpdateIllustrationInput {
	topic: string;
	illus: string;
	application: string;
	sourceLink: string;
}

/**
 * One illustration inside a topic bundle.
 *
 * Row ids are intentionally omitted so imported rows get fresh local ids.
 */
export interface TopicBundleEntry {
	illus: string;
	application: string;
	sourceLink: string;
	createdAt: string;
	updatedAt: string;
}

/**
 * Phase 2.9.6: Transfer format for one topic and a subset of its illustrations.
 *
 * Unlike the full `.db` backup, a bundle is additive: importing it adds rows
 * to the local database instead of replacing it.
 */
export interface TopicBundle {
	schemaVersion: 1;
	exportedAt: string;
	topic: string;
	illustrations: TopicBundleEntry[];
}

export const TOPIC_BUNDLE_SCHEMA_VERSION = 1;
