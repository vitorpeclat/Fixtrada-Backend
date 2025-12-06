import { Server, Socket } from 'socket.io';
import { db } from '../db/connection.ts';
import { mensagem } from '../db/schema/mensagem.ts';
import { usuario } from '../db/schema/usuario.ts';
import { eq } from 'drizzle-orm';
import jwt from 'jsonwebtoken';
import { env } from '../env.ts';
import { registroServico } from '../db/schema/registroServico.ts';
import { carro } from '../db/schema/carro.ts';
import { chat } from '../db/schema/chat.ts';

interface UserSocket extends Socket {
    userId?: string; // ID do usuário (usuID ou mecCNPJ)
    userRole?: 'cliente' | 'prestador';
}

// Mapeamento simples para rastrear usuários online (em memória - considere Redis para produção)
const onlineUsers = new Map<string, string>(); // userId -> socket.id

export function setupSocketIO(io: Server) {

  // Middleware de autenticação (opcional, mas recomendado)
  io.use((socket: UserSocket, next) => {
   const token = socket.handshake.auth.token;
   if (!token) {
     socket.emit('auth_error', 'Authentication error: Token missing'); // Notifica o cliente
     return next(new Error('Authentication error: Token missing'));
   }
   try {
     const payload = jwt.verify(token, env.JWT_SECRET) as { sub: string, role: 'cliente' | 'prestador' };
     socket.userId = payload.sub;
     socket.userRole = payload.role;
     next();
   } catch (err) {
     socket.emit('auth_error', 'Authentication error: Invalid token'); // Notifica o cliente
     next(new Error('Authentication error: Invalid token'));
   }
});


  io.on('connection', (socket: UserSocket) => {
    console.log(`Usuário conectado: ${socket.id}, ID: ${socket.userId}, Role: ${socket.userRole}`);

    // Rastrear usuário online (se autenticado)
    if (socket.userId) {
        onlineUsers.set(socket.userId, socket.id);
        // Opcional: Entrar em uma sala com base no ID do usuário
        socket.join(socket.userId);
        console.log(`Usuário ${socket.userId} entrou na sala ${socket.userId}`);
    }

    // --- Eventos de Chat (RF012) ---

    // Cliente/Prestador entra em uma sala de chat específica do serviço
    // Suporta tanto 'join_service_chat' (backend legacy) quanto 'joinChat' (frontend)
    async function handleJoin(rawId: string) {
      if (!socket.userId) return; // Precisa estar autenticado
      // Resolve se o id recebido é um registroServico.regID ou já um chatID
      let targetChatId = rawId;
      try {
        const chatRoom = await db.query.chat.findFirst({
          where: eq(chat.fk_registro_servico_regID, rawId),
          columns: { chatID: true }
        });
        if (chatRoom && chatRoom.chatID) targetChatId = chatRoom.chatID;
      } catch (e) {
        console.warn('Erro ao resolver chat para join:', e);
      }

      socket.join(targetChatId);
      console.log(`Usuário ${socket.userId} entrou no chat ${targetChatId} (orig: ${rawId})`);
      // Carregar histórico de mensagens e emitir para o socket que entrou
      loadAndEmitHistory(socket, targetChatId);
    }

    socket.on('join_service_chat', handleJoin);
    socket.on('joinChat', handleJoin);

    // Receber mensagem e retransmitir + salvar no DB
        socket.on('send_message', async (data: { serviceId?: string, chatId?: string, senderId: string, senderName?: string, content: string }) => {
        if (!socket.userId || socket.userId !== data.senderId) {
          console.error("Tentativa de enviar mensagem por usuário não autorizado ou não correspondente.");
          return; // Ignora se o senderId não bate com o socket autenticado
        }

       // Aceita tanto 'chatId' quanto 'serviceId' no payload
       const incomingId = data.chatId ?? data.serviceId;
       const { senderId, content } = data;
       let senderName = data.senderName;
       let targetChatId = incomingId; // Declarar no escopo superior

      try {
        if (!senderName) {
          const user = await db.query.usuario.findFirst({
            where: eq(usuario.usuID, senderId),
          });
          if (user) {
            senderName = user.usuNome;
          } else {
            console.warn(`Sender name not provided and user not found for senderId: ${senderId}. Using 'Desconhecido'.`);
            senderName = "Desconhecido";
          }
        }

        // 1. Encontrar o chatID com base no incomingId (que pode ser regID ou chatID)
        if (!incomingId) {
          console.error('Erro: Nenhum ID fornecido (chatId ou serviceId)');
          socket.emit('message_error', { error: 'Nenhum ID de chat ou serviço fornecido.' });
          return;
        }

        const chatRoom = await db.query.chat.findFirst({
          where: (fields, { eq: eqOp }) => 
            eqOp(fields.fk_registro_servico_regID, incomingId),
          columns: { chatID: true }
        });
        if (chatRoom && chatRoom.chatID) {
          targetChatId = chatRoom.chatID;
        }

        if (!targetChatId) {
          console.error(`Erro: Chat não encontrado para o identificador ${incomingId}`);
          socket.emit('message_error', { id: incomingId, error: 'Falha ao encontrar a sala de chat.' });
          return;
        }

        // 2. Salvar mensagem no banco (com a correção)
        const [newMessage] = await db.insert(mensagem).values({
          // Use os campos corretos do schema `mensagem`
          fk_chat_chatID: targetChatId,
          fk_remetente_usuID: senderId,
          menConteudo: content,
        }).returning();

        // 2. Emitir mensagem para todos na sala do serviço (incluindo o remetente)
        // Emite para a sala identificada pelo chatID/resolvido
        io.to(targetChatId).emit('receive_message', {
          menID: newMessage.menID,
          serviceId: targetChatId,
          senderName: senderName,
          senderId: senderId, // Adiciona o ID do remetente
          content: content,
          menData: newMessage.menData,
        });

        // Emite também o evento clássico que o frontend antigo escutava
        io.to(targetChatId).emit('newMessage', {
          id: newMessage.menID,
          senderId: senderId,
          content: content,
          timestamp: newMessage.menData,
          senderName: senderName,
          chatId: targetChatId
        });
         console.log(`Mensagem enviada no chat ${targetChatId} por ${senderName}`);

        // 3. Notificar ambos os usuários (remetente e destinatário) para atualizarem suas listas de chat
        // Buscar o chat para pegar o registro de serviço associado
        const chatWithService = await db.query.chat.findFirst({
            where: eq(chat.chatID, targetChatId),
            columns: { fk_registro_servico_regID: true }
        });

        const serviceId = chatWithService?.fk_registro_servico_regID;
        
        if (serviceId) {
          const service = await db.query.registroServico.findFirst({
            where: eq(registroServico.regID, serviceId),
            columns: {
                fk_carro_carID: true,
                fk_prestador_servico_mecCNPJ: true
            }
        });

        if (service) {
            const car = await db.query.carro.findFirst({
                where: eq(carro.carID, service.fk_carro_carID),
                columns: {
                    fk_usuario_usuID: true
                }
            });

            if (car) {
                const clienteId = car.fk_usuario_usuID;
                const prestadorId = service.fk_prestador_servico_mecCNPJ;

                // Garante que ambos os IDs existam antes de emitir
                if (clienteId && prestadorId) {
                    // Emite para o remetente e para o destinatário
                    io.to(clienteId).to(prestadorId).emit('new_chat_activity');
                    console.log(`Evento new_chat_activity emitido para ${clienteId} e ${prestadorId}`);
                }
            }
          }
        }

      } catch (error) {
        console.error(`Erro ao salvar/emitir mensagem para o chat ${targetChatId}:`, error);
        // Opcional: Emitir erro de volta para o remetente
        socket.emit('message_error', { chatId: targetChatId, error: 'Falha ao enviar mensagem.' });
      }
    });

    // --- Notificação de Novo Serviço (RF011) ---
    // Este evento deve ser EMITIDO PELO BACKEND (ex: na rota de criação de serviço)
    // para os prestadores relevantes. A função abaixo é um EXEMPLO de como emitir.
    // Você chamaria algo como `emitNewServiceNotification` de dentro da sua rota
    // de criação de serviço (`serviceCliente.ts`).

    // Exemplo de como emitir (NÃO colocar este listener aqui, apenas a função de emissão)
    // socket.on('EXEMPLO_emitir_notificacao', (prestadorId: string, serviceData: any) => {
    //     emitNewServiceNotification(io, prestadorId, serviceData);
    // });


    // Handlers de leave compatíveis
    socket.on('leave_service_chat', (rawId: string) => {
      // resolve e sair da sala, se possível
      (async () => {
        try {
          let target = rawId;
          const cr = await db.query.chat.findFirst({ where: eq(chat.fk_registro_servico_regID, rawId), columns: { chatID: true } });
          if (cr && cr.chatID) target = cr.chatID;
          socket.leave(target);
          console.log(`Usuário ${socket.userId} saiu da sala ${target} (orig: ${rawId})`);
        } catch (e) {
          console.warn('Erro ao processar leave_service_chat:', e);
        }
      })();
    });

    socket.on('leaveChat', (rawId: string) => {
      socket.emit('leave_service_chat', rawId);
    });

    // Lógica de Desconexão
    socket.on('disconnect', () => {
      console.log(`Usuário desconectado: ${socket.id}, ID: ${socket.userId}`);
      if (socket.userId) {
        onlineUsers.delete(socket.userId);
      }
    });
  });
}

// Função para carregar histórico do chat
async function loadAndEmitHistory(socket: Socket, serviceId: string) {
    try {
    // `serviceId` pode ser um `registroServico.regID` ou já o `chatID`.
    // Primeiro tentamos resolver um chat ligado ao regID; se não existir,
    // assumimos que `serviceId` já é o chatID.
    let targetChatId = serviceId;
    const chatRoom = await db.query.chat.findFirst({
      where: eq(chat.fk_registro_servico_regID, serviceId),
      columns: { chatID: true }
    });
    if (chatRoom && chatRoom.chatID) {
      targetChatId = chatRoom.chatID;
    }

    const historyDb = await db.query.mensagem.findMany({
      where: eq(mensagem.fk_chat_chatID, targetChatId),
      orderBy: (fields, { asc }) => [asc(fields.menData)],
      columns: {
        menID: true,
        menConteudo: true,
        menData: true,
        fk_remetente_usuID: true,
        fk_chat_chatID: true
      }
    });

    const history = historyDb.map(msg => ({
      menID: msg.menID,
      serviceId: targetChatId,
      senderId: msg.fk_remetente_usuID,
      content: msg.menConteudo,
      menData: msg.menData,
    }));

    socket.emit('chat_history', { serviceId: targetChatId, history });
    } catch (error) {
        console.error(`Erro ao carregar histórico do chat ${serviceId}:`, error);
        socket.emit('history_error', { serviceId, error: 'Falha ao carregar histórico.' });
    }
}

// Função auxiliar para emitir notificação de novo serviço (CHAMAR A PARTIR DA ROTA)
export function emitNewServiceNotification(io: Server, prestadorId: string, serviceData: any) {
    // Encontra o socket do prestador se ele estiver online
    const targetSocketId = onlineUsers.get(prestadorId);
    if (targetSocketId) {
        io.to(targetSocketId).emit('new_service_request', serviceData);
        console.log(`Notificação de serviço ${serviceData.regCodigo || serviceData.id} enviada para prestador ${prestadorId}`);
    } else {
        console.log(`Prestador ${prestadorId} não está online para receber notificação.`);
        // Aqui você pode adicionar lógica para fallback (ex: Push Notification, SMS)
    }
}
