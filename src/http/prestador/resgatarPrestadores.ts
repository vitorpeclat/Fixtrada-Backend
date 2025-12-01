import type { FastifyInstance } from 'fastify';
import { db } from '../../db/connection.ts';
import { prestadorServico } from '../../db/schema/prestadorServico.ts';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

// Rota para listar ("resgatar") prestadores de serviço.
// Opcionalmente permite filtros via query string:
//   ?ativo=true|false  (default: true)
//   ?verificado=true|false
//   ?limit=number (default 100)
//   ?offset=number (default 0)
// Exemplo: GET /prestadores?verificado=true
export async function resgatarPrestadoresRoutes(app: FastifyInstance) {
  app.get('/prestadores', async (request, reply) => {
    const querySchema = z.object({
      ativo: z.string().optional(),
      verificado: z.string().optional(),
      limit: z.coerce.number().int().positive().max(500).optional(),
      offset: z.coerce.number().int().nonnegative().optional(),
    });

    const { ativo, verificado, limit = 100, offset = 0 } = querySchema.parse(request.query);

    // Construção dinâmica de where
    const whereClauses: any[] = [];
    if (ativo !== undefined) {
      whereClauses.push(eq(prestadorServico.mecAtivo, ativo === 'true'));
    } else {
      // Padrão: somente ativos
      whereClauses.push(eq(prestadorServico.mecAtivo, true));
    }
    if (verificado !== undefined) {
      whereClauses.push(eq(prestadorServico.mecVerificado, verificado === 'true'));
    }

    const prestadores = await db.query.prestadorServico.findMany({
      where: (fields, { and }) => and(...whereClauses),
      limit,
      offset,
      // Seleciona somente campos que podem ser retornados publicamente
      columns: {
        mecCNPJ: true,
        mecLogin: true,
        mecNota: true,
        mecEnderecoNum: true,
        mecAtivo: true,
        mecFoto: true,
        latitude: true,
        longitude: true,
        fk_endereco_endCEP: true,
      }
    });

    return reply.send(prestadores);
  });

  // Rota para buscar um prestador específico pelo CNPJ
  app.get('/prestadores/:cnpj', async (request, reply) => {
    const paramsSchema = z.object({
      cnpj: z.string().length(14, 'CNPJ deve ter 14 caracteres'),
    });

    const { cnpj } = paramsSchema.parse(request.params);

    const prestador = await db.query.prestadorServico.findFirst({
      where: eq(prestadorServico.mecCNPJ, cnpj),
      columns: {
        mecCNPJ: true,
        mecLogin: true,
        mecNome: true,
        mecNota: true,
        mecEnderecoNum: true,
        mecAtivo: true,
        mecFoto: true,
        mecVerificado: true,
        latitude: true,
        longitude: true,
        fk_endereco_endCEP: true,
      },
    });

    if (!prestador) {
      return reply.status(404).send({ error: 'Prestador não encontrado' });
    }

    return reply.send(prestador);
  });
}
