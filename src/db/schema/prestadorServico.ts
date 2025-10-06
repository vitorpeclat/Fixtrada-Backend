import { boolean, doublePrecision, integer, pgTable, text, varchar } from "drizzle-orm/pg-core";
import { endereco } from "./endereco.ts";

export const prestadorServico = pgTable('prestador_servico', {
  mecCNPJ: varchar('mecCNPJ', { length: 14 }).primaryKey(),
  mecNota: doublePrecision('mecNota'),
  mecEnderecoNum: integer('mecEnderecoNum').notNull(),
  mecLogin: varchar('mecLogin', { length: 50 }).notNull().unique(),
  mecSenha: text('mecSenha').notNull(),
  mecAtivo: boolean('mecAtivo').notNull(),
  // LINHA ADICIONADA
  mecFoto: text('mecFoto'), // Pode ser a URL para a imagem
  fk_endereco_endCEP: varchar('fk_endereco_endCEP', { length: 9 }).notNull().references(() => endereco.endCEP),
});