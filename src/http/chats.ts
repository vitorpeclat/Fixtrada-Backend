import { sql, eq, and, inArray, desc } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { db } from '../db/connection.ts';
import { carro } from '../db/schema/carro.ts';
import { mensagem } from '../db/schema/mensagem.ts';
import { prestadorServico } from '../db/schema/prestadorServico.ts';
import { registroServico } from '../db/schema/registroServico.ts';
import { usuario } from '../db/schema/usuario.ts';
import { authHook, JwtUserPayload } from './hooks/auth.ts';


export async function meusChatsRoutes(app: FastifyInstance) {
    app.addHook('onRequest', authHook);

    app.get('/cliente/meus-chats', async (request, reply) => {
        const { sub: userId, role } = request.user as JwtUserPayload;

        // Otimização: Usar DISTINCT ON para pegar a última mensagem de cada conversa
        const lastMessageSubquery = db.$with('last_message_subquery').as(
            db.select({
                serviceId: mensagem.fk_registro_servico_regID,
                lastMessage: mensagem.menConteudo,
                lastMessageDate: mensagem.menData,
                row_number: sql<number>`ROW_NUMBER() OVER (PARTITION BY ${mensagem.fk_registro_servico_regID} ORDER BY ${mensagem.menData} DESC)`.as('row_number')
            }).from(mensagem)
        );

        const sq = db.with(lastMessageSubquery).select().from(lastMessageSubquery).where(eq(lastMessageSubquery.row_number, 1)).as('sq');


        let services;

        if (role === 'cliente') {
            const clientCars = await db.query.carro.findMany({
                where: eq(carro.fk_usuario_usuID, userId),
                columns: { carID: true }
            });

            if (clientCars.length === 0) {
                return reply.send([]);
            }
            const carIds = clientCars.map(c => c.carID);

            services = await db.select({
                id: registroServico.regID,
                shopName: prestadorServico.mecLogin,
                lastMessage: sq.lastMessage,
            })
            .from(registroServico)
            .where(and(
                inArray(registroServico.fk_carro_carID, carIds),
                inArray(registroServico.regStatus, ['Aceito', 'Em_Andamento', 'pendente'])
            ))
            .leftJoin(prestadorServico, eq(registroServico.fk_prestador_servico_mecCNPJ, prestadorServico.mecCNPJ))
            .leftJoin(sq, eq(registroServico.regID, sq.serviceId))
            .orderBy(desc(sq.lastMessageDate));

        } else if (role === 'prestador') {
            services = await db.select({
                id: registroServico.regID,
                shopName: usuario.usuNome,
                lastMessage: sq.lastMessage,
            })
            .from(registroServico)
            .where(and(
                eq(registroServico.fk_prestador_servico_mecCNPJ, userId),
                inArray(registroServico.regStatus, ['Aceito', 'pendente', 'Em_Andamento'])
            ))
            .leftJoin(carro, eq(registroServico.fk_carro_carID, carro.carID))
            .leftJoin(usuario, eq(carro.fk_usuario_usuID, usuario.usuID))
            .leftJoin(sq, eq(registroServico.regID, sq.serviceId))
            .orderBy(desc(sq.lastMessageDate));
        } else {
            return reply.status(403).send({ message: 'Acesso negado. Role inválido.' });
        }

        return reply.send(services);
    });
}
