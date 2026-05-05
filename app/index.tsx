import { Text, View } from 'react-native';

/**
 * Renders the app's home screen.
 *
 * @returns {JSX.Element} A view containing the "Home Screen" title text.
 */
export default function IndexScreen() {
	return (
		<View style={{ padding: 20 }}>
			<Text style={{ fontSize: 20 }}>Home Screen</Text>
		</View>
	);
}
