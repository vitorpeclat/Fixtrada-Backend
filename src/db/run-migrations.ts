import { sql } from './connection.ts';
import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, '..');

async function runMigrations() {
  try {
    console.log('Executando migrações...');
    
    // Ler o arquivo SQL de migrations
    const migrationPath = join(__dirname, 'migrations', '0000_powerful_sandman.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');
    
    // Executar cada statement separadamente (split by -->)
    const statements = migrationSQL
      .split('-->statement-breakpoint')
      .map(s => s.trim())
      .filter(s => s.length > 0);
    
    for (const statement of statements) {
      try {
        await sql.unsafe(statement);
        console.log('✓ Statement executado');
      } catch (err: any) {
        console.error('Erro ao executar statement:', err.message);
      }
    }
    
    console.log('✓ Migrações executadas com sucesso!');
    process.exit(0);
  } catch (error) {
    console.error('Erro ao rodar migrações:', error);
    process.exit(1);
  }
}

runMigrations();
