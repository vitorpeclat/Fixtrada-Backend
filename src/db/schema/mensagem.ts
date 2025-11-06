import { pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { registroServico } from "./registroServico.ts";
import { relations } from "drizzle-orm"; // Importar relations

export const mensagem = pgTable('mensagem', {
  menID: uuid('menID').primaryKey().defaultRandom(),
  menSender: varchar('menSender', { length: 100 }).notNull(),
  menSenderId: uuid('menSenderId'), // <<< ADICIONAR ESTA LINHA (uuid de quem enviou)
  menConteudo: text('menConteudo').notNull(),
  menData: timestamp('menData').notNull().defaultNow(),
  fk_registro_servico_regID: uuid('fk_registro_servico_regID').notNull().references(() => registroServico.regID),
});

// Opcional, mas recomendado para o Drizzle Kit
export const mensagemRelations = relations(mensagem, ({ one }) => ({
	registroServico: one(registroServico, {
		fields: [mensagem.fk_registro_servico_regID],
		references: [registroServico.regID],
	}),
}));