import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../../db/connection.ts';
import { usuario } from "../../db/schema/usuario.ts";
import { eq } from 'drizzle-orm';

const verificacaoEmailSchema = z.object({
  email: z.string().email(),
  codigo: z.string().length(6),
});

export async function verificacaoEmailClienteRoutes(app: FastifyInstance) {
  app.post('/cliente/verificar-email', async (request, reply) => {
      const { email, codigo } = verificacaoEmailSchema.parse(request.body);

      const user = await db.query.usuario.findFirst({
        where: eq(usuario.usuLogin, email),
      });

      if (!user) {
        return reply.status(404).send({ message: 'Usuário não encontrado.' });
      }

      if (user.usuVerificado) {
        return reply.status(400).send({ message: 'E-mail já verificado.' });
      }

      const agora = new Date();

      if (user.usuCodigoVerificacao !== codigo || (user.usuCodigoVerificacaoExpira && user.usuCodigoVerificacaoExpira < agora)) {
        return reply.status(400).send({ message: 'Código de verificação inválido ou expirado.' });
      }

      await db.update(usuario).set({
        usuVerificado: true,
        usuCodigoVerificacao: null,
        usuCodigoVerificacaoExpira: null,
      }).where(eq(usuario.usuLogin, email));

      return reply.status(200).send({ message: 'E-mail verificado com sucesso!' });
  });
}