import { z } from 'zod';

// Adicione os campos que podem ser atualizados pelo prestador
export const updatePrestadorSchema = z.object({
  mecFoto: z.string().url().optional(),
  mecEnderecoNum: z.number().int().optional(),
  latitude: z.number().min(-90).max(90, 'Latitude inválida.').optional(),
  longitude: z.number().min(-180).max(180, 'Longitude inválida.').optional(),
});

export type UpdatePrestadorDTO = z.infer<typeof updatePrestadorSchema>;
