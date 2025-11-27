import { z } from 'zod';

export const criarClienteSchema = z.object({
  usuLogin: z.string().email('Formato de e-mail inválido.'),
  usuSenha: z.string()
    .min(8, 'A senha deve ter no mínimo 8 caracteres.')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/, 'A senha deve conter pelo menos uma letra minúscula, uma maiúscula, um número e um caractere especial.'),
  usuNome: z.string().min(3, 'O nome é obrigatório.'),
  usuDataNasc: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de data inválido (AAAA-MM-DD).'),
  usuCpf: z.string().length(11, 'O CPF deve ter 11 dígitos.'),
  usuTelefone: z.string().optional(),
});

export const criarPrestadorSchema = z.object({
  mecNome: z.string().min(3, 'O nome é obrigatório.'),
  mecCNPJ: z.string().length(14, 'O CNPJ deve ter 14 dígitos.'),
  mecLogin: z.string().email('Formato de e-mail inválido.'),
  mecSenha: z.string()
    .min(8, 'A senha deve ter no mínimo 8 caracteres.')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/, 'A senha deve conter pelo menos uma letra minúscula, uma maiúscula, um número e um caractere especial.'),
  mecEnderecoNum: z.number().int(),
  endereco: z.object({
    endCEP: z.string().length(8, 'O CEP deve ter 8 dígitos.'),
    endRua: z.string(),
    endBairro: z.string(),
    endCidade: z.string(),
    endEstado: z.string().length(2),
  }),
});

export const loginSchema = z.object({
    login: z.string().email('O e-mail é obrigatório e deve ser válido.'),
    senha: z.string().min(1, 'A senha é obrigatória.'),
});

export const loginPrestador = z.object({
  login: z.string().optional(),
  senha: z.string().optional(),
  codigoServico: z.string().optional(),
}).refine(d => d.codigoServico || (d.login && d.senha), {
  message: 'Forneça login+senha ou codigoServico.',
});
