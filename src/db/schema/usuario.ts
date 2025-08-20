import { boolean, date, pgTable, text, uuid } from "drizzle-orm/pg-core";

// Definição da tabela 'usuario'
export const usuario = pgTable('usuario', {
  id: uuid('id').primaryKey().defaultRandom(),  // ID único usando UUID com valor aleatório
  usuLogin: text('usuLogin').notNull(),        // Login do usuário
  usuSenha: text('usuSenha').notNull(),        // Senha do usuário
  usuNome: text('usuNome').notNull(),          // Nome do usuário
  usuDataNasc: date('usuDataNasc').notNull(),  // Data de nascimento
  usuCpf: text('usuCpf').notNull(),            // CPF do usuário
  usuTelefone: text('usuTelefone'),           // Telefone do usuário (pode ser nulo)
  usuAtivo: boolean('usuAtivo').notNull(),     // Indica se o usuário está ativo
});