import { usuario, usuarioRelations } from "./usuario.ts";
import { carro } from "./carro.ts";
import { endereco } from "./endereco.ts";
import { prestadorServico, prestadorServicoRelations } from "./prestadorServico.ts";
import { tipoServico } from "./tipoServico.ts";
import { registroServico, registroServicoRelations } from "./registroServico.ts";
import { mensagem, mensagemRelations } from "./mensagem.ts";
import { chat, chatRelations } from "./chat.ts";

export const schema = {
    usuario,
    usuarioRelations,
    carro,
    endereco,
    prestadorServico,
    prestadorServicoRelations,
    tipoServico,
    registroServico,
    registroServicoRelations,
    mensagem,
    mensagemRelations,
    chat,
    chatRelations,
};