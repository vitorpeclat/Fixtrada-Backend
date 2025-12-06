import { boolean, date, doublePrecision, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { carro } from "./carro.ts";
import { chat } from "./chat.ts";

// Campo de foto será armazenado como Base64 em texto.

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
  // LINHA ADICIONADA (Base64)
  usuFoto: text('usuFoto'), // Armazena string Base64 da foto
  usuVerificado: boolean('usuVerificado').default(false),
  usuCodigoVerificacao: text('usuCodigoVerificacao'),
  usuCodigoVerificacaoExpira: timestamp('usuCodigoVerificacaoExpira', { withTimezone: true }),
  codigoResetSenha: text('codigoResetSenha'),
  codigoResetSenhaExpira: timestamp('codigoResetSenhaExpira', { withTimezone: true }),
  latitude: doublePrecision('latitude'),
  longitude: doublePrecision('longitude'),
});

export const usuarioRelations = relations(usuario, ({ many }) => ({
    carros: many(carro),
    chats: many(chat),
}));