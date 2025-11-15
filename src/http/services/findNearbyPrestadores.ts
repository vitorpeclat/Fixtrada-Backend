import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../../db/connection.ts';
import { prestadorServico } from '../../db/schema/prestadorServico.ts';
import { endereco } from '../../db/schema/endereco.ts';
import { sql, eq, and } from 'drizzle-orm';
import { authHook, JwtUserPayload } from '../hooks/auth.ts'; // Proteger a rota

const findNearbySchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  raioKm: z.number().positive().default(7), // Raio em KM, default 7km
});

export async function findNearbyPrestadoresRoutes(app: FastifyInstance) {
  app.addHook('onRequest', authHook); // Apenas usuários logados podem buscar

  app.get('/prestadores/nearby', async (request, reply) => {
    const { latitude, longitude, raioKm } = findNearbySchema.parse(request.query);

    const raioMetros = raioKm * 1000;

    try {
      // --- Placeholder para Query Geográfica ---
      // A query exata depende da sua abordagem (PostGIS ou cálculo manual)
      // Exemplo Conceitual com PostGIS (requer extensão e coluna geometry):
      /*
      const prestadores = await db.select()
        .from(prestadorServico)
        .where(sql`ST_DWithin(
            geography(ST_MakePoint(longitude, latitude)), // Ponto do cliente
            geography(coordenadas_geograficas_prestador), // Coluna de geografia do prestador
            ${raioMetros}
        )`)
        .execute();
      */

      // Exemplo Conceitual com Cálculo Haversine (requer colunas latitude/longitude):
      // Esta query pode ser complexa e menos eficiente que PostGIS para grandes datasets
      // Você precisaria da fórmula Haversine em SQL. Exemplo simplificado:
      const R = 6371; // Raio da Terra em km
      const prestadores = await db.select({
          // Selecione os campos desejados do prestador e endereço
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
          // Calcule a distância (exemplo MUITO simplificado, use Haversine real)
          distancia: sql<number>`
              (${R} * acos(cos(radians(${latitude})) * cos(radians("latitude")) *
              cos(radians("longitude") - radians(${longitude})) + sin(radians(${latitude})) *
              sin(radians("latitude"))))
          `.as('distancia_calculada') // Precisa das colunas latitude/longitude na tabela prestador_servico
      })
      .from(prestadorServico)
      .leftJoin(endereco, eq(prestadorServico.fk_endereco_endCEP, endereco.endCEP))
      .where(
          // Filtro inicial por bounding box para otimizar (opcional mas recomendado)
          // e depois refinar com a distância calculada
          sql`(${R} * acos(cos(radians(${latitude})) * cos(radians("latitude")) *
              cos(radians("longitude") - radians(${longitude})) + sin(radians(${latitude})) *
              sin(radians("latitude")))) < ${raioKm}`
      )
      .orderBy(sql`distancia_calculada ASC`) // Ordena por distância
      .limit(20); // Limita os resultados

      // --- Fim do Placeholder ---

      return reply.send(prestadores);

    } catch (error) {
      console.error("Erro ao buscar prestadores próximos:", error);
      return reply.status(500).send({ message: 'Erro ao buscar prestadores.' });
    }
  });
}
