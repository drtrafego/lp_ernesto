import { pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core'

export const leads = pgTable('leads', {
  id: serial('id').primaryKey(),
  name:     text('name').notNull(),
  whatsapp: text('whatsapp').notNull(),
  utm_source:   text('utm_source'),
  utm_medium:   text('utm_medium'),
  utm_campaign: text('utm_campaign'),
  utm_term:     text('utm_term'),
  created_at: timestamp('created_at').defaultNow().notNull(),
})

export type Lead    = typeof leads.$inferSelect
export type NewLead = typeof leads.$inferInsert
