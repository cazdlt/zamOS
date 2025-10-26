import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { eq, count } from 'drizzle-orm';
import Database from 'better-sqlite3';
import { dev } from '$app/environment';
import { existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import { apps, type App, type NewApp } from './schema';

const dbPath = dev ? 'data/zamos.db' : '/data/zamos.db';

let sqlite: Database.Database;
let dbInstance: ReturnType<typeof drizzle>;

function getDb() {
	if (!dbInstance) {
		// Ensure data directory exists
		const dbDir = dirname(dbPath);
		if (!existsSync(dbDir)) {
			mkdirSync(dbDir, { recursive: true });
		}
		sqlite = new Database(dbPath);
		dbInstance = drizzle(sqlite);
	}
	return dbInstance;
}

export const db = new Proxy({} as ReturnType<typeof drizzle>, {
	get: (target, prop) => {
		return getDb()[prop as keyof ReturnType<typeof drizzle>];
	}
});

// Re-export types
export type { App, NewApp };

// Initialize database with migrations
let initialized = false;

export function initDb() {
	if (initialized) return;

	const db = getDb();

	// Run migrations
	migrate(db, { migrationsFolder: './drizzle' });
	console.log('✅ Database migrations applied');

	// Seed data if table is empty
	const result = db.select({ count: count() }).from(apps).get();

	if (result && result.count === 0) {
		const seedApp: NewApp = {
			name: 'Example App',
			description: 'Sample Application',
			icon: '🚀',
			url: 'http://localhost:3000',
			status: 'running'
		};

		db.insert(apps).values(seedApp).run();
		console.log('✅ Database seeded with sample app');
	}

	initialized = true;
}

// Queries
export const appQueries = {
	getAll: () => {
		initDb();
		return db.select().from(apps).orderBy(apps.name).all();
	},
	getById: (id: number) => {
		initDb();
		return db.select().from(apps).where(eq(apps.id, id)).get();
	},
	create: (app: NewApp) => {
		initDb();
		return db.insert(apps).values(app).run();
	},
	update: (id: number, app: Partial<NewApp>) => {
		initDb();
		return db
			.update(apps)
			.set({ ...app, updatedAt: new Date() })
			.where(eq(apps.id, id))
			.run();
	},
	delete: (id: number) => {
		initDb();
		return db.delete(apps).where(eq(apps.id, id)).run();
	},
	updateStatus: (id: number, status: 'running' | 'stopped' | 'error') => {
		initDb();
		return db.update(apps).set({ status, updatedAt: new Date() }).where(eq(apps.id, id)).run();
	}
};
