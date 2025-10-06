ALTER TABLE "prestador_servico" ADD COLUMN "mecFoto" text;--> statement-breakpoint
ALTER TABLE "registro_servico" ADD COLUMN "regCodigo" varchar(8);--> statement-breakpoint
ALTER TABLE "registro_servico" ADD COLUMN "regNotaCliente" integer;--> statement-breakpoint
ALTER TABLE "registro_servico" ADD COLUMN "regValor" double precision;--> statement-breakpoint
ALTER TABLE "usuario" ADD COLUMN "usuFoto" text;--> statement-breakpoint
ALTER TABLE "registro_servico" ADD CONSTRAINT "registro_servico_regCodigo_unique" UNIQUE("regCodigo");