import { date, pgTable, text, uuid, varchar } from "drizzle-orm/pg-core";
import { registroServico } from "./registroServico.ts";

export const mensagem = pgTable('mensagem', {
  menID: uuid('menID').primaryKey().defaultRandom(),
  menSender: varchar('menSender', { length: 100 }).notNull(),
  menConteudo: text('menConteudo').notNull(),
  menData: date('menData').notNull(),
  fk_registro_servico_regID: uuid('fk_registro_servico_regID').notNull().references(() => registroServico.regID),
});