import { date, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { registroServico } from "./registroServico.ts";

export const mensagem = pgTable('mensagem', {
  menID: uuid('menID').primaryKey().defaultRandom(),
  menSender: varchar('menSender', { length: 100 }).notNull(),
  menConteudo: text('menConteudo').notNull(),
  menData: timestamp('menData').notNull().defaultNow(),
  fk_registro_servico_regID: uuid('fk_registro_servico_regID').notNull().references(() => registroServico.regID),
});