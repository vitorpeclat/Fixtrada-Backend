import { boolean, date, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

export const usuario = pgTable('usuario', {
  usuID: uuid('usuID').primaryKey().defaultRandom(),
  usuLogin: varchar('usuLogin', { length: 50 }).notNull().unique(),
  usuSenha: text('usuSenha').notNull(),
  usuNome: varchar('usuNome', { length: 100 }).notNull(),
  usuDataNasc: date('usuDataNasc').notNull(),
  usuCpf: varchar('usuCpf', { length: 11 }).notNull().unique(),
  usuTelefone: text('usuTelefone'),
  usuAtivo: boolean('usuAtivo').notNull().default(true),
  usuRole: varchar('usuRole', { length: 10 }).notNull().default('cliente'), // cliente, admin
  // LINHA ADICIONADA
  usuFoto: text('usuFoto'), // Pode ser a URL para a imagem
  usuVerificado: boolean('usuVerificado').default(false),
  usuCodigoVerificacao: text('usuCodigoVerificacao'),
  usuCodigoVerificacaoExpira: timestamp('usuCodigoVerificacaoExpira', { withTimezone: true }),
  codigoResetSenha: text('codigoResetSenha'),
  codigoResetSenhaExpira: timestamp('codigoResetSenhaExpira', { withTimezone: true }),
});