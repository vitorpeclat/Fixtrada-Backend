import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../db/connection.ts';
import { carro } from '../db/schema/carro.ts';
import { eq } from 'drizzle-orm';
import { authHook } from './hooks/auth.ts';

const vehicleSchema = z.object({
    carMarca: z.string(),
    carModelo: z.string(),
    carAno: z.number().int(),
    carCor: z.string(),
    carKM: z.number().int(),
});

export async function vehicleRoutes(app: FastifyInstance) {
    app.addHook('onRequest', authHook);

    // Criar novo veículo (RF005 - Create)
    app.post('/vehicles', async (request, reply) => {
        try {
            // @ts-ignore
            const { sub: userId, role } = request.user;
            if (role !== 'cliente') {
                return reply.status(403).send({ message: 'Apenas clientes podem cadastrar veículos.' });
            }

            const dadosValidados = vehicleSchema.parse(request.body);

            await db.insert(carro).values({
                ...dadosValidados,
                carAtivo: true, // Definir como true por padrão
                carOpTrocaOleo: null, // Definir como null ou um valor padrão
                carOpTrocaPneu: null, // Definir como null ou um valor padrão
                carOpRevisao: null, // Definir como null ou um valor padrão
                fk_usuario_usuID: String(userId),
            });

            return reply.status(201).send({ message: 'Veículo cadastrado com sucesso!' });

        } catch (error) {
            if (error instanceof z.ZodError) {
                return reply.status(400).send({ issues: error.format() });
            }
            return reply.status(500).send({ message: 'Erro interno.' });
        }
    });

    // Listar veículos do cliente (RF005 - Read)
    app.get('/vehicles', async (request, reply) => {
        // @ts-ignore
        const { sub: userId } = request.user;

        if (!userId) {
            return reply.status(401).send({ message: 'Usuário não autenticado.' });
        }
        
        const vehicles = await db.query.carro.findMany({
            where: eq(carro.fk_usuario_usuID, String(userId)),
        });

        return reply.send(vehicles);
    });

    // Implementar PUT para atualizar e DELETE para remover
}