import { pgTable, uuid, text, timestamp, pgEnum, varchar } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
// Importe a nova tabela de chat
import { chat } from "./chat.ts";
import { usuario } from "./usuario.ts";
import { prestadorServico } from "./prestadorServico.ts";

// (Assumindo que este enum já existe no arquivo original)
export const remetenteEnum = pgEnum('remetente', ['cliente', 'prestador']);

export const mensagem = pgTable('mensagem', {
  menID: uuid('menID').primaryKey().defaultRandom(),
  menConteudo: text('menConteudo').notNull(),
  menData: timestamp('menData').notNull().defaultNow(),
  
  // Chave estrangeira para o chat ao qual a mensagem pertence
  fk_chat_chatID: uuid('fk_chat_chatID').notNull().references(() => chat.chatID),

  // Chave estrangeira para o remetente.
  // Armazena o ID do usuário (cliente ou prestador) que enviou a mensagem.
  // O frontend precisa disso para diferenciar as mensagens.
  fk_remetente_usuID: varchar('fk_remetente_usuID').notNull(),
});

export const mensagemRelations = relations(mensagem, ({ one }) => ({
  // Relação: Uma mensagem pertence a um chat
  chat: one(chat, {
    fields: [mensagem.fk_chat_chatID],
    references: [chat.chatID],
  }),

  // Relação: Uma mensagem tem um remetente (que pode ser um 'usuario' ou 'prestadorServico')
  // Como o ID pode ser de duas tabelas diferentes, não podemos usar uma FK direta,
  // mas a relação ainda é útil para consultas.
}));