import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
	ActivityIndicator,
	Alert,
	FlatList,
	Keyboard,
	Pressable,
	StyleSheet,
	Text,
	View,
} from 'react-native';
import { TopicComboBox } from '../components/TopicComboBox';
import {
	commitPreviewedSQLiteDatabaseImport,
	discardPreviewSQLiteDatabaseImport,
	exportSafetyTempBackup,
	exportSafetyTempBackupToDownloads,
	exportSQLiteDatabaseBackup,
	exportSQLiteJsonDump,
	exportTopicBundle,
	previewSQLiteDatabaseImport,
} from '../services/databaseExport';
import { listIllustrations, listTopics } from '../services/illustrationsRepo';
import { Illustration } from '../types/illustration';

type ImportSummaryDecision =
	| 'cancel'
	| 'continue'
	| 'backup-continue'
	| 'backup-download-continue';

/**
 * Home screen for browsing locally stored illustrations.
 *
 * Key behaviors for this learning project:
 * - Loads rows from the SQLite repository when the screen gains focus.
 * - Phase 2.4 Step 1: Topic combo-box with in-input search + selection reset.
 * - Phase 2.4 Step 2: Home cards use default A-Z ordering.
 * - Phase 2.5.1 Step 1: Tapping the combo input box opens/focuses the dropdown.
 * - Phase 2.5.2 Step 1: Uses shared TopicComboBox component.
 * - Phase 2.5.3 Steps 2-3: Combo closes on outside tap and Android back/keyboard dismiss.
 * - Uses direct screen navigation from Home action buttons.
 *
 * @returns {JSX.Element} The Home/List screen.
 */
export default function IndexScreen() {
	// SECTION 1: Router + screen state
	// The router handles navigation to Create/Edit/Delete screens.
	// State values track fetched data, UI status, and topic combo-box input.
	const router = useRouter();
	const [items, setItems] = useState<Illustration[]>([]);
	const [keywordInput, setKeywordInput] = useState('');
	const [keywordSearch, setKeywordSearch] = useState('');
	const [sortMode, setSortMode] = useState<'newest' | 'az'>('az');
	const [comboOpen, setComboOpen] = useState(false);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [exporting, setExporting] = useState<'db' | 'json' | 'topic' | null>(
		null,
	);
	const [importing, setImporting] = useState(false);
	const [exportError, setExportError] = useState<string | null>(null);
	const [importError, setImportError] = useState<string | null>(null);
	const [shareMenuOpen, setShareMenuOpen] = useState(false);
	const [pendingImportSummary, setPendingImportSummary] =
		useState<Awaited<ReturnType<typeof previewSQLiteDatabaseImport>>>(null);
	const importSummaryResolverRef = useRef<
		((decision: ImportSummaryDecision) => void) | null
	>(null);
	const [topicExportStep, setTopicExportStep] = useState<
		'topic' | 'illustrations' | null
	>(null);
	const [topicExportTopics, setTopicExportTopics] = useState<string[]>([]);
	const [topicExportTopic, setTopicExportTopic] = useState('');
	const [topicExportItems, setTopicExportItems] = useState<Illustration[]>([]);
	const [topicExportSelectedIds, setTopicExportSelectedIds] = useState<
		number[]
	>([]);
	const SEARCH_IDLE_MS = 700;

	// SECTION 2: Data loading
	// This function is the single source of truth for loading list data.
	const load = useCallback(async () => {
		// Centralized load handler keeps startup and refresh behavior consistent.
		try {
			setLoading(true);
			setError(null);
			// Phase 2.7 Step 2: Use one search input to query topic/illustration/application.
			const data = await listIllustrations({
				searchText: keywordSearch,
				sortBy: sortMode === 'newest' ? 'updatedAt' : 'topic',
				sortDir: sortMode === 'newest' ? 'DESC' : 'ASC',
			});
			setItems(data);
		} catch {
			setError('Failed to load illustrations.');
		} finally {
			setLoading(false);
		}
	}, [keywordSearch, sortMode]);

	// SECTION 3: Refresh behavior
	// Phase 2.7 Step 4: Refresh rows on focus without resetting active filters.
	useFocusEffect(
		useCallback(() => {
			setComboOpen(false);
			setShareMenuOpen(false);

			// Keeps Home fresh after CRUD navigation while preserving user-selected filters.
			void load();
		}, [load]),
	);

	useEffect(() => {
		// Phase 2.7 Step 7: Debounce text search and dismiss keyboard after typing pause.
		const timer = setTimeout(() => {
			setKeywordSearch(keywordInput);

			if (keywordInput.trim().length > 0) {
				setComboOpen(false);
				Keyboard.dismiss();
			}
		}, SEARCH_IDLE_MS);

		return () => {
			clearTimeout(timer);
		};
	}, [keywordInput]);

	// SECTION 4: Derived topic options + visible card list
	// Phase 2.4 Step 1: Build sorted topic options for combo-box search/select.
	// Phase 2.4 Step 2: Build result list in default A-Z order.
	const sortedTopics = useMemo(() => {
		const unique = Array.from(new Set(items.map((i) => i.topic.trim()))).filter(
			(topic) => topic.length > 0,
		);

		return unique.sort((a, b) =>
			a.localeCompare(b, undefined, { sensitivity: 'base' }),
		);
	}, [items]);

	const filteredTopics = useMemo(() => {
		// Phase 2.7 Step 2: Dropdown shows topics from current result set.
		return sortedTopics;
	}, [sortedTopics]);

	const visibleItems = useMemo(() => {
		return items;
	}, [items]);

	const clearTransferErrors = useCallback(() => {
		// Phase 2.9.4 Step 3: Clear stale transfer errors once user continues interacting.
		setExportError(null);
		setImportError(null);
	}, []);

	const promptImportSummaryDecision = useCallback(
		(
			preview: NonNullable<
				Awaited<ReturnType<typeof previewSQLiteDatabaseImport>>
			>,
		): Promise<ImportSummaryDecision> => {
			setPendingImportSummary(preview);
			return new Promise<ImportSummaryDecision>((resolve) => {
				importSummaryResolverRef.current = resolve;
			});
		},
		[],
	);

	const resolveImportSummaryDecision = useCallback(
		(decision: ImportSummaryDecision) => {
			setPendingImportSummary(null);
			const resolver = importSummaryResolverRef.current;
			importSummaryResolverRef.current = null;
			resolver?.(decision);
		},
		[],
	);

	// SECTION 5: Combo-box actions
	// Phase 2.4 Step 1 controls: open/close, type-search, select, and clear.
	const toggleCombo = useCallback(() => {
		clearTransferErrors();
		setComboOpen((open) => {
			return !open;
		});
	}, [clearTransferErrors]);

	const selectTopic = useCallback(
		(topic: string) => {
			clearTransferErrors();
			setKeywordInput(topic);
			setKeywordSearch(topic);
			setComboOpen(false);
			Keyboard.dismiss();
		},
		[clearTransferErrors],
	);

	const clearSelection = useCallback(() => {
		clearTransferErrors();
		// Phase 2.7 Step 3: One-tap reset for search + sort defaults.
		setKeywordInput('');
		setKeywordSearch('');
		setSortMode('az');
		setComboOpen(false);
		Keyboard.dismiss();
	}, [clearTransferErrors]);

	const onComboSearchChange = useCallback(
		(value: string) => {
			clearTransferErrors();
			setComboOpen(true);
			setKeywordInput(value);
		},
		[clearTransferErrors],
	);

	const toggleComboFromZone = useCallback(() => {
		clearTransferErrors();
		setComboOpen((open) => {
			return !open;
		});
	}, [clearTransferErrors]);

	const closeCombo = useCallback(() => {
		clearTransferErrors();
		setComboOpen(false);
	}, [clearTransferErrors]);

	const runExport = useCallback(async (kind: 'db' | 'json') => {
		try {
			setExporting(kind);
			setExportError(null);

			// Phase 2.9 Step 1: Generate either a shareable SQLite backup or JSON dump from the device-local DB.
			const result =
				kind === 'db'
					? await exportSQLiteDatabaseBackup()
					: await exportSQLiteJsonDump();

			const message = result.shared
				? `${result.fileName} was saved and the share sheet opened.`
				: `${result.fileName} was saved in the app documents export folder.`;

			Alert.alert('Export Complete', message);
		} catch (exportIssue) {
			const message =
				exportIssue instanceof Error
					? exportIssue.message
					: 'Failed to export Illus Mobile data.';
			setExportError(message);
			Alert.alert('Export Failed', message);
		} finally {
			setExporting(null);
		}
	}, []);

	const openExportChooser = useCallback(() => {
		if (exporting || importing) {
			return;
		}

		clearTransferErrors();

		Alert.alert('Export Illus Mobile Data', 'Choose an export format.', [
			{
				text: 'SQLite DB',
				onPress: () => {
					void runExport('db');
				},
			},
			{
				text: 'JSON Dump',
				onPress: () => {
					void runExport('json');
				},
			},
			{
				text: 'Cancel',
				style: 'cancel',
			},
		]);
	}, [clearTransferErrors, exporting, importing, runExport]);

	// Phase 2.9.6 Step 10: Topic export runs topic pick -> illustration pick -> share.
	const closeTopicExport = useCallback(() => {
		setTopicExportStep(null);
		setTopicExportTopic('');
		setTopicExportItems([]);
		setTopicExportSelectedIds([]);
	}, []);

	const openTopicExport = useCallback(async () => {
		if (exporting || importing) {
			return;
		}

		clearTransferErrors();

		try {
			const topics = await listTopics();

			if (topics.length === 0) {
				Alert.alert('Export Topic', 'There are no topics to export yet.');
				return;
			}

			setTopicExportTopics(topics);
			setTopicExportStep('topic');
		} catch {
			setExportError('Failed to load topics for export.');
		}
	}, [clearTransferErrors, exporting, importing]);

	const selectTopicToExport = useCallback(async (topic: string) => {
		try {
			const rows = await listIllustrations({ topic });

			if (rows.length === 0) {
				Alert.alert('Export Topic', 'This topic has no illustrations.');
				return;
			}

			setTopicExportTopic(topic);
			setTopicExportItems(rows);
			setTopicExportSelectedIds(rows.map((row) => row.id));
			setTopicExportStep('illustrations');
		} catch {
			setExportError('Failed to load illustrations for this topic.');
		}
	}, []);

	const toggleTopicExportSelection = useCallback((id: number) => {
		setTopicExportSelectedIds((selected) =>
			selected.includes(id)
				? selected.filter((selectedId) => selectedId !== id)
				: [...selected, id],
		);
	}, []);

	const runTopicExport = useCallback(async () => {
		const topic = topicExportTopic;
		const selectedIds = topicExportSelectedIds;

		closeTopicExport();

		try {
			setExporting('topic');
			setExportError(null);

			const result = await exportTopicBundle(topic, selectedIds);
			const message = result.shared
				? `${result.fileName} was saved and the share sheet opened.`
				: `${result.fileName} was saved in the app documents export folder.`;

			Alert.alert('Topic Export Complete', message);
		} catch (exportIssue) {
			const message =
				exportIssue instanceof Error
					? exportIssue.message
					: 'Failed to export topic bundle.';
			setExportError(message);
			Alert.alert('Topic Export Failed', message);
		} finally {
			setExporting(null);
		}
	}, [closeTopicExport, topicExportSelectedIds, topicExportTopic]);

	const runImport = useCallback(async () => {
		let previewTokenToCleanup: string | null = null;
		try {
			setImporting(true);
			setImportError(null);

			// Phase 2.9.4 Step 4: Run preview first and only commit after explicit user choice.
			const preview = await previewSQLiteDatabaseImport();
			if (!preview) {
				return;
			}
			previewTokenToCleanup = preview.previewToken;

			const decision = await promptImportSummaryDecision(preview);

			if (decision === 'cancel') {
				await discardPreviewSQLiteDatabaseImport(preview.previewToken);
				previewTokenToCleanup = null;
				return;
			}

			if (decision === 'backup-continue') {
				const backupResult = await exportSafetyTempBackup();
				const backupMessage = backupResult.shared
					? `${backupResult.fileName} was saved and share sheet opened.`
					: `${backupResult.fileName} was saved in the app documents export folder.`;
				Alert.alert('Safety Backup Created', backupMessage);
			}

			if (decision === 'backup-download-continue') {
				// Phase 2.9.4 Step 5: explicit device-folder save path for predictable recovery.
				const backupResult = await exportSafetyTempBackupToDownloads();
				Alert.alert(
					'Safety Backup Saved',
					`${backupResult.fileName} was saved to the selected folder via Android folder picker.`,
				);
			}

			const result = await commitPreviewedSQLiteDatabaseImport(
				preview.previewToken,
			);
			previewTokenToCleanup = null;

			const message = `Imported ${result.fileName}. Illustrations now: ${result.importedRows}.`;
			Alert.alert('Import Complete', message);

			// Refresh Home list immediately so imported rows appear without navigation.
			await load();
		} catch (importIssue) {
			if (previewTokenToCleanup) {
				await discardPreviewSQLiteDatabaseImport(previewTokenToCleanup).catch(
					() => {
						/* no-op cleanup fallback */
					},
				);
			}

			const message =
				importIssue instanceof Error
					? importIssue.message
					: 'Failed to import SQLite backup.';
			setImportError(message);
			Alert.alert('Import Failed', message);
		} finally {
			setImporting(false);
		}
	}, [load, promptImportSummaryDecision]);

	const openImportConfirmation = useCallback(() => {
		if (importing || exporting) {
			return;
		}

		clearTransferErrors();

		Alert.alert(
			'Import SQLite Backup',
			'Choose a .db backup file. Import will replace current local data on this device.',
			[
				{
					text: 'Cancel',
					style: 'cancel',
				},
				{
					text: 'Import',
					onPress: () => {
						void runImport();
					},
				},
			],
		);
	}, [clearTransferErrors, exporting, importing, runImport]);

	const toggleShareDataMenu = useCallback(() => {
		if (importing || exporting) {
			return;
		}

		clearTransferErrors();

		// Phase 2.9 Step 3: compact in-screen menu opens/closes from the Share data button.
		setShareMenuOpen((open) => !open);
	}, [clearTransferErrors, exporting, importing]);

	const closeShareDataMenu = useCallback(() => {
		clearTransferErrors();
		setShareMenuOpen(false);
	}, [clearTransferErrors]);

	const onShareImportPress = useCallback(() => {
		// Phase 2.9 Step 3: close menu first so outside tap behavior stays consistent.
		clearTransferErrors();
		setShareMenuOpen(false);
		openImportConfirmation();
	}, [clearTransferErrors, openImportConfirmation]);

	const onShareExportPress = useCallback(() => {
		// Phase 2.9 Step 3: close menu first so outside tap behavior stays consistent.
		clearTransferErrors();
		setShareMenuOpen(false);
		openExportChooser();
	}, [clearTransferErrors, openExportChooser]);

	const onShareExportTopicPress = useCallback(() => {
		clearTransferErrors();
		setShareMenuOpen(false);
		void openTopicExport();
	}, [clearTransferErrors, openTopicExport]);

	// Phase 2.6.1 Step 2: Open fullscreen read-only illustration card.
	const openReadOnlyCard = useCallback(
		(id: number) => {
			clearTransferErrors();
			router.push(`/illustration/${id}`);
		},
		[clearTransferErrors, router],
	);

	// SECTION 7: Render
	// Layout order: title -> search -> action buttons -> status states -> list.
	return (
		<View style={styles.screen}>
			{pendingImportSummary && (
				<Pressable
					style={styles.importSummaryBackdrop}
					onPress={() => resolveImportSummaryDecision('cancel')}
				/>
			)}

			{topicExportStep && (
				<Pressable
					style={styles.importSummaryBackdrop}
					onPress={closeTopicExport}
				/>
			)}

			{shareMenuOpen && (
				<Pressable
					style={styles.shareMenuBackdrop}
					onPress={closeShareDataMenu}
				/>
			)}

			<Text style={styles.title}>Illustrations</Text>

			<TopicComboBox
				value={keywordInput}
				onChangeText={onComboSearchChange}
				placeholder="Search topic, illustration, or application"
				isOpen={comboOpen}
				onToggle={toggleCombo}
				onRequestClose={closeCombo}
				onToggleFromZone={toggleComboFromZone}
				options={filteredTopics}
				onSelectOption={selectTopic}
				showClear={Boolean(keywordInput)}
				onClear={clearSelection}
				showOpenZone={!keywordInput.trim()}
				emptyMessage="No matching topics for this filter."
				containerStyle={styles.comboContainer}
			/>
			<Text style={styles.countLabel}>
				{/* Phase 2.9.5 Step 1: Show topics first, then illustrations for quick scope context. */}
				{`Topics: ${filteredTopics.length} | Illustrations: ${visibleItems.length}`}
			</Text>

			<View style={styles.filtersRow}>
				<Pressable
					style={[
						styles.filterChip,
						sortMode === 'newest' && styles.filterChipActive,
					]}
					onPress={() => {
						clearTransferErrors();
						setSortMode('newest');
					}}
				>
					<Text
						style={[
							styles.filterChipText,
							sortMode === 'newest' && styles.filterChipTextActive,
						]}
					>
						Newest
					</Text>
				</Pressable>
				<Pressable
					style={[
						styles.filterChip,
						sortMode === 'az' && styles.filterChipActive,
					]}
					onPress={() => {
						clearTransferErrors();
						setSortMode('az');
					}}
				>
					<Text
						style={[
							styles.filterChipText,
							sortMode === 'az' && styles.filterChipTextActive,
						]}
					>
						A-Z
					</Text>
				</Pressable>
			</View>

			<View style={styles.quickActionsRow}>
				<Pressable
					style={styles.actionBtn}
					onPress={() => {
						clearTransferErrors();
						router.push('/create');
					}}
				>
					<Text style={styles.actionText}>Create</Text>
				</Pressable>
				<Pressable
					style={styles.actionBtn}
					onPress={() => {
						clearTransferErrors();
						router.push('/edit');
					}}
				>
					<Text style={styles.actionText}>Edit</Text>
				</Pressable>
				<Pressable
					style={styles.actionBtn}
					onPress={() => {
						clearTransferErrors();
						router.push('/delete');
					}}
				>
					<Text style={styles.actionText}>Delete</Text>
				</Pressable>
				<Pressable
					style={[
						styles.shareActionBtn,
						(exporting || importing) && styles.shareActionBtnDisabled,
					]}
					onPress={toggleShareDataMenu}
					disabled={Boolean(exporting || importing)}
				>
					<Text style={styles.shareActionText}>
						{importing
							? 'Importing...'
							: exporting
								? 'Exporting...'
								: 'Share data'}
					</Text>
				</Pressable>
			</View>
			{shareMenuOpen && (
				<View style={styles.shareMenuPanel}>
					<Pressable style={styles.shareMenuItem} onPress={onShareImportPress}>
						<Text style={styles.shareMenuItemText}>Import Data</Text>
					</Pressable>
					<Pressable style={styles.shareMenuItem} onPress={onShareExportPress}>
						<Text style={styles.shareMenuItemText}>Export Data</Text>
					</Pressable>
					<Pressable
						style={styles.shareMenuItem}
						onPress={onShareExportTopicPress}
					>
						<Text style={styles.shareMenuItemText}>Export Topic</Text>
					</Pressable>
					<Pressable style={styles.shareMenuItem} onPress={closeShareDataMenu}>
						<Text style={styles.shareMenuItemText}>Cancel</Text>
					</Pressable>
				</View>
			)}
			{pendingImportSummary && (
				<View style={styles.importSummaryPanel}>
					<Text style={styles.importSummaryTitle}>Review Import Summary</Text>
					<Text style={styles.importSummaryLine}>
						{`File: ${pendingImportSummary.fileName}`}
					</Text>
					<Text
						style={styles.importSummaryLine}
					>{`Current: ${pendingImportSummary.currentIllustrationCount} illustrations, ${pendingImportSummary.currentTopicCount} topics`}</Text>
					<Text
						style={styles.importSummaryLine}
					>{`Import: ${pendingImportSummary.importIllustrationCount} illustrations, ${pendingImportSummary.importTopicCount} topics`}</Text>
					<Text
						style={styles.importSummaryLine}
					>{`Added illustrations: ${pendingImportSummary.addedIllustrationCount}`}</Text>
					<Text
						style={styles.importSummaryLine}
					>{`Removed illustrations: ${pendingImportSummary.removedIllustrationCount}`}</Text>
					<Text
						style={styles.importSummaryLine}
					>{`Topic overlap: ${pendingImportSummary.overlapPercent}%`}</Text>
					<Text
						style={styles.importSummaryLine}
					>{`Added topics: ${pendingImportSummary.addedTopicCount}`}</Text>
					<Text
						style={styles.importSummaryLine}
					>{`Removed topics: ${pendingImportSummary.removedTopicCount}`}</Text>
					{pendingImportSummary.isSameInventorySummary && (
						<Text style={styles.importSummaryCaution}>
							Current data and import data look similar; illustration
							wording/content may still differ.
						</Text>
					)}
					<View style={styles.importSummaryActions}>
						<Pressable
							style={[
								styles.importSummaryActionBtn,
								styles.importSummaryCancelBtn,
							]}
							onPress={() => resolveImportSummaryDecision('cancel')}
						>
							<Text style={styles.importSummaryActionText}>Cancel</Text>
						</Pressable>
						<Pressable
							style={styles.importSummaryActionBtn}
							onPress={() => resolveImportSummaryDecision('continue')}
						>
							<Text style={styles.importSummaryActionText}>
								Continue Import
							</Text>
						</Pressable>
						<Pressable
							style={styles.importSummaryActionBtn}
							onPress={() => resolveImportSummaryDecision('backup-continue')}
						>
							<Text style={styles.importSummaryActionText}>
								Create Sharable Backup + Continue
							</Text>
						</Pressable>
						<Pressable
							style={styles.importSummaryActionBtn}
							onPress={() =>
								resolveImportSummaryDecision('backup-download-continue')
							}
						>
							<Text style={styles.importSummaryActionText}>
								Save Backup to Phone + Continue
							</Text>
						</Pressable>
					</View>
				</View>
			)}
			{topicExportStep === 'topic' && (
				<View style={styles.importSummaryPanel}>
					<Text style={styles.importSummaryTitle}>Export Topic</Text>
					<Text style={styles.importSummaryLine}>
						Choose the topic you want to share.
					</Text>
					<FlatList
						data={topicExportTopics}
						keyExtractor={(topic) => topic}
						style={styles.topicExportList}
						renderItem={({ item }) => (
							<Pressable
								style={styles.topicExportRow}
								onPress={() => {
									void selectTopicToExport(item);
								}}
							>
								<Text style={styles.topicExportRowText}>{item}</Text>
							</Pressable>
						)}
					/>
					<View style={styles.importSummaryActions}>
						<Pressable
							style={[
								styles.importSummaryActionBtn,
								styles.importSummaryCancelBtn,
							]}
							onPress={closeTopicExport}
						>
							<Text style={styles.importSummaryActionText}>Cancel</Text>
						</Pressable>
					</View>
				</View>
			)}

			{topicExportStep === 'illustrations' && (
				<View style={styles.importSummaryPanel}>
					<Text style={styles.importSummaryTitle}>{topicExportTopic}</Text>
					<Text style={styles.importSummaryLine}>
						{`Selected ${topicExportSelectedIds.length} of ${topicExportItems.length} illustrations.`}
					</Text>
					<FlatList
						data={topicExportItems}
						keyExtractor={(item) => String(item.id)}
						style={styles.topicExportList}
						renderItem={({ item }) => {
							const isSelected = topicExportSelectedIds.includes(item.id);
							return (
								<Pressable
									style={styles.topicExportRow}
									onPress={() => toggleTopicExportSelection(item.id)}
								>
									<Text style={styles.topicExportCheckbox}>
										{isSelected ? '[x]' : '[ ]'}
									</Text>
									<Text style={styles.topicExportRowText} numberOfLines={2}>
										{item.illus}
									</Text>
								</Pressable>
							);
						}}
					/>
					<View style={styles.importSummaryActions}>
						<Pressable
							style={[
								styles.importSummaryActionBtn,
								styles.importSummaryCancelBtn,
							]}
							onPress={closeTopicExport}
						>
							<Text style={styles.importSummaryActionText}>Cancel</Text>
						</Pressable>
						<Pressable
							style={[
								styles.importSummaryActionBtn,
								topicExportSelectedIds.length === 0 &&
									styles.importSummaryActionBtnDisabled,
							]}
							onPress={() => {
								void runTopicExport();
							}}
							disabled={topicExportSelectedIds.length === 0}
						>
							<Text style={styles.importSummaryActionText}>
								Export Selected
							</Text>
						</Pressable>
					</View>
				</View>
			)}

			{exportError && <Text style={styles.exportError}>{exportError}</Text>}
			{importError && <Text style={styles.importError}>{importError}</Text>}

			{loading && <ActivityIndicator size="large" style={styles.loader} />}
			{!loading && error && <Text style={styles.error}>{error}</Text>}
			{!loading && !error && visibleItems.length === 0 && (
				<Text style={styles.empty}>No illustrations found.</Text>
			)}

			{!loading && !error && visibleItems.length > 0 && (
				// FlatList efficiently renders large lists by virtualizing off-screen rows.
				<FlatList
					data={visibleItems}
					keyExtractor={(item) => String(item.id)}
					contentContainerStyle={styles.listContent}
					renderItem={({ item }) => (
						<Pressable
							style={styles.card}
							onPress={() => openReadOnlyCard(item.id)}
						>
							<Text style={styles.topic}>{item.topic}</Text>

							<Text style={styles.label}>Illustration</Text>
							<Text style={styles.body}>{item.illus}</Text>

							<Text style={styles.label}>Application</Text>
							<Text style={styles.body}>{item.application}</Text>

							<Text style={styles.label}>Source</Text>
							<Text style={styles.source}>{item.sourceLink}</Text>
						</Pressable>
					)}
				/>
			)}
		</View>
	);
}

const styles = StyleSheet.create({
	screen: {
		flex: 1,
		paddingHorizontal: 16,
		paddingTop: 14,
		backgroundColor: '#f6f7f9',
	},
	importSummaryBackdrop: {
		...StyleSheet.absoluteFillObject,
		zIndex: 35,
		backgroundColor: 'rgba(15, 23, 42, 0.25)',
	},
	shareMenuBackdrop: {
		...StyleSheet.absoluteFillObject,
		zIndex: 25,
	},
	title: {
		fontSize: 28,
		fontWeight: '700',
		marginBottom: 12,
		color: '#1f2937',
	},
	comboContainer: {
		marginBottom: 12,
		zIndex: 20,
	},
	filtersRow: {
		flexDirection: 'row',
		gap: 8,
		marginBottom: 12,
	},
	filterChip: {
		paddingVertical: 7,
		paddingHorizontal: 12,
		borderRadius: 16,
		borderWidth: 1,
		borderColor: '#cbd5e1',
		backgroundColor: '#ffffff',
	},
	filterChipActive: {
		borderColor: '#0f766e',
		backgroundColor: '#ccfbf1',
	},
	filterChipText: {
		fontSize: 13,
		fontWeight: '600',
		color: '#334155',
	},
	filterChipTextActive: {
		color: '#115e59',
	},
	quickActionsRow: {
		flexDirection: 'row',
		gap: 8,
		marginBottom: 12,
	},
	actionBtn: {
		backgroundColor: '#0f766e',
		borderRadius: 10,
		paddingVertical: 8,
		paddingHorizontal: 12,
	},
	actionText: {
		color: '#ffffff',
		fontWeight: '600',
	},
	shareActionBtn: {
		backgroundColor: '#2563eb',
		borderRadius: 10,
		paddingVertical: 8,
		paddingHorizontal: 12,
	},
	shareActionBtnDisabled: {
		opacity: 0.55,
	},
	shareActionText: {
		color: '#ffffff',
		fontWeight: '600',
	},
	shareMenuPanel: {
		zIndex: 30,
		alignSelf: 'flex-end',
		minWidth: 156,
		backgroundColor: '#ffffff',
		borderRadius: 10,
		borderWidth: 1,
		borderColor: '#cbd5e1',
		marginTop: -6,
		marginBottom: 12,
		shadowColor: '#000000',
		shadowOpacity: 0.14,
		shadowRadius: 8,
		shadowOffset: { width: 0, height: 3 },
		elevation: 4,
	},
	shareMenuItem: {
		paddingVertical: 10,
		paddingHorizontal: 12,
	},
	shareMenuItemText: {
		fontSize: 14,
		fontWeight: '600',
		color: '#1f2937',
	},
	importSummaryPanel: {
		zIndex: 40,
		position: 'absolute',
		top: 120,
		left: 16,
		right: 16,
		backgroundColor: '#ffffff',
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#cbd5e1',
		padding: 14,
		shadowColor: '#000000',
		shadowOpacity: 0.18,
		shadowRadius: 10,
		shadowOffset: { width: 0, height: 4 },
		elevation: 6,
	},
	importSummaryTitle: {
		fontSize: 17,
		fontWeight: '700',
		color: '#111827',
		marginBottom: 8,
	},
	importSummaryLine: {
		fontSize: 14,
		color: '#1f2937',
		marginTop: 2,
	},
	importSummaryCaution: {
		marginTop: 10,
		fontSize: 14,
		fontWeight: '700',
		color: '#b91c1c',
	},
	importSummaryActions: {
		marginTop: 12,
		gap: 8,
	},
	importSummaryActionBtn: {
		backgroundColor: '#2563eb',
		borderRadius: 10,
		paddingVertical: 10,
		paddingHorizontal: 12,
		alignItems: 'center',
	},
	importSummaryCancelBtn: {
		backgroundColor: '#64748b',
	},
	importSummaryActionBtnDisabled: {
		opacity: 0.55,
	},
	topicExportList: {
		marginTop: 10,
		maxHeight: 260,
	},
	topicExportRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		paddingVertical: 10,
		borderBottomWidth: 1,
		borderBottomColor: '#e5e7eb',
	},
	topicExportCheckbox: {
		fontSize: 14,
		fontWeight: '700',
		color: '#2563eb',
	},
	topicExportRowText: {
		flex: 1,
		fontSize: 14,
		color: '#1f2937',
	},
	importSummaryActionText: {
		color: '#ffffff',
		fontSize: 14,
		fontWeight: '700',
	},
	exportError: {
		marginBottom: 10,
		fontSize: 13,
		color: '#b91c1c',
	},
	importError: {
		marginBottom: 10,
		fontSize: 13,
		color: '#b91c1c',
	},
	loader: {
		marginTop: 24,
	},
	listContent: {
		paddingBottom: 24,
	},
	card: {
		backgroundColor: '#ffffff',
		borderRadius: 14,
		padding: 14,
		marginBottom: 10,
		borderWidth: 1,
		borderColor: '#e5e7eb',
	},
	topic: {
		fontSize: 18,
		fontWeight: '700',
		marginBottom: 8,
		color: '#111827',
	},
	label: {
		fontSize: 12,
		fontWeight: '700',
		color: '#4b5563',
		textTransform: 'uppercase',
		marginTop: 6,
	},
	body: {
		fontSize: 15,
		color: '#1f2937',
		marginTop: 2,
		lineHeight: 21,
	},
	source: {
		fontSize: 14,
		color: '#0f766e',
		marginTop: 2,
	},
	countLabel: {
		fontSize: 14,
		fontWeight: '600',
		color: '#4b5563',
		marginBottom: 10,
	},
	empty: {
		marginTop: 24,
		fontSize: 16,
		color: '#6b7280',
	},
	error: {
		marginTop: 24,
		fontSize: 16,
		color: '#b91c1c',
	},
});
