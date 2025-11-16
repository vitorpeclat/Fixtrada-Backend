// ============================================================================
// SCHEMA: Usuário
// ============================================================================
// Tabela de usuários do sistema (clientes e administradores)

import { boolean, date, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { carro } from "./carro.ts";

export const usuario = pgTable('usuario', {
  usuID: uuid('usuID').primaryKey().defaultRandom(),
  usuLogin: varchar('usuLogin', { length: 50 }).notNull().unique(),
  usuSenha: text('usuSenha').notNull(),
  usuNome: varchar('usuNome', { length: 100 }).notNull(),
  usuDataNasc: date('usuDataNasc').notNull(),
  usuCpf: varchar('usuCpf', { length: 11 }).notNull().unique(),
  usuTelefone: text('usuTelefone'),
  usuAtivo: boolean('usuAtivo').notNull().default(true),
  usuRole: varchar('usuRole', { length: 10 }).notNull().default('cliente'),
  usuFoto: text('usuFoto'),
  usuVerificado: boolean('usuVerificado').default(false),
  usuCodigoVerificacao: text('usuCodigoVerificacao'),
  usuCodigoVerificacaoExpira: timestamp('usuCodigoVerificacaoExpira', { withTimezone: true }),
  codigoResetSenha: text('codigoResetSenha'),
  codigoResetSenhaExpira: timestamp('codigoResetSenhaExpira', { withTimezone: true }),
  usuStatus: text('usu_status').notNull(),
  usuDataCriacao: timestamp('usu_data_criacao').defaultNow().notNull(),
});

export const usuarioRelations = relations(usuario, ({ many }) => ({
    carros: many(carro),
}));