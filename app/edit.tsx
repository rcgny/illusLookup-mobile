import { Text, View } from 'react-native';

/**
 * Placeholder Edit screen.
 *
 * This route is intentionally minimal while the project migrates from web API
 * CRUD flows to local SQLite CRUD flows in Expo.
 *
 * @returns {JSX.Element} The Edit route placeholder UI.
 */
export default function EditScreen() {
	return (
		<View style={{ padding: 20 }}>
			<Text style={{ fontSize: 20 }}>Edit Screen</Text>
		</View>
	);
}
