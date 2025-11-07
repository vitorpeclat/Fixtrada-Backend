import { pgTable, text, varchar } from "drizzle-orm/pg-core";

export const endereco = pgTable('endereco', {
  endCEP: varchar('endCEP', { length: 8 }).primaryKey(),
  endRua: text('endRua').notNull(),
  endBairro: text('endBairro').notNull(),
  endCidade: text('endCidade').notNull(),
  endEstado: varchar('endEstado', { length: 2 }).notNull(),
});