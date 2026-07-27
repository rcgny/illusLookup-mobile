import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
	exportSQLiteDatabaseBackup,
	exportSQLiteJsonDump,
	importSQLiteDatabaseBackup,
} from '../services/databaseExport';
import { listIllustrations } from '../services/illustrationsRepo';
import { Illustration } from '../types/illustration';

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
	const [exporting, setExporting] = useState<'db' | 'json' | null>(null);
	const [importing, setImporting] = useState(false);
	const [exportError, setExportError] = useState<string | null>(null);
	const [importError, setImportError] = useState<string | null>(null);
	const [shareMenuOpen, setShareMenuOpen] = useState(false);
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

	// SECTION 5: Combo-box actions
	// Phase 2.4 Step 1 controls: open/close, type-search, select, and clear.
	const toggleCombo = useCallback(() => {
		setComboOpen((open) => {
			return !open;
		});
	}, []);

	const selectTopic = useCallback((topic: string) => {
		setKeywordInput(topic);
		setKeywordSearch(topic);
		setComboOpen(false);
		Keyboard.dismiss();
	}, []);

	const clearSelection = useCallback(() => {
		// Phase 2.7 Step 3: One-tap reset for search + sort defaults.
		setKeywordInput('');
		setKeywordSearch('');
		setSortMode('az');
		setComboOpen(false);
		Keyboard.dismiss();
	}, []);

	const onComboSearchChange = useCallback((value: string) => {
		setComboOpen(true);
		setKeywordInput(value);
	}, []);

	const toggleComboFromZone = useCallback(() => {
		setComboOpen((open) => {
			return !open;
		});
	}, []);

	const closeCombo = useCallback(() => {
		setComboOpen(false);
	}, []);

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
	}, [exporting, importing, runExport]);

	const runImport = useCallback(async () => {
		try {
			setImporting(true);
			setImportError(null);

			// Phase 2.9 Step 2: Pick a `.db` backup and restore device-local SQLite data from it.
			const result = await importSQLiteDatabaseBackup();
			if (!result) {
				return;
			}

			const message = `Imported ${result.fileName}. Illustrations now: ${result.importedRows}.`;
			Alert.alert('Import Complete', message);

			// Refresh Home list immediately so imported rows appear without navigation.
			await load();
		} catch (importIssue) {
			const message =
				importIssue instanceof Error
					? importIssue.message
					: 'Failed to import SQLite backup.';
			setImportError(message);
			Alert.alert('Import Failed', message);
		} finally {
			setImporting(false);
		}
	}, [load]);

	const openImportConfirmation = useCallback(() => {
		if (importing || exporting) {
			return;
		}

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
	}, [exporting, importing, runImport]);

	const toggleShareDataMenu = useCallback(() => {
		if (importing || exporting) {
			return;
		}

		// Phase 2.9 Step 3: compact in-screen menu opens/closes from the Share data button.
		setShareMenuOpen((open) => !open);
	}, [exporting, importing]);

	const closeShareDataMenu = useCallback(() => {
		setShareMenuOpen(false);
	}, []);

	const onShareImportPress = useCallback(() => {
		// Phase 2.9 Step 3: close menu first so outside tap behavior stays consistent.
		setShareMenuOpen(false);
		openImportConfirmation();
	}, [openImportConfirmation]);

	const onShareExportPress = useCallback(() => {
		// Phase 2.9 Step 3: close menu first so outside tap behavior stays consistent.
		setShareMenuOpen(false);
		openExportChooser();
	}, [openExportChooser]);

	// Phase 2.6.1 Step 2: Open fullscreen read-only illustration card.
	const openReadOnlyCard = useCallback(
		(id: number) => {
			router.push(`/illustration/${id}`);
		},
		[router],
	);

	// SECTION 7: Render
	// Layout order: title -> search -> action buttons -> status states -> list.
	return (
		<View style={styles.screen}>
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
			<Text
				style={styles.countLabel}
			>{`Illustrations: ${visibleItems.length}`}</Text>

			<View style={styles.filtersRow}>
				<Pressable
					style={[
						styles.filterChip,
						sortMode === 'newest' && styles.filterChipActive,
					]}
					onPress={() => setSortMode('newest')}
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
					onPress={() => setSortMode('az')}
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
					onPress={() => router.push('/create')}
				>
					<Text style={styles.actionText}>Create</Text>
				</Pressable>
				<Pressable
					style={styles.actionBtn}
					onPress={() => router.push('/edit')}
				>
					<Text style={styles.actionText}>Edit</Text>
				</Pressable>
				<Pressable
					style={styles.actionBtn}
					onPress={() => router.push('/delete')}
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
					<Pressable style={styles.shareMenuItem} onPress={closeShareDataMenu}>
						<Text style={styles.shareMenuItemText}>Cancel</Text>
					</Pressable>
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
