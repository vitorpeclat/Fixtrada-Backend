// ============================================================================
// ROTAS: Outros Dados de Administração
// ============================================================================
// GET /admin/historico-completo - Consultar histórico completo de serviços
// GET /admin/relatorios         - Gerar relatórios e estatísticas

import type { FastifyInstance } from 'fastify';
import { db } from '../../db/connection.ts';
import { registroServico } from '../../db/schema/registroServico.ts';
import { adminAuthHook } from '../hooks/adminAuth.ts';
import { sql, count } from 'drizzle-orm';

export async function outrosAdminRoutes(app: FastifyInstance) {
    app.addHook('onRequest', adminAuthHook);

    // ========================================================================
    // GET /admin/historico-completo - Consultar histórico completo
    // ========================================================================
    app.get('/admin/historico-completo', async (request, reply) => {
        const historico = await db.query.registroServico.findMany({
            orderBy: (registroServico, { desc }) => [desc(registroServico.regData)],
        });
        return reply.send(historico);
    });

    // ========================================================================
    // GET /admin/relatorios - Gerar relatórios e estatísticas
    // ========================================================================
    app.get('/admin/relatorios', async (request, reply) => {
        // Exemplo: Contagem de serviços por status
        const servicosPorStatus = await db
            .select({
                status: registroServico.regStatus,
                total: count(registroServico.regID)
            })
            .from(registroServico)
            .groupBy(registroServico.regStatus);

        // Outras agregações podem ser adicionadas aqui

        const relatorios = {
            servicosPorStatus,
        };

        return reply.send(relatorios);
    });
}