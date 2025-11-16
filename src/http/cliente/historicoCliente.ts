// ============================================================================
// ROTAS: Histórico de Serviços do Cliente
// ============================================================================
// GET /cliente/historico - Listar histórico de serviços do cliente

import type { FastifyInstance } from 'fastify';
import { db } from '../../db/connection.ts';
import { carro } from '../../db/schema/carro.ts';
import { registroServico } from '../../db/schema/registroServico.ts';
import { inArray, eq } from 'drizzle-orm';
import { authHook, JwtUserPayload } from '../hooks/auth.ts';

export async function historicoClienteRoutes(app: FastifyInstance) {
    app.addHook('onRequest', authHook);

    app.get('/cliente/historico', async (request, reply) => {
        const { sub: userId, role } = request.user as JwtUserPayload;

        if (role !== 'cliente') {
            return reply.status(403).send({ message: 'Acesso negado. Rota exclusiva para clientes.' });
        }

        // Encontrar todos os carros do cliente
        const clientCars = await db.query.carro.findMany({
            where: eq(carro.fk_usuario_usuID, userId),
            columns: { carID: true }
        });

        if (clientCars.length === 0) {
            return reply.send([]);
        }

        const carIds = clientCars.map(c => c.carID);

        // Encontrar todos os registros de serviço para esses carros
        const historico = await db.query.registroServico.findMany({
            where: inArray(registroServico.fk_carro_carID, carIds),
            orderBy: (registroServico, { desc }) => [desc(registroServico.regData)],
        });

        return reply.send(historico);
    });
}