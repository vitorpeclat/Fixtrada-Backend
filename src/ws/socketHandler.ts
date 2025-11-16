// ============================================================================
// SOCKET.IO HANDLER - Comunicação em Tempo Real
// ============================================================================
// Gerencia conexões WebSocket, autenticação JWT e eventos de chat

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

// ============================================================================
// TIPOS E INTERFACES
// ============================================================================
interface UserSocket extends Socket {
    userId?: string;
    userRole?: 'cliente' | 'prestador';
}

// Rastreamento de usuários online (considere Redis em produção)
const onlineUsers = new Map<string, string>();

// ============================================================================
// CONFIGURAÇÃO PRINCIPAL - setupSocketIO
// ============================================================================
export function setupSocketIO(io: Server) {

  // ========================================================================
  // MIDDLEWARE DE AUTENTICAÇÃO JWT
  // ========================================================================
  io.use((socket: UserSocket, next) => {
   const token = socket.handshake.auth.token;
   if (!token) {
     socket.emit('auth_error', 'Authentication error: Token missing');
     return next(new Error('Authentication error: Token missing'));
   }
   try {
     const payload = jwt.verify(token, env.JWT_SECRET) as { sub: string, role: 'cliente' | 'prestador' };
     socket.userId = payload.sub;
     socket.userRole = payload.role;
     next();
   } catch (err) {
     socket.emit('auth_error', 'Authentication error: Invalid token');
     next(new Error('Authentication error: Invalid token'));
   }
});

  // ========================================================================
  // EVENTO DE CONEXÃO
  // ========================================================================
  io.on('connection', (socket: UserSocket) => {
    console.log(`Socket conectado: ${socket.id} | Usuário: ${socket.userId} | Role: ${socket.userRole}`);

    if (socket.userId) {
        onlineUsers.set(socket.userId, socket.id);
        socket.join(socket.userId);
    }

    // ====================================================================
    // EVENTOS DE CHAT
    // ====================================================================
    
    // Evento: Entrar na sala de chat de um serviço
    socket.on('join_service_chat', (serviceId: string) => {
      if (!socket.userId) return;
      socket.join(serviceId);
      console.log(`Usuário ${socket.userId} entrou no chat ${serviceId}`);
      loadAndEmitHistory(socket, serviceId);
    });

    // Evento: Receber e salvar mensagem
    socket.on('send_message', async (data: { serviceId: string, senderId: string, senderName?: string, content: string }) => {
       if (!socket.userId || socket.userId !== data.senderId) {
            console.error("Tentativa não autorizada de enviar mensagem");
            return;
       }

      const { serviceId, senderId, content } = data;
      let senderName = data.senderName;

      try {
        // Buscar nome do usuário se não fornecido
        if (!senderName) {
          const user = await db.query.usuario.findFirst({
            where: eq(usuario.usuID, senderId),
          });
          senderName = user?.usuNome || "Desconhecido";
        }

        // Buscar ou criar sala de chat
        const chatRoom = await db.query.chat.findFirst({
            where: eq(chat.fk_registro_servico_regID, serviceId),
            columns: { chatID: true }
        });

        if (!chatRoom) {
            socket.emit('message_error', { serviceId, error: 'Sala de chat não encontrada' });
            return;
        }

        // Salvar mensagem no banco de dados
        const [newMessage] = await db.insert(mensagem).values({
          fk_chat_chatID: chatRoom.chatID,
          fk_remetente_usuID: socket.userId,
          menConteudo: content,
        }).returning();

        // Emitir mensagem para todos na sala
        io.to(serviceId).emit('receive_message', {
            menID: newMessage.menID,
            serviceId: serviceId,
            senderName: senderName,
            senderId: senderId,
            content: content,
            menData: newMessage.menData,
        });

        // Notificar ambos os usuários de nova atividade
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
                columns: { fk_usuario_usuID: true }
            });

            if (car) {
                const clienteId = car.fk_usuario_usuID;
                const prestadorId = service.fk_prestador_servico_mecCNPJ;

                if (clienteId && prestadorId) {
                    io.to(clienteId).to(prestadorId).emit('new_chat_activity');
                }
            }
        }

      } catch (error) {
        console.error(`Erro ao enviar mensagem: ${error}`);
        socket.emit('message_error', { serviceId, error: 'Falha ao enviar mensagem' });
      }
    });

    // ====================================================================
    // EVENTO DE DESCONEXÃO
    // ====================================================================
    socket.on('disconnect', () => {
      console.log(`Socket desconectado: ${socket.id} | Usuário: ${socket.userId}`);
      if (socket.userId) {
        onlineUsers.delete(socket.userId);
      }
    });
  });
}

// ============================================================================
// FUNÇÃO AUXILIAR: Carregar histórico de chat
// ============================================================================
async function loadAndEmitHistory(socket: Socket, serviceId: string) {
    try {
        const historyDb = await db.query.mensagem.findMany({
            where: eq(mensagem.fk_chat_chatID, serviceId),
            orderBy: (fields, { asc }) => [asc(fields.menData)],
            columns: {
                menID: true,
                menConteudo: true,
                menData: true,
                fk_remetente_usuID: true,
            }
        });

        const history = historyDb.map(msg => ({
            menID: msg.menID,
            serviceId: serviceId,
            senderName: msg.fk_remetente_usuID,
            content: msg.menConteudo,
            menData: msg.menData,
        }));

        socket.emit('chat_history', { serviceId, history });
    } catch (error) {
        console.error(`Erro ao carregar histórico: ${error}`);
        socket.emit('history_error', { serviceId, error: 'Falha ao carregar histórico' });
    }
}

// ============================================================================
// FUNÇÃO AUXILIAR: Emitir notificação de novo serviço
// ============================================================================
// Chamada a partir das rotas de criação de serviço
export function emitNewServiceNotification(io: Server, prestadorId: string, serviceData: any) {
    const targetSocketId = onlineUsers.get(prestadorId);
    if (targetSocketId) {
        io.to(targetSocketId).emit('new_service_request', serviceData);
        console.log(`Notificação enviada para prestador ${prestadorId}`);
    } else {
        console.log(`Prestador ${prestadorId} offline - notificação não enviada`);
    }
}
