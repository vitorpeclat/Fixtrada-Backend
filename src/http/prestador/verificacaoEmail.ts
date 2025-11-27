import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../../db/connection.ts';
import { prestadorServico } from "../../db/schema/prestadorServico.ts";
import { eq } from 'drizzle-orm';

const verificacaoEmailSchema = z.object({
  email: z.string().email(),
  codigo: z.string().length(6),
});

export async function verificacaoEmailPrestadorRoutes(app: FastifyInstance) {
  app.post('/prestador/verificar-email', async (request, reply) => {
      const { email, codigo } = verificacaoEmailSchema.parse(request.body);

      const user = await db.query.prestadorServico.findFirst({
        where: eq(prestadorServico.mecLogin, email),
      });

      if (!user) {
        return reply.status(404).send({ message: 'Prestador não encontrado.' });
      }

      if (user.mecVerificado) {
        return reply.status(400).send({ message: 'E-mail já verificado.' });
      }

      const agora = new Date();

      if (user.mecCodigoVerificacao !== codigo || (user.mecCodigoVerificacaoExpira && user.mecCodigoVerificacaoExpira < agora)) {
        return reply.status(400).send({ message: 'Código de verificação inválido ou expirado.' });
      }

      await db.update(prestadorServico).set({
        mecVerificado: true,
        mecCodigoVerificacao: null,
        mecCodigoVerificacaoExpira: null,
      }).where(eq(prestadorServico.mecLogin, email));

      return reply.status(200).send({ message: 'E-mail verificado com sucesso!' });
  });
}
