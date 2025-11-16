// ============================================================================
// ROTAS: Busca de Prestadores Próximos
// ============================================================================
// GET /prestadores/nearby - Buscar prestadores por geolocalização

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../../db/connection.ts';
import { prestadorServico } from '../../db/schema/prestadorServico.ts';
import { endereco } from '../../db/schema/endereco.ts';
import { sql, eq, and } from 'drizzle-orm';
import { authHook, JwtUserPayload } from '../hooks/auth.ts';

const findNearbySchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  raioKm: z.number().positive().default(7),
});

export async function findNearbyPrestadoresRoutes(app: FastifyInstance) {
  app.addHook('onRequest', authHook);

  // ========================================================================
  // GET /prestadores/nearby - Buscar prestadores por geolocalização
  // ========================================================================
  app.get('/prestadores/nearby', async (request, reply) => {
    const { latitude, longitude, raioKm } = findNearbySchema.parse(request.query);

    const raioMetros = raioKm * 1000;

    try {
      const R = 6371;
      const prestadores = await db.select({
          cnpj: prestadorServico.mecCNPJ,
          login: prestadorServico.mecLogin,
          nota: prestadorServico.mecNota,
          enderecoNum: prestadorServico.mecEnderecoNum,
          cep: endereco.endCEP,
          rua: endereco.endRua,
          bairro: endereco.endBairro,
          cidade: endereco.endCidade,
          estado: endereco.endEstado,
          latitude: prestadorServico.latitude,
          longitude: prestadorServico.longitude,
          distancia: sql<number>`
              (${R} * acos(cos(radians(${latitude})) * cos(radians("latitude")) *
              cos(radians("longitude") - radians(${longitude})) + sin(radians(${latitude})) *
              sin(radians("latitude"))))
          `.as('distancia_calculada')
      })
      .from(prestadorServico)
      .leftJoin(endereco, eq(prestadorServico.fk_endereco_endCEP, endereco.endCEP))
      .where(
          sql`(${R} * acos(cos(radians(${latitude})) * cos(radians("latitude")) *
              cos(radians("longitude") - radians(${longitude})) + sin(radians(${latitude})) *
              sin(radians("latitude")))) < ${raioKm}`
      )
      .orderBy(sql`distancia_calculada ASC`)
      .limit(20);

      return reply.send(prestadores);

    } catch (error) {
      console.error("Erro ao buscar prestadores próximos:", error);
      return reply.status(500).send({ message: 'Erro ao buscar prestadores.' });
    }
  });
}
