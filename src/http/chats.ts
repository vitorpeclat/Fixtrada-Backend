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

        // Subquery to get the last message for each service
        const sq = db
            .select({
                serviceId: mensagem.fk_registro_servico_regID,
                lastMessage: sql<string>`(array_agg(${mensagem.menConteudo} ORDER BY ${mensagem.menData} DESC))[1]`.as('lastMessage'),
                lastMessageDate: sql<string>`max(${mensagem.menData})`.as('lastMessageDate'),
            })
            .from(mensagem)
            .groupBy(mensagem.fk_registro_servico_regID)
            .as('sq');

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
                shopName: prestadorServico.mecLogin, // Using mecLogin as mecNomeFantasia is not in the schema
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
                shopName: usuario.usuNome, // For provider, shopName is the client's name
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
