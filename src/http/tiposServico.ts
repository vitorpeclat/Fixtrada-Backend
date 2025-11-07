import type { FastifyInstance } from 'fastify';
import { db } from '../db/connection.ts';
import { tipoServico } from '../db/schema/tipoServico.ts';
import { authHook } from './hooks/auth.ts';

export async function tiposServicoRoutes(app: FastifyInstance) {
    app.addHook('onRequest', authHook);

    // Rota para listar todos os tipos de serviço disponíveis
    app.get('/tipos-servico', async (request, reply) => {
        const tiposServico = await db.query.tipoServico.findMany({
            orderBy: (fields, { asc }) => [asc(fields.tseTipoProblema)]
        });

        return reply.send(tiposServico);
    });
}
