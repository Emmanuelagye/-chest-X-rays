import { relations } from 'drizzle-orm';
import { integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

// Users table authenticated via Firebase Auth
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull(),
  displayName: text('display_name'),
  photoUrl: text('photo_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Diagnostic review and triage records stored in PostgreSQL
export const diagnosticRecords = pgTable('diagnostic_records', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id)
    .notNull(),
  patientId: text('patient_id').notNull(),
  caseTitle: text('case_title').notNull(),
  predictedClass: text('predicted_class').notNull(),
  probabilityPercent: text('probability_percent').notNull(),
  backbone: text('backbone').notNull(),
  raleScore: integer('rale_score').notNull(),
  triagePriority: text('triage_priority').notNull(),
  radiologistImpression: text('radiologist_impression'),
  clinicalNotes: text('clinical_notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Multi-turn conversational chat thread messages
export const chatMessages = pgTable('chat_messages', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id)
    .notNull(),
  role: text('role').notNull(), // 'user' | 'model' | 'system'
  content: text('content').notNull(),
  model: text('model').notNull(), // e.g. 'gemini-3.8-flash'
  radiologistPersona: text('radiologist_persona').notNull(),
  caseContextId: text('case_context_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Drizzle relations
export const usersRelations = relations(users, ({ many }) => ({
  records: many(diagnosticRecords),
  messages: many(chatMessages),
}));

export const diagnosticRecordsRelations = relations(diagnosticRecords, ({ one }) => ({
  user: one(users, {
    fields: [diagnosticRecords.userId],
    references: [users.id],
  }),
}));

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  user: one(users, {
    fields: [chatMessages.userId],
    references: [users.id],
  }),
}));
