ALTER TABLE "prestador_servico" ADD COLUMN "codigoResetSenha" text;--> statement-breakpoint
ALTER TABLE "prestador_servico" ADD COLUMN "codigoResetSenhaExpira" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "usuario" ADD COLUMN "codigoResetSenha" text;--> statement-breakpoint
ALTER TABLE "usuario" ADD COLUMN "codigoResetSenhaExpira" timestamp with time zone;