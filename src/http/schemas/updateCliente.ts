// ============================================================================
// SCHEMAS: Validação de Atualização de Cliente
// ============================================================================

import { z } from 'zod';

export const updateClienteSchema = z.object({
  nome: z.string().min(1, 'O nome deve ter ao menos 1 caractere.').optional(),
  email: z.string().email('Formato de e-mail inválido.').optional(),
  dataNascimento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de data inválido (AAAA-MM-DD).').optional(),
  telefone: z.string().regex(/^\d{10,11}$/, 'Formato de telefone inválido. Deve conter apenas números e ter 10 ou 11 dígitos.').optional(), 
});

export type UpdateClienteDTO = z.infer<typeof updateClienteSchema>;