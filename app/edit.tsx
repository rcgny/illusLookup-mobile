import {
	Href,
	useFocusEffect,
	useLocalSearchParams,
	useRouter,
} from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
	ActivityIndicator,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	View,
} from 'react-native';
import { TopicComboBox } from '../components/TopicComboBox';
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
 * - Saves immediately after validation and dirty-state checks.
 * - Returns to Home after successful update.
 * - Phase 2.4 Step 5: Uses a Home-style combo-box for searchable selection.
 * - Phase 2.4 Step 6: Uses non-ScrollView outer container to avoid nested list warnings.
 * - Phase 2.5.1 Step 1: Tapping the combo input box opens/focuses the dropdown.
 * - Phase 2.5.2 Step 1: Uses shared TopicComboBox component.
 * - Phase 2.5.3 Steps 2-3: Combo closes on outside tap and Android back/keyboard dismiss.
 * - Phase 2.6.3 Step 1: Supports optional prefill from route id for one-time selection. ( In [id].tsx)
 * - Phase 2.6.3 Step 2: Supports one-time prefill selection from optional route id.
 *
 * @returns {JSX.Element} The Edit route screen.
 */
export default function EditScreen() {
	const router = useRouter();
	const params = useLocalSearchParams<{ id?: string | string[] }>();
	const [items, setItems] = useState<Illustration[]>([]);
	const [selectedId, setSelectedId] = useState<number | null>(null);
	const [topicSearch, setTopicSearch] = useState('');
	const [comboOpen, setComboOpen] = useState(false);
	const [routePrefillApplied, setRoutePrefillApplied] = useState(false);
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

	const selectedItem = useMemo(() => {
		if (selectedId === null) return null;
		return items.find((item) => item.id === selectedId) ?? null;
	}, [items, selectedId]);

	// Phase 2.7 Step 5: Use id-qualified labels so records with shared topics remain selectable.
	const toOptionLabel = useCallback((item: Illustration) => {
		return `${item.topic} (ID ${item.id})`;
	}, []);

	const routeEditId = useMemo(() => {
		const idParam = Array.isArray(params.id) ? params.id[0] : params.id;
		if (!idParam) return null;
		const parsed = Number(idParam);
		if (!Number.isFinite(parsed) || parsed <= 0) return null;
		return parsed;
	}, [params.id]);

	const sortedItems = useMemo(() => {
		return [...items].sort((a, b) => {
			const topicOrder = a.topic.localeCompare(b.topic, undefined, {
				sensitivity: 'base',
			});
			if (topicOrder !== 0) return topicOrder;
			return a.id - b.id;
		});
	}, [items]);

	const filteredItems = useMemo(() => {
		const q = topicSearch.trim().toLowerCase();
		if (!q) return sortedItems;
		return sortedItems.filter((item) => {
			return (
				item.topic.toLowerCase().includes(q) ||
				item.illus.toLowerCase().includes(q) ||
				item.application.toLowerCase().includes(q) ||
				String(item.id).includes(q)
			);
		});
	}, [sortedItems, topicSearch]);

	const filteredOptions = useMemo(() => {
		return filteredItems.map(toOptionLabel);
	}, [filteredItems, toOptionLabel]);

	const selectedOptionLabel = useMemo(() => {
		if (!selectedItem) return '';
		return toOptionLabel(selectedItem);
	}, [selectedItem, toOptionLabel]);

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

			if (!routePrefillApplied) {
				// Phase 2.6.3 Step 2: Apply detail-route id prefill once, then keep manual edit flow unchanged.
				const routeMatch =
					routeEditId === null
						? null
						: (data.find((item) => item.id === routeEditId) ?? null);

				if (routeMatch) {
					setSelectedId(routeMatch.id);
					syncFormFromItem(routeMatch);
					setTopicSearch(toOptionLabel(routeMatch));
					setComboOpen(false);
					setRoutePrefillApplied(true);
					return;
				}

				setRoutePrefillApplied(true);
			}

			const stillExists =
				selectedId !== null && data.some((item) => item.id === selectedId);
			if (stillExists) {
				const nextSelected = data.find((item) => item.id === selectedId);
				setSelectedId(nextSelected?.id ?? null);
				if (nextSelected) {
					syncFormFromItem(nextSelected);
					setTopicSearch(toOptionLabel(nextSelected));
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
	}, [
		routeEditId,
		routePrefillApplied,
		selectedId,
		syncFormFromItem,
		toOptionLabel,
	]);

	useFocusEffect(
		useCallback(() => {
			void load();
		}, [load]),
	);

	const selectItem = (item: Illustration) => {
		setSelectedId(item.id);
		setTopicSearch(toOptionLabel(item));
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
				setTopicSearch(selectedItem ? toOptionLabel(selectedItem) : '');
			}
			return next;
		});
	}, [selectedItem, toOptionLabel]);

	const toggleComboFromZone = useCallback(() => {
		setComboOpen((open) => {
			const next = !open;
			if (next) {
				setTopicSearch(selectedItem ? toOptionLabel(selectedItem) : '');
			}
			return next;
		});
	}, [selectedItem, toOptionLabel]);

	const closeCombo = useCallback(() => {
		setComboOpen(false);
	}, []);

	const onComboSearchChange = useCallback(
		(value: string) => {
			setComboOpen(true);
			setTopicSearch(value);

			if (selectedItem && value.trim() !== selectedOptionLabel) {
				setSelectedId(null);
			}
		},
		[selectedItem, selectedOptionLabel],
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

		// Phase 2.6.2 Step 2: Update runs immediately after validation without a Keep/Undo prompt.
		void runSave();
	};

	return (
		<ScrollView
			contentContainerStyle={styles.scrollContent}
			keyboardShouldPersistTaps="handled"
		>
			<View style={styles.screen}>
				<Text style={styles.title}>Edit Illustration</Text>
				<Text style={styles.subtitle}>
					Select an existing item, update fields, then save changes.
				</Text>

				<Text style={styles.sectionTitle}>Choose Illustration</Text>
				{loadingList && (
					<ActivityIndicator size="small" style={styles.loader} />
				)}
				{!loadingList && items.length === 0 && (
					<Text style={styles.empty}>No illustrations available to edit.</Text>
				)}

				{!loadingList && items.length > 0 && (
					<TopicComboBox
						value={comboOpen ? topicSearch : selectedOptionLabel}
						onChangeText={onComboSearchChange}
						placeholder="Select Illustration"
						isOpen={comboOpen}
						onToggle={toggleCombo}
						onRequestClose={closeCombo}
						onToggleFromZone={toggleComboFromZone}
						options={filteredOptions}
						onSelectOption={(optionLabel) => {
							const match = filteredItems.find(
								(row) => toOptionLabel(row) === optionLabel,
							);
							if (!match) return;
							selectItem(match);
						}}
						showClear={Boolean(selectedItem || topicSearch)}
						onClear={clearSelection}
						showOpenZone={!selectedItem && !topicSearch.trim()}
						emptyMessage="No matching topics."
						containerStyle={styles.comboContainer}
					/>
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
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	scrollContent: {
		flexGrow: 1,
	},
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
