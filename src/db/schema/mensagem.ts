// ============================================================================
// SCHEMA: Mensagem
// ============================================================================
// Tabela de mensagens em chats entre clientes e prestadores

import { pgTable, uuid, text, timestamp, pgEnum, varchar } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { chat } from "./chat.ts";
import { usuario } from "./usuario.ts";
import { prestadorServico } from "./prestadorServico.ts";

// Enum para diferenciar remetentes
export const remetenteEnum = pgEnum('remetente', ['cliente', 'prestador']);

export const mensagem = pgTable('mensagem', {
  menID: uuid('menID').primaryKey().defaultRandom(),
  menConteudo: text('menConteudo').notNull(),
  menData: timestamp('menData').notNull().defaultNow(),
  fk_chat_chatID: uuid('fk_chat_chatID').notNull().references(() => chat.chatID),
  fk_remetente_usuID: varchar('fk_remetente_usuID').notNull(),
});

export const mensagemRelations = relations(mensagem, ({ one }) => ({
  chat: one(chat, {
    fields: [mensagem.fk_chat_chatID],
    references: [chat.chatID],
  }),
}));