// ============================================================================
// ROTAS: Avaliação de Serviço (Cliente)
// ============================================================================
// POST /cliente/servicos/:serviceId/avaliar - Avaliar um serviço concluído

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../../db/connection.ts';
import { carro } from '../../db/schema/carro.ts';
import { registroServico } from '../../db/schema/registroServico.ts';
import { and, eq, inArray } from 'drizzle-orm';
import { authHook, JwtUserPayload } from '../hooks/auth.ts';

export async function avaliarServicoRoutes(app: FastifyInstance) {
    app.addHook('onRequest', authHook);

    const paramsSchema = z.object({ serviceId: z.string().uuid() });
    const bodySchema = z.object({
        nota: z.number().int().min(1).max(5),
        comentario: z.string().max(500).optional(),
    });

    // ========================================================================
    // POST /cliente/servicos/:serviceId/avaliar - Avaliar serviço
    // ========================================================================
    app.post('/cliente/servicos/:serviceId/avaliar', async (request, reply) => {
        const { sub: userId, role } = request.user as JwtUserPayload;
        if (role !== 'cliente') {
            return reply.status(403).send({ message: 'Acesso negado. Rota exclusiva para clientes.' });
        }

        const { serviceId } = paramsSchema.parse(request.params);
        const { nota, comentario } = bodySchema.parse(request.body);

        // Verificar se o serviço pertence a um carro do cliente
        const clientCars = await db.query.carro.findMany({ where: eq(carro.fk_usuario_usuID, userId), columns: { carID: true } });
        if (clientCars.length === 0) {
            return reply.status(404).send({ message: 'Serviço não encontrado.' });
        }
        const carIds = clientCars.map(c => c.carID);

        const servico = await db.query.registroServico.findFirst({
            where: and(
                eq(registroServico.regID, serviceId),
                inArray(registroServico.fk_carro_carID, carIds)
            )
        });

        if (!servico) {
            return reply.status(404).send({ message: 'Serviço não encontrado ou não pertence ao cliente.' });
        }

        // Regras de negócio
        if (servico.regStatus !== 'concluído') {
            return reply.status(400).send({ message: 'Só é possível avaliar serviços com status "concluído".' });
        }

        if (servico.regNotaCliente !== null) {
            return reply.status(400).send({ message: 'Este serviço já foi avaliado.' });
        }

        // Atualizar o registro de serviço com a avaliação
        const [updatedService] = await db.update(registroServico)
            .set({
                regNotaCliente: nota,
                regComentarioCliente: comentario,
            })
            .where(eq(registroServico.regID, serviceId))
            .returning();

        return reply.send(updatedService);
    });
}