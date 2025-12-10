import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../../db/connection.ts';
import { registroServico } from '../../db/schema/registroServico.ts';
import { authHook, JwtUserPayload } from '../hooks/auth.ts';
import { customAlphabet } from 'nanoid';
import { createServiceRequestSchema } from '../schemas/service.ts';
import { eq } from 'drizzle-orm';
import { emitNewServiceNotification } from '../../ws/socketHandler.ts';
import { prestadorServico } from '../../db/schema/prestadorServico.ts';
import { carro } from '../../db/schema/carro.ts';
import { tipoServico } from '../../db/schema/tipoServico.ts';
import { chat } from '../../db/schema/chat.ts';

const nanoid = customAlphabet('1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ', 8);

export async function serviceClienteRoutes(app: FastifyInstance) {
    app.addHook('onRequest', authHook);

    // Registro de novas solicitações de serviço (RF007)
    app.post('/services', async (request, reply) => {
        const user = request.user as JwtUserPayload;
        if (!user || user.role !== 'cliente') {
            return reply.status(403).send({ message: 'Acesso negado.' });
        }
        const dadosValidados = createServiceRequestSchema.parse(request.body);

        // Validar se o carro existe e pertence ao usuário
        const carroExiste = await db.query.carro.findFirst({
            where: eq(carro.carID, dadosValidados.fk_carro_carID)
        });

        if (!carroExiste) {
            return reply.status(404).send({ message: 'Carro não encontrado.' });
        }

        if (carroExiste.fk_usuario_usuID !== user.sub) {
            return reply.status(403).send({ message: 'Este carro não pertence a você.' });
        }

        // Validar se o tipo de serviço existe
        const tipoServicoExiste = await db.query.tipoServico.findFirst({
            where: eq(tipoServico.tseID, dadosValidados.fk_tipo_servico_tseID)
        });

        if (!tipoServicoExiste) {
            return reply.status(404).send({ message: 'Tipo de serviço não encontrado.' });
        }

        // Se foi especificado um prestador, validar se ele existe
        if (dadosValidados.fk_prestador_servico_mecCNPJ) {
            const prestadorExiste = await db.query.prestadorServico.findFirst({
                where: eq(prestadorServico.mecCNPJ, dadosValidados.fk_prestador_servico_mecCNPJ)
            });

            if (!prestadorExiste) {
                return reply.status(404).send({ message: 'Prestador de serviço não encontrado.' });
            }
        }

        const [newService] = await db.insert(registroServico).values({
            regDescricao: dadosValidados.regDescricao,
            fk_carro_carID: dadosValidados.fk_carro_carID,
            fk_tipo_servico_tseID: dadosValidados.fk_tipo_servico_tseID,
            regLatitude: dadosValidados.regLatitude,
            regLongitude: dadosValidados.regLongitude,
            fk_prestador_servico_mecCNPJ: dadosValidados.fk_prestador_servico_mecCNPJ || null, // Opcional
            regCodigo: nanoid(), // Gera código único
            regData: new Date().toISOString().split('T')[0],
            regHora: new Date(),
            regStatus: 'pendente', // Inicia como pendente
        }).returning({
            id: registroServico.regID,
            code: registroServico.regCodigo,
            description: registroServico.regDescricao,
            status: registroServico.regStatus,
        });
        /*
        // Se foi especificado um prestador, notificar via WebSocket
        if (dadosValidados.fk_prestador_servico_mecCNPJ && app.io) {
            emitNewServiceNotification(app.io, dadosValidados.fk_prestador_servico_mecCNPJ, {
                id: newService.id,
                code: newService.code,
                description: newService.description,
            });
        }
        */

        return reply.status(201).send(newService);
    });

    // Rota para resgatar os serviços solicitados pelo cliente autenticado
    app.get('/services', async (request, reply) => {
        const user = request.user as JwtUserPayload;
        if (!user || user.role !== 'cliente') {
            return reply.status(403).send({ message: 'Acesso negado.' });
        }

        // Buscar todos os carros do cliente
        const carros = await db.query.carro.findMany({
            where: eq(carro.fk_usuario_usuID, user.sub)
        });
        const carrosIds = carros.map(c => c.carID);
        if (carrosIds.length === 0) {
            return reply.send([]);
        }

        // Buscar todos os serviços vinculados aos carros do cliente
        const servicos = await db.query.registroServico.findMany({
            where: (fields, { inArray }) => inArray(fields.fk_carro_carID, carrosIds),
            orderBy: (fields, { desc }) => [desc(fields.regData), desc(fields.regHora)]
        });
        if (servicos.length === 0) {
            return reply.send([]);
        }

        // Coletar todos os IDs relacionados
        const carroIdsSet = new Set(servicos.map(s => s.fk_carro_carID));
        const tipoServicoIdsSet = new Set(servicos.map(s => s.fk_tipo_servico_tseID));
        const prestadorCnpjsSet = new Set(servicos.map(s => s.fk_prestador_servico_mecCNPJ).filter(Boolean));

        // Buscar dados relacionados em batch
        const [carrosRelacionados, tiposServicoRelacionados, prestadoresRelacionados] = await Promise.all([
            db.query.carro.findMany({ where: (fields, { inArray }) => inArray(fields.carID, Array.from(carroIdsSet)) }),
            db.query.tipoServico.findMany({ where: (fields, { inArray }) => inArray(fields.tseID, Array.from(tipoServicoIdsSet)) }),
            prestadorCnpjsSet.size > 0 
                ? db.query.prestadorServico.findMany({ where: (fields, { inArray }) => inArray(fields.mecCNPJ, Array.from(prestadorCnpjsSet) as string[]) })
                : []
        ]);

        // Mapear para acesso rápido
        const carrosMap = new Map(carrosRelacionados.map(c => [c.carID, c]));
        const tiposServicoMap = new Map(tiposServicoRelacionados.map(t => [t.tseID, t]));
        const prestadoresMap = new Map(prestadoresRelacionados.map(p => [p.mecCNPJ, p]));

        // Montar array de cards
        const cards = servicos.map(servico => ({
            id: servico.regID,
            codigo: servico.regCodigo,
            status: servico.regStatus,
            descricao: servico.regDescricao,
            data: servico.regData,
            hora: servico.regHora,
            valor: servico.regValor,
            notaCliente: servico.regNotaCliente,
            comentarioCliente: servico.regComentarioCliente,
            latitude: servico.regLatitude,
            longitude: servico.regLongitude,
            carro: carrosMap.get(servico.fk_carro_carID) || null,
            tipoServico: tiposServicoMap.get(servico.fk_tipo_servico_tseID) || null,
            prestador: servico.fk_prestador_servico_mecCNPJ ? prestadoresMap.get(servico.fk_prestador_servico_mecCNPJ) || null : null
        }));

        if (cards.length > 0) {
            console.log('Exemplo de card retornado:', cards[0]);
        }
        return reply.send(cards);
    });

    // Rota para buscar um serviço específico pelo ID
    app.get('/services/:id', async (request, reply) => {
        const { id } = request.params as { id: string };
        const user = request.user as JwtUserPayload;
        
        if (!user || (user.role !== 'cliente' && user.role !== 'prestador')) {
            return reply.status(403).send({ message: 'Acesso negado.' });
        }

        // Buscar o serviço
        const servico = await db.query.registroServico.findFirst({
            where: eq(registroServico.regID, id)
        });

        if (!servico) {
            return reply.status(404).send({ message: 'Serviço não encontrado.' });
        }

        // Verificar permissão baseada no tipo de usuário
        if (user.role === 'cliente') {
            // Verificar se o serviço pertence a um carro do cliente
            const carroDono = await db.query.carro.findFirst({
                where: eq(carro.carID, servico.fk_carro_carID)
            });

            if (!carroDono || carroDono.fk_usuario_usuID !== user.sub) {
                return reply.status(403).send({ message: 'Você não tem permissão para acessar este serviço.' });
            }
        } else if (user.role === 'prestador') {
            // Verificar se o serviço está associado ao prestador
            if (!servico.fk_prestador_servico_mecCNPJ || servico.fk_prestador_servico_mecCNPJ !== user.sub) {
                return reply.status(403).send({ message: 'Você não tem permissão para acessar este serviço.' });
            }
        }

        // Buscar dados relacionados
        const [carroRelacionado, tipoServicoRelacionado, prestadorRelacionado, chatRelacionado] = await Promise.all([
            db.query.carro.findFirst({ where: eq(carro.carID, servico.fk_carro_carID) }),
            db.query.tipoServico.findFirst({ where: eq(tipoServico.tseID, servico.fk_tipo_servico_tseID) }),
            servico.fk_prestador_servico_mecCNPJ 
                ? db.query.prestadorServico.findFirst({ where: eq(prestadorServico.mecCNPJ, servico.fk_prestador_servico_mecCNPJ) })
                : Promise.resolve(null),
            db.query.chat.findFirst({ where: eq(chat.fk_registro_servico_regID, servico.regID) })
        ]);

        // Montar card do serviço
        const card = {
            id: servico.regID,
            codigo: servico.regCodigo,
            status: servico.regStatus,
            descricao: servico.regDescricao,
            data: servico.regData,
            hora: servico.regHora,
            valor: servico.regValor,
            notaCliente: servico.regNotaCliente,
            comentarioCliente: servico.regComentarioCliente,
            latitude: servico.regLatitude,
            longitude: servico.regLongitude,
            carro: carroRelacionado || null,
            tipoServico: tipoServicoRelacionado || null,
            prestador: prestadorRelacionado || null,
            chatID: chatRelacionado?.chatID || null
        };
        return reply.send(card);
    });

    // Rota para finalizar um serviço (marcar como concluído)
    app.patch('/services/:id/finalize', async (request, reply) => {
        const { id } = request.params as { id: string };
        const user = request.user as JwtUserPayload;
        
        if (!user || (user.role !== 'cliente' && user.role !== 'prestador')) {
            return reply.status(403).send({ message: 'Acesso negado.' });
        }

        // Buscar o serviço
        const servico = await db.query.registroServico.findFirst({
            where: eq(registroServico.regID, id)
        });

        if (!servico) {
            return reply.status(404).send({ message: 'Serviço não encontrado.' });
        }

        // Verificar permissão baseada no tipo de usuário
        if (user.role === 'cliente') {
            // Verificar se o serviço pertence a um carro do cliente
            const carroDono = await db.query.carro.findFirst({
                where: eq(carro.carID, servico.fk_carro_carID)
            });

            if (!carroDono || carroDono.fk_usuario_usuID !== user.sub) {
                return reply.status(403).send({ message: 'Você não tem permissão para finalizar este serviço.' });
            }
        } else if (user.role === 'prestador') {
            // Verificar se o serviço está associado ao prestador
            if (!servico.fk_prestador_servico_mecCNPJ || servico.fk_prestador_servico_mecCNPJ !== user.sub) {
                return reply.status(403).send({ message: 'Você não tem permissão para finalizar este serviço.' });
            }
        }

        // Verificar se o serviço já está concluído
        if (servico.regStatus === 'concluído') {
            return reply.status(400).send({ message: 'Este serviço já está finalizado.' });
        }

        // Atualizar o status do serviço para concluído
        const [servicoAtualizado] = await db
            .update(registroServico)
            .set({ regStatus: 'concluído' })
            .where(eq(registroServico.regID, id))
            .returning();

        return reply.send({
            message: 'Serviço finalizado com sucesso.',
            servico: servicoAtualizado
        });
    });

    // Rota para resgatar os serviços com status de "proposta" e "em_andamento"
    app.get('/services/proposta/list', async (request, reply) => {
        const user = request.user as JwtUserPayload;
        if (!user || user.role !== 'cliente') {
            return reply.status(403).send({ message: 'Acesso negado.' });
        }

        console.log('Buscando serviços para usuário:', user.sub);

        // Buscar todos os carros do cliente
        const carros = await db.query.carro.findMany({
            where: eq(carro.fk_usuario_usuID, user.sub)
        });
        
        console.log('Carros encontrados para usuário', user.sub, ':', carros.map(c => ({ id: c.carID, marca: c.carMarca, usuario: c.fk_usuario_usuID })));
        
        const carrosIds = carros.map(c => c.carID);
        if (carrosIds.length === 0) {
            console.log('Nenhum carro encontrado para o usuário');
            return reply.send([]);
        }

        // Buscar todos os serviços com status "proposta" ou "em_andamento" vinculados aos carros do cliente
        const servicos = await db.query.registroServico.findMany({
            where: (fields, { inArray, eq: eqOp, or }) => 
                inArray(fields.fk_carro_carID, carrosIds) && or(eqOp(fields.regStatus, 'proposta'), eqOp(fields.regStatus, 'em_andamento')),
            orderBy: (fields, { desc }) => [desc(fields.regData), desc(fields.regHora)]
        });
        
        console.log('Serviços encontrados (antes da validação):', servicos.length, servicos.map(s => ({ id: s.regID, carro: s.fk_carro_carID, status: s.regStatus, prestador: s.fk_prestador_servico_mecCNPJ })));

        // Validação extra: garantir que todos os serviços realmente pertencem aos carros do usuário
        const servicosValidos = servicos.filter(s => carrosIds.includes(s.fk_carro_carID));
        
        console.log('Serviços após validação:', servicosValidos.length, servicosValidos.map(s => ({ id: s.regID, carro: s.fk_carro_carID, status: s.regStatus, prestador: s.fk_prestador_servico_mecCNPJ })));
        
        if (servicosValidos.length === 0) {
            return reply.send([]);
        }

        // Coletar todos os IDs relacionados
        const carroIdsSet = new Set(servicosValidos.map(s => s.fk_carro_carID));
        const tipoServicoIdsSet = new Set(servicosValidos.map(s => s.fk_tipo_servico_tseID));
        const prestadorCnpjsSet = new Set(servicosValidos.map(s => s.fk_prestador_servico_mecCNPJ).filter(Boolean));

        // Buscar dados relacionados em batch
        const [carrosRelacionados, tiposServicoRelacionados, prestadoresRelacionados] = await Promise.all([
            db.query.carro.findMany({ where: (fields, { inArray }) => inArray(fields.carID, Array.from(carroIdsSet)) }),
            db.query.tipoServico.findMany({ where: (fields, { inArray }) => inArray(fields.tseID, Array.from(tipoServicoIdsSet)) }),
            prestadorCnpjsSet.size > 0 
                ? db.query.prestadorServico.findMany({ where: (fields, { inArray }) => inArray(fields.mecCNPJ, Array.from(prestadorCnpjsSet) as string[]) })
                : []
        ]);

        // Mapear para acesso rápido
        const carrosMap = new Map(carrosRelacionados.map(c => [c.carID, c]));
        const tiposServicoMap = new Map(tiposServicoRelacionados.map(t => [t.tseID, t]));
        const prestadoresMap = new Map(prestadoresRelacionados.map(p => [p.mecCNPJ, p]));

        // Montar array de cards
        const cards = servicosValidos.map(servico => ({
            id: servico.regID,
            codigo: servico.regCodigo,
            status: servico.regStatus,
            descricao: servico.regDescricao,
            data: servico.regData,
            hora: servico.regHora,
            valor: servico.regValor,
            notaCliente: servico.regNotaCliente,
            comentarioCliente: servico.regComentarioCliente,
            latitude: servico.regLatitude,
            longitude: servico.regLongitude,
            carro: carrosMap.get(servico.fk_carro_carID) || null,
            tipoServico: tiposServicoMap.get(servico.fk_tipo_servico_tseID) || null,
            prestador: servico.fk_prestador_servico_mecCNPJ ? prestadoresMap.get(servico.fk_prestador_servico_mecCNPJ) || null : null
        }));

        console.log('Cards a retornar:', cards.length);
        return reply.send(cards);
    });

    // Rota para aceitar a proposta de um serviço
    app.post('/services/:id/aceitar-proposta', async (request, reply) => {
        const { id } = request.params as { id: string };
        const user = request.user as JwtUserPayload;
        
        if (!user || user.role !== 'cliente') {
            return reply.status(403).send({ message: 'Acesso negado.' });
        }

        // Buscar o serviço
        const servico = await db.query.registroServico.findFirst({
            where: eq(registroServico.regID, id)
        });

        if (!servico) {
            return reply.status(404).send({ message: 'Serviço não encontrado.' });
        }

        // Verificar se o serviço pertence a um carro do cliente
        const carroDono = await db.query.carro.findFirst({
            where: eq(carro.carID, servico.fk_carro_carID)
        });

        if (!carroDono || carroDono.fk_usuario_usuID !== user.sub) {
            return reply.status(403).send({ message: 'Você não tem permissão para aceitar esta proposta.' });
        }

        // Verificar se o serviço está com status "proposta"
        if (servico.regStatus !== 'proposta') {
            return reply.status(400).send({ message: `Não é possível aceitar uma proposta para um serviço com status "${servico.regStatus}".` });
        }

        // Verificar se há prestador vinculado
        if (!servico.fk_prestador_servico_mecCNPJ) {
            return reply.status(400).send({ message: 'Este serviço não tem um prestador vinculado.' });
        }

        // Atualizar o status do serviço para "em_andamento"
        const [servicoAtualizado] = await db
            .update(registroServico)
            .set({ regStatus: 'em_andamento' })
            .where(eq(registroServico.regID, id))
            .returning();

        // Criar chat entre cliente e prestador
        try {
            const [novoChat] = await db.insert(chat).values({
                fk_usuario_usuID: user.sub,
                fk_prestador_servico_mecCNPJ: servico.fk_prestador_servico_mecCNPJ,
                fk_registro_servico_regID: id
            }).returning();

            console.log('Chat criado com sucesso:', novoChat.chatID);

            return reply.send({
                message: 'Proposta aceita com sucesso. Serviço em andamento e chat iniciado.',
                servico: servicoAtualizado,
                chat: novoChat
            });
        } catch (chatError: any) {
            console.error('Erro ao criar chat:', chatError);
            // Mesmo com erro no chat, a proposta foi aceita
            return reply.send({
                message: 'Proposta aceita com sucesso. Serviço em andamento. (Erro ao criar chat)',
                servico: servicoAtualizado
            });
        }
    });

    // Rota para recusar a proposta de um serviço
    app.post('/services/:id/recusar-proposta', async (request, reply) => {
        const { id } = request.params as { id: string };
        const user = request.user as JwtUserPayload;
        
        if (!user || user.role !== 'cliente') {
            return reply.status(403).send({ message: 'Acesso negado.' });
        }

        // Buscar o serviço
        const servico = await db.query.registroServico.findFirst({
            where: eq(registroServico.regID, id)
        });

        if (!servico) {
            return reply.status(404).send({ message: 'Serviço não encontrado.' });
        }

        // Verificar se o serviço pertence a um carro do cliente
        const carroDono = await db.query.carro.findFirst({
            where: eq(carro.carID, servico.fk_carro_carID)
        });

        if (!carroDono || carroDono.fk_usuario_usuID !== user.sub) {
            return reply.status(403).send({ message: 'Você não tem permissão para recusar esta proposta.' });
        }

        // Verificar se o serviço está com status "proposta"
        if (servico.regStatus !== 'proposta') {
            return reply.status(400).send({ message: `Não é possível recusar uma proposta para um serviço com status "${servico.regStatus}".` });
        }

        // Atualizar o serviço: remover prestador e alterar status para "pendente"
        const [servicoAtualizado] = await db
            .update(registroServico)
            .set({ 
                regStatus: 'pendente',
                fk_prestador_servico_mecCNPJ: null
            })
            .where(eq(registroServico.regID, id))
            .returning();

        return reply.send({
            message: 'Proposta recusada com sucesso. Serviço retornou ao status pendente.',
            servico: servicoAtualizado
        });
    });
}