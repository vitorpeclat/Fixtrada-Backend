import { z } from 'zod';

export const createServiceRequestSchema = z.object({
    regDescricao: z.string(),
    fk_carro_carID: z.string().uuid(),
    fk_prestador_servico_mecCNPJ: z.string(),
    fk_tipo_servico_tseID: z.string().uuid(),
});