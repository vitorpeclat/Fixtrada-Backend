// ============================================================================
// ROTAS: Gerenciamento de Tipos de Serviço (Administrador)
// ============================================================================
// POST   /admin/tipos-servico     - Criar novo tipo de serviço
// GET    /admin/tipos-servico     - Listar todos os tipos
// PUT    /admin/tipos-servico/:id - Atualizar tipo de serviço
// DELETE /admin/tipos-servico/:id - Deletar tipo de serviço

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../../db/connection.ts';
import { tipoServico } from '../../db/schema/tipoServico.ts';
import { eq } from 'drizzle-orm';
import { adminAuthHook } from '../hooks/adminAuth.ts';

export async function tiposServicoAdminRoutes(app: FastifyInstance) {
    app.addHook('onRequest', adminAuthHook);

    const bodySchema = z.object({ tseTipoProblema: z.string().min(3).max(100) });
    const paramsSchema = z.object({ id: z.string().uuid() });

    // ========================================================================
    // POST /admin/tipos-servico - Criar novo tipo de serviço
    // ========================================================================
    app.post('/admin/tipos-servico', async (request, reply) => {
        const { tseTipoProblema } = bodySchema.parse(request.body);
        const [newTipoServico] = await db.insert(tipoServico).values({ tseTipoProblema }).returning();
        return reply.status(201).send(newTipoServico);
    });

    // ========================================================================
    // GET /admin/tipos-servico - Listar todos os tipos de serviço
    // ========================================================================
    app.get('/admin/tipos-servico', async (request, reply) => {
        const tipos = await db.query.tipoServico.findMany();
        return reply.send(tipos);
    });

    // ========================================================================
    // PUT /admin/tipos-servico/:id - Atualizar tipo de serviço
    // ========================================================================
    app.put('/admin/tipos-servico/:id', async (request, reply) => {
        const { id } = paramsSchema.parse(request.params);
        const { tseTipoProblema } = bodySchema.parse(request.body);

        const [updated] = await db.update(tipoServico)
            .set({ tseTipoProblema })
            .where(eq(tipoServico.tseID, id))
            .returning();

        if (!updated) {
            return reply.status(404).send({ message: 'Tipo de serviço não encontrado.' });
        }
        return reply.send(updated);
    });

    // ========================================================================
    // DELETE /admin/tipos-servico/:id - Deletar tipo de serviço
    // ========================================================================
    app.delete('/admin/tipos-servico/:id', async (request, reply) => {
        const { id } = paramsSchema.parse(request.params);

        const [deleted] = await db.delete(tipoServico).where(eq(tipoServico.tseID, id)).returning();

        if (!deleted) {
            return reply.status(404).send({ message: 'Tipo de serviço não encontrado.' });
        }

        return reply.status(204).send();
    });
}