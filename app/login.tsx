import { Text, View } from 'react-native';

/**
 * Placeholder Login screen.
 *
 * This route is reserved for local auth gating so Create/Edit/Delete actions
 * can be hidden or disabled when the user is not authenticated.
 *
 * @returns {JSX.Element} The Login route placeholder UI.
 */
export default function LoginScreen() {
	return (
		<View style={{ padding: 20 }}>
			<Text style={{ fontSize: 20 }}>Login Screen</Text>
		</View>
	);
}
