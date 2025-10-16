import { boolean, doublePrecision, integer, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { endereco } from "./endereco.ts";

export const prestadorServico = pgTable('prestador_servico', {
  mecCNPJ: varchar('mecCNPJ', { length: 14 }).primaryKey(),
  mecNota: doublePrecision('mecNota'),
  mecEnderecoNum: integer('mecEnderecoNum').notNull(),
  mecLogin: varchar('mecLogin', { length: 50 }).notNull().unique(),
  mecSenha: text('mecSenha').notNull(),
  mecAtivo: boolean('mecAtivo').notNull().default(true),
  // LINHA ADICIONADA
  mecFoto: text('mecFoto'), // Pode ser a URL para a imagem
  mecVerificado: boolean('mecVerificado').default(false),
  mecCodigoVerificacao: text('mecCodigoVerificacao'),
  mecCodigoVerificacaoExpira: timestamp('mecCodigoVerificacaoExpira', { withTimezone: true }),
  fk_endereco_endCEP: varchar('fk_endereco_endCEP', { length: 9 }).notNull().references(() => endereco.endCEP),
});