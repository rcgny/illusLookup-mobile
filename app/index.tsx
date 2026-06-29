import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
	ActivityIndicator,
	FlatList,
	Pressable,
	StyleSheet,
	Text,
	View,
} from 'react-native';
import { TopicComboBox } from '../components/TopicComboBox';
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
	const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
	const [topicSearch, setTopicSearch] = useState('');
	const [comboOpen, setComboOpen] = useState(false);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// SECTION 2: Data loading
	// This function is the single source of truth for loading list data.
	const load = useCallback(async () => {
		// Centralized load handler keeps startup and refresh behavior consistent.
		try {
			setLoading(true);
			setError(null);
			const data = await listIllustrations();
			setItems(data);
		} catch {
			setError('Failed to load illustrations.');
		} finally {
			setLoading(false);
		}
	}, []);

	// SECTION 3: Refresh behavior
	// Re-runs load whenever this screen gets focus (for example, after returning
	// from Create/Edit/Delete).
	useFocusEffect(
		useCallback(() => {
			// Re-query data whenever this route becomes active.
			void load();
		}, [load]),
	);

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
		const q = topicSearch.trim().toLowerCase();
		if (!q) return sortedTopics;
		return sortedTopics.filter((topic) => topic.toLowerCase().includes(q));
	}, [sortedTopics, topicSearch]);

	const selectedTopicItems = useMemo(() => {
		if (!selectedTopic) return items;
		return items.filter((item) => item.topic === selectedTopic);
	}, [items, selectedTopic]);

	const visibleItems = useMemo(() => {
		return [...selectedTopicItems].sort((a, b) =>
			a.topic.localeCompare(b.topic, undefined, { sensitivity: 'base' }),
		);
	}, [selectedTopicItems]);

	// SECTION 5: Combo-box actions
	// Phase 2.4 Step 1 controls: open/close, type-search, select, and clear.
	const toggleCombo = useCallback(() => {
		setComboOpen((open) => {
			const next = !open;
			if (next) {
				setTopicSearch(selectedTopic ?? '');
			}
			return next;
		});
	}, [selectedTopic]);

	const selectTopic = useCallback((topic: string) => {
		setSelectedTopic(topic);
		setComboOpen(false);
		setTopicSearch(topic);
	}, []);

	const clearSelection = useCallback(() => {
		setSelectedTopic(null);
		setTopicSearch('');
		setComboOpen(false);
	}, []);

	const onComboSearchChange = useCallback(
		(value: string) => {
			setComboOpen(true);
			setTopicSearch(value);

			if (selectedTopic && value.trim() !== selectedTopic) {
				setSelectedTopic(null);
			}
		},
		[selectedTopic],
	);

	const toggleComboFromZone = useCallback(() => {
		setComboOpen((open) => {
			const next = !open;
			if (next) {
				setTopicSearch(selectedTopic ?? '');
			}
			return next;
		});
	}, [selectedTopic]);

	const closeCombo = useCallback(() => {
		setComboOpen(false);
	}, []);

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
			<Text style={styles.title}>Illustrations</Text>

			<TopicComboBox
				value={comboOpen ? topicSearch : (selectedTopic ?? '')}
				onChangeText={onComboSearchChange}
				placeholder="Select Topic"
				isOpen={comboOpen}
				onToggle={toggleCombo}
				onRequestClose={closeCombo}
				onToggleFromZone={toggleComboFromZone}
				options={filteredTopics}
				onSelectOption={selectTopic}
				showClear={Boolean(selectedTopic || topicSearch)}
				onClear={clearSelection}
				showOpenZone={!selectedTopic && !topicSearch.trim()}
				emptyMessage="No matching topics."
				containerStyle={styles.comboContainer}
			/>

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
			</View>

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
