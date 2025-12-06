import { z } from 'zod';

export const createServiceRequestSchema = z.object({
    regDescricao: z.string(),
    fk_carro_carID: z.string().uuid(),
    fk_prestador_servico_mecCNPJ: z.string().optional(), // Opcional - prestador pode ser atribuído depois
    fk_tipo_servico_tseID: z.string().uuid(),
    regLatitude: z.number().min(-90).max(90, 'Latitude inválida.'),
    regLongitude: z.number().min(-180).max(180, 'Longitude inválida.'),
});