import type { FastifyInstance } from 'fastify';
import { db } from '../../db/connection.ts';
import { registroServico } from '../../db/schema/registroServico.ts';
import { adminAuthHook } from '../hooks/adminAuth.ts';
import { sql, count } from 'drizzle-orm';

export async function outrosAdminRoutes(app: FastifyInstance) {
    app.addHook('onRequest', adminAuthHook);

    // Consulta de Histórico Completo (RF019)
    app.get('/admin/historico-completo', async (request, reply) => {
        const historico = await db.query.registroServico.findMany({
            orderBy: (registroServico, { desc }) => [desc(registroServico.regData)],
        });
        return reply.send(historico);
    });

    // Relatórios (RF017)
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