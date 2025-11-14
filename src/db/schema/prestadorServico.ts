import { boolean, doublePrecision, integer, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
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
  codigoResetSenha: text('codigoResetSenha'),
  codigoResetSenhaExpira: timestamp('codigoResetSenhaExpira', { withTimezone: true }),
  latitude: doublePrecision('latitude'),
  longitude: doublePrecision('longitude'),
  fk_endereco_endCEP: varchar('fk_endereco_endCEP', { length: 8 }).notNull().references(() => endereco.endCEP),
});

export const prestadorServicoRelations = relations(prestadorServico, ({ one }) => ({
    endereco: one(endereco, {
        fields: [prestadorServico.fk_endereco_endCEP],
        references: [endereco.endCEP],
    }),
}));