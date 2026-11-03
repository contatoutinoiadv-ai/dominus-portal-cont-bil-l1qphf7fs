migrate(
  (app) => {
    // Amplia o enum de ações da Trilha de Auditoria para contemplar o ciclo de
    // vida do cadastro de empresas (criação, edição e exclusão lógica).
    const auditoria = app.findCollectionByNameOrId('auditoria')
    const acaoField = auditoria.fields.getByName('acao')
    if (acaoField) {
      auditoria.fields.removeByName('acao')
      auditoria.fields.add(
        new SelectField({
          name: 'acao',
          required: true,
          values: [
            'LANCAMENTO_CRIADO',
            'LANCAMENTO_ALTERADO',
            'LANCAMENTO_VALIDADO',
            'LANCAMENTO_DEVOLVIDO',
            'LANCAMENTO_EXCLUIDO',
            'ENQUADRAMENTO_ALTERADO',
            'PARAMETRO_ALTERADO',
            'LOGIN_SUCESSO',
            'LOGIN_FALHA',
            'SENHA_ALTERADA',
            'CONSENTIMENTO_LGPD',
            'USUARIO_CRIADO',
            'USUARIO_ALTERADO',
            'USUARIO_EXCLUIDO',
            'USUARIO_DESATIVADO',
            'USUARIO_ATIVADO',
            'USUARIO_DESBLOQUEADO',
            'SENHA_REDEFINIDA',
            'EMPRESA_CRIADA',
            'EMPRESA_ALTERADA',
            'EMPRESA_EXCLUIDA',
          ],
          maxSelect: 1,
        }),
      )
      app.save(auditoria)
    }
  },
  (app) => {
    // Reverte para o enum anterior (sem as ações de empresas).
    const auditoria = app.findCollectionByNameOrId('auditoria')
    const acaoField = auditoria.fields.getByName('acao')
    if (acaoField) {
      auditoria.fields.removeByName('acao')
      auditoria.fields.add(
        new SelectField({
          name: 'acao',
          required: true,
          values: [
            'LANCAMENTO_CRIADO',
            'LANCAMENTO_ALTERADO',
            'LANCAMENTO_VALIDADO',
            'LANCAMENTO_DEVOLVIDO',
            'LANCAMENTO_EXCLUIDO',
            'ENQUADRAMENTO_ALTERADO',
            'PARAMETRO_ALTERADO',
            'LOGIN_SUCESSO',
            'LOGIN_FALHA',
            'SENHA_ALTERADA',
            'CONSENTIMENTO_LGPD',
            'USUARIO_CRIADO',
            'USUARIO_ALTERADO',
            'USUARIO_EXCLUIDO',
            'USUARIO_DESATIVADO',
            'USUARIO_ATIVADO',
            'USUARIO_DESBLOQUEADO',
            'SENHA_REDEFINIDA',
          ],
          maxSelect: 1,
        }),
      )
      app.save(auditoria)
    }
  },
)
