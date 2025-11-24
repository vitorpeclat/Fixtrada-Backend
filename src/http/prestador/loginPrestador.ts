import type { FastifyInstance } from 'fastify';
import { compare } from 'bcrypt';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db/connection.ts';
import { prestadorServico } from '../../db/schema/prestadorServico.ts';
import { registroServico } from '../../db/schema/registroServico.ts';
import { loginPrestador } from '../schemas/auth.ts';

export async function loginPrestadorRoutes(app: FastifyInstance) {
  app.post('/prestador/login', async (request, reply) => {
    const { login, senha, codigoServico } = loginPrestador.parse(request.body);
    let user: typeof prestadorServico.$inferSelect | undefined;
    let viaCodigo = false;

    if (codigoServico) {
      // Login via código de serviço
      const registro = await db.query.registroServico.findFirst({
        where: eq(registroServico.regCodigo, codigoServico),
      });

      if (!registro || !registro.fk_prestador_servico_mecCNPJ) {
        return reply.status(401).send({ message: 'Código de serviço inválido.' });
      }

      user = await db.query.prestadorServico.findFirst({
        where: eq(prestadorServico.mecCNPJ, registro.fk_prestador_servico_mecCNPJ),
      });

      if (!user || !user.mecAtivo) {
        return reply.status(401).send({ message: 'Prestador associado inativo ou inexistente.' });
      }
      viaCodigo = true;
    } else {
      // Login tradicional via credenciais
      user = await db.query.prestadorServico.findFirst({
        where: eq(prestadorServico.mecLogin, login!),
      });

      if (!user || !user.mecAtivo) {
        return reply.status(401).send({ message: 'Credenciais inválidas.' });
      }

      const isPasswordCorrect = await compare(senha!, user.mecSenha);
      if (!isPasswordCorrect) {
        return reply.status(401).send({ message: 'Credenciais inválidas.' });
      }
    }

    // Token agora contém CNPJ e role
    const token = await reply.jwtSign({
      sub: user.mecCNPJ,
      role: 'prestador',
    });

    return reply.status(200).send({
      token,
      user: {
        id: user.mecCNPJ,
        nome: user.mecLogin,
        role: 'prestador',
        viaCodigoServico: viaCodigo,
        codigoServico: viaCodigo ? codigoServico : undefined,
      },
    });
  });
}
