import { Server, Socket } from 'socket.io';
import { db } from '../db/connection.ts';
import { mensagem } from '../db/schema/mensagem.ts';
import { usuario } from '../db/schema/usuario.ts';
import { eq } from 'drizzle-orm';
import jwt from 'jsonwebtoken';
import { env } from '../env.ts';

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
    socket.on('join_service_chat', (serviceId: string) => {
      if (!socket.userId) return; // Precisa estar autenticado
      socket.join(serviceId);
      console.log(`Usuário ${socket.userId} entrou no chat do serviço ${serviceId}`);
      // Opcional: Carregar histórico de mensagens e emitir para o socket que entrou
      loadAndEmitHistory(socket, serviceId);
    });

    // Receber mensagem e retransmitir + salvar no DB
    socket.on('send_message', async (data: { serviceId: string, senderId: string, senderName?: string, content: string }) => {
       if (!socket.userId || socket.userId !== data.senderId) {
            console.error("Tentativa de enviar mensagem por usuário não autorizado ou não correspondente.");
            return; // Ignora se o senderId não bate com o socket autenticado
       }

      const { serviceId, senderId, content } = data;
      let senderName = data.senderName;

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

        // 1. Salvar mensagem no banco
        const [newMessage] = await db.insert(mensagem).values({
          fk_registro_servico_regID: serviceId, // Certifique-se que serviceId é o UUID (regID)
          menSender: senderName, // Ou pode usar o ID e buscar o nome
          menSenderId: senderId, // Adiciona o ID do remetente
          menConteudo: content,
          // menData é defaultNow()
        }).returning();

        // 2. Emitir mensagem para todos na sala do serviço (incluindo o remetente)
        io.to(serviceId).emit('receive_message', {
            menID: newMessage.menID,
            serviceId: serviceId,
            senderName: senderName,
            senderId: senderId, // Adiciona o ID do remetente
            content: content,
            menData: newMessage.menData,
        });
         console.log(`Mensagem enviada no chat ${serviceId} por ${senderName}`);

      } catch (error) {
        console.error(`Erro ao salvar/emitir mensagem para serviço ${serviceId}:`, error);
        // Opcional: Emitir erro de volta para o remetente
        socket.emit('message_error', { serviceId, error: 'Falha ao enviar mensagem.' });
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
        const historyDb = await db.query.mensagem.findMany({
            where: eq(mensagem.fk_registro_servico_regID, serviceId),
            orderBy: (fields, { asc }) => [asc(fields.menData)],
             // Adicione um limit se necessário
        });

        const history = historyDb.map(msg => ({
            menID: msg.menID,
            serviceId: serviceId,
            senderName: msg.menSender,
            senderId: msg.menSenderId, // Garante que o senderId seja enviado
            content: msg.menConteudo,
            menData: msg.menData,
        }));


        socket.emit('chat_history', { serviceId, history });
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
