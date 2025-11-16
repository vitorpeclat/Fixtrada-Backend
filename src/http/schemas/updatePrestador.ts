// ============================================================================
// SCHEMAS: Validação de Atualização de Prestador
// ============================================================================

import { z } from 'zod';

// Adicionar campos que podem ser atualizados pelo prestador
export const updatePrestadorSchema = z.object({
  mecFoto: z.string().url().optional(),
  mecEnderecoNum: z.number().int().optional(),
});

export type UpdatePrestadorDTO = z.infer<typeof updatePrestadorSchema>;
