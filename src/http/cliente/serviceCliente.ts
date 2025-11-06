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

const nanoid = customAlphabet('1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ', 8);

export async function serviceClienteRoutes(app: FastifyInstance) {
    app.addHook('onRequest', authHook);

    // Registro de novas solicitações de serviço (RF007)
    app.post('/services', async (request, reply) => {
            const dadosValidados = createServiceRequestSchema.parse(request.body);

            // Buscar o endereço do prestador para registrar no serviço
            const prestador = await db.query.prestadorServico.findFirst({
                where: eq(prestadorServico.mecCNPJ, dadosValidados.fk_prestador_servico_mecCNPJ)
            });

            if(!prestador) {
                return reply.status(404).send({ message: "Prestador de serviço não encontrado." });
            }

            const [newService] = await db.insert(registroServico).values({
                ...dadosValidados,
                regCodigo: nanoid(), // Gera código único
                regData: new Date().toISOString().split('T')[0],
                regHora: new Date(),
                fk_endereco_endCEP: prestador.fk_endereco_endCEP,
            }).returning({
                id: registroServico.regID,
                code: registroServico.regCodigo,
                description: registroServico.regDescricao,
                prestadorCnpj: registroServico.fk_prestador_servico_mecCNPJ,
            });

            if (app.io) {
              emitNewServiceNotification(app.io, newService.prestadorCnpj, {
                  id: newService.id,
                  code: newService.code,
                  description: newService.description,
              });
            } else {
              console.error("Instância do Socket.IO não encontrada para emitir notificação.");
            }

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
        const prestadorCnpjsSet = new Set(servicos.map(s => s.fk_prestador_servico_mecCNPJ));

        // Buscar dados relacionados em batch
        const [carrosRelacionados, tiposServicoRelacionados, prestadoresRelacionados] = await Promise.all([
            db.query.carro.findMany({ where: (fields, { inArray }) => inArray(fields.carID, Array.from(carroIdsSet)) }),
            db.query.tipoServico.findMany({ where: (fields, { inArray }) => inArray(fields.tseID, Array.from(tipoServicoIdsSet)) }),
            db.query.prestadorServico.findMany({ where: (fields, { inArray }) => inArray(fields.mecCNPJ, Array.from(prestadorCnpjsSet)) })
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
            prestador: prestadoresMap.get(servico.fk_prestador_servico_mecCNPJ) || null
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
        const [carroRelacionado, tipoServicoRelacionado, prestadorRelacionado] = await Promise.all([
            db.query.carro.findFirst({ where: eq(carro.carID, servico.fk_carro_carID) }),
            db.query.tipoServico.findFirst({ where: eq(tipoServico.tseID, servico.fk_tipo_servico_tseID) }),
            db.query.prestadorServico.findFirst({ where: eq(prestadorServico.mecCNPJ, servico.fk_prestador_servico_mecCNPJ) })
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
            prestador: prestadorRelacionado || null
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