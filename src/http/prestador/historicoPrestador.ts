// ============================================================================
// ROTAS: Histórico de Serviços (Prestador)
// ============================================================================
// GET /prestador/historico - Listar histórico de serviços do prestador

import type { FastifyInstance } from 'fastify';
import { db } from '../../db/connection.ts';
import { registroServico } from '../../db/schema/registroServico.ts';
import { eq } from 'drizzle-orm';
import { authHook, JwtUserPayload } from '../hooks/auth.ts';

export async function historicoPrestadorRoutes(app: FastifyInstance) {
    app.addHook('onRequest', authHook);

    // ========================================================================
    // GET /prestador/historico - Listar serviços do prestador
    // ========================================================================
    app.get('/prestador/historico', async (request, reply) => {
        const { sub: prestadorId, role } = request.user as JwtUserPayload;

        if (role !== 'prestador') {
            return reply.status(403).send({ message: 'Acesso negado. Rota exclusiva para prestadores.' });
        }

        const historico = await db.query.registroServico.findMany({
            where: eq(registroServico.fk_prestador_servico_mecCNPJ, prestadorId),
            orderBy: (registroServico, { desc }) => [desc(registroServico.regData)],
        });

        return reply.send(historico);
    });
}