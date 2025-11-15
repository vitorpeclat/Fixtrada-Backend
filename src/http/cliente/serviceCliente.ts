import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../../db/connection.ts';
import { registroServico } from '../../db/schema/registroServico.ts';
import { authHook, JwtUserPayload } from '../hooks/auth.ts';
import { customAlphabet } from 'nanoid';
import { createServiceRequestSchema } from '../schemas/service.ts';
import { eq } from 'drizzle-orm';
import { emitNewServiceNotification } from '../../ws/socketHandler.ts';
import { chat } from '../../db/schema/chat.ts';
import { prestadorServico } from '../../db/schema/prestadorServico.ts';
import { carro } from '../../db/schema/carro.ts';
import { tipoServico } from '../../db/schema/tipoServico.ts';
import { endereco } from '../../db/schema/endereco.ts';

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

        // Validar se o CEP existe no banco de dados
        const enderecoExiste = await db.query.endereco.findFirst({
            where: eq(endereco.endCEP, dadosValidados.fk_endereco_endCEP)
        });

        if (!enderecoExiste) {
            return reply.status(404).send({ 
                message: 'CEP não encontrado no banco de dados. Por favor, cadastre o endereço primeiro.' 
            });
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
            fk_endereco_endCEP: dadosValidados.fk_endereco_endCEP,
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
            return reply.status(403).send({ message: 'Você não tem permissão para acessar este serviço.' });
        }

        // Buscar dados relacionados
        const [carroRelacionado, tipoServicoRelacionado, prestadorRelacionado, chatRelacionado] = await Promise.all([
            db.query.carro.findFirst({ where: eq(carro.carID, servico.fk_carro_carID) }),
            db.query.tipoServico.findFirst({ where: eq(tipoServico.tseID, servico.fk_tipo_servico_tseID) }),
            servico.fk_prestador_servico_mecCNPJ 
                ? db.query.prestadorServico.findFirst({ where: eq(prestadorServico.mecCNPJ, servico.fk_prestador_servico_mecCNPJ) })
                : Promise.resolve(null),
            db.query.chat.findFirst({ where: eq(chat.fk_registro_servico_regID, id) })
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
            carro: carroRelacionado || null,
            tipoServico: tipoServicoRelacionado || null,
            prestador: prestadorRelacionado || null,
            chatId: chatRelacionado?.chatID || null,
        };

        console.log('Card do serviço retornado:', card);
        return reply.send(card);
    });

    // Rota para finalizar um serviço (marcar como concluído)
    app.patch('/services/:id/finalize', async (request, reply) => {
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
            return reply.status(403).send({ message: 'Você não tem permissão para finalizar este serviço.' });
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
}