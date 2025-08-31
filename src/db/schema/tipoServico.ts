import { pgTable, uuid, varchar } from "drizzle-orm/pg-core";

export const tipoServico = pgTable('tipo_servico', {
  tseID: uuid('tseID').primaryKey().defaultRandom(),
  tseTipoProblema: varchar('tseTipoProblema', { length: 100 }).notNull(),
});