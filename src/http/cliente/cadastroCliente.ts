import type { FastifyInstance } from 'fastify';
import { hash } from 'bcrypt';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db/connection.ts';
import { usuario } from '../../db/schema/usuario.ts';
import { criarClienteSchema } from '../schemas/auth.ts';

export async function cadastroClienteRoutes(app: FastifyInstance) {
  
  app.post('/cliente/cadastro', async (request, reply) => {
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
}