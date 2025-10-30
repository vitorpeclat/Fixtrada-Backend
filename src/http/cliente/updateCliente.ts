import type { FastifyInstance } from 'fastify';
import { db } from '../../db/connection.ts';
import { usuario } from '../../db/schema/usuario.ts';
import { authHook, JwtUserPayload } from '../hooks/auth.ts';
import { eq } from 'drizzle-orm';
import { updateClienteSchema } from '../schemas/updateCliente.ts';
import { z } from 'zod';

export async function updateClienteRoutes(app: FastifyInstance) {
  app.addHook('onRequest', authHook);

  // Atualiza dados do cliente; o token vem no header e já é verificado pelo hook.
  app.post('/cliente/update', async (request, reply) => {
      const dados = updateClienteSchema.parse(request.body);
      const { sub: usuID } = request.user as JwtUserPayload;

      // Buscar usuário existente pelo usuID do token
      const user = await db.query.usuario.findFirst({ where: eq(usuario.usuID, usuID) });

      if (!user) {
        return reply.status(404).send({ message: 'Cliente não encontrado.' });
      }

      // Preparar objeto de atualização com apenas os campos enviados
      const updates: Record<string, any> = {};
      if (typeof dados.nome !== 'undefined') updates.usuNome = dados.nome;
      if (typeof dados.email !== 'undefined') updates.usuLogin = dados.email;
      if (typeof dados.dataNascimento !== 'undefined') updates.usuDataNasc = dados.dataNascimento;
      if (typeof dados.telefone !== 'undefined') updates.usuTelefone = dados.telefone;

      // Se nenhum campo foi informado, retornar OK sem alterações
      if (Object.keys(updates).length === 0) {
        return reply.status(200).send({ message: 'Nenhuma alteração fornecida.' });
      }

      // Tenta atualizar em uma única operação. Se nada for atualizado, retorna 404.
      const [updated] = await db.update(usuario).set(updates).where(eq(usuario.usuID, usuID)).returning({
        id: usuario.usuID,
        nome: usuario.usuNome,
        email: usuario.usuLogin,
        dataNascimento: usuario.usuDataNasc,
      });

      if (!updated) {
        return reply.status(404).send({ message: 'Cliente não encontrado.' });
      }

      return reply.status(200).send({ message: 'Cliente atualizado com sucesso.', user: updated });
  });
}
