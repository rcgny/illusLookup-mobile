import {
	Href,
	useFocusEffect,
	useLocalSearchParams,
	useRouter,
} from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
	ActivityIndicator,
	Alert,
	Pressable,
	StyleSheet,
	Text,
	View,
} from 'react-native';
import { TopicComboBox } from '../components/TopicComboBox';
import {
	deleteIllustration,
	listIllustrations,
} from '../services/illustrationsRepo';
import { Illustration } from '../types/illustration';

/**
 * Delete screen for removing an existing SQLite illustration.
 *
 * Phase 2.3 behaviors:
 * - Loads existing rows and lets user choose a record to remove.
 * - Shows a read-only preview before deletion.
 * - Uses explicit Keep/Undo confirmation before delete.
 * - Returns to Home after successful delete.
 * - Phase 2.4 Step 3: Uses a Home-style combo-box for searchable selection.
 * - Phase 2.4 Step 4: Removes outer ScrollView to avoid nested VirtualizedList warning.
 * - Phase 2.5.1 Step 1: Tapping the combo input box opens/focuses the dropdown.
 * - Phase 2.5.2 Step 1: Uses shared TopicComboBox component.
 * - Phase 2.5.3 Steps 2-3: Combo closes on outside tap and Android back/keyboard dismiss.
 * - Phase 2.6.3 Step 3: Supports one-time prefill selection from optional route id.
 *
 * @returns {JSX.Element} The Delete route screen.
 */
export default function DeleteScreen() {
	// SECTION 1: Router + state
	const router = useRouter();
	const params = useLocalSearchParams<{ id?: string | string[] }>();
	const [items, setItems] = useState<Illustration[]>([]);
	const [selectedId, setSelectedId] = useState<number | null>(null);
	const [topicSearch, setTopicSearch] = useState('');
	const [comboOpen, setComboOpen] = useState(false);
	const [routePrefillApplied, setRoutePrefillApplied] = useState(false);
	const [loadingList, setLoadingList] = useState(true);
	const [deleting, setDeleting] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [successMessage, setSuccessMessage] = useState<string | null>(null);

	const routeDeleteId = useMemo(() => {
		const idParam = Array.isArray(params.id) ? params.id[0] : params.id;
		if (!idParam) return null;
		const parsed = Number(idParam);
		if (!Number.isFinite(parsed) || parsed <= 0) return null;
		return parsed;
	}, [params.id]);

	const selectedItem =
		selectedId === null
			? null
			: (items.find((item) => item.id === selectedId) ?? null);

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

	// SECTION 2: Load items when screen becomes active
	const load = useCallback(async () => {
		try {
			setLoadingList(true);
			setErrorMessage(null);

			const data = await listIllustrations();
			setItems(data);

			if (data.length === 0) {
				setSelectedId(null);
				setTopicSearch('');
				setComboOpen(false);
				return;
			}

			if (!routePrefillApplied) {
				// Phase 2.6.3 Step 3: Apply detail-route id prefill once, then keep manual delete flow unchanged.
				const routeMatch =
					routeDeleteId === null
						? null
						: (data.find((item) => item.id === routeDeleteId) ?? null);

				if (routeMatch) {
					setSelectedId(routeMatch.id);
					setTopicSearch(routeMatch.topic);
					setComboOpen(false);
					setRoutePrefillApplied(true);
					return;
				}

				setRoutePrefillApplied(true);
			}

			const stillExists =
				selectedId !== null && data.some((item) => item.id === selectedId);
			setSelectedId(stillExists ? selectedId : null);

			if (stillExists) {
				const existing = data.find((item) => item.id === selectedId);
				setTopicSearch(existing?.topic ?? '');
			} else {
				setTopicSearch('');
			}
		} catch {
			setErrorMessage('Failed to load illustrations for deletion.');
		} finally {
			setLoadingList(false);
		}
	}, [routeDeleteId, routePrefillApplied, selectedId]);

	useFocusEffect(
		useCallback(() => {
			void load();
		}, [load]),
	);

	const handleSelect = (id: number, topic: string) => {
		setSelectedId(id);
		setTopicSearch(topic);
		setComboOpen(false);
		setErrorMessage(null);
		setSuccessMessage(null);
	};

	const toggleCombo = useCallback(() => {
		setComboOpen((open) => {
			const next = !open;
			if (next) {
				setTopicSearch(selectedItem?.topic ?? '');
			}
			return next;
		});
	}, [selectedItem]);

	const toggleComboFromZone = useCallback(() => {
		setComboOpen((open) => {
			const next = !open;
			if (next) {
				setTopicSearch(selectedItem?.topic ?? '');
			}
			return next;
		});
	}, [selectedItem]);

	const closeCombo = useCallback(() => {
		setComboOpen(false);
	}, []);

	const onComboSearchChange = useCallback(
		(value: string) => {
			setComboOpen(true);
			setTopicSearch(value);

			if (selectedItem && value.trim() !== selectedItem.topic) {
				setSelectedId(null);
			}
		},
		[selectedItem],
	);

	const clearSelection = useCallback(() => {
		setSelectedId(null);
		setTopicSearch('');
		setComboOpen(false);
		setErrorMessage(null);
		setSuccessMessage(null);
	}, []);

	// SECTION 3: Confirmed delete flow
	const runDelete = async () => {
		if (!selectedItem) {
			setErrorMessage('Select an illustration to delete.');
			return;
		}

		try {
			setDeleting(true);
			setErrorMessage(null);
			setSuccessMessage(null);

			await deleteIllustration(selectedItem.id);
			setSuccessMessage('Illustration deleted. Returning to Home...');

			setTimeout(() => {
				router.push('/' as Href);
			}, 300);
		} catch (error) {
			setErrorMessage(
				error instanceof Error
					? error.message
					: 'Failed to delete illustration.',
			);
		} finally {
			setDeleting(false);
		}
	};

	const handleDeletePress = () => {
		if (!selectedItem) {
			setErrorMessage('Select an illustration to delete.');
			return;
		}

		Alert.alert(
			'Confirm Delete',
			'Keep this delete action? This cannot be undone.',
			[
				{
					text: 'Undo',
					style: 'cancel',
				},
				{
					text: 'Keep',
					onPress: () => {
						void runDelete();
					},
				},
			],
		);
	};

	return (
		// Phase 2.4 Step 4: Use a non-virtualized outer container so the
		// combo dropdown FlatList is not nested inside same-orientation ScrollView.
		<View style={styles.screen}>
			<Text style={styles.title}>Delete Illustration</Text>
			<Text style={styles.subtitle}>
				Select from dropdown/search, review details, then confirm deletion.
			</Text>

			<Text style={styles.sectionTitle}>Choose Illustration</Text>
			{loadingList && <ActivityIndicator size="small" style={styles.loader} />}
			{!loadingList && items.length === 0 && (
				<Text style={styles.empty}>No illustrations available to delete.</Text>
			)}

			{!loadingList && items.length > 0 && (
				<TopicComboBox
					value={comboOpen ? topicSearch : (selectedItem?.topic ?? '')}
					onChangeText={onComboSearchChange}
					placeholder="Select Topic"
					isOpen={comboOpen}
					onToggle={toggleCombo}
					onRequestClose={closeCombo}
					onToggleFromZone={toggleComboFromZone}
					options={filteredTopics}
					onSelectOption={(topic) => {
						const match = items.find((row) => row.topic === topic);
						if (!match) return;
						handleSelect(match.id, match.topic);
					}}
					showClear={Boolean(selectedItem || topicSearch)}
					onClear={clearSelection}
					showOpenZone={!selectedItem && !topicSearch.trim()}
					emptyMessage="No matching topics."
					containerStyle={styles.comboContainer}
				/>
			)}

			<Text style={styles.sectionTitle}>Selected Preview</Text>
			{selectedItem ? (
				<View style={styles.previewCard}>
					<Text style={styles.previewTopic}>{selectedItem.topic}</Text>

					<Text style={styles.previewLabel}>Illustration</Text>
					<Text style={styles.previewValue}>{selectedItem.illus}</Text>

					<Text style={styles.previewLabel}>Application</Text>
					<Text style={styles.previewValue}>{selectedItem.application}</Text>

					<Text style={styles.previewLabel}>Source</Text>
					<Text style={styles.previewValue}>{selectedItem.sourceLink}</Text>
				</View>
			) : (
				<Text style={styles.empty}>Select an item to preview.</Text>
			)}

			{errorMessage && <Text style={styles.error}>{errorMessage}</Text>}
			{successMessage && <Text style={styles.success}>{successMessage}</Text>}

			<Pressable
				style={[
					styles.deleteButton,
					(deleting || !selectedItem) && styles.deleteButtonDisabled,
				]}
				onPress={handleDeletePress}
				disabled={deleting || !selectedItem}
			>
				{deleting ? (
					<ActivityIndicator color="#ffffff" />
				) : (
					<Text style={styles.deleteButtonText}>Delete Illustration</Text>
				)}
			</Pressable>
		</View>
	);
}

const styles = StyleSheet.create({
	screen: {
		flex: 1,
		paddingHorizontal: 16,
		paddingTop: 14,
		paddingBottom: 24,
		backgroundColor: '#f6f7f9',
	},
	title: {
		fontSize: 28,
		fontWeight: '700',
		color: '#1f2937',
		marginBottom: 6,
	},
	subtitle: {
		fontSize: 14,
		color: '#4b5563',
		marginBottom: 14,
	},
	sectionTitle: {
		fontSize: 13,
		fontWeight: '700',
		color: '#374151',
		marginBottom: 8,
		marginTop: 8,
	},
	loader: {
		marginVertical: 8,
	},
	empty: {
		color: '#6b7280',
		fontSize: 14,
		marginBottom: 8,
	},
	comboContainer: {
		marginBottom: 10,
		zIndex: 20,
	},
	previewCard: {
		backgroundColor: '#ffffff',
		borderRadius: 14,
		padding: 14,
		borderWidth: 1,
		borderColor: '#e5e7eb',
	},
	previewTopic: {
		fontSize: 18,
		fontWeight: '700',
		color: '#111827',
		marginBottom: 8,
	},
	previewLabel: {
		fontSize: 12,
		fontWeight: '700',
		color: '#4b5563',
		textTransform: 'uppercase',
		marginTop: 6,
	},
	previewValue: {
		fontSize: 15,
		color: '#1f2937',
		marginTop: 2,
		lineHeight: 21,
	},
	error: {
		marginTop: 12,
		fontSize: 14,
		color: '#b91c1c',
	},
	success: {
		marginTop: 12,
		fontSize: 14,
		color: '#0f766e',
	},
	deleteButton: {
		marginTop: 18,
		backgroundColor: '#b91c1c',
		borderRadius: 12,
		paddingVertical: 12,
		alignItems: 'center',
	},
	deleteButtonDisabled: {
		opacity: 0.55,
	},
	deleteButtonText: {
		color: '#ffffff',
		fontWeight: '700',
		fontSize: 15,
	},
});
