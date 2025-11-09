import { sql, eq, and, inArray, desc, or, isNull } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { db } from '../db/connection.ts';
import { mensagem } from '../db/schema/mensagem.ts';
import { prestadorServico } from '../db/schema/prestadorServico.ts';
import { usuario } from '../db/schema/usuario.ts';
import { authHook, JwtUserPayload } from './hooks/auth.ts';
import { chat } from '../db/schema/chat.ts'; // IMPORTADO 'chat'
import { registroServico } from '../db/schema/registroServico.ts';

export async function meusChatsRoutes(app: FastifyInstance) {
    app.addHook('onRequest', authHook);

    app.get('/cliente/meus-chats', async (request, reply) => {
        const { sub: userId, role } = request.user as JwtUserPayload;

        // Otimização: Pegar a última mensagem de cada CHAT
        const lastMessageSubquery = db.$with('last_message_subquery').as(
            db.select({
                chatId: mensagem.fk_chat_chatID, // Alterado para fk_chat_chatID
                lastMessage: mensagem.menConteudo,
                lastMessageDate: mensagem.menData,
                row_number: sql<number>`ROW_NUMBER() OVER (PARTITION BY ${mensagem.fk_chat_chatID} ORDER BY ${mensagem.menData} DESC)`.as('row_number')
            }).from(mensagem)
        );

        const sq = db.with(lastMessageSubquery).select().from(lastMessageSubquery).where(eq(lastMessageSubquery.row_number, 1)).as('sq');

        let services; // (Poderia ser renomeado para 'chats')

        if (role === 'cliente') {
            services = await db.select({
                id: chat.chatID, // O ID principal agora é o chatID
                shopName: prestadorServico.mecLogin,
                lastMessage: sq.lastMessage,
            })
            .from(chat) // O ponto de partida é a tabela 'chat'
            .leftJoin(prestadorServico, eq(chat.fk_prestador_servico_mecCNPJ, prestadorServico.mecCNPJ))
            .leftJoin(sq, eq(chat.chatID, sq.chatId)) // Join com a subquery de mensagens
            .leftJoin(registroServico, eq(chat.fk_registro_servico_regID, registroServico.regID)) // Join opcional
            .where(
                // COMBINANDO AS DUAS CONDIÇÕES COM and()
                and(
                    eq(chat.fk_usuario_usuID, userId), // 1. Filtro pelo cliente
                    or( // 2. Filtro de status
                        isNull(chat.fk_registro_servico_regID),
                        inArray(registroServico.regStatus, ['Aceito', 'Em_Andamento', 'pendente'])
                    )
                )
            )
            .orderBy(desc(sq.lastMessageDate));

        } else if (role === 'prestador') {
            services = await db.select({
                id: chat.chatID,
                shopName: usuario.usuNome, // Nome do cliente
                lastMessage: sq.lastMessage,
            })
            .from(chat)
            .leftJoin(usuario, eq(chat.fk_usuario_usuID, usuario.usuID))
            .leftJoin(sq, eq(chat.chatID, sq.chatId))
            .leftJoin(registroServico, eq(chat.fk_registro_servico_regID, registroServico.regID))
            .where(
                // COMBINANDO AS DUAS CONDIÇÕES COM and()
                and(
                    eq(chat.fk_prestador_servico_mecCNPJ, userId), // 1. Filtro pelo prestador
                    or( // 2. Filtro de status
                        isNull(chat.fk_registro_servico_regID),
                        inArray(registroServico.regStatus, ['Aceito', 'pendente', 'Em_Andamento'])
                    )
                )
            )
            .orderBy(desc(sq.lastMessageDate));
        } else {
            return reply.status(403).send({ message: 'Acesso negado. Role inválido.' });
        }

        return reply.send(services);
    });
}