import { Href, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
	listIllustrations,
	updateIllustration,
} from '../services/illustrationsRepo';
import { Illustration, UpdateIllustrationInput } from '../types/illustration';

/**
 * Edit screen for updating an existing SQLite illustration.
 *
 * Phase 2.3 behaviors:
 * - Loads existing rows and lets user select which one to edit.
 * - Prefills editable form from selected row.
 * - Validates required values before update.
 * - Uses Keep/Undo confirmation before persisting changes.
 * - Returns to Home after successful update.
 * - Phase 2.4 Step 5: Uses a Home-style combo-box for searchable selection.
 * - Phase 2.4 Step 6: Uses non-ScrollView outer container to avoid nested list warnings.
 * - Phase 2.5.1 Step 1: Tapping the combo input box opens/focuses the dropdown.
 *
 * @returns {JSX.Element} The Edit route screen.
 */
export default function EditScreen() {
	const router = useRouter();
	const [items, setItems] = useState<Illustration[]>([]);
	const [selectedId, setSelectedId] = useState<number | null>(null);
	const [topicSearch, setTopicSearch] = useState('');
	const [comboOpen, setComboOpen] = useState(false);
	const [form, setForm] = useState<UpdateIllustrationInput>({
		topic: '',
		illus: '',
		application: '',
		sourceLink: '',
	});
	const [loadingList, setLoadingList] = useState(true);
	const [saving, setSaving] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [successMessage, setSuccessMessage] = useState<string | null>(null);
	const comboInputRef = useRef<TextInput | null>(null);

	const selectedItem = useMemo(() => {
		if (selectedId === null) return null;
		return items.find((item) => item.id === selectedId) ?? null;
	}, [items, selectedId]);

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

	const fieldErrors = useMemo(() => {
		return {
			topic: form.topic.trim() ? null : 'Topic is required.',
			illus: form.illus.trim() ? null : 'Illustration is required.',
			application: form.application.trim() ? null : 'Application is required.',
			sourceLink: form.sourceLink.trim() ? null : 'Source is required.',
		};
	}, [form]);

	const isFormValid = useMemo(() => {
		return !Object.values(fieldErrors).some(Boolean);
	}, [fieldErrors]);

	const isDirty = useMemo(() => {
		if (!selectedItem) return false;
		return (
			selectedItem.topic !== form.topic.trim() ||
			selectedItem.illus !== form.illus.trim() ||
			selectedItem.application !== form.application.trim() ||
			selectedItem.sourceLink !== form.sourceLink.trim()
		);
	}, [selectedItem, form]);

	const syncFormFromItem = useCallback((item: Illustration) => {
		setForm({
			topic: item.topic,
			illus: item.illus,
			application: item.application,
			sourceLink: item.sourceLink,
		});
	}, []);

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
				setForm({ topic: '', illus: '', application: '', sourceLink: '' });
				return;
			}

			const stillExists =
				selectedId !== null && data.some((item) => item.id === selectedId);
			if (stillExists) {
				const nextSelected = data.find((item) => item.id === selectedId);
				setSelectedId(nextSelected?.id ?? null);
				if (nextSelected) {
					syncFormFromItem(nextSelected);
					setTopicSearch(nextSelected.topic);
				}
			} else {
				setSelectedId(null);
				setTopicSearch('');
				setForm({ topic: '', illus: '', application: '', sourceLink: '' });
			}
		} catch {
			setErrorMessage('Failed to load illustrations for editing.');
		} finally {
			setLoadingList(false);
		}
	}, [selectedId, syncFormFromItem]);

	useFocusEffect(
		useCallback(() => {
			void load();
		}, [load]),
	);

	const selectItem = (item: Illustration) => {
		setSelectedId(item.id);
		setTopicSearch(item.topic);
		setComboOpen(false);
		syncFormFromItem(item);
		setErrorMessage(null);
		setSuccessMessage(null);
	};

	// Phase 2.4 Step 5 controls: open/close, type-search, select, and clear.
	const toggleCombo = useCallback(() => {
		setComboOpen((open) => {
			const next = !open;
			if (next) {
				setTopicSearch(selectedItem?.topic ?? '');
			}
			return next;
		});
	}, [selectedItem]);

	useEffect(() => {
		if (comboOpen) {
			comboInputRef.current?.focus();
		}
	}, [comboOpen]);

	const toggleComboFromZone = useCallback(() => {
		setComboOpen((open) => {
			const next = !open;
			if (next) {
				setTopicSearch(selectedItem?.topic ?? '');
				comboInputRef.current?.focus();
			} else {
				comboInputRef.current?.blur();
			}
			return next;
		});
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
		setForm({ topic: '', illus: '', application: '', sourceLink: '' });
	}, []);

	const updateField = (key: keyof UpdateIllustrationInput, value: string) => {
		setForm((prev) => ({ ...prev, [key]: value }));
		setErrorMessage(null);
		setSuccessMessage(null);
	};

	const runSave = async () => {
		if (selectedId === null) {
			setErrorMessage('Select an illustration before saving.');
			return;
		}

		try {
			setSaving(true);
			setErrorMessage(null);
			setSuccessMessage(null);

			await updateIllustration(selectedId, form);
			setSuccessMessage('Illustration updated. Returning to Home...');

			setTimeout(() => {
				router.push('/' as Href);
			}, 300);
		} catch (error) {
			setErrorMessage(
				error instanceof Error
					? error.message
					: 'Failed to update illustration.',
			);
		} finally {
			setSaving(false);
		}
	};

	const handleSavePress = () => {
		if (!selectedItem) {
			setErrorMessage('Select an illustration to edit.');
			return;
		}
		if (!isFormValid) {
			setErrorMessage('Please fix validation errors before saving.');
			return;
		}
		if (!isDirty) {
			setErrorMessage('No changes detected to save.');
			return;
		}

		Alert.alert('Confirm Update', 'Keep these changes and update the record?', [
			{
				text: 'Undo',
				style: 'cancel',
			},
			{
				text: 'Keep',
				onPress: () => {
					void runSave();
				},
			},
		]);
	};

	return (
		<View style={styles.screen}>
			<Text style={styles.title}>Edit Illustration</Text>
			<Text style={styles.subtitle}>
				Select an existing item, update fields, then save changes.
			</Text>

			<Text style={styles.sectionTitle}>Choose Illustration</Text>
			{loadingList && <ActivityIndicator size="small" style={styles.loader} />}
			{!loadingList && items.length === 0 && (
				<Text style={styles.empty}>No illustrations available to edit.</Text>
			)}

			{!loadingList && items.length > 0 && (
				<View style={styles.comboContainer}>
					<View style={styles.comboInput}>
						<TextInput
							ref={comboInputRef}
							value={comboOpen ? topicSearch : (selectedItem?.topic ?? '')}
							onChangeText={onComboSearchChange}
							placeholder="Select Topic"
							style={styles.comboTextInput}
							autoCapitalize="none"
							autoCorrect={false}
						/>
						{!selectedItem && !topicSearch.trim() && (
							<Pressable
								style={styles.comboInputOpenZone}
								onPress={toggleComboFromZone}
							/>
						)}
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
												onPress={() => selectItem(match)}
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

			<Text style={styles.sectionTitle}>Edit Fields</Text>

			{selectedItem ? (
				<>
					<Text style={styles.label}>Topic</Text>
					<TextInput
						value={form.topic}
						onChangeText={(value) => updateField('topic', value)}
						placeholder="Enter topic"
						style={styles.input}
					/>
					{fieldErrors.topic && (
						<Text style={styles.validation}>{fieldErrors.topic}</Text>
					)}

					<Text style={styles.label}>Illustration</Text>
					<TextInput
						value={form.illus}
						onChangeText={(value) => updateField('illus', value)}
						placeholder="Enter illustration"
						style={[styles.input, styles.multiLine]}
						multiline
						textAlignVertical="top"
					/>
					{fieldErrors.illus && (
						<Text style={styles.validation}>{fieldErrors.illus}</Text>
					)}

					<Text style={styles.label}>Application</Text>
					<TextInput
						value={form.application}
						onChangeText={(value) => updateField('application', value)}
						placeholder="Enter application"
						style={[styles.input, styles.multiLine]}
						multiline
						textAlignVertical="top"
					/>
					{fieldErrors.application && (
						<Text style={styles.validation}>{fieldErrors.application}</Text>
					)}

					<Text style={styles.label}>Source</Text>
					<TextInput
						value={form.sourceLink}
						onChangeText={(value) => updateField('sourceLink', value)}
						placeholder="Enter source"
						style={styles.input}
					/>
					{fieldErrors.sourceLink && (
						<Text style={styles.validation}>{fieldErrors.sourceLink}</Text>
					)}
				</>
			) : (
				<Text style={styles.empty}>
					Select an item from the dropdown to edit.
				</Text>
			)}

			{errorMessage && <Text style={styles.error}>{errorMessage}</Text>}
			{successMessage && <Text style={styles.success}>{successMessage}</Text>}

			<Pressable
				style={[
					styles.saveButton,
					(saving || !selectedItem || !isFormValid || !isDirty) &&
						styles.saveButtonDisabled,
				]}
				onPress={handleSavePress}
				disabled={saving || !selectedItem || !isFormValid || !isDirty}
			>
				{saving ? (
					<ActivityIndicator color="#ffffff" />
				) : (
					<Text style={styles.saveButtonText}>Save Changes</Text>
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
	comboInputOpenZone: {
		position: 'absolute',
		top: 0,
		bottom: 0,
		left: 96,
		right: 30,
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
	label: {
		fontSize: 13,
		fontWeight: '700',
		color: '#374151',
		marginBottom: 6,
		marginTop: 8,
	},
	input: {
		backgroundColor: '#ffffff',
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#d1d5db',
		paddingHorizontal: 12,
		paddingVertical: 10,
		fontSize: 16,
	},
	multiLine: {
		minHeight: 110,
	},
	validation: {
		marginTop: 4,
		color: '#b91c1c',
		fontSize: 12,
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
	saveButton: {
		marginTop: 18,
		backgroundColor: '#0f766e',
		borderRadius: 12,
		paddingVertical: 12,
		alignItems: 'center',
	},
	saveButtonDisabled: {
		opacity: 0.55,
	},
	saveButtonText: {
		color: '#ffffff',
		fontWeight: '700',
		fontSize: 15,
	},
});
