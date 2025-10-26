import { drizzle } from 'drizzle-orm/better-sqlite3';
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { eq } from 'drizzle-orm';
import Database from 'better-sqlite3';
import { dev } from '$app/environment';
import { existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';

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

// Schema
export const apps = sqliteTable('apps', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	name: text('name').notNull().unique(),
	description: text('description').notNull(),
	icon: text('icon').notNull(),
	url: text('url').notNull(),
	status: text('status', { enum: ['running', 'stopped', 'error'] }).notNull(),
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date()),
	updatedAt: integer('updated_at', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date())
});

export type App = typeof apps.$inferSelect;
export type NewApp = typeof apps.$inferInsert;

// Initialize database
let initialized = false;

export function initDb() {
	if (initialized) return;

	const db = getDb();

	sqlite.exec(`
    CREATE TABLE IF NOT EXISTS apps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT NOT NULL,
      icon TEXT NOT NULL,
      url TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('running', 'stopped', 'error')),
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);

	// Seed data if table is empty
	const count = sqlite.prepare('SELECT COUNT(*) as count FROM apps').get() as { count: number };

	if (count.count === 0) {
		const seedApps: NewApp[] = [
			{
				name: 'Plex',
				description: 'Media Server',
				icon: '🎬',
				url: 'http://localhost:32400',
				status: 'running'
			},
			{
				name: 'Home Assistant',
				description: 'Home Automation',
				icon: '🏠',
				url: 'http://localhost:8123',
				status: 'running'
			},
			{
				name: 'Nextcloud',
				description: 'File Storage',
				icon: '☁️',
				url: 'http://localhost:8080',
				status: 'running'
			},
			{
				name: 'Pi-hole',
				description: 'Ad Blocker',
				icon: '🛡️',
				url: 'http://localhost:80',
				status: 'running'
			},
			{
				name: 'Portainer',
				description: 'Container Manager',
				icon: '🐳',
				url: 'http://localhost:9000',
				status: 'running'
			},
			{
				name: 'Jellyfin',
				description: 'Media System',
				icon: '📺',
				url: 'http://localhost:8096',
				status: 'stopped'
			}
		];

		db.insert(apps).values(seedApps).run();
		console.log('✅ Database seeded with 6 apps');
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
