import { Href, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
	ActivityIndicator,
	Alert,
	Pressable,
	ScrollView,
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
 *
 * @returns {JSX.Element} The Edit route screen.
 */
export default function EditScreen() {
	const router = useRouter();
	const [items, setItems] = useState<Illustration[]>([]);
	const [selectedId, setSelectedId] = useState<number | null>(null);
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
				setForm({ topic: '', illus: '', application: '', sourceLink: '' });
				return;
			}

			const stillExists =
				selectedId !== null && data.some((item) => item.id === selectedId);
			const nextSelected = stillExists
				? (data.find((item) => item.id === selectedId) ?? data[0])
				: data[0];

			setSelectedId(nextSelected.id);
			syncFormFromItem(nextSelected);
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
		syncFormFromItem(item);
		setErrorMessage(null);
		setSuccessMessage(null);
	};

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
					<View style={styles.selectList}>
						{items.map((item) => {
							const isSelected = selectedId === item.id;
							return (
								<Pressable
									key={item.id}
									style={[
										styles.selectItem,
										isSelected && styles.selectItemSelected,
									]}
									onPress={() => selectItem(item)}
								>
									<Text
										style={[
											styles.selectItemText,
											isSelected && styles.selectItemTextSelected,
										]}
									>
										{item.topic}
									</Text>
								</Pressable>
							);
						})}
					</View>
				)}

				<Text style={styles.sectionTitle}>Edit Fields</Text>

				<Text style={styles.label}>Topic</Text>
				<TextInput
					value={form.topic}
					onChangeText={(value) => updateField('topic', value)}
					placeholder="Enter topic"
					style={styles.input}
					editable={!!selectedItem}
				/>
				{fieldErrors.topic && selectedItem && (
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
					editable={!!selectedItem}
				/>
				{fieldErrors.illus && selectedItem && (
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
					editable={!!selectedItem}
				/>
				{fieldErrors.application && selectedItem && (
					<Text style={styles.validation}>{fieldErrors.application}</Text>
				)}

				<Text style={styles.label}>Source</Text>
				<TextInput
					value={form.sourceLink}
					onChangeText={(value) => updateField('sourceLink', value)}
					placeholder="Enter source"
					style={styles.input}
					editable={!!selectedItem}
				/>
				{fieldErrors.sourceLink && selectedItem && (
					<Text style={styles.validation}>{fieldErrors.sourceLink}</Text>
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
		paddingBottom: 24,
	},
	screen: {
		flex: 1,
		paddingHorizontal: 16,
		paddingTop: 14,
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
	selectList: {
		gap: 8,
		marginBottom: 10,
	},
	selectItem: {
		backgroundColor: '#ffffff',
		borderRadius: 10,
		borderWidth: 1,
		borderColor: '#d1d5db',
		paddingVertical: 10,
		paddingHorizontal: 12,
	},
	selectItemSelected: {
		borderColor: '#0f766e',
		backgroundColor: '#ecfeff',
	},
	selectItemText: {
		color: '#1f2937',
		fontSize: 14,
		fontWeight: '600',
	},
	selectItemTextSelected: {
		color: '#0f766e',
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
