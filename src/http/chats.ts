import { sql, eq, and, inArray, desc, or, isNull, isNotNull } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { db } from '../db/connection.ts';
import { mensagem } from '../db/schema/mensagem.ts';
import { prestadorServico } from '../db/schema/prestadorServico.ts';
import { usuario } from '../db/schema/usuario.ts';
import { authHook, JwtUserPayload } from './hooks/auth.ts';
import { chat } from '../db/schema/chat.ts'; // IMPORTADO 'chat'
import { registroServico } from '../db/schema/registroServico.ts';
import { z } from 'zod';

// Define o tipo para os parâmetros da rota de mensagens
type GetChatMessagesParams = {
    chatId: string;
}

export async function meusChatsRoutes(app: FastifyInstance) {
    app.addHook('onRequest', authHook);

    // Cria um chat entre cliente e prestador (sem vínculo de serviço)
    app.post('/chats', async (request, reply) => {
        const bodySchema = z.object({
            clienteId: z.string().uuid(),
            prestadorCnpj: z.string().length(14),
        });

        const { clienteId, prestadorCnpj } = bodySchema.parse(request.body);

        // Verifica se já existe um chat entre esses participantes sem serviço vinculado
        const existente = await db.query.chat.findFirst({
            where: (fields, { and }) => and(
                eq(chat.fk_usuario_usuID, clienteId),
                eq(chat.fk_prestador_servico_mecCNPJ, prestadorCnpj),
                isNull(chat.fk_registro_servico_regID)
            ),
            columns: { chatID: true },
        });

        if (existente) {
            return reply.status(200).send({ chatID: existente.chatID, criado: false });
        }

        const inserted = await db.insert(chat).values({
            fk_usuario_usuID: clienteId,
            fk_prestador_servico_mecCNPJ: prestadorCnpj,
            // fk_registro_servico_regID permanece null
        }).returning({ chatID: chat.chatID });

        return reply.status(201).send({ chatID: inserted[0].chatID, criado: true });
    });

    // Cria um chat entre cliente e prestador vinculado a um registro de serviço
    app.post('/chats/servico', async (request, reply) => {
        const bodySchema = z.object({
            clienteId: z.string().uuid(),
            prestadorCnpj: z.string().length(14),
            registroServicoId: z.string().uuid(),
        });

        const { clienteId, prestadorCnpj, registroServicoId } = bodySchema.parse(request.body);

        // Verifica se já existe um chat para esse serviço com os mesmos participantes
        const existente = await db.query.chat.findFirst({
            where: (fields, { and }) => and(
                eq(chat.fk_usuario_usuID, clienteId),
                eq(chat.fk_prestador_servico_mecCNPJ, prestadorCnpj),
                eq(chat.fk_registro_servico_regID, registroServicoId)
            ),
            columns: { chatID: true },
        });

        if (existente) {
            return reply.status(200).send({ chatID: existente.chatID, criado: false });
        }

        const inserted = await db.insert(chat).values({
            fk_usuario_usuID: clienteId,
            fk_prestador_servico_mecCNPJ: prestadorCnpj,
            fk_registro_servico_regID: registroServicoId,
        }).returning({ chatID: chat.chatID });

        return reply.status(201).send({ chatID: inserted[0].chatID, criado: true });
    });

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
                        isNull(chat.fk_registro_servico_regID), // Chat sem serviço
                        and(
                            isNotNull(registroServico.regStatus), // Garantir que o status não é null
                            inArray(registroServico.regStatus, ['aceito', 'em_andamento', 'pendente'])
                        )
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
                        isNull(chat.fk_registro_servico_regID), // Chat sem serviço
                        and(
                            isNotNull(registroServico.regStatus), // Garantir que o status não é null
                            inArray(registroServico.regStatus, ['aceito', 'pendente', 'em_andamento'])
                        )
                    )
                )
            )
            .orderBy(desc(sq.lastMessageDate));
        } else {
            return reply.status(403).send({ message: 'Acesso negado. Role inválido.' });
        }

        return reply.send(services);
    });

    app.get<{ Params: GetChatMessagesParams }>('/chats/:chatId/messages', async (request, reply) => {
        const { sub: userId, role } = request.user as JwtUserPayload;
        const { chatId } = request.params;

        // 1. Validação: Buscar o chat com joins manuais para evitar erro de relação
        const chatDetailsResult = await db
            .select({
                chatID: chat.chatID,
                fk_usuario_usuID: chat.fk_usuario_usuID,
                fk_prestador_servico_mecCNPJ: chat.fk_prestador_servico_mecCNPJ,
                usuNome: usuario.usuNome,
                mecLogin: prestadorServico.mecLogin,
            })
            .from(chat)
            .leftJoin(usuario, eq(chat.fk_usuario_usuID, usuario.usuID))
            .leftJoin(prestadorServico, eq(chat.fk_prestador_servico_mecCNPJ, prestadorServico.mecCNPJ))
            .where(eq(chat.chatID, chatId))
            .limit(1);

        if (chatDetailsResult.length === 0) {
            return reply.status(404).send({ message: 'Chat não encontrado.' });
        }

        const chatDetails = chatDetailsResult[0];

        // Verifica se o usuário logado é o cliente ou o prestador do chat
        const isParticipant =
            chatDetails.fk_usuario_usuID === userId ||
            chatDetails.fk_prestador_servico_mecCNPJ === userId;

        if (!isParticipant) {
            return reply.status(403).send({ message: 'Acesso negado a este chat.' });
        }

        // 2. Buscar as mensagens do chat, ordenando da mais recente para a mais antiga
        const messages = await db
            .select({
                id: mensagem.menID,
                senderId: mensagem.fk_remetente_usuID, 
                content: mensagem.menConteudo,
                timestamp: mensagem.menData
            })
            .from(mensagem)
            .where(eq(mensagem.fk_chat_chatID, chatId))
            .orderBy(desc(mensagem.menData));

        // 3. Determinar o nome a ser exibido no cabeçalho do chat
        let shopName = '';
        if (role === 'cliente') {
            // Se o usuário é cliente, o nome do chat é o do prestador
            shopName = chatDetails.mecLogin ?? 'Prestador';
        } else if (role === 'prestador') {
            // Se o usuário é prestador, o nome do chat é o do cliente
            shopName = chatDetails.usuNome ?? 'Cliente';
        }

        // 4. Retornar os dados no formato esperado pelo frontend
        // O frontend inverte a lista, então enviamos na ordem descendente (mais novas primeiro)
        return reply.send({
            messages,
            shopName,
        });
    });
}