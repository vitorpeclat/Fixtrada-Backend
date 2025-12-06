import { pgTable, uuid, varchar } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { registroServico } from "./registroServico.ts";

export const tipoServico = pgTable('tipo_servico', {
  tseID: uuid('tseID').primaryKey().defaultRandom(),
  tseTipoProblema: varchar('tseTipoProblema', { length: 100 }).notNull(),
});

export const tipoServicoRelations = relations(tipoServico, ({ many }) => ({
  registrosServico: many(registroServico),
}));