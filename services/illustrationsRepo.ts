import { Illustration } from '../types/illustration';

/**
 * Learning-project repository boundary for illustration queries.
 *
 * Why this file exists:
 * - Screens call this module instead of embedding data access logic.
 * - The implementation can be swapped from mock data to SQLite with minimal UI changes.
 */

const demoRows: Illustration[] = [
	{
		id: 1,
		topic: 'Grace Under Pressure',
		illus: 'Calm, controlled response under stress.',
		application: 'Team lead de-escalates a production incident.',
		sourceLink: 'Seed data',
		createdAt: new Date(0).toISOString(),
		updatedAt: new Date(0).toISOString(),
	},
	{
		id: 2,
		topic: 'Incremental Learning',
		illus: 'Small improvements compound over time.',
		application: 'Daily coding practice with reflection notes.',
		sourceLink: 'Seed data',
		createdAt: new Date(0).toISOString(),
		updatedAt: new Date(0).toISOString(),
	},
];

/**
 * Returns all illustrations ordered by topic.
 *
 * @returns {Promise<Illustration[]>} A promise containing the list data.
 */
export async function listIllustrations(): Promise<Illustration[]> {
	const sorted = [...demoRows].sort((a, b) => a.topic.localeCompare(b.topic));
	return sorted;
}
