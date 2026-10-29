import { sqliteTable, text, integer, index, check } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
export const admin = sqliteTable('admin', { id: integer('id').primaryKey(), password: text('password').notNull(), createdAt: integer('created_at').notNull() });
export const sessions = sqliteTable('sessions', { token: text('token').primaryKey(), csrf: text('csrf').notNull(), expires: integer('expires').notNull() });
export const limits = sqliteTable('limits', { key: text('key').primaryKey(), count: integer('count').notNull(), expires: integer('expires').notNull() });
export const entries = sqliteTable('entries', {
  id: text('id').primaryKey(), studentId: text('student_id').notNull(), name: text('name').notNull(), title: text('title').notNull(), author: text('author').notNull(), review: text('review').notNull(), createdAt: integer('created_at').notNull(), reviewed: integer('reviewed').notNull().default(0), deletedAt: integer('deleted_at'),
}, t => [index('entries_created_idx').on(t.createdAt), check('review_length', sql`length(${t.review}) BETWEEN 200 AND 10000`)]);
