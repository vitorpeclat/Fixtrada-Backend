import { FastifyInstance } from 'fastify';
import { db } from '../db/connection.ts';
import { hash } from 'bcrypt';
import { eq } from 'drizzle-orm';
import z from 'zod';
import { endereco } from '../db/schema/endereco.ts';
import { prestadorServico } from '../db/schema/prestadorServico.ts';
import { usuario } from '../db/schema/usuario.ts';
import { criarClienteSchema, criarPrestadorSchema } from './validators/auth.validators.ts';

export async function authRoutes(app: FastifyInstance) {
  
  // Endpoint para cadastrar Cliente (RF001)
  app.post('/usuario', async (request, reply) => {
    try {
      const dadosValidados = criarClienteSchema.parse(request.body);

      // Verifica se o login (e-mail) ou CPF já existem
      const clienteExistente = await db.query.usuario.findFirst({
        where: (fields, { or }) => or(
          eq(fields.usuLogin, dadosValidados.usuLogin),
          eq(fields.usuCpf, dadosValidados.usuCpf)
        ),
      });

      if (clienteExistente) {
        return reply.status(409).send({ message: 'E-mail ou CPF já cadastrado.' });
      }

      // Criptografa a senha (RNF006)
      const senhaHash = await hash(dadosValidados.usuSenha, 8);

      // Insere no banco de dados
      await db.insert(usuario).values({
        ...dadosValidados,
        usuSenha: senhaHash,
        usuAtivo: true, // Define o usuário como ativo por padrão
      });

      return reply.status(201).send({ message: 'Cliente cadastrado com sucesso!' });

    } catch (error) {
      // Zod lança um erro se a validação falhar
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ message: 'Dados inválidos.', issues: error.format() });
      }
      console.error(error);
      return reply.status(500).send({ message: 'Erro interno no servidor.' });
    }
  });

  // Endpoint para cadastrar Prestador (RF001)
  app.post('/prestador', async (request, reply) => {
    try {
      const dadosValidados = criarPrestadorSchema.parse(request.body);

      // Verifica se o CNPJ ou login já existem
      const prestadorExistente = await db.query.prestadorServico.findFirst({
        where: (fields, { or }) => or(
          eq(fields.mecCNPJ, dadosValidados.mecCNPJ),
          eq(fields.mecLogin, dadosValidados.mecLogin)
        ),
      });

      if (prestadorExistente) {
        return reply.status(409).send({ message: 'CNPJ ou e-mail já cadastrado.' });
      }

      // Lógica de transação para endereço e prestador
      await db.transaction(async (tx) => {
        // 1. Insere o endereço (ou ignora se já existir)
        await tx.insert(endereco)
          .values(dadosValidados.endereco)
          .onConflictDoNothing(); // Se o CEP já existir, não faz nada
        
        // 2. Criptografa a senha (RNF006)
        const senhaHash = await hash(dadosValidados.mecSenha, 8);

        // 3. Insere o prestador
        await tx.insert(prestadorServico).values({
          mecCNPJ: dadosValidados.mecCNPJ,
          mecLogin: dadosValidados.mecLogin,
          mecSenha: senhaHash,
          mecEnderecoNum: dadosValidados.mecEnderecoNum,
          fk_endereco_endCEP: dadosValidados.endereco.endCEP,
          mecAtivo: true, // Define como ativo por padrão
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