import { z } from 'zod';

export const vehicleSchema = z.object({
    carMarca: z.string(),
    carModelo: z.string(),
    carAno: z.number().int(),
    carCor: z.string(),
    carKM: z.number().int(),
});