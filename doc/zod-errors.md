# Formato de erro de validação (Zod)

Quando uma validação Zod falha, a API retorna resposta HTTP 400 com um corpo JSON padronizado para facilitar o consumo pelo front-end.

Exemplo de resposta:

{
  "message": "Erro de validação",
  "errors": [
    { "path": "usuLogin", "message": "Invalid email", "code": "invalid_string" },
    { "path": "endereco.rua", "message": "Required", "code": "invalid_type" }
  ]
}

Campos:
- message: mensagem genérica em português.
- errors: array de objetos com detalhes por campo.
  - path: caminho do campo (campos aninhados usam ponto como separador).
  - message: mensagem de erro gerada pelo Zod (pode ser personalizada nos schemas quando necessário).
  - code: código do tipo de erro do Zod (ex: too_small, invalid_type, custom, etc.).

Observações:
- As rotas não precisam capturar ZodError localmente; existe um tratador global que formata o erro.
- Se uma rota fizer tratamento próprio, recomenda-se usar o helper `formatZodError` em `src/lib/validation.ts` para manter o mesmo formato.
