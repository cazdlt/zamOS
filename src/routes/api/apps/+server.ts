import { json } from '@sveltejs/kit';
import { appQueries, type NewApp } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	const apps = appQueries.getAll();
	return json(apps);
};

export const POST: RequestHandler = async ({ request }) => {
	try {
		const data = await request.json();

		// Validate required fields
		if (!data.name || !data.description || !data.icon || !data.url || !data.status) {
			return json({ error: 'Missing required fields' }, { status: 400 });
		}

		// Validate status
		if (!['running', 'stopped', 'error'].includes(data.status)) {
			return json({ error: 'Invalid status' }, { status: 400 });
		}

		const newApp: NewApp = {
			name: data.name,
			description: data.description,
			icon: data.icon,
			url: data.url,
			status: data.status
		};

		appQueries.create(newApp);

		return json({ success: true }, { status: 201 });
	} catch (error) {
		console.error('Error creating app:', error);
		return json({ error: 'Failed to create app' }, { status: 500 });
	}
};

export const PUT: RequestHandler = async ({ request }) => {
	try {
		const data = await request.json();

		if (!data.id) {
			return json({ error: 'App ID is required' }, { status: 400 });
		}

		const updateData: Partial<NewApp> = {};
		if (data.name) updateData.name = data.name;
		if (data.description) updateData.description = data.description;
		if (data.icon) updateData.icon = data.icon;
		if (data.url) updateData.url = data.url;
		if (data.status && ['running', 'stopped', 'error'].includes(data.status)) {
			updateData.status = data.status;
		}

		appQueries.update(data.id, updateData);

		return json({ success: true });
	} catch (error) {
		console.error('Error updating app:', error);
		return json({ error: 'Failed to update app' }, { status: 500 });
	}
};

export const DELETE: RequestHandler = async ({ request }) => {
	try {
		const data = await request.json();

		if (!data.id) {
			return json({ error: 'App ID is required' }, { status: 400 });
		}

		appQueries.delete(data.id);

		return json({ success: true });
	} catch (error) {
		console.error('Error deleting app:', error);
		return json({ error: 'Failed to delete app' }, { status: 500 });
	}
};
