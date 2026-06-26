import { Href, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
 * - Uses Keep/Undo confirmation before saving.
 * - Persists to SQLite through repository boundary.
 * - Returns to Home screen after successful save.
 * - Phase 2.5.1 Step 1: Tapping the combo input box opens/focuses the dropdown.
 * - Phase 2.5.1 Step 2: Topic field supports choosing an existing topic or typing a new one.
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
	const comboInputRef = useRef<TextInput | null>(null);

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

	useEffect(() => {
		if (comboOpen) {
			comboInputRef.current?.focus();
		}
	}, [comboOpen]);

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
		setComboOpen((open) => {
			const next = !open;
			if (next) {
				comboInputRef.current?.focus();
			} else {
				comboInputRef.current?.blur();
			}
			return next;
		});
	}, []);

	const clearTopicSelection = useCallback(() => {
		setComboOpen(false);
		updateField('topic', '');
	}, []);

	const selectExistingTopic = useCallback((topic: string) => {
		updateField('topic', topic);
		setComboOpen(false);
	}, []);

	// SECTION 4: Confirmed save flow (Keep/Undo)
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

		Alert.alert('Confirm Save', 'Keep this new illustration and save it?', [
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
				<Text style={styles.title}>Create Illustration</Text>
				<Text style={styles.subtitle}>
					Choose an existing topic or type a new one, then fill the rest of the
					form.
				</Text>

				<Text style={styles.label}>Topic</Text>
				{loadingTopics && (
					<ActivityIndicator size="small" style={styles.inlineLoader} />
				)}
				<View style={styles.comboContainer}>
					<View style={styles.comboInput}>
						<TextInput
							ref={comboInputRef}
							value={form.topic}
							onChangeText={(value) => {
								updateField('topic', value);
								setComboOpen(true);
							}}
							placeholder="Select Topic"
							style={styles.comboTextInput}
							autoCapitalize="none"
							autoCorrect={false}
						/>
						{!form.topic.trim() && (
							<Pressable
								style={styles.comboInputOpenZone}
								onPress={toggleComboFromZone}
							/>
						)}
						<View style={styles.comboInputActions}>
							{!!form.topic && (
								<Pressable
									onPress={clearTopicSelection}
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
							{displayedTopics.length === 0 ? (
								<Text style={styles.comboEmpty}>No matching topics.</Text>
							) : (
								<>
									{displayedTopics.map((topic) => (
										<Pressable
											key={topic}
											style={styles.comboOption}
											onPress={() => selectExistingTopic(topic)}
										>
											<Text style={styles.comboOptionText}>{topic}</Text>
										</Pressable>
									))}
									{!form.topic.trim() && existingTopics.length > 6 && (
										<Text style={styles.comboHint}>
											Type to search more topics or enter a new one.
										</Text>
									)}
								</>
							)}
						</View>
					)}
				</View>
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
	comboInput: {
		backgroundColor: '#ffffff',
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#d1d5db',
		paddingVertical: 10,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingLeft: 12,
		paddingRight: 8,
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
	comboHint: {
		paddingHorizontal: 12,
		paddingVertical: 10,
		fontSize: 13,
		color: '#6b7280',
		fontStyle: 'italic',
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
