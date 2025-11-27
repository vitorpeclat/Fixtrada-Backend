import { z } from 'zod';

export const solicitarResetSenhaSchema = z.object({
  email: z.string().email('Formato de e-mail inválido.'),
});

export const validarCodigoSchema = z.object({
  email: z.string().email('Formato de e-mail inválido.'),
  codigo: z.string().min(6, 'Código inválido.'),
});

export const confirmarResetSenhaSchema = z.object({
  email: z.string().email('Formato de e-mail inválido.'),
  novaSenha: z.string()
    .min(8, 'A nova senha deve ter no mínimo 8 caracteres.')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/, 'A senha deve conter pelo menos uma letra minúscula, uma maiúscula, um número e um caractere especial.'),
});

export const alterarSenhaSimplesSchema = z.object({
  email: z.string().email('Formato de e-mail inválido.'),
  role: z.enum(['cliente', 'prestador'], { message: 'Role deve ser "cliente" ou "prestador".' }),
  senhaAtual: z.string().min(1, 'Senha atual obrigatória.'),
  novaSenha: z.string()
    .min(8, 'A nova senha deve ter no mínimo 8 caracteres.')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/, 'A senha deve conter pelo menos uma letra minúscula, uma maiúscula, um número e um caractere especial.'),
});
