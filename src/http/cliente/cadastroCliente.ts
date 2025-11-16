// ============================================================================
// ROTAS: Cadastro de Cliente
// ============================================================================
// POST /cliente/cadastro - Registrar novo cliente com verificação de e-mail

import type { FastifyInstance } from 'fastify';
import { hash } from 'bcrypt';
import { eq } from 'drizzle-orm';
import { db } from '../../db/connection.ts';
import { usuario } from '../../db/schema/usuario.ts';
import { criarClienteSchema } from '../schemas/auth.ts';
import { customAlphabet } from 'nanoid';
import { getMailClient } from '../../lib/mail.ts';
import { env } from '../../env.ts';

export async function cadastroClienteRoutes(app: FastifyInstance) {
  app.post('/cliente/cadastro', async (request, reply) => {
      const dadosValidados = criarClienteSchema.parse(request.body);

      const clienteExistente = await db.query.usuario.findFirst({
        columns: {
          usuID: true,
          usuLogin: true,
          usuCpf: true,
        },
        where: (fields, { or }) => or(
          eq(fields.usuLogin, dadosValidados.usuLogin),
          eq(fields.usuCpf, dadosValidados.usuCpf)
        ),
      });

      if (clienteExistente) {
        return reply.status(409).send({ message: 'E-mail ou CPF já cadastrado.' });
      }

      // Gerar hash de senha e código de verificação (1 hora de expiração)
      const senhaHash = await hash(dadosValidados.usuSenha, 8);
      const codigoVerificacao = customAlphabet('0123456789', 6)();
      const agora = new Date();
      const usuCodigoVerificacaoExpira = new Date(agora.getTime() + 60 * 60 * 1000);

      const [newUser] = await db.insert(usuario).values({
          ...dadosValidados,
          usuSenha: senhaHash,
          usuAtivo: true,
          usuCodigoVerificacao: codigoVerificacao,
          usuCodigoVerificacaoExpira: usuCodigoVerificacaoExpira,
          usuStatus: 'ativo',
      }).returning({
          usuID: usuario.usuID,
          usuLogin: usuario.usuLogin,
          usuNome: usuario.usuNome,
          usuTelefone: usuario.usuTelefone,
          usuDataNasc: usuario.usuDataNasc,
      });
      const token = await reply.jwtSign(
        {
          sub: newUser.usuID,
          role: 'cliente'
        }
      );

      // Enviar e-mail com código de verificação
      const mail = await getMailClient();
      await mail.sendMail({
          from: `Fixtrada <${env.email}>`,
          to: dadosValidados.usuLogin,
          subject: 'Código de Verificação de E-mail',
          text: `Seu código de verificação é: ${codigoVerificacao}`,
      });
      
      return reply.status(201).send({
        message: 'Cliente cadastrado com sucesso! Um código de verificação foi enviado para o seu e-mail.',
        token,
        user: {
            id: newUser.usuID,
            email: newUser.usuLogin,
            nome: newUser.usuNome,
            role: 'cliente',
            telefone: newUser.usuTelefone,
            dataNascimento: newUser.usuDataNasc,
        },
      });
  });
}