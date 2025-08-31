import { boolean, date, integer, pgTable, text, uuid, varchar } from "drizzle-orm/pg-core";
import { usuario } from "./usuario.ts";

export const carro = pgTable('carro', {
  carID: uuid('carID').primaryKey().defaultRandom(),
  carMarca: varchar('carMarca', { length: 50 }).notNull(),
  carModelo: varchar('carModelo', { length: 50 }).notNull(),
  carAno: integer('carAno').notNull(),
  carCor: varchar('carCor', { length: 30 }).notNull(),
  carKM: integer('carKM').notNull(),
  carTpCombust: varchar('carTpCombust', { length: 30 }),
  carOpTracao: varchar('carOpTracao', { length: 30 }),
  carOpTrocaOleo: date('carOpTrocaOleo'),
  carOpTrocaPneu: date('carOpTrocaPneu'),
  carOpRevisao: varchar('carOpRevisao', { length: 255 }),
  carAtivo: boolean('carAtivo').notNull(),
  fk_usuario_usuID: uuid('fk_usuario_usuID').notNull().references(() => usuario.usuID),
});