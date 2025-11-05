CREATE TABLE "carro" (
	"carID" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"carPlaca" varchar(7) NOT NULL,
	"carMarca" varchar(50) NOT NULL,
	"carModelo" varchar(50) NOT NULL,
	"carAno" integer NOT NULL,
	"carCor" varchar(30) NOT NULL,
	"carKM" integer NOT NULL,
	"carTpCombust" varchar(30),
	"carOpTracao" varchar(30),
	"carOpTrocaOleo" date,
	"carOpTrocaPneu" date,
	"carOpRevisao" varchar(255),
	"carAtivo" boolean DEFAULT true NOT NULL,
	"carFavorito" boolean DEFAULT false NOT NULL,
	"fk_usuario_usuID" uuid NOT NULL,
	CONSTRAINT "carro_carPlaca_unique" UNIQUE("carPlaca")
);
--> statement-breakpoint
CREATE TABLE "endereco" (
	"endCEP" varchar(9) PRIMARY KEY NOT NULL,
	"endRua" text NOT NULL,
	"endBairro" text NOT NULL,
	"endCidade" text NOT NULL,
	"endEstado" varchar(2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mensagem" (
	"menID" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"menSender" varchar(100) NOT NULL,
	"menConteudo" text NOT NULL,
	"menData" timestamp DEFAULT now() NOT NULL,
	"fk_registro_servico_regID" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prestador_servico" (
	"mecCNPJ" varchar(14) PRIMARY KEY NOT NULL,
	"mecNota" double precision,
	"mecEnderecoNum" integer NOT NULL,
	"mecLogin" varchar(50) NOT NULL,
	"mecSenha" text NOT NULL,
	"mecAtivo" boolean DEFAULT true NOT NULL,
	"mecFoto" text,
	"mecVerificado" boolean DEFAULT false,
	"mecCodigoVerificacao" text,
	"mecCodigoVerificacaoExpira" timestamp with time zone,
	"codigoResetSenha" text,
	"codigoResetSenhaExpira" timestamp with time zone,
	"latitude" double precision,
	"longitude" double precision,
	"fk_endereco_endCEP" varchar(9) NOT NULL,
	CONSTRAINT "prestador_servico_mecLogin_unique" UNIQUE("mecLogin")
);
--> statement-breakpoint
CREATE TABLE "registro_servico" (
	"regID" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"regCodigo" varchar(8),
	"regNotaCliente" integer,
	"regComentarioCliente" text,
	"regValor" double precision,
	"regStatus" varchar(20) DEFAULT 'pendente' NOT NULL,
	"regDescricao" text NOT NULL,
	"regData" date NOT NULL,
	"regHora" timestamp NOT NULL,
	"fk_endereco_endCEP" varchar(9) NOT NULL,
	"fk_carro_carID" uuid NOT NULL,
	"fk_prestador_servico_mecCNPJ" varchar(14) NOT NULL,
	"fk_tipo_servico_tseID" uuid NOT NULL,
	CONSTRAINT "registro_servico_regCodigo_unique" UNIQUE("regCodigo")
);
--> statement-breakpoint
CREATE TABLE "tipo_servico" (
	"tseID" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tseTipoProblema" varchar(100) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "usuario" (
	"usuID" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuLogin" varchar(50) NOT NULL,
	"usuSenha" text NOT NULL,
	"usuNome" varchar(100) NOT NULL,
	"usuDataNasc" date NOT NULL,
	"usuCpf" varchar(11) NOT NULL,
	"usuTelefone" text,
	"usuAtivo" boolean DEFAULT true NOT NULL,
	"usuRole" varchar(10) DEFAULT 'cliente' NOT NULL,
	"usuFoto" text,
	"usuVerificado" boolean DEFAULT false,
	"usuCodigoVerificacao" text,
	"usuCodigoVerificacaoExpira" timestamp with time zone,
	"codigoResetSenha" text,
	"codigoResetSenhaExpira" timestamp with time zone,
	CONSTRAINT "usuario_usuLogin_unique" UNIQUE("usuLogin"),
	CONSTRAINT "usuario_usuCpf_unique" UNIQUE("usuCpf")
);
--> statement-breakpoint
ALTER TABLE "carro" ADD CONSTRAINT "carro_fk_usuario_usuID_usuario_usuID_fk" FOREIGN KEY ("fk_usuario_usuID") REFERENCES "public"."usuario"("usuID") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mensagem" ADD CONSTRAINT "mensagem_fk_registro_servico_regID_registro_servico_regID_fk" FOREIGN KEY ("fk_registro_servico_regID") REFERENCES "public"."registro_servico"("regID") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prestador_servico" ADD CONSTRAINT "prestador_servico_fk_endereco_endCEP_endereco_endCEP_fk" FOREIGN KEY ("fk_endereco_endCEP") REFERENCES "public"."endereco"("endCEP") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registro_servico" ADD CONSTRAINT "registro_servico_fk_endereco_endCEP_endereco_endCEP_fk" FOREIGN KEY ("fk_endereco_endCEP") REFERENCES "public"."endereco"("endCEP") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registro_servico" ADD CONSTRAINT "registro_servico_fk_carro_carID_carro_carID_fk" FOREIGN KEY ("fk_carro_carID") REFERENCES "public"."carro"("carID") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registro_servico" ADD CONSTRAINT "registro_servico_fk_prestador_servico_mecCNPJ_prestador_servico_mecCNPJ_fk" FOREIGN KEY ("fk_prestador_servico_mecCNPJ") REFERENCES "public"."prestador_servico"("mecCNPJ") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registro_servico" ADD CONSTRAINT "registro_servico_fk_tipo_servico_tseID_tipo_servico_tseID_fk" FOREIGN KEY ("fk_tipo_servico_tseID") REFERENCES "public"."tipo_servico"("tseID") ON DELETE no action ON UPDATE no action;