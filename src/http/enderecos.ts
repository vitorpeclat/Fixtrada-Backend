// ============================================================================
// ROTAS: Gerenciamento de Endereços
// ============================================================================
// POST /enderecos    - Adicionar novo endereço
// GET  /enderecos    - Listar todos os endereços
// GET  /enderecos/:id - Obter detalhes de um endereço

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../db/connection.ts';
import { endereco } from '../db/schema/endereco.ts';
import { authHook } from './hooks/auth.ts';
import { eq } from 'drizzle-orm';

const enderecoSchema = z.object({
    endCEP: z.string().length(8, 'O CEP deve ter 8 dígitos.'),
    endRua: z.string().min(1, 'A rua é obrigatória.'),
    endBairro: z.string().min(1, 'O bairro é obrigatório.'),
    endCidade: z.string().min(1, 'A cidade é obrigatória.'),
    endEstado: z.string().length(2, 'O estado deve ter 2 caracteres (UF).'),
});

export async function enderecosRoutes(app: FastifyInstance) {
    app.addHook('onRequest', authHook);

    // ========================================================================
    // POST /enderecos - Adicionar novo endereço
    // ========================================================================
    app.post('/enderecos', async (request, reply) => {
        const dadosValidados = enderecoSchema.parse(request.body);

        // Verificar se o CEP já existe
        const enderecoExistente = await db.query.endereco.findFirst({
            where: eq(endereco.endCEP, dadosValidados.endCEP)
        });

        if (enderecoExistente) {
            return reply.status(409).send({ 
                message: 'Este CEP já está cadastrado no banco de dados.',
                endereco: enderecoExistente
            });
        }

        // Inserir o novo endereço
        const [novoEndereco] = await db.insert(endereco)
            .values(dadosValidados)
            .returning();

        return reply.status(201).send({
            message: 'Endereço cadastrado com sucesso.',
            endereco: novoEndereco
        });
    });

    // ========================================================================
    // GET /enderecos/:cep - Buscar endereço por CEP
    // ========================================================================
    app.get('/enderecos/:cep', async (request, reply) => {
        const { cep } = request.params as { cep: string };

        if (cep.length !== 8) {
            return reply.status(400).send({ message: 'O CEP deve ter 8 dígitos.' });
        }

        const enderecoEncontrado = await db.query.endereco.findFirst({
            where: eq(endereco.endCEP, cep)
        });

        if (!enderecoEncontrado) {
            return reply.status(404).send({ message: 'CEP não encontrado.' });
        }

        return reply.send(enderecoEncontrado);
    });

    // ========================================================================
    // GET /enderecos - Listar todos os endereços
    // ========================================================================
    app.get('/enderecos', async (request, reply) => {
        const enderecos = await db.query.endereco.findMany({
            orderBy: (fields, { asc }) => [asc(fields.endCidade), asc(fields.endBairro)]
        });

        return reply.send(enderecos);
    });
}
