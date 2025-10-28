import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../../db/connection.ts';
import { usuario } from '../../db/schema/usuario.ts';
import { prestadorServico } from '../../db/schema/prestadorServico.ts';
import { eq } from 'drizzle-orm';
import { adminAuthHook } from '../hooks/adminAuth.ts';

export async function contasAdminRoutes(app: FastifyInstance) {
    app.addHook('onRequest', adminAuthHook);

    // Listar todos os clientes
    app.get('/admin/clientes', async (request, reply) => {
        const clientes = await db.query.usuario.findMany({
            where: eq(usuario.usuRole, 'cliente')
        });
        return reply.send(clientes);
    });

    // Listar todos os prestadores
    app.get('/admin/prestadores', async (request, reply) => {
        const prestadores = await db.query.prestadorServico.findMany();
        return reply.send(prestadores);
    });

    const clienteParamsSchema = z.object({ id: z.string().uuid() });
    // Desativar conta de cliente
    app.delete('/admin/clientes/:id', async (request, reply) => {
        const { id } = clienteParamsSchema.parse(request.params);
        
        const [deletedUser] = await db.update(usuario)
            .set({ usuAtivo: false })
            .where(eq(usuario.usuID, id))
            .returning();

        if (!deletedUser) {
            return reply.status(404).send({ message: 'Cliente não encontrado.' });
        }

        return reply.status(204).send();
    });

    const prestadorParamsSchema = z.object({ id: z.string() }); // CNPJ é string
    // Desativar conta de prestador
    app.delete('/admin/prestadores/:id', async (request, reply) => {
        const { id } = prestadorParamsSchema.parse(request.params);

        const [deletedProvider] = await db.update(prestadorServico)
            .set({ mecAtivo: false })
            .where(eq(prestadorServico.mecCNPJ, id))
            .returning();
        
        if (!deletedProvider) {
            return reply.status(404).send({ message: 'Prestador não encontrado.' });
        }

        return reply.status(204).send();
    });
}