import { pgTable, text, varchar } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { prestadorServico } from "./prestadorServico.ts";
import { registroServico } from "./registroServico.ts";

export const endereco = pgTable('endereco', {
  endCEP: varchar('endCEP', { length: 8 }).primaryKey(),
  endRua: text('endRua').notNull(),
  endBairro: text('endBairro').notNull(),
  endCidade: text('endCidade').notNull(),
  endEstado: varchar('endEstado', { length: 2 }).notNull(),
});

export const enderecoRelations = relations(endereco, ({ many }) => ({
  prestadores: many(prestadorServico),
}));