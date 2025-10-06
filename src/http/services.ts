import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../db/connection.ts';
import { registroServico } from '../db/schema/registroServico.ts';
import { authHook } from './hooks/auth.ts';
import { customAlphabet } from 'nanoid';

const nanoid = customAlphabet('1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ', 8);

const createServiceRequestSchema = z.object({
    regDescricao: z.string(),
    fk_carro_carID: z.string().uuid(),
    fk_prestador_servico_mecCNPJ: z.string(),
    fk_tipo_servico_tseID: z.string().uuid(),
    // O endereço (CEP) virá do prestador selecionado
});

export async function serviceRoutes(app: FastifyInstance) {
    app.addHook('onRequest', authHook);

    // Registro de novas solicitações de serviço (RF007)
    app.post('/services', async (request, reply) => {
        try {
            // @ts-ignore
            if (request.user.role !== 'cliente') {
                return reply.status(403).send({ message: 'Apenas clientes podem solicitar serviços.' });
            }
            
            const dadosValidados = createServiceRequestSchema.parse(request.body);

            // Buscar o endereço do prestador para registrar no serviço
            const prestador = await db.query.prestadorServico.findFirst({
                where: (fields, { eq }) => eq(fields.mecCNPJ, dadosValidados.fk_prestador_servico_mecCNPJ)
            });

            if(!prestador) {
                return reply.status(404).send({ message: "Prestador de serviço não encontrado." });
            }

            await db.insert(registroServico).values({
                ...dadosValidados,
                regCodigo: nanoid(), // Gera código único
                regData: new Date().toISOString().split('T')[0],
                regHora: new Date(),
                fk_endereco_endCEP: prestador.fk_endereco_endCEP,
            });

            return reply.status(201).send({ message: 'Solicitação de serviço registrada com sucesso!' });

        } catch (error) {
            if (error instanceof z.ZodError) {
                return reply.status(400).send({ issues: error.format() });
            }
            return reply.status(500).send({ message: 'Erro interno.' });
        }
    });
}