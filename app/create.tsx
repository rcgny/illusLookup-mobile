import { Text, View } from 'react-native';

/**
 * Placeholder Create screen.
 *
 * This route exists so navigation can be wired up before the form logic is
 * implemented. In the next migration step, this component will host the
 * SQLite-backed create form.
 *
 * @returns {JSX.Element} The Create route placeholder UI.
 */
export default function CreateScreen() {
	return (
		<View style={{ padding: 20 }}>
			<Text style={{ fontSize: 20 }}>Create Screen</Text>
		</View>
	);
}
