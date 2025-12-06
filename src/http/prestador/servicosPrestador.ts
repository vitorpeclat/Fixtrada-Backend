import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../../db/connection.ts';
import { registroServico } from '../../db/schema/registroServico.ts';
import { and, eq, isNull } from 'drizzle-orm';
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

    // Listar serviços disponíveis (pendentes sem prestador atribuído)
    app.get('/prestador/servicos/disponiveis', { preHandler: [isPrestador] }, async (request, reply) => {
        const servicosDisponiveis = await db.query.registroServico.findMany({
            where: and(
                eq(registroServico.regStatus, 'pendente'),
                isNull(registroServico.fk_prestador_servico_mecCNPJ)
            ),
            with: {
                tipoServico: true
            },
            orderBy: (fields, { desc }) => [desc(fields.regData), desc(fields.regHora)]
        });

        return reply.send(servicosDisponiveis);
    });

    // Aceitar serviço
    app.post('/prestador/servicos/:serviceId/aceitar', { preHandler: [isPrestador] }, async (request, reply) => {
        const { sub: prestadorId } = request.user as JwtUserPayload;
        const { serviceId } = paramsSchema.parse(request.params);

        const servico = await db.query.registroServico.findFirst({
            where: eq(registroServico.regID, serviceId)
        });

        if (!servico) {
            return reply.status(404).send({ message: 'Serviço não encontrado.' });
        }

        // Verificar se o serviço já foi aceito por outro prestador
        if (servico.fk_prestador_servico_mecCNPJ && servico.fk_prestador_servico_mecCNPJ !== prestadorId) {
            return reply.status(400).send({ message: 'Este serviço já foi aceito por outro prestador.' });
        }

        if (servico.regStatus !== 'pendente') {
            return reply.status(400).send({ message: `Não é possível aceitar um serviço com status "${servico.regStatus}".` });
        }

        // Atualizar o serviço com o prestador e mudar status para aceito
        const [updatedService] = await db.update(registroServico)
            .set({ 
                regStatus: 'aceito',
                fk_prestador_servico_mecCNPJ: prestadorId // Atribuir o prestador ao serviço
            })
            .where(eq(registroServico.regID, serviceId))
            .returning();

        return reply.send(updatedService);
    });

    // Recusar serviço
    app.post('/prestador/servicos/:serviceId/recusar', { preHandler: [isPrestador] }, async (request, reply) => {
        const { sub: prestadorId } = request.user as JwtUserPayload;
        const { serviceId } = paramsSchema.parse(request.params);

        const servico = await db.query.registroServico.findFirst({
            where: eq(registroServico.regID, serviceId)
        });

        if (!servico) {
            return reply.status(404).send({ message: 'Serviço não encontrado.' });
        }

        // Verificar se o serviço pertence a este prestador (se já foi atribuído)
        if (servico.fk_prestador_servico_mecCNPJ && servico.fk_prestador_servico_mecCNPJ !== prestadorId) {
            return reply.status(403).send({ message: 'Você não tem permissão para recusar este serviço.' });
        }

        if (servico.regStatus !== 'pendente') {
            return reply.status(400).send({ message: `Não é possível recusar um serviço com status "${servico.regStatus}".` });
        }

        const [updatedService] = await db.update(registroServico)
            .set({ 
                regStatus: 'recusado',
                fk_prestador_servico_mecCNPJ: null // Remover a atribuição ao recusar
            })
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
            where: eq(registroServico.regID, serviceId)
        });

        if (!servico) {
            return reply.status(404).send({ message: 'Serviço não encontrado.' });
        }

        // Verificar se o serviço já foi atribuído a outro prestador
        if (servico.fk_prestador_servico_mecCNPJ && servico.fk_prestador_servico_mecCNPJ !== prestadorId) {
            return reply.status(403).send({ message: 'Este serviço já foi atribuído a outro prestador.' });
        }

        if (servico.regStatus !== 'pendente') {
            return reply.status(400).send({ message: `Não é possível enviar uma proposta para um serviço com status "${servico.regStatus}".` });
        }

        // Enviar proposta e atribuir o prestador ao serviço
        const [updatedService] = await db.update(registroServico)
            .set({ 
                regValor: valor, 
                regStatus: 'proposta',
                fk_prestador_servico_mecCNPJ: prestadorId // Atribuir o prestador ao enviar proposta
            })
            .where(eq(registroServico.regID, serviceId))
            .returning();

        return reply.send(updatedService);
    });

    // Resgatar todos os serviços associados ao prestador (todos os status)
    app.get('/prestador/servicos/meus', { preHandler: [isPrestador] }, async (request, reply) => {
        const { sub: prestadorId } = request.user as JwtUserPayload;
        console.log('Prestador ID recebido:', prestadorId);

        const meusServicos = await db.query.registroServico.findMany({
            where: eq(registroServico.fk_prestador_servico_mecCNPJ, prestadorId),
            with: {
                tipoServico: true
            },
            orderBy: (fields, { desc }) => [desc(fields.regData), desc(fields.regHora)]
        });

        return reply.send(meusServicos);
    });
}