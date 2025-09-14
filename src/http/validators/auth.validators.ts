import { z } from 'zod';

export const criarClienteSchema = z.object({
  usuLogin: z.string().email('Formato de e-mail inválido.'),
  usuSenha: z.string().min(6, 'A senha deve ter no mínimo 6 caracteres.'),
  usuNome: z.string().min(3, 'O nome é obrigatório.'),
  usuDataNasc: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de data inválido (AAAA-MM-DD).'),
  usuCpf: z.string().length(11, 'O CPF deve ter 11 dígitos.'),
  usuTelefone: z.string().optional(),
});

export const criarPrestadorSchema = z.object({
  mecCNPJ: z.string().length(14, 'O CNPJ deve ter 14 dígitos.'),
  mecLogin: z.string().email('Formato de e-mail inválido.'),
  mecSenha: z.string().min(6, 'A senha deve ter no mínimo 6 caracteres.'),
  mecEnderecoNum: z.number().int(),
  endereco: z.object({
    endCEP: z.string().length(8, 'O CEP deve ter 8 dígitos.'),
    endRua: z.string(),
    endBairro: z.string(),
    endCidade: z.string(),
    endEstado: z.string().length(2),
  }),
});