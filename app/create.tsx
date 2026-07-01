import { Href, useFocusEffect, useRouter } from 'expo-router';
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
	createIllustration,
	listIllustrations,
} from '../services/illustrationsRepo';
import { CreateIllustrationInput } from '../types/illustration';

/**
 * Create screen for adding a new illustration to SQLite.
 *
 * Phase 2.2 behaviors:
 * - Collects form input using controlled TextInput fields.
 * - Validates required values before insert.
 * - Saves immediately after validation passes.
 * - Persists to SQLite through repository boundary.
 * - Returns to Home screen after successful save.
 * - Phase 2.5.1 Step 1: Tapping the combo input box opens/focuses the dropdown.
 * - Phase 2.5.1 Step 2: Topic field supports choosing an existing topic or typing a new one.
 * - Phase 2.5.2 Step 1: Uses shared TopicComboBox component.
 * - Phase 2.5.3 Steps 2-3: Combo closes on outside tap and Android back/keyboard dismiss.
 *
 * @returns {JSX.Element} The Create route form screen.
 */
export default function CreateScreen() {
	// SECTION 1: Router + form state
	const router = useRouter();
	const [existingTopics, setExistingTopics] = useState<string[]>([]);
	const [loadingTopics, setLoadingTopics] = useState(true);
	const [comboOpen, setComboOpen] = useState(false);
	const [form, setForm] = useState<CreateIllustrationInput>({
		topic: '',
		illus: '',
		application: '',
		sourceLink: '',
	});
	const [loading, setLoading] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [successMessage, setSuccessMessage] = useState<string | null>(null);

	const filteredTopics = useMemo(() => {
		const q = form.topic.trim().toLowerCase();
		if (!q) return existingTopics;
		return existingTopics.filter((topic) => topic.toLowerCase().includes(q));
	}, [existingTopics, form.topic]);

	const displayedTopics = useMemo(() => {
		if (!form.topic.trim()) return filteredTopics.slice(0, 6);
		return filteredTopics;
	}, [filteredTopics, form.topic]);

	// SECTION 2: Form validation helpers
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

	const loadTopics = useCallback(async () => {
		try {
			setLoadingTopics(true);
			const data = await listIllustrations();
			const topics = Array.from(
				new Set(data.map((item) => item.topic.trim()).filter(Boolean)),
			).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
			setExistingTopics(topics);
		} finally {
			setLoadingTopics(false);
		}
	}, []);

	useFocusEffect(
		useCallback(() => {
			void loadTopics();
		}, [loadTopics]),
	);

	// SECTION 3: Input handlers
	const updateField = (key: keyof CreateIllustrationInput, value: string) => {
		setForm((prev) => ({ ...prev, [key]: value }));
		setErrorMessage(null);
		setSuccessMessage(null);
	};

	// Phase 2.5.1 Step 2: Topic combo supports existing-topic selection or new typing.
	const toggleCombo = useCallback(() => {
		setComboOpen((open) => !open);
	}, []);

	const toggleComboFromZone = useCallback(() => {
		setComboOpen((open) => !open);
	}, []);

	const closeCombo = useCallback(() => {
		setComboOpen(false);
	}, []);

	const clearTopicSelection = useCallback(() => {
		setComboOpen(false);
		updateField('topic', '');
	}, []);

	const selectExistingTopic = useCallback((topic: string) => {
		updateField('topic', topic);
		setComboOpen(false);
	}, []);

	// SECTION 4: Save flow
	const runSave = async () => {
		try {
			setLoading(true);
			setErrorMessage(null);
			setSuccessMessage(null);

			await createIllustration(form);
			setSuccessMessage(
				'Illustration saved successfully. Returning to Home...',
			);

			// Home screen reloads data on focus, so inserted row appears automatically.
			setTimeout(() => {
				router.push('/' as Href);
			}, 300);
		} catch (error) {
			setErrorMessage(
				error instanceof Error ? error.message : 'Failed to save illustration.',
			);
		} finally {
			setLoading(false);
		}
	};

	const handleSavePress = () => {
		if (!isFormValid) {
			setErrorMessage('Please fix validation errors before saving.');
			return;
		}

		// Phase 2.6.2 Step 1: Save runs immediately after validation without a Keep/Undo prompt.
		void runSave();
	};

	return (
		<ScrollView
			contentContainerStyle={styles.scrollContent}
			keyboardShouldPersistTaps="handled"
		>
			<View style={styles.screen}>
				<Text style={styles.title}>Create Illustration</Text>
				<Text style={styles.subtitle}>
					Choose an existing topic or type a new one, then fill the rest of the
					form.
				</Text>

				<Text style={styles.label}>Topic</Text>
				{loadingTopics && (
					<ActivityIndicator size="small" style={styles.inlineLoader} />
				)}
				<TopicComboBox
					value={form.topic}
					onChangeText={(value) => {
						updateField('topic', value);
						setComboOpen(true);
					}}
					placeholder="Select Topic"
					isOpen={comboOpen}
					onToggle={toggleCombo}
					onRequestClose={closeCombo}
					onToggleFromZone={toggleComboFromZone}
					options={displayedTopics}
					onSelectOption={selectExistingTopic}
					showClear={Boolean(form.topic)}
					onClear={clearTopicSelection}
					showOpenZone={!form.topic.trim()}
					emptyMessage="No matching topics."
					hintMessage={
						!form.topic.trim() && existingTopics.length > 6
							? 'Type to search more topics or enter a new one.'
							: undefined
					}
					containerStyle={styles.comboContainer}
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

				{errorMessage && <Text style={styles.error}>{errorMessage}</Text>}
				{successMessage && <Text style={styles.success}>{successMessage}</Text>}

				<Pressable
					style={[
						styles.saveButton,
						(loading || !isFormValid) && styles.saveButtonDisabled,
					]}
					onPress={handleSavePress}
					disabled={loading || !isFormValid}
				>
					{loading ? (
						<ActivityIndicator color="#ffffff" />
					) : (
						<Text style={styles.saveButtonText}>Save Illustration</Text>
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
		paddingHorizontal: 20,
		paddingTop: 14,
		backgroundColor: '#f6f7f9',
	},
	title: {
		fontSize: 24,
		fontWeight: '800',
		color: '#111827',
		marginBottom: 6,
	},
	subtitle: {
		fontSize: 14,
		lineHeight: 20,
		color: '#4b5563',
		marginBottom: 18,
	},
	label: {
		fontSize: 13,
		fontWeight: '700',
		color: '#374151',
		marginBottom: 6,
		marginTop: 8,
	},
	inlineLoader: {
		marginBottom: 8,
	},
	comboContainer: {
		marginBottom: 2,
		zIndex: 20,
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
