import { Text, View } from 'react-native';

/**
 * Placeholder Logout screen.
 *
 * This route will later clear the login state and navigate the user back to
 * the Home screen.
 *
 * @returns {JSX.Element} The Logout route placeholder UI.
 */
export default function LogoutScreen() {
	return (
		<View style={{ padding: 20 }}>
			<Text style={{ fontSize: 20 }}>Logout Screen</Text>
		</View>
	);
}
