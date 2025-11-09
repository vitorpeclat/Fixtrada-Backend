import { pgTable, uuid, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
// Importe a nova tabela de chat
import { chat } from "./chat.ts";
// O import de registroServico foi removido das relações

// (Assumindo que este enum já existe no arquivo original)
export const remetenteEnum = pgEnum('remetente', ['cliente', 'prestador']);

export const mensagem = pgTable('mensagem', {
  menID: uuid('menID').primaryKey().defaultRandom(),
  menConteudo: text('menConteudo').notNull(),
  menData: timestamp('menData').notNull().defaultNow(),
  menRemetente: remetenteEnum('menRemetente').notNull(),
  
  // --- CAMPO NOVO ---
  fk_chat_chatID: uuid('fk_chat_chatID').notNull().references(() => chat.chatID),
  
  // --- CAMPO ANTIGO (REMOVIDO) ---
  // fk_registro_servico_regID: uuid('fk_registro_servico_regID').notNull().references(() => registroServico.regID),
});

export const mensagemRelations = relations(mensagem, ({ one }) => ({
  // --- RELAÇÃO NOVA ---
  chat: one(chat, {
    fields: [mensagem.fk_chat_chatID],
    references: [chat.chatID],
  }),
  
  // --- RELAÇÃO ANTIGA (REMOVIDA) ---
  // registroServico: one(registroServico, {
  //   fields: [mensagem.fk_registro_servico_regID],
  //   references: [registroServico.regID],
  // }),
}));