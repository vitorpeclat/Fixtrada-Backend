// ============================================================================
// SCHEMA: Usuário
// ============================================================================
// Tabela de usuários do sistema (clientes e administradores)

import { boolean, date, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { carro } from "./carro.ts";
import { userRoleEnum, userStatusEnum } from "./enums.ts";

export const usuario = pgTable('usuario', {
  usuID: uuid('usuID').primaryKey().defaultRandom(),
  usuLogin: varchar('usuLogin', { length: 50 }).notNull().unique(),
  usuSenha: text('usuSenha').notNull(),
  usuNome: varchar('usuNome', { length: 100 }).notNull(),
  usuDataNasc: date('usuDataNasc').notNull(),
  usuCpf: varchar('usuCpf', { length: 11 }).notNull().unique(),
  usuTelefone: text('usuTelefone'),
  usuAtivo: boolean('usuAtivo').notNull().default(true),
  usuTipo: userRoleEnum('usuRole').notNull().default('cliente'),
  usuFoto: text('usuFoto'),
  usuVerificado: boolean('usuVerificado').default(false),
  usuCodigoVerificacao: text('usuCodigoVerificacao'),
  usuCodigoVerificacaoExpira: timestamp('usuCodigoVerificacaoExpira', { withTimezone: true }),
  codigoResetSenha: text('codigoResetSenha'),
  codigoResetSenhaExpira: timestamp('codigoResetSenhaExpira', { withTimezone: true }),
  usuStatus: userStatusEnum('usu_status').notNull().default('ativo'),
  usuDataCriacao: timestamp('usu_data_criacao').defaultNow().notNull(),
});

export const usuarioRelations = relations(usuario, ({ many }) => ({
    carros: many(carro),
}));