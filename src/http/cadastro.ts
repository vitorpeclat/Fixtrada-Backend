import type { FastifyInstance } from 'fastify';
import { hash } from 'bcrypt';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/connection.ts';
import { endereco } from '../db/schema/endereco.ts';
import { prestadorServico } from '../db/schema/prestadorServico.ts';
import { usuario } from '../db/schema/usuario.ts';
import { criarClienteSchema, criarPrestadorSchema } from './schemas/auth.ts';

export async function cadastroRoutes(app: FastifyInstance) {
  
  app.post('/cadastro', async (request, reply) => {
    try {
      const dadosValidados = criarClienteSchema.parse(request.body);

      const clienteExistente = await db.query.usuario.findFirst({
        where: (fields, { or }) => or(
          eq(fields.usuLogin, dadosValidados.usuLogin),
          eq(fields.usuCpf, dadosValidados.usuCpf)
        ),
      });

      if (clienteExistente) {
        return reply.status(409).send({ message: 'E-mail ou CPF já cadastrado.' });
      }

      const senhaHash = await hash(dadosValidados.usuSenha, 8);

       const [newUser] = await db.insert(usuario).values({
            ...dadosValidados,
            usuSenha: senhaHash,
            usuAtivo: true,
        }).returning({
            usuID: usuario.usuID,
        });

      return reply.status(201).send({ message: 'Cliente cadastrado com sucesso!', usuarioID: newUser.usuID});

    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ message: 'Dados inválidos.', issues: error.format() });
      }
      console.error(error);
      return reply.status(500).send({ message: 'Erro interno no servidor.' });
    }
  });

  app.post('/prestador', async (request, reply) => {
    try {
      const dadosValidados = criarPrestadorSchema.parse(request.body);

      const prestadorExistente = await db.query.prestadorServico.findFirst({
        where: (fields, { or }) => or(
          eq(fields.mecCNPJ, dadosValidados.mecCNPJ),
          eq(fields.mecLogin, dadosValidados.mecLogin)
        ),
      });

      if (prestadorExistente) {
        return reply.status(409).send({ message: 'CNPJ ou e-mail já cadastrado.' });
      }

      await db.transaction(async (tx) => {
        await tx.insert(endereco)
          .values(dadosValidados.endereco)
          .onConflictDoNothing();
        
        const senhaHash = await hash(dadosValidados.mecSenha, 8);

        await tx.insert(prestadorServico).values({
          mecCNPJ: dadosValidados.mecCNPJ,
          mecLogin: dadosValidados.mecLogin,
          mecSenha: senhaHash,
          mecEnderecoNum: dadosValidados.mecEnderecoNum,
          fk_endereco_endCEP: dadosValidados.endereco.endCEP,
          mecAtivo: true,
        });
      });

      return reply.status(201).send({ message: 'Prestador cadastrado com sucesso!' });

    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ message: 'Dados inválidos.', issues: error.format() });
      }
      console.error(error);
      return reply.status(500).send({ message: 'Erro interno no servidor.' });
    }
  });
}
