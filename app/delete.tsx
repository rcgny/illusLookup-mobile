import { Href, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
	ActivityIndicator,
	Alert,
	FlatList,
	Pressable,
	StyleSheet,
	Text,
	TextInput,
	View,
} from 'react-native';
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
 *
 * @returns {JSX.Element} The Delete route screen.
 */
export default function DeleteScreen() {
	// SECTION 1: Router + state
	const router = useRouter();
	const [items, setItems] = useState<Illustration[]>([]);
	const [selectedId, setSelectedId] = useState<number | null>(null);
	const [topicSearch, setTopicSearch] = useState('');
	const [comboOpen, setComboOpen] = useState(false);
	const [loadingList, setLoadingList] = useState(true);
	const [deleting, setDeleting] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [successMessage, setSuccessMessage] = useState<string | null>(null);
	const comboInputRef = useRef<TextInput | null>(null);

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
	}, [selectedId]);

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

	const onComboFocus = useCallback(() => {
		setComboOpen(true);
		setTopicSearch(selectedItem?.topic ?? '');
	}, [selectedItem]);

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
				<View style={styles.comboContainer}>
					<View style={styles.comboInput}>
						<TextInput
							ref={comboInputRef}
							value={comboOpen ? topicSearch : (selectedItem?.topic ?? '')}
							onFocus={onComboFocus}
							onChangeText={onComboSearchChange}
							placeholder="Select Topic"
							style={styles.comboTextInput}
							autoCapitalize="none"
							autoCorrect={false}
						/>
						<View style={styles.comboInputActions}>
							{(selectedItem || topicSearch) && (
								<Pressable
									onPress={clearSelection}
									style={styles.iconButton}
									hitSlop={8}
								>
									<Text style={styles.iconButtonText}>X</Text>
								</Pressable>
							)}
							<Pressable onPress={toggleCombo} hitSlop={8}>
								<Text style={styles.comboChevron}>{comboOpen ? '▲' : '▼'}</Text>
							</Pressable>
						</View>
					</View>

					{comboOpen && (
						<View style={styles.comboDropdown}>
							{filteredTopics.length === 0 ? (
								<Text style={styles.comboEmpty}>No matching topics.</Text>
							) : (
								<FlatList
									data={filteredTopics}
									keyExtractor={(topic) => topic}
									style={styles.comboList}
									keyboardShouldPersistTaps="handled"
									initialNumToRender={6}
									renderItem={({ item }) => {
										const match = items.find((row) => row.topic === item);
										if (!match) return null;

										return (
											<Pressable
												style={styles.comboOption}
												onPress={() => handleSelect(match.id, match.topic)}
											>
												<Text style={styles.comboOptionText}>{item}</Text>
											</Pressable>
										);
									}}
								/>
							)}
						</View>
					)}
				</View>
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
	comboInput: {
		backgroundColor: '#ffffff',
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#d1d5db',
		paddingHorizontal: 12,
		paddingVertical: 10,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	comboTextInput: {
		flex: 1,
		fontSize: 16,
		color: '#111827',
	},
	comboInputActions: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	comboChevron: {
		fontSize: 12,
		color: '#374151',
	},
	iconButton: {
		width: 24,
		height: 24,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#cbd5e1',
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#f8fafc',
	},
	iconButtonText: {
		fontSize: 12,
		fontWeight: '700',
		color: '#334155',
	},
	comboDropdown: {
		marginTop: 8,
		backgroundColor: '#ffffff',
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#d1d5db',
		overflow: 'hidden',
	},
	comboList: {
		maxHeight: 264,
	},
	comboOption: {
		paddingHorizontal: 12,
		paddingVertical: 11,
		borderBottomWidth: 1,
		borderBottomColor: '#f1f5f9',
	},
	comboOptionText: {
		fontSize: 15,
		color: '#111827',
	},
	comboEmpty: {
		paddingHorizontal: 12,
		paddingVertical: 14,
		fontSize: 14,
		color: '#6b7280',
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
