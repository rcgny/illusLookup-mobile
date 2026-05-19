import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { initializeDatabase } from '../db/database';

/**
 * Root layout component for the Expo Router app.
 *
 * In Expo Router, this file defines the top-level navigator for all routes
 * in the app directory. Every screen under app/ is rendered inside this stack.
 *
 * @returns {JSX.Element} The root Stack navigator element.
 */
export default function RootLayout() {
	useEffect(() => {
		// Initialize local DB once near app startup so screens can query immediately.
		void initializeDatabase();
	}, []);

	return <Stack />;
}
