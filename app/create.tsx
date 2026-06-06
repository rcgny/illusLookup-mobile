import { Href, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
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
import { createIllustration } from '../services/illustrationsRepo';
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
 *
 * @returns {JSX.Element} The Create route form screen.
 */
export default function CreateScreen() {
	// SECTION 1: Router + form state
	const router = useRouter();
	const [form, setForm] = useState<CreateIllustrationInput>({
		topic: '',
		illus: '',
		application: '',
		sourceLink: '',
	});
	const [loading, setLoading] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [successMessage, setSuccessMessage] = useState<string | null>(null);

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

	// SECTION 3: Input handlers
	const updateField = (key: keyof CreateIllustrationInput, value: string) => {
		setForm((prev) => ({ ...prev, [key]: value }));
		setErrorMessage(null);
		setSuccessMessage(null);
	};

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
					Enter all fields, then tap Save to insert into local SQLite.
				</Text>

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
