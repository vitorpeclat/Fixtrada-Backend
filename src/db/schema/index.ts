import { usuario, usuarioRelations } from "./usuario.ts";
import { carro, carroRelations } from "./carro.ts";
import { endereco, enderecoRelations } from "./endereco.ts";
import { prestadorServico, prestadorServicoRelations } from "./prestadorServico.ts";
import { tipoServico, tipoServicoRelations } from "./tipoServico.ts";
import { registroServico, registroServicoRelations } from "./registroServico.ts";
import { mensagem, mensagemRelations } from "./mensagem.ts";
import { chat, chatRelations } from "./chat.ts";

export const schema = {
    usuario,
    usuarioRelations,
    carro,
    carroRelations,
    endereco,
    enderecoRelations,
    prestadorServico,
    prestadorServicoRelations,
    tipoServico,
    tipoServicoRelations,
    registroServico,
    registroServicoRelations,
    mensagem,
    mensagemRelations,
    chat,
    chatRelations,
};