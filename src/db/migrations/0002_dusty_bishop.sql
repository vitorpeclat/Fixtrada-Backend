ALTER TABLE "carro" ALTER COLUMN "carAtivo" SET DEFAULT true;--> statement-breakpoint
ALTER TABLE "mensagem" ALTER COLUMN "menData" SET DATA TYPE timestamp;--> statement-breakpoint
ALTER TABLE "mensagem" ALTER COLUMN "menData" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "prestador_servico" ALTER COLUMN "mecAtivo" SET DEFAULT true;--> statement-breakpoint
ALTER TABLE "usuario" ALTER COLUMN "usuAtivo" SET DEFAULT true;--> statement-breakpoint
ALTER TABLE "carro" ADD COLUMN "carPlaca" varchar(7) NOT NULL;--> statement-breakpoint
ALTER TABLE "carro" ADD CONSTRAINT "carro_carPlaca_unique" UNIQUE("carPlaca");