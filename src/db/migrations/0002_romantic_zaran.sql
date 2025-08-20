CREATE TABLE "usuario" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuLogin" text NOT NULL,
	"usuSenha" text NOT NULL,
	"usuNome" text NOT NULL,
	"usuDataNasc" date NOT NULL,
	"usuCpf" text NOT NULL,
	"usuTelefone" text,
	"usuAtivo" boolean NOT NULL
);
--> statement-breakpoint
DROP TABLE "users" CASCADE;