// ============================================================================
// SCHEMAS: Validação de Recuperação de Senha
// ============================================================================

import { z } from 'zod';

export const solicitarResetSenhaSchema = z.object({
  email: z.string().email('Formato de e-mail inválido.'),
});

export const confirmarResetSenhaSchema = z.object({
  email: z.string().email('Formato de e-mail inválido.'),
  codigo: z.string().min(6, 'Código inválido.'), // Ajuste o tamanho se usar token UUID
  novaSenha: z.string()
    .min(8, 'A nova senha deve ter no mínimo 8 caracteres.')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/, 'A senha deve conter pelo menos uma letra minúscula, uma maiúscula, um número e um caractere especial.'),
});
