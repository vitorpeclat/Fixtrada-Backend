import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../../db/connection.ts';
import { usuario } from '../../db/schema/usuario.ts';
import { prestadorServico } from '../../db/schema/prestadorServico.ts';
import { and, eq, gt } from 'drizzle-orm';
import { validarCodigoSchema } from '../schemas/passwordReset.ts'; // ajuste o path
import { hash } from 'bcrypt';

export async function confirmarResetSenhaRoutes(app: FastifyInstance) {
  app.post('/password/confirm-reset', async (request, reply) => {
    console.log('Dados recebidos:', request.body);
    const { email, codigo} = validarCodigoSchema.parse(request.body);

    const agora = new Date();
    console.log('Data atual:', agora.toISOString());
    console.log('Data atual timestamp:', agora.getTime());
    
    // Tenta encontrar cliente ou prestador com o código válido e não expirado
    const userCliente = await db.query.usuario.findFirst({
      where: and(
        eq(usuario.usuLogin, email),
        eq(usuario.codigoResetSenha, codigo),
        gt(usuario.codigoResetSenhaExpira, agora)
      )
    });
    
    console.log('userCliente encontrado:', userCliente);
    console.log('Data de expiração do código:', userCliente?.codigoResetSenhaExpira);

    const userPrestador = userCliente ? null : await db.query.prestadorServico.findFirst({
      where: and(
        eq(prestadorServico.mecLogin, email),
        eq(prestadorServico.codigoResetSenha, codigo), // Adapte nome do campo
        gt(prestadorServico.codigoResetSenhaExpira, agora) // Adapte nome do campo
      )
    });

    if (!userCliente && !userPrestador) {
      return reply.status(400).send({ message: 'Código inválido ou expirado.' });
    }

    return reply.status(200).send({ message: 'Código válido!' });
  });
}
