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
    const clienteBodySchema = z.object({ ativo: z.boolean() });
    
    // Alterar status de conta de cliente (ativar/desativar)
    app.patch('/admin/clientes/:id', async (request, reply) => {
        const { id } = clienteParamsSchema.parse(request.params);
        const { ativo } = clienteBodySchema.parse(request.body);
        
        const [updatedUser] = await db.update(usuario)
            .set({ usuAtivo: ativo })
            .where(eq(usuario.usuID, id))
            .returning();

        if (!updatedUser) {
            return reply.status(404).send({ message: 'Cliente não encontrado.' });
        }

        return reply.send(updatedUser);
    });

    // Desativar conta de cliente (mantido para compatibilidade)
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
    const prestadorBodySchema = z.object({ ativo: z.boolean() });
    
    // Alterar status de conta de prestador (ativar/desativar)
    app.patch('/admin/prestadores/:id', async (request, reply) => {
        const { id } = prestadorParamsSchema.parse(request.params);
        const { ativo } = prestadorBodySchema.parse(request.body);

        const [updatedProvider] = await db.update(prestadorServico)
            .set({ mecAtivo: ativo })
            .where(eq(prestadorServico.mecCNPJ, id))
            .returning();
        
        if (!updatedProvider) {
            return reply.status(404).send({ message: 'Prestador não encontrado.' });
        }

        return reply.send(updatedProvider);
    });

    // Desativar conta de prestador (mantido para compatibilidade)
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