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
}