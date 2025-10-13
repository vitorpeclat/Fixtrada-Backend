import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../../db/connection.ts';
import { carro } from '../../db/schema/carro.ts';
import { eq } from 'drizzle-orm';
import { vehicleSchema } from '../schemas/vehicles.ts';
import { authHook, JwtUserPayload } from '../hooks/auth.ts';

export async function vehicleClienteRoutes(app: FastifyInstance) {
    app.addHook('onRequest', authHook);

    // Criar novo veículo
    app.post('/vehicle', async (request, reply) => {
        try {
            const { sub: userId } = request.user as JwtUserPayload;
            const dadosValidados = vehicleSchema.parse(request.body);
            const [newVehicle] = await db.insert(carro).values({
                ...dadosValidados,
                fk_usuario_usuID: userId,
            }).returning();

            return reply.status(201).send(newVehicle);

        } catch (error) {
            if (error instanceof z.ZodError) {
                return reply.status(400).send({ message: 'Dados inválidos.', issues: error.format() });
            }
            console.error(error);
            return reply.status(500).send({ message: 'Erro interno no servidor.' });
        }
    });

    // Listar veículos do cliente
    app.get('/vehicles', async (request, reply) => {
        const { sub: userId } = request.user as JwtUserPayload;
        
        const vehicles = await db.query.carro.findMany({
            where: eq(carro.fk_usuario_usuID, userId),
        });

        return reply.send(vehicles);
    });
}