import { pgTable, uuid, varchar } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { usuario } from "./usuario.ts";
import { prestadorServico } from "./prestadorServico.ts";
import { registroServico } from "./registroServico.ts";
import { mensagem } from "./mensagem.ts";

export const chat = pgTable('chat', {
  chatID: uuid('chatID').primaryKey().defaultRandom(),
  
  // Chaves estrangeiras para os participantes
  fk_usuario_usuID: uuid('fk_usuario_usuID').notNull().references(() => usuario.usuID),
  fk_prestador_servico_mecCNPJ: varchar('fk_prestador_servico_mecCNPJ', { length: 14 }).notNull().references(() => prestadorServico.mecCNPJ),
  
  // Chave opcional: se o chat foi iniciado a partir de um serviço
  fk_registro_servico_regID: uuid('fk_registro_servico_regID').references(() => registroServico.regID), 
});

export const chatRelations = relations(chat, ({ one, many }) => ({
  usuario: one(usuario, {
    fields: [chat.fk_usuario_usuID],
    references: [usuario.usuID],
  }),
  prestadorServico: one(prestadorServico, {
    fields: [chat.fk_prestador_servico_mecCNPJ],
    references: [prestadorServico.mecCNPJ],
  }),
  // Opcional: o chat pode estar ligado a um serviço
  registroServico: one(registroServico, {
    fields: [chat.fk_registro_servico_regID],
    references: [registroServico.regID],
  }),
  
  // Relação principal: um chat tem muitas mensagens
  mensagens: many(mensagem),
}));