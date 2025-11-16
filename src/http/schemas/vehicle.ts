// ============================================================================
// SCHEMAS: Validação de Veículo
// ============================================================================

import { z } from 'zod';

export const vehicleSchema = z.object({
    carPlaca: z.string().length(7),
    carMarca: z.string(),
    carModelo: z.string(),
    carAno: z.number().int(),
    carCor: z.string(),
    carKM: z.number().int(),
    carTpCombust: z.string().max(30).optional(),
    carOpTracao: z.string().max(30).optional(),
    carOpTrocaOleo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de data inválido (AAAA-MM-DD)').optional(),
    carOpTrocaPneu: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de data inválido (AAAA-MM-DD)').optional(),
    carOpRevisao: z.string().max(255).optional(),
});