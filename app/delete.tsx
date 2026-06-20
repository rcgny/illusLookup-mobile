import { Href, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
	ActivityIndicator,
	Alert,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
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
 *
 * @returns {JSX.Element} The Delete route screen.
 */
export default function DeleteScreen() {
	// SECTION 1: Router + state
	const router = useRouter();
	const [items, setItems] = useState<Illustration[]>([]);
	const [selectedId, setSelectedId] = useState<number | null>(null);
	const [loadingList, setLoadingList] = useState(true);
	const [deleting, setDeleting] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [successMessage, setSuccessMessage] = useState<string | null>(null);

	const selectedItem =
		selectedId === null
			? null
			: (items.find((item) => item.id === selectedId) ?? null);

	// SECTION 2: Load items when screen becomes active
	const load = useCallback(async () => {
		try {
			setLoadingList(true);
			setErrorMessage(null);

			const data = await listIllustrations();
			setItems(data);

			if (data.length === 0) {
				setSelectedId(null);
				return;
			}

			const stillExists =
				selectedId !== null && data.some((item) => item.id === selectedId);
			setSelectedId(stillExists ? selectedId : data[0].id);
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

	const handleSelect = (id: number) => {
		setSelectedId(id);
		setErrorMessage(null);
		setSuccessMessage(null);
	};

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
		<ScrollView
			contentContainerStyle={styles.scrollContent}
			keyboardShouldPersistTaps="handled"
		>
			<View style={styles.screen}>
				<Text style={styles.title}>Delete Illustration</Text>
				<Text style={styles.subtitle}>
					Select a record, review its details, then confirm deletion.
				</Text>

				<Text style={styles.sectionTitle}>Choose Illustration</Text>
				{loadingList && (
					<ActivityIndicator size="small" style={styles.loader} />
				)}
				{!loadingList && items.length === 0 && (
					<Text style={styles.empty}>
						No illustrations available to delete.
					</Text>
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
									onPress={() => handleSelect(item.id)}
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
		borderColor: '#b91c1c',
		backgroundColor: '#fef2f2',
	},
	selectItemText: {
		color: '#1f2937',
		fontSize: 14,
		fontWeight: '600',
	},
	selectItemTextSelected: {
		color: '#b91c1c',
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
