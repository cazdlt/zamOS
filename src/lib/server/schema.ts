import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

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
