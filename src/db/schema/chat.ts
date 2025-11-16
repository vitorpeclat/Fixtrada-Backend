// ============================================================================
// SCHEMA: Chat
// ============================================================================
// Tabela de conversas entre clientes e prestadores

import { pgTable, uuid, varchar } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { usuario } from "./usuario.ts";
import { prestadorServico } from "./prestadorServico.ts";
import { registroServico } from "./registroServico.ts";
import { mensagem } from "./mensagem.ts";

export const chat = pgTable('chat', {
  chatID: uuid('chatID').primaryKey().defaultRandom(),
  fk_usuario_usuID: uuid('fk_usuario_usuID').notNull().references(() => usuario.usuID),
  fk_prestador_servico_mecCNPJ: varchar('fk_prestador_servico_mecCNPJ', { length: 14 }).notNull().references(() => prestadorServico.mecCNPJ),
  fk_registro_servico_regID: uuid('fk_registro_servico_regID').references(() => registroServico.regID),
});

export const chatRelations = relations(chat, ({ one, many }) => ({
  usuario: one(usuario, {
    fields: [chat.fk_usuario_usuID],
    references: [usuario.usuID],
  }),
  prestador: one(prestadorServico, {
    fields: [chat.fk_prestador_servico_mecCNPJ],
    references: [prestadorServico.mecCNPJ],
  }),
  registroServico: one(registroServico, {
    fields: [chat.fk_registro_servico_regID],
    references: [registroServico.regID],
  }),
  cliente: one(usuario, {
    fields: [chat.fk_usuario_usuID],
    references: [usuario.usuID],
  }),
  mensagens: many(mensagem),
}));