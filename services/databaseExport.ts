import { Directory, File, Paths } from 'expo-file-system';
import * as FileSystemLegacy from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as SQLite from 'expo-sqlite';
import { DB_NAME, getDb, initializeDatabase } from '../db/database';
import {
	Illustration,
	TOPIC_BUNDLE_SCHEMA_VERSION,
	TopicBundle,
} from '../types/illustration';

type AppMetaRow = {
	key: string;
	value: string;
};

type ExportResult = {
	fileName: string;
	fileUri: string;
	shared: boolean;
};

type ImportResult = {
	fileName: string;
	importedRows: number;
};

type InventoryStats = {
	illustrationCount: number;
	normalizedTopics: string[];
};

export type ImportPreviewResult = {
	previewToken: string;
	fileName: string;
	currentIllustrationCount: number;
	importIllustrationCount: number;
	addedIllustrationCount: number;
	removedIllustrationCount: number;
	currentTopicCount: number;
	importTopicCount: number;
	overlapPercent: number;
	addedTopicCount: number;
	removedTopicCount: number;
	isSameInventorySummary: boolean;
};

const EXPORTS_DIR_NAME = 'illuslookup-exports';
const IMPORTS_DIR_NAME = 'illuslookup-imports';

type StagedImportPreview = {
	previewToken: string;
	fileName: string;
	stagedImportDbName: string;
	sqliteDirectoryUri: string;
};

const stagedImportPreviews = new Map<string, StagedImportPreview>();
const { StorageAccessFramework } = FileSystemLegacy;

function createExportStamp(): string {
	return new Date().toISOString().replace(/[.:]/g, '-');
}

function createPreviewToken(): string {
	return `preview-${createExportStamp()}-${Math.random().toString(36).slice(2, 8)}`;
}

function getExportsDirectory(): Directory {
	const directory = new Directory(Paths.document, EXPORTS_DIR_NAME);
	directory.create({ idempotent: true, intermediates: true });
	return directory;
}

function getImportsDirectory(): Directory {
	const directory = new Directory(Paths.document, IMPORTS_DIR_NAME);
	directory.create({ idempotent: true, intermediates: true });
	return directory;
}

function getSQLiteDirectoryUri(): string {
	const rawDirectory = String(SQLite.defaultDatabaseDirectory ?? '').trim();
	if (!rawDirectory) {
		throw new Error('SQLite default database directory is unavailable.');
	}

	if (rawDirectory.startsWith('file://')) {
		return rawDirectory;
	}

	if (rawDirectory.startsWith('/')) {
		return `file://${rawDirectory}`;
	}

	throw new Error('SQLite default database directory URI is not absolute.');
}

async function shareExport(file: File, mimeType: string): Promise<boolean> {
	const sharingAvailable = await Sharing.isAvailableAsync();
	if (!sharingAvailable) {
		return false;
	}

	await Sharing.shareAsync(file.uri, {
		dialogTitle: 'Export Illus Mobile data',
		mimeType,
	});

	return true;
}

async function getInventoryStats(
	db: SQLite.SQLiteDatabase,
): Promise<InventoryStats> {
	const countRow = await db.getFirstAsync<{ count: number }>(
		'SELECT COUNT(*) as count FROM illustrations',
	);
	const topicRows = await db.getAllAsync<{ topic: string }>(
		`SELECT DISTINCT LOWER(TRIM(topic)) as topic
		 FROM illustrations
		 WHERE LENGTH(TRIM(topic)) > 0
		 ORDER BY topic COLLATE NOCASE`,
	);

	return {
		illustrationCount: countRow?.count ?? 0,
		normalizedTopics: topicRows.map((row) => row.topic),
	};
}

function deleteIfExists(file: File): void {
	if (file.exists) {
		file.delete();
	}
}

function cleanupSQLiteArtifacts(
	directory: Directory,
	baseDbName: string,
): void {
	const filesToDelete = [baseDbName, `${baseDbName}-wal`, `${baseDbName}-shm`];

	for (const fileName of filesToDelete) {
		deleteIfExists(new File(directory, fileName));
	}
}

function createSafetyTempBackupFile(serializedDb: Uint8Array): File {
	const exportFile = new File(
		getExportsDirectory(),
		`SAFETY-TEMP-BACKUP-${createExportStamp()}.db`,
	);

	exportFile.create({ intermediates: true, overwrite: true });
	exportFile.write(serializedDb);

	return exportFile;
}

/**
 * Phase 2.9.4 Step 2:
 * - Removes a staged preview candidate without importing it.
 * - Safe to call repeatedly (no-op if token is unknown/expired).
 *
 * @param {string} previewToken Token from previewSQLiteDatabaseImport.
 * @returns {Promise<void>} Resolves when staged artifacts are removed.
 */
export async function discardPreviewSQLiteDatabaseImport(
	previewToken: string,
): Promise<void> {
	const stagedPreview = stagedImportPreviews.get(previewToken);
	if (!stagedPreview) {
		return;
	}

	const sqliteDirectory = new Directory(stagedPreview.sqliteDirectoryUri);
	cleanupSQLiteArtifacts(sqliteDirectory, stagedPreview.stagedImportDbName);
	stagedImportPreviews.delete(previewToken);
}

/**
 * Phase 2.9.4 Step 1:
 * - Previews a candidate SQLite backup and compares it with current local data.
 * - Computes summary-only inventory metrics without overwriting the local DB.
 *
 * @returns {Promise<ImportPreviewResult | null>} Preview metrics, or null when picker is canceled.
 */
export async function previewSQLiteDatabaseImport(): Promise<ImportPreviewResult | null> {
	let selectedFile: File;
	let previewSourceDb: SQLite.SQLiteDatabase | null = null;
	let sqliteDirectory: Directory | null = null;
	let keepStagedPreview = false;
	const stagedPreviewDbName = `illuslookup-preview-${createExportStamp()}.db`;

	try {
		// Phase 2.9.4 Step 1: reuse the stable picker call form used by import.
		selectedFile = await File.pickFileAsync(undefined, '*/*');
	} catch (pickIssue) {
		const pickMessage =
			pickIssue instanceof Error ? pickIssue.message.toLowerCase() : '';
		if (
			pickMessage.includes('cancel') ||
			pickMessage.includes('canceled') ||
			pickMessage.includes('cancelled')
		) {
			return null;
		}
		throw pickIssue;
	}

	try {
		await initializeDatabase();
		const destinationDb = await getDb();
		sqliteDirectory = new Directory(getSQLiteDirectoryUri());

		// Phase 2.9.4 Step 1: stage picker bytes into SQLite directory, no local overwrite.
		const previewBytes = await selectedFile.bytes();
		const stagedPreviewDbFile = new File(sqliteDirectory, stagedPreviewDbName);
		stagedPreviewDbFile.create({ intermediates: true, overwrite: true });
		stagedPreviewDbFile.write(previewBytes);

		previewSourceDb = await SQLite.openDatabaseAsync(stagedPreviewDbName, {
			useNewConnection: true,
		});

		const tableCheck = await previewSourceDb.getFirstAsync<{ count: number }>(
			`SELECT COUNT(*) as count
			 FROM sqlite_master
			 WHERE type = 'table' AND name = 'illustrations'`,
		);

		if (!tableCheck || tableCheck.count === 0) {
			throw new Error('The selected file is not a valid Illus Mobile backup.');
		}

		const currentStats = await getInventoryStats(destinationDb);
		const importStats = await getInventoryStats(previewSourceDb);

		const currentTopics = new Set(currentStats.normalizedTopics);
		const importTopics = new Set(importStats.normalizedTopics);
		const overlapCount = importStats.normalizedTopics.filter((topic) =>
			currentTopics.has(topic),
		).length;
		const addedTopicCount = importStats.normalizedTopics.filter(
			(topic) => !currentTopics.has(topic),
		).length;
		const removedTopicCount = currentStats.normalizedTopics.filter(
			(topic) => !importTopics.has(topic),
		).length;
		const overlapBase = Math.max(
			currentStats.normalizedTopics.length,
			importStats.normalizedTopics.length,
		);
		const overlapPercent =
			overlapBase === 0 ? 100 : Math.round((overlapCount / overlapBase) * 100);
		const addedIllustrationCount = Math.max(
			importStats.illustrationCount - currentStats.illustrationCount,
			0,
		);
		const removedIllustrationCount = Math.max(
			currentStats.illustrationCount - importStats.illustrationCount,
			0,
		);
		const previewToken = createPreviewToken();

		stagedImportPreviews.set(previewToken, {
			previewToken,
			fileName: selectedFile.name,
			stagedImportDbName: stagedPreviewDbName,
			sqliteDirectoryUri: sqliteDirectory.uri,
		});
		keepStagedPreview = true;

		return {
			previewToken,
			fileName: selectedFile.name,
			currentIllustrationCount: currentStats.illustrationCount,
			importIllustrationCount: importStats.illustrationCount,
			addedIllustrationCount,
			removedIllustrationCount,
			currentTopicCount: currentStats.normalizedTopics.length,
			importTopicCount: importStats.normalizedTopics.length,
			overlapPercent,
			addedTopicCount,
			removedTopicCount,
			isSameInventorySummary:
				currentStats.illustrationCount === importStats.illustrationCount &&
				addedTopicCount === 0 &&
				removedTopicCount === 0,
		};
	} finally {
		if (previewSourceDb) {
			await previewSourceDb.closeAsync();
		}
		if (sqliteDirectory && !keepStagedPreview) {
			cleanupSQLiteArtifacts(sqliteDirectory, stagedPreviewDbName);
		}
	}
}

/**
 * Phase 2.9.4 Step 2:
 * - Commits a previously previewed SQLite backup using a preview token.
 * - Reuses existing rollback behavior so failed imports restore prior local data.
 *
 * @param {string} previewToken Token from previewSQLiteDatabaseImport.
 * @returns {Promise<ImportResult>} Import metadata after commit.
 */
export async function commitPreviewedSQLiteDatabaseImport(
	previewToken: string,
): Promise<ImportResult> {
	const stagedPreview = stagedImportPreviews.get(previewToken);
	if (!stagedPreview) {
		throw new Error('Import preview expired. Please run Import Data again.');
	}

	const stagedRollbackDbName = `illuslookup-preimport-${createExportStamp()}.db`;
	let sourceDb: SQLite.SQLiteDatabase | null = null;
	let rollbackSourceDb: SQLite.SQLiteDatabase | null = null;
	let destinationDb: SQLite.SQLiteDatabase | null = null;
	const sqliteDirectory = new Directory(stagedPreview.sqliteDirectoryUri);
	let hasDestinationSnapshot = false;

	const restoreFromPreImportBackup = async (): Promise<boolean> => {
		if (!hasDestinationSnapshot) {
			return false;
		}

		rollbackSourceDb = await SQLite.openDatabaseAsync(stagedRollbackDbName, {
			useNewConnection: true,
		});

		if (!destinationDb) {
			await initializeDatabase();
			destinationDb = await getDb();
		}

		await SQLite.backupDatabaseAsync({
			sourceDatabase: rollbackSourceDb,
			sourceDatabaseName: 'main',
			destDatabase: destinationDb,
			destDatabaseName: 'main',
		});

		return true;
	};

	try {
		await initializeDatabase();
		destinationDb = await getDb();

		// Phase 2.9.4 Step 2 safety: snapshot current local DB before overwrite commit.
		const preImportBytes = await destinationDb.serializeAsync();
		const stagedRollbackDbFile = new File(
			sqliteDirectory,
			stagedRollbackDbName,
		);
		stagedRollbackDbFile.create({ intermediates: true, overwrite: true });
		stagedRollbackDbFile.write(preImportBytes);
		hasDestinationSnapshot = true;

		sourceDb = await SQLite.openDatabaseAsync(
			stagedPreview.stagedImportDbName,
			{
				useNewConnection: true,
			},
		);

		const tableCheck = await sourceDb.getFirstAsync<{ count: number }>(
			`SELECT COUNT(*) as count
			 FROM sqlite_master
			 WHERE type = 'table' AND name = 'illustrations'`,
		);

		if (!tableCheck || tableCheck.count === 0) {
			throw new Error('The selected file is not a valid Illus Mobile backup.');
		}

		await SQLite.backupDatabaseAsync({
			sourceDatabase: sourceDb,
			sourceDatabaseName: 'main',
			destDatabase: destinationDb,
			destDatabaseName: 'main',
		});

		const importedCountRow = await destinationDb.getFirstAsync<{
			count: number;
		}>('SELECT COUNT(*) as count FROM illustrations');

		const importedSchemaCheck = await destinationDb.getFirstAsync<{
			count: number;
		}>(
			`SELECT COUNT(*) as count
			 FROM sqlite_master
			 WHERE type = 'table' AND name = 'illustrations'`,
		);
		if (!importedSchemaCheck || importedSchemaCheck.count === 0) {
			throw new Error('Imported DB is missing the illustrations table.');
		}

		return {
			fileName: stagedPreview.fileName,
			importedRows: importedCountRow?.count ?? 0,
		};
	} catch (importIssue) {
		const rollbackApplied = await restoreFromPreImportBackup().catch(
			() => false,
		);
		const baseMessage =
			importIssue instanceof Error
				? importIssue.message
				: 'Failed to import SQLite backup.';

		if (rollbackApplied) {
			throw new Error(
				`${baseMessage} Original local data was restored from pre-import backup.`,
			);
		}

		throw new Error(
			`${baseMessage} Import rollback could not be confirmed; please restore from your latest exported backup.`,
		);
	} finally {
		if (rollbackSourceDb) {
			await rollbackSourceDb.closeAsync();
		}
		if (sourceDb) {
			await sourceDb.closeAsync();
		}

		cleanupSQLiteArtifacts(sqliteDirectory, stagedPreview.stagedImportDbName);
		cleanupSQLiteArtifacts(sqliteDirectory, stagedRollbackDbName);
		stagedImportPreviews.delete(previewToken);
	}
}

/**
 * Phase 2.9 Step 1:
 * - Exports the live SQLite database as a shareable `.db` backup file.
 * - Saves the export in the app documents area so it can be shared later.
 *
 * @returns {Promise<ExportResult>} Metadata about the exported backup file.
 */
export async function exportSQLiteDatabaseBackup(): Promise<ExportResult> {
	await initializeDatabase();
	const db = await getDb();
	const serializedDb = await db.serializeAsync();
	const exportFile = new File(
		getExportsDirectory(),
		`illuslookup-backup-${createExportStamp()}.db`,
	);

	exportFile.create({ intermediates: true, overwrite: true });
	exportFile.write(serializedDb);

	return {
		fileName: exportFile.name,
		fileUri: exportFile.uri,
		shared: await shareExport(exportFile, 'application/octet-stream'),
	};
}

/**
 * Phase 2.9 Step 1:
 * - Exports a readable JSON snapshot beside the `.db` backup for inspection.
 * - Captures both illustration rows and app meta rows for development review.
 *
 * @returns {Promise<ExportResult>} Metadata about the exported JSON file.
 */
export async function exportSQLiteJsonDump(): Promise<ExportResult> {
	await initializeDatabase();
	const db = await getDb();
	const illustrations = await db.getAllAsync<Illustration>(
		`SELECT id, topic, illus, application, sourceLink, createdAt, updatedAt
		 FROM illustrations
		 ORDER BY id ASC`,
	);
	const appMeta = await db.getAllAsync<AppMetaRow>(
		`SELECT key, value
		 FROM app_meta
		 ORDER BY key ASC`,
	);
	const exportFile = new File(
		getExportsDirectory(),
		`illuslookup-backup-${createExportStamp()}.json`,
	);
	const payload = {
		databaseName: DB_NAME,
		databasePath: db.databasePath,
		exportedAt: new Date().toISOString(),
		rowCounts: {
			illustrations: illustrations.length,
			appMeta: appMeta.length,
		},
		illustrations,
		appMeta,
	};

	exportFile.create({ intermediates: true, overwrite: true });
	exportFile.write(`${JSON.stringify(payload, null, 2)}\n`);

	return {
		fileName: exportFile.name,
		fileUri: exportFile.uri,
		shared: await shareExport(exportFile, 'application/json'),
	};
}

/**
 * Phase 2.9.6 Step 4: Exports one topic and a chosen subset of its illustrations.
 *
 * @param {string} topic Topic to export, matched case-insensitively.
 * @param {number[]} selectedIds Illustration ids to include.
 * @returns {Promise<ExportResult>} Metadata about the exported bundle file.
 */
export async function exportTopicBundle(
	topic: string,
	selectedIds: number[],
): Promise<ExportResult> {
	const trimmedTopic = topic.trim();

	if (!trimmedTopic) {
		throw new Error('Select a topic to export.');
	}

	if (selectedIds.length === 0) {
		throw new Error('Select at least one illustration to export.');
	}

	await initializeDatabase();
	const db = await getDb();

	const placeholders = selectedIds.map(() => '?').join(', ');
	const rows = await db.getAllAsync<Illustration>(
		`SELECT id, topic, illus, application, sourceLink, createdAt, updatedAt
		 FROM illustrations
		 WHERE id IN (${placeholders})
		   AND LOWER(TRIM(topic)) = LOWER(TRIM(?))
		 ORDER BY id ASC`,
		[...selectedIds, trimmedTopic],
	);

	if (rows.length === 0) {
		throw new Error('The selected illustrations are no longer available.');
	}

	const bundle: TopicBundle = {
		schemaVersion: TOPIC_BUNDLE_SCHEMA_VERSION,
		exportedAt: new Date().toISOString(),
		topic: rows[0].topic,
		illustrations: rows.map((row) => ({
			illus: row.illus,
			application: row.application,
			sourceLink: row.sourceLink,
			createdAt: row.createdAt,
			updatedAt: row.updatedAt,
		})),
	};

	const topicSlug =
		trimmedTopic
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-+|-+$/g, '')
			.slice(0, 40) || 'topic';
	const exportFile = new File(
		getExportsDirectory(),
		`illuslookup-topic-${topicSlug}-${createExportStamp()}.json`,
	);

	exportFile.create({ intermediates: true, overwrite: true });
	exportFile.write(`${JSON.stringify(bundle, null, 2)}\n`);

	return {
		fileName: exportFile.name,
		fileUri: exportFile.uri,
		shared: await shareExport(exportFile, 'application/json'),
	};
}

/**
 * Phase 2.9.4 Step 4:
 * - Creates a temporary safety backup before a destructive import commit.
 * - Opens the share sheet so users can move backup to Downloads/Drive.
 *
 * @returns {Promise<ExportResult>} Metadata about the safety backup file.
 */
export async function exportSafetyTempBackup(): Promise<ExportResult> {
	await initializeDatabase();
	const db = await getDb();
	const serializedDb = await db.serializeAsync();
	const exportFile = createSafetyTempBackupFile(serializedDb);

	return {
		fileName: exportFile.name,
		fileUri: exportFile.uri,
		shared: await shareExport(exportFile, 'application/octet-stream'),
	};
}

/**
 * Phase 2.9.4 Step 5:
 * - Creates a temporary safety backup and saves it through Android SAF.
 * - User can choose Downloads directly from the system folder picker.
 *
 * @returns {Promise<ExportResult>} Metadata about the saved safety backup file.
 */
export async function exportSafetyTempBackupToDownloads(): Promise<ExportResult> {
	await initializeDatabase();
	const db = await getDb();
	const serializedDb = await db.serializeAsync();
	const exportFile = createSafetyTempBackupFile(serializedDb);

	// Phase 2.9.4 Step 5: allow user-selected folder because some Android builds block root Downloads.
	const directoryPermission =
		await StorageAccessFramework.requestDirectoryPermissionsAsync();

	if (!directoryPermission.granted || !directoryPermission.directoryUri) {
		throw new Error(
			'Folder access was not granted. On some phones, Android blocks the root Downloads folder. Choose a different folder or a subfolder inside Downloads, then retry.',
		);
	}

	let safFileUri = '';
	try {
		const safFileName = exportFile.name.replace(/\.db$/i, '');
		safFileUri = await StorageAccessFramework.createFileAsync(
			directoryPermission.directoryUri,
			safFileName,
			'application/octet-stream',
		);

		await StorageAccessFramework.writeAsStringAsync(
			safFileUri,
			exportFile.base64Sync(),
			{ encoding: FileSystemLegacy.EncodingType.Base64 },
		);
	} catch {
		throw new Error(
			"Android couldn't save in that folder. Pick a different folder (for example Documents or a subfolder inside Downloads) and retry.",
		);
	}

	return {
		fileName: exportFile.name,
		fileUri: safFileUri,
		shared: false,
	};
}

/**
 * Phase 2.9 Step 2:
 * - Imports a SQLite `.db` backup chosen from the device picker.
 * - Replaces current local data so shared backups can be restored on another phone.
 *
 * @returns {Promise<ImportResult | null>} Import metadata, or null when picker is canceled.
 */
export async function importSQLiteDatabaseBackup(): Promise<ImportResult | null> {
	// Phase 2.9 Step 2 compatibility path:
	// keep existing one-tap import behavior while internally using preview -> commit.
	const preview = await previewSQLiteDatabaseImport();
	if (!preview) {
		return null;
	}

	try {
		return await commitPreviewedSQLiteDatabaseImport(preview.previewToken);
	} catch (importIssue) {
		await discardPreviewSQLiteDatabaseImport(preview.previewToken).catch(() => {
			/* no-op cleanup fallback */
		});
		throw importIssue;
	}
}
