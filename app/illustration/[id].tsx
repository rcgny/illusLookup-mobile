import { Href, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
	ActivityIndicator,
	Linking,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	View,
} from 'react-native';
import { getIllustrationById } from '../../services/illustrationsRepo';
import { Illustration } from '../../types/illustration';

/**
 * Fullscreen read-only illustration card route.
 *
 * Phase 2.6.1 Step 1:
 * - Adds a dedicated details screen for a single illustration.
 * - Preserves read-only data rendering for the selected item.
 *
 * Phase 2.6.3 Step 1:
 * - Adds minimal Edit/Delete actions that pass the current id to target routes.
 *
 * @returns {JSX.Element} Read-only details screen for one illustration.
 */
export default function IllustrationDetailsScreen() {
	const router = useRouter();
	const params = useLocalSearchParams<{ id?: string | string[] }>();
	const [item, setItem] = useState<Illustration | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const idParam = useMemo(() => {
		return Array.isArray(params.id) ? params.id[0] : params.id;
	}, [params.id]);

	const illustrationId = useMemo(() => {
		if (!idParam) return null;
		const parsed = Number(idParam);
		if (!Number.isFinite(parsed) || parsed <= 0) return null;
		return parsed;
	}, [idParam]);

	useEffect(() => {
		// Phase 2.6.1 Step 2: Load detail data by route id for fullscreen card view.
		const load = async () => {
			if (illustrationId === null) {
				setError('Invalid illustration id.');
				setItem(null);
				setLoading(false);
				return;
			}

			try {
				setLoading(true);
				setError(null);
				const row = await getIllustrationById(illustrationId);
				setItem(row);
			} catch {
				setError('Failed to load illustration details.');
				setItem(null);
			} finally {
				setLoading(false);
			}
		};

		void load();
	}, [illustrationId]);

	const handleOpenSource = async () => {
		if (!item?.sourceLink) return;
		const supported = await Linking.canOpenURL(item.sourceLink);
		if (!supported) return;
		await Linking.openURL(item.sourceLink);
	};

	const handleEditPress = () => {
		if (!item) return;
		// Phase 2.6.3 Step 1: Start detail -> edit transition by forwarding selected id.
		router.push(`/edit?id=${item.id}` as Href);
	};

	const handleDeletePress = () => {
		if (!item) return;
		// Phase 2.6.3 Step 1: Start detail -> delete transition by forwarding selected id.
		router.push(`/delete?id=${item.id}` as Href);
	};

	if (loading) {
		return (
			<View style={styles.centerState}>
				<ActivityIndicator size="large" />
				<Text style={styles.stateText}>Loading illustration...</Text>
			</View>
		);
	}

	if (error) {
		return (
			<View style={styles.centerState}>
				<Text style={styles.errorText}>{error}</Text>
			</View>
		);
	}

	if (!item) {
		return (
			<View style={styles.centerState}>
				<Text style={styles.stateText}>Illustration not found.</Text>
			</View>
		);
	}

	return (
		<ScrollView
			contentContainerStyle={styles.scrollContent}
			style={styles.screen}
		>
			<View style={styles.card}>
				<Text style={styles.topic}>{item.topic}</Text>

				<Text style={styles.label}>Illustration</Text>
				<Text style={styles.body}>{item.illus}</Text>

				<Text style={styles.label}>Application</Text>
				<Text style={styles.body}>{item.application}</Text>

				<Text style={styles.label}>Source</Text>
				<Pressable onPress={() => void handleOpenSource()}>
					<Text style={styles.source}>{item.sourceLink}</Text>
				</Pressable>

				<Text style={styles.meta}>Created: {item.createdAt}</Text>
				<Text style={styles.meta}>Updated: {item.updatedAt}</Text>

				<View style={styles.actionRow}>
					<Pressable style={styles.editButton} onPress={handleEditPress}>
						<Text style={styles.actionButtonText}>Edit</Text>
					</Pressable>
					<Pressable style={styles.deleteButton} onPress={handleDeletePress}>
						<Text style={styles.actionButtonText}>Delete</Text>
					</Pressable>
				</View>
			</View>
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	screen: {
		flex: 1,
		backgroundColor: '#f6f7f9',
	},
	scrollContent: {
		paddingHorizontal: 16,
		paddingTop: 16,
		paddingBottom: 24,
	},
	card: {
		backgroundColor: '#ffffff',
		borderRadius: 16,
		padding: 16,
		borderWidth: 1,
		borderColor: '#e5e7eb',
	},
	topic: {
		fontSize: 24,
		fontWeight: '700',
		color: '#111827',
		marginBottom: 10,
	},
	label: {
		fontSize: 12,
		fontWeight: '700',
		color: '#4b5563',
		textTransform: 'uppercase',
		marginTop: 10,
	},
	body: {
		fontSize: 16,
		lineHeight: 23,
		color: '#1f2937',
		marginTop: 4,
	},
	source: {
		fontSize: 15,
		color: '#0f766e',
		marginTop: 4,
		textDecorationLine: 'underline',
	},
	meta: {
		fontSize: 12,
		color: '#6b7280',
		marginTop: 10,
	},
	actionRow: {
		marginTop: 16,
		flexDirection: 'row',
		gap: 10,
	},
	editButton: {
		flex: 1,
		backgroundColor: '#0f766e',
		borderRadius: 10,
		paddingVertical: 10,
		alignItems: 'center',
	},
	deleteButton: {
		flex: 1,
		backgroundColor: '#b91c1c',
		borderRadius: 10,
		paddingVertical: 10,
		alignItems: 'center',
	},
	actionButtonText: {
		fontSize: 14,
		fontWeight: '700',
		color: '#ffffff',
	},
	centerState: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: 20,
		backgroundColor: '#f6f7f9',
	},
	stateText: {
		marginTop: 10,
		fontSize: 15,
		color: '#4b5563',
		textAlign: 'center',
	},
	errorText: {
		fontSize: 15,
		color: '#b91c1c',
		textAlign: 'center',
	},
});
