import { date, pgTable, text, timestamp, uuid, varchar, integer, doublePrecision } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { endereco } from "./endereco.ts";
import { carro } from "./carro.ts";
import { tipoServico } from "./tipoServico.ts";
import { prestadorServico } from "./prestadorServico.ts";
import { chat } from "./chat.ts"; // Importação adicionada

export const registroServico = pgTable('registro_servico', {
  regID: uuid('regID').primaryKey().defaultRandom(),
  // NOVOS CAMPOS ADICIONADOS
  regCodigo: varchar('regCodigo', { length: 8 }).unique(), // Código único de 8 caracteres
  regNotaCliente: integer('regNotaCliente'), // Nota que o cliente dará ao serviço
  regComentarioCliente: text('regComentarioCliente'), // Comentário do cliente sobre o serviço
  regValor: doublePrecision('regValor'), // Valor do serviço ou visita
  regStatus: varchar('regStatus', { length: 20 }).notNull().default('pendente'), // pendente, aceito, recusado, em_andamento, concluído, cancelado
  regDescricao: text('regDescricao').notNull(),
  regData: date('regData').notNull(),
  regHora: timestamp('regHora').notNull(),
  fk_endereco_endCEP: varchar('fk_endereco_endCEP', { length: 8 }).notNull().references(() => endereco.endCEP),
  fk_carro_carID: uuid('fk_carro_carID').notNull().references(() => carro.carID),
  fk_prestador_servico_mecCNPJ: varchar('fk_prestador_servico_mecCNPJ', { length: 14 }).references(() => prestadorServico.mecCNPJ),
  fk_tipo_servico_tseID: uuid('fk_tipo_servico_tseID').notNull().references(() => tipoServico.tseID),
});

export const registroServicoRelations = relations(registroServico, ({ one, many }) => ({
  carro: one(carro, {
    fields: [registroServico.fk_carro_carID],
    references: [carro.carID],
  }),
  prestadorServico: one(prestadorServico, {
    fields: [registroServico.fk_prestador_servico_mecCNPJ],
    references: [prestadorServico.mecCNPJ],
  }),
  tipoServico: one(tipoServico, {
    fields: [registroServico.fk_tipo_servico_tseID],
    references: [tipoServico.tseID],
  }),
  chats: many(chat),
}));