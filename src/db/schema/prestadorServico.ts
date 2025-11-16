// ============================================================================
// SCHEMA: Prestador de Serviço
// ============================================================================
// Tabela de prestadores de serviço cadastrados

import { boolean, doublePrecision, integer, pgTable, text, timestamp, uuid, varchar, date } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { endereco } from "./endereco.ts";
import { usuario } from "./usuario.ts";

export const prestadorServico = pgTable('prestador_servico', {
  mecCNPJ: varchar('mecCNPJ', { length: 14 }).primaryKey(),
  mecNota: doublePrecision('mecNota'),
  mecEnderecoNum: integer('mecEnderecoNum').notNull(),
  mecNome: varchar('mecNome', { length: 100 }).notNull(),
  mecDataNasc: date('mecDataNasc').notNull(),
  mecAtivo: boolean('mecAtivo').notNull().default(true),
  mecFoto: text('mecFoto'),
  mecVerificado: boolean('mecVerificado').default(false),
  mecCodigoVerificacao: text('mecCodigoVerificacao'),
  mecCodigoVerificacaoExpira: timestamp('mecCodigoVerificacaoExpira', { withTimezone: true }),
  codigoResetSenha: text('codigoResetSenha'),
  codigoResetSenhaExpira: timestamp('codigoResetSenhaExpira', { withTimezone: true }),
  latitude: doublePrecision('latitude'),
  longitude: doublePrecision('longitude'),
  fk_endereco_endCEP: varchar('fk_endereco_endCEP', { length: 8 }).notNull().references(() => endereco.endCEP),
  fk_usuario_usuID: uuid('fk_usuario_usuID').notNull().references(() => usuario.usuID),
});

export const prestadorServicoRelations = relations(prestadorServico, ({ one }) => ({
    endereco: one(endereco, {
        fields: [prestadorServico.fk_endereco_endCEP],
        references: [endereco.endCEP],
    }),
    usuario: one(usuario, {
        fields: [prestadorServico.fk_usuario_usuID],
        references: [usuario.usuID],
    }),
}));