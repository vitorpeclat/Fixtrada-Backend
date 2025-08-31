import { date, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";


import { endereco } from "./endereco.ts";
import { carro } from "./carro.ts";
import { tipoServico } from "./tipoServico.ts";
import { prestadorServico } from "./prestadorServico.ts";

export const registroServico = pgTable('registro_servico', {
  regID: uuid('regID').primaryKey().defaultRandom(),
  regDescricao: text('regDescricao').notNull(),
  regData: date('regData').notNull(),
  regHora: timestamp('regHora').notNull(),
  fk_endereco_endCEP: varchar('fk_endereco_endCEP', { length: 9 }).notNull().references(() => endereco.endCEP),
  fk_carro_carID: uuid('fk_carro_carID').notNull().references(() => carro.carID),
  fk_prestador_servico_mecCNPJ: varchar('fk_prestador_servico_mecCNPJ', { length: 14 }).notNull().references(() => prestadorServico.mecCNPJ),
  fk_tipo_servico_tseID: uuid('fk_tipo_servico_tseID').notNull().references(() => tipoServico.tseID),
});