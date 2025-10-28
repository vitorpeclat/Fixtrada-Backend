import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../../db/connection.ts';
import { registroServico } from '../../db/schema/registroServico.ts';
import { and, eq } from 'drizzle-orm';
import { authHook, JwtUserPayload } from '../hooks/auth.ts';

export async function servicosPrestadorRoutes(app: FastifyInstance) {
    app.addHook('onRequest', authHook);

    const paramsSchema = z.object({ serviceId: z.string().uuid() });

    // Middleware para checar se o usuário é um prestador
    async function isPrestador(request: any, reply: any) {
        if (request.user.role !== 'prestador') {
            return reply.status(403).send({ message: 'Acesso negado. Rota exclusiva para prestadores.' });
        }
    }

    // Aceitar serviço
    app.post('/prestador/servicos/:serviceId/aceitar', { preHandler: [isPrestador] }, async (request, reply) => {
        const { sub: prestadorId } = request.user as JwtUserPayload;
        const { serviceId } = paramsSchema.parse(request.params);

        const servico = await db.query.registroServico.findFirst({
            where: and(eq(registroServico.regID, serviceId), eq(registroServico.fk_prestador_servico_mecCNPJ, prestadorId))
        });

        if (!servico) {
            return reply.status(404).send({ message: 'Serviço não encontrado ou não associado a este prestador.' });
        }

        if (servico.regStatus !== 'pendente') {
            return reply.status(400).send({ message: `Não é possível aceitar um serviço com status "${servico.regStatus}".` });
        }

        const [updatedService] = await db.update(registroServico)
            .set({ regStatus: 'aceito' })
            .where(eq(registroServico.regID, serviceId))
            .returning();

        return reply.send(updatedService);
    });

    // Recusar serviço
    app.post('/prestador/servicos/:serviceId/recusar', { preHandler: [isPrestador] }, async (request, reply) => {
        const { sub: prestadorId } = request.user as JwtUserPayload;
        const { serviceId } = paramsSchema.parse(request.params);

        const servico = await db.query.registroServico.findFirst({
            where: and(eq(registroServico.regID, serviceId), eq(registroServico.fk_prestador_servico_mecCNPJ, prestadorId))
        });

        if (!servico) {
            return reply.status(404).send({ message: 'Serviço não encontrado ou não associado a este prestador.' });
        }

        if (servico.regStatus !== 'pendente') {
            return reply.status(400).send({ message: `Não é possível recusar um serviço com status "${servico.regStatus}".` });
        }

        const [updatedService] = await db.update(registroServico)
            .set({ regStatus: 'recusado' })
            .where(eq(registroServico.regID, serviceId))
            .returning();

        return reply.send(updatedService);
    });

    // Enviar proposta de orçamento
    app.post('/prestador/servicos/:serviceId/proposta', { preHandler: [isPrestador] }, async (request, reply) => {
        const { sub: prestadorId } = request.user as JwtUserPayload;
        const { serviceId } = paramsSchema.parse(request.params);
        
        const bodySchema = z.object({ valor: z.number().positive() });
        const { valor } = bodySchema.parse(request.body);

        const servico = await db.query.registroServico.findFirst({
            where: and(eq(registroServico.regID, serviceId), eq(registroServico.fk_prestador_servico_mecCNPJ, prestadorId))
        });

        if (!servico) {
            return reply.status(404).send({ message: 'Serviço não encontrado ou não associado a este prestador.' });
        }

        if (servico.regStatus !== 'pendente') {
            return reply.status(400).send({ message: `Não é possível enviar uma proposta para um serviço com status "${servico.regStatus}".` });
        }

        const [updatedService] = await db.update(registroServico)
            .set({ regValor: valor, regStatus: 'proposta' })
            .where(eq(registroServico.regID, serviceId))
            .returning();

        return reply.send(updatedService);
    });
}