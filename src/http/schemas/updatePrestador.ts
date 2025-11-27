import { z } from 'zod';

// Adicione os campos que podem ser atualizados pelo prestador
export const updatePrestadorSchema = z.object({
  mecFoto: z.string().url().optional(),
  mecEnderecoNum: z.number().int().optional(),
});

export type UpdatePrestadorDTO = z.infer<typeof updatePrestadorSchema>;
