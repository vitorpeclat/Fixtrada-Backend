// ============================================================================
// ROTAS: Atualização de Dados (Prestador)
// ============================================================================
// PUT /prestador/update - Atualizar perfil do prestador

import type { FastifyInstance } from 'fastify';
import { db } from '../../db/connection.ts';
import { prestadorServico } from '../../db/schema/prestadorServico.ts';
import { authHook, JwtUserPayload } from '../hooks/auth.ts';
import { eq } from 'drizzle-orm';
import { updatePrestadorSchema } from '../schemas/updatePrestador.ts';

export async function updatePrestadorRoutes(app: FastifyInstance) {
  app.addHook('onRequest', authHook);

  // ========================================================================
  // PUT /prestador/update - Atualizar dados do prestador
  // ========================================================================
  app.put('/prestador/update', async (request, reply) => {
    // Valida o corpo da requisição
    const dados = updatePrestadorSchema.parse(request.body);

    // Obtém o CNPJ do prestador a partir do token JWT
    const { sub: mecCNPJ, role } = request.user as JwtUserPayload;

    // Verifica se o usuário autenticado é um prestador
    if (role !== 'prestador') {
        return reply.status(403).send({ message: 'Acesso não autorizado.' });
    }

    // Verifica se há dados para atualizar
    if (Object.keys(dados).length === 0) {
      return reply.status(200).send({ message: 'Nenhuma alteração fornecida.' });
    }

    // Busca o prestador para garantir que existe (opcional, update direto pode falhar)
    const existingPrestador = await db.query.prestadorServico.findFirst({
         where: eq(prestadorServico.mecCNPJ, mecCNPJ)
    });

    if (!existingPrestador) {
        return reply.status(404).send({ message: 'Prestador não encontrado.' });
    }

    // Prepara objeto de atualização apenas com os campos enviados e válidos
    // Mapeie os campos do DTO para os campos da tabela Drizzle
    const updates: Partial<typeof prestadorServico.$inferInsert> = {};
    if (dados.mecFoto) updates.mecFoto = dados.mecFoto;
    if (dados.mecEnderecoNum) updates.mecEnderecoNum = dados.mecEnderecoNum;

    try {
        const [updated] = await db.update(prestadorServico)
            .set(updates)
            .where(eq(prestadorServico.mecCNPJ, mecCNPJ))
            .returning({
              mecCNPJ: prestadorServico.mecCNPJ,
              mecFoto: prestadorServico.mecFoto,
              mecEnderecoNum: prestadorServico.mecEnderecoNum,
            });

        if (!updated) {
           // Pode acontecer se o where não encontrar (improvável devido à verificação anterior)
           return reply.status(404).send({ message: 'Prestador não encontrado para atualização.' });
        }

        return reply.status(200).send({ message: 'Dados do prestador atualizados com sucesso.', prestador: updated });

    } catch (error) {
        console.error("Erro ao atualizar prestador:", error);
        // Adicionar tratamento para erros específicos (ex: email duplicado, se aplicável)
        return reply.status(500).send({ message: 'Erro interno ao atualizar dados.' });
    }
  });
}
