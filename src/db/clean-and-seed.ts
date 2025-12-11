import { sql } from './connection.ts';

async function cleanAndSeed() {
  try {
    console.log('Limpando banco de dados...');
    
    // Drop all tables in cascade
    try {
      await sql`DROP TABLE IF EXISTS "mensagem" CASCADE;`;
      await sql`DROP TABLE IF EXISTS "chat" CASCADE;`;
      await sql`DROP TABLE IF EXISTS "registro_servico" CASCADE;`;
      await sql`DROP TABLE IF EXISTS "carro" CASCADE;`;
      await sql`DROP TABLE IF EXISTS "prestador_servico" CASCADE;`;
      await sql`DROP TABLE IF EXISTS "tipo_servico" CASCADE;`;
      await sql`DROP TABLE IF EXISTS "endereco" CASCADE;`;
      await sql`DROP TABLE IF EXISTS "usuario" CASCADE;`;
      await sql`DROP TABLE IF EXISTS "__drizzle_migrations" CASCADE;`;
    } catch (err) {
      console.log('Aviso ao limpar tabelas:', (err as any).message);
    }
    
    console.log('Banco de dados limpo. Executando seed...');
    
    // Importar e executar seed após limpar
    await import('./seed.ts');
    
    console.log('Banco de dados preparado e seed executado com sucesso!');
    process.exit(0);
  } catch (error) {
    console.error('Erro ao limpar e fazer seed:', error);
    process.exit(1);
  }
}

cleanAndSeed();
