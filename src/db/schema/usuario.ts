import { boolean, date, pgTable, text, uuid, varchar } from "drizzle-orm/pg-core";

export const usuario = pgTable('usuario', {
  usuID: uuid('usuID').primaryKey().defaultRandom(),
  usuLogin: varchar('usuLogin', { length: 50 }).notNull().unique(),
  usuSenha: text('usuSenha').notNull(),
  usuNome: varchar('usuNome', { length: 100 }).notNull(),
  usuDataNasc: date('usuDataNasc').notNull(),
  usuCpf: varchar('usuCpf', { length: 11 }).notNull().unique(),
  usuTelefone: text('usuTelefone'),
  usuAtivo: boolean('usuAtivo').notNull(),
});