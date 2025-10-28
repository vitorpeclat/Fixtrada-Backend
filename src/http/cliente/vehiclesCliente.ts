import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../../db/connection.ts';
import { carro } from '../../db/schema/carro.ts';
import { and, eq } from 'drizzle-orm';
import { vehicleSchema } from '../schemas/vehicle.ts';
import { authHook, JwtUserPayload } from '../hooks/auth.ts';

export async function vehicleClienteRoutes(app: FastifyInstance) {
    app.addHook('onRequest', authHook);

    // Criar novo veículo
    app.post('/vehicle', async (request, reply) => {
            const { sub: userId } = request.user as JwtUserPayload;
            const dadosValidados = vehicleSchema.parse(request.body);
            const [newVehicle] = await db.insert(carro).values({
                ...dadosValidados,
                fk_usuario_usuID: userId,
            }).returning();

            return reply.status(201).send(newVehicle);
    });

    // Listar veículos do cliente
    app.get('/vehicles', async (request, reply) => {
        const { sub: userId } = request.user as JwtUserPayload;
        
        const vehicles = await db.query.carro.findMany({
            where: eq(carro.fk_usuario_usuID, userId),
        });
        return reply.send(vehicles);
    });

    // Atualizar dados do veículo
    app.put('/vehicles/:vehicleId', async (request, reply) => {
        const { sub: userId } = request.user as JwtUserPayload;
        const paramsSchema = z.object({ vehicleId: z.string().uuid() });
        const { vehicleId } = paramsSchema.parse(request.params);

        const existingVehicle = await db.query.carro.findFirst({
            where: and(eq(carro.carID, vehicleId), eq(carro.fk_usuario_usuID, userId))
        });

        if (!existingVehicle) {
            return reply.status(404).send({ message: 'Veículo não encontrado ou não pertence ao usuário.' });
        }

        const updateVehicleSchema = vehicleSchema.partial();
        const dadosValidados = updateVehicleSchema.parse(request.body);

        if (Object.keys(dadosValidados).length === 0) {
            return reply.status(400).send({ message: 'Pelo menos um campo deve ser fornecido para atualização.' });
        }

        const [updatedVehicle] = await db.update(carro)
            .set(dadosValidados)
            .where(eq(carro.carID, vehicleId))
            .returning();

        return reply.send(updatedVehicle);
    });

    // Deletar um veículo (soft delete)
    app.delete('/vehicles/:vehicleId', async (request, reply) => {
        const { sub: userId } = request.user as JwtUserPayload;
        const paramsSchema = z.object({ vehicleId: z.string().uuid() });
        const { vehicleId } = paramsSchema.parse(request.params);

        const existingVehicle = await db.query.carro.findFirst({
            where: and(eq(carro.carID, vehicleId), eq(carro.fk_usuario_usuID, userId))
        });

        if (!existingVehicle) {
            return reply.status(404).send({ message: 'Veículo não encontrado ou não pertence ao usuário.' });
        }

        await db.update(carro)
            .set({ carAtivo: false })
            .where(eq(carro.carID, vehicleId));

        return reply.status(204).send();
    });
}