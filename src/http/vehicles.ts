import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../db/connection.ts';
import { carro } from '../db/schema/carro.ts';
import { eq } from 'drizzle-orm';
import { authHook } from './hooks/auth.ts';
import { vehicleSchema } from './schemas/vehicles.ts';

export async function vehicleRoutes(app: FastifyInstance) {
    app.addHook('onRequest', authHook);

    // Criar novo veículo (RF005 - Create)
    app.post('/vehicles', async (request, reply) => {
        try {
            const { sub: userId, role } = request.user;
            if (role !== 'cliente') {
                return reply.status(403).send({ message: 'Apenas clientes podem cadastrar veículos.' });
            }

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
            return reply.status(500).send({ message: 'Erro interno.' });
        }
    });

    // Listar veículos do cliente (RF005 - Read)
    app.get('/vehicles', async (request, reply) => {
        const { sub: userId } = request.user;

        if (!userId) {
            return reply.status(401).send({ message: 'Usuário não autenticado.' });
        }
        
        const vehicles = await db.query.carro.findMany({
            where: eq(carro.fk_usuario_usuID, userId),
        });

        return reply.send(vehicles);
    });

    // Implementar PUT para atualizar e DELETE para remover
}