// ============================================================================
// ENUMS
// ============================================================================
// Arquivo para armazenar enums para o banco de dados

import { pgEnum } from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum('user_role', ['cliente', 'prestador', 'admin']);
export const userStatusEnum = pgEnum('user_status', ['ativo', 'inativo', 'pendente']);