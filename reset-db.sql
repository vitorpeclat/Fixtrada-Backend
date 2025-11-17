-- Desconectar todas as conexões do banco fixtrada
SELECT pg_terminate_backend(pg_stat_activity.pid)
FROM pg_stat_activity
WHERE pg_stat_activity.datname = 'fixtrada'
  AND pid <> pg_backend_pid();

-- Dropar e recriar o banco
DROP DATABASE IF EXISTS fixtrada;
CREATE DATABASE fixtrada;
