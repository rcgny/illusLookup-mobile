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
import { listIllustrations } from '../services/illustrationsRepo';
import { Illustration } from '../types/illustration';

/**
 * Home screen for browsing locally stored illustrations.
 *
 * Key behaviors for this learning project:
 * - Loads rows from the SQLite repository when the screen gains focus.
 * - Filters rows by topic based on a search query.
 * - Uses explicit Keep/Undo prompts before navigation and search clear actions.
 *
 * @returns {JSX.Element} The Home/List screen.
 */
export default function IndexScreen() {
	// SECTION 1: Router + screen state
	// The router handles navigation to Create/Edit/Delete screens.
	// State values track fetched data, UI status, and user input.
	const router = useRouter();
	const [items, setItems] = useState<Illustration[]>([]);
	const [query, setQuery] = useState('');
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	// useRef stores the last query without forcing a re-render.
	const previousQueryRef = useRef('');

	// SECTION 2: Data loading
	// This function is the single source of truth for loading list data.
	const load = useCallback(async () => {
		// Centralized load handler keeps startup and refresh behavior consistent.
		try {
			setLoading(true);
			setError(null);
			const data = await listIllustrations();
			setItems(data);
		} catch {
			setError('Failed to load illustrations.');
		} finally {
			setLoading(false);
		}
	}, []);

	// SECTION 3: Refresh behavior
	// Re-runs load whenever this screen gets focus (for example, after returning
	// from Create/Edit/Delete).
	useFocusEffect(
		useCallback(() => {
			// Re-query data whenever this route becomes active.
			void load();
		}, [load]),
	);

	// SECTION 4: Derived searchable list
	// The original fetched list remains unchanged. Filtering is derived from
	// query + items, then memoized for efficiency.
	const filtered = useMemo(() => {
		// Derived list avoids mutating source data and recomputes only when needed.
		const q = query.trim().toLowerCase();
		if (!q) return items;
		return items.filter((i) => i.topic.toLowerCase().includes(q));
	}, [items, query]);

	// SECTION 5: Keep/Undo prompt helper
	// Any action that should be confirmed first can reuse this utility.
	const withKeepUndoPrompt = useCallback(
		(
			title: string,
			message: string,
			onKeep: () => void,
			onUndo?: () => void,
		) => {
			// Reusable confirmation helper to keep action prompts consistent.
			Alert.alert(title, message, [
				{
					text: 'Undo',
					style: 'cancel',
					onPress: onUndo,
				},
				{
					text: 'Keep',
					onPress: onKeep,
				},
			]);
		},
		[],
	);

	// SECTION 6: Prompted route navigation
	// Pressing action buttons does not navigate immediately; it asks the user to
	// Keep (continue) or Undo (cancel).
	const goWithPrompt = useCallback(
		(route: Href) => {
			// Route action is deferred until user explicitly confirms Keep.
			withKeepUndoPrompt(
				'Proceed to Screen',
				`Keep this action and open ${route}?`,
				() => router.push(route),
				undefined,
			);
		},
		[router, withKeepUndoPrompt],
	);

	// SECTION 7: Prompted search clear with undo restore
	// Undo restores the previously typed query value.
	const clearSearchWithPrompt = useCallback(() => {
		if (!query) return;
		const previous = previousQueryRef.current;

		// Undo restores the last search text tracked by previousQueryRef.
		withKeepUndoPrompt(
			'Clear Search',
			'Keep clear search or undo to restore your last text?',
			() => {
				previousQueryRef.current = query;
				setQuery('');
			},
			() => {
				setQuery(previous);
			},
		);
	}, [query, withKeepUndoPrompt]);

	// SECTION 8: Query input handler
	// Capture the prior query first so Undo has a restore value.
	const onQueryChange = useCallback(
		(value: string) => {
			// Track prior value so Undo has a known restore point.
			previousQueryRef.current = query;
			setQuery(value);
		},
		[query],
	);

	// SECTION 9: Render
	// Layout order: title -> search -> action buttons -> status states -> list.
	return (
		<View style={styles.screen}>
			<Text style={styles.title}>Illustrations</Text>

			<TextInput
				value={query}
				onChangeText={onQueryChange}
				placeholder="Search topic..."
				style={styles.search}
				autoCapitalize="none"
			/>

			<View style={styles.quickActionsRow}>
				<Pressable
					style={styles.actionBtn}
					onPress={() => goWithPrompt('/create' as Href)}
				>
					<Text style={styles.actionText}>Create</Text>
				</Pressable>
				<Pressable
					style={styles.actionBtn}
					onPress={() => goWithPrompt('/edit' as Href)}
				>
					<Text style={styles.actionText}>Edit</Text>
				</Pressable>
				<Pressable
					style={styles.actionBtn}
					onPress={() => goWithPrompt('/delete' as Href)}
				>
					<Text style={styles.actionText}>Delete</Text>
				</Pressable>
			</View>

			<View style={styles.quickActionsRow}>
				<Pressable style={styles.clearBtn} onPress={clearSearchWithPrompt}>
					<Text style={styles.clearText}>Clear Search</Text>
				</Pressable>
			</View>

			{loading && <ActivityIndicator size="large" style={styles.loader} />}
			{!loading && error && <Text style={styles.error}>{error}</Text>}
			{!loading && !error && filtered.length === 0 && (
				<Text style={styles.empty}>No illustrations found.</Text>
			)}

			{!loading && !error && filtered.length > 0 && (
				// FlatList efficiently renders large lists by virtualizing off-screen rows.
				<FlatList
					data={filtered}
					keyExtractor={(item) => String(item.id)}
					contentContainerStyle={styles.listContent}
					renderItem={({ item }) => (
						<View style={styles.card}>
							<Text style={styles.topic}>{item.topic}</Text>

							<Text style={styles.label}>Illustration</Text>
							<Text style={styles.body}>{item.illus}</Text>

							<Text style={styles.label}>Application</Text>
							<Text style={styles.body}>{item.application}</Text>

							<Text style={styles.label}>Source</Text>
							<Text style={styles.source}>{item.sourceLink}</Text>
						</View>
					)}
				/>
			)}
		</View>
	);
}

const styles = StyleSheet.create({
	screen: {
		flex: 1,
		paddingHorizontal: 16,
		paddingTop: 14,
		backgroundColor: '#f6f7f9',
	},
	title: {
		fontSize: 28,
		fontWeight: '700',
		marginBottom: 12,
		color: '#1f2937',
	},
	search: {
		backgroundColor: '#ffffff',
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#d1d5db',
		paddingHorizontal: 12,
		paddingVertical: 10,
		fontSize: 16,
		marginBottom: 12,
	},
	quickActionsRow: {
		flexDirection: 'row',
		gap: 8,
		marginBottom: 12,
	},
	actionBtn: {
		backgroundColor: '#0f766e',
		borderRadius: 10,
		paddingVertical: 8,
		paddingHorizontal: 12,
	},
	actionText: {
		color: '#ffffff',
		fontWeight: '600',
	},
	clearBtn: {
		backgroundColor: '#475569',
		borderRadius: 10,
		paddingVertical: 8,
		paddingHorizontal: 12,
	},
	clearText: {
		color: '#ffffff',
		fontWeight: '600',
	},
	loader: {
		marginTop: 24,
	},
	listContent: {
		paddingBottom: 24,
	},
	card: {
		backgroundColor: '#ffffff',
		borderRadius: 14,
		padding: 14,
		marginBottom: 10,
		borderWidth: 1,
		borderColor: '#e5e7eb',
	},
	topic: {
		fontSize: 18,
		fontWeight: '700',
		marginBottom: 8,
		color: '#111827',
	},
	label: {
		fontSize: 12,
		fontWeight: '700',
		color: '#4b5563',
		textTransform: 'uppercase',
		marginTop: 6,
	},
	body: {
		fontSize: 15,
		color: '#1f2937',
		marginTop: 2,
		lineHeight: 21,
	},
	source: {
		fontSize: 14,
		color: '#0f766e',
		marginTop: 2,
	},
	empty: {
		marginTop: 24,
		fontSize: 16,
		color: '#6b7280',
	},
	error: {
		marginTop: 24,
		fontSize: 16,
		color: '#b91c1c',
	},
});
