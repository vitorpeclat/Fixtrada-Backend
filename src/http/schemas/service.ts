// ============================================================================
// SCHEMAS: Validação de Solicitação de Serviço
// ============================================================================

import { z } from 'zod';

export const createServiceRequestSchema = z.object({
    regDescricao: z.string(),
    fk_carro_carID: z.string().uuid(),
    fk_prestador_servico_mecCNPJ: z.string().optional(), // Opcional - prestador pode ser atribuído depois
    fk_tipo_servico_tseID: z.string().uuid(),
    fk_endereco_endCEP: z.string().length(8), // Adicionar CEP do local do serviço
});