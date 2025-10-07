import { z } from 'zod';

// Zod Schema para a atualização
export const updateUserSchema = z.object({
  usuNome: z.string().min(3).optional(),
  usuTelefone: z.string().optional(),
  usuFoto: z.string().url().optional(),
});