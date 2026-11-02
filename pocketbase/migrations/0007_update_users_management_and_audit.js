migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users')

    if (!users.fields.getByName('ativo')) {
      users.fields.add(
        new BoolField({
          name: 'ativo',
          required: false,
        }),
      )
    }

    if (!users.fields.getByName('cargo')) {
      users.fields.add(
        new TextField({
          name: 'cargo',
          required: false,
        }),
      )
    }

    if (!users.fields.getByName('telefone')) {
      users.fields.add(
        new TextField({
          name: 'telefone',
          required: false,
        }),
      )
    }

    if (!users.fields.getByName('observacoes')) {
      users.fields.add(
        new TextField({
          name: 'observacoes',
          required: false,
        }),
      )
    }

    if (!users.fields.getByName('deleted_at')) {
      users.fields.add(
        new TextField({
          name: 'deleted_at',
          required: false,
        }),
      )
    }

    // Regra de criação: somente usuários autenticados com perfil contador podem cadastrar novos logins
    users.createRule = "@request.auth.id != '' && @request.auth.role = 'contador'"
    users.listRule =
      "@request.auth.id != '' && (@request.auth.role = 'contador' || id = @request.auth.id)"
    users.viewRule =
      "@request.auth.id != '' && (@request.auth.role = 'contador' || id = @request.auth.id)"
    users.updateRule =
      "@request.auth.id != '' && (@request.auth.role = 'contador' || id = @request.auth.id)"
    users.deleteRule =
      "@request.auth.id != '' && (@request.auth.role = 'contador' || id = @request.auth.id)"

    app.save(users)

    // Atualizar enum de acoes na collection auditoria para incluir ações de gestão de usuários
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

    // Marcar usuários existentes como ativos por padrão
    try {
      app.db().newQuery('UPDATE users SET ativo = 1 WHERE ativo IS NULL').execute()
    } catch (_) {}
  },
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    const fieldNames = ['ativo', 'cargo', 'telefone', 'observacoes', 'deleted_at']
    fieldNames.forEach((fn) => {
      const f = users.fields.getByName(fn)
      if (f) users.fields.removeByName(fn)
    })
    app.save(users)
  },
)
