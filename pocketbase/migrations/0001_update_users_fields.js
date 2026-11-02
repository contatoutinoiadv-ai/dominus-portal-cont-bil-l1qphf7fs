migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users')

    if (!users.fields.getByName('role')) {
      users.fields.add(
        new SelectField({
          name: 'role',
          values: ['contador', 'cliente'],
          maxSelect: 1,
          required: false,
        }),
      )
    }

    if (!users.fields.getByName('empresa_id')) {
      users.fields.add(
        new TextField({
          name: 'empresa_id',
          required: false,
        }),
      )
    }

    if (!users.fields.getByName('must_change_password')) {
      users.fields.add(
        new BoolField({
          name: 'must_change_password',
          required: false,
        }),
      )
    }

    if (!users.fields.getByName('lgpd_accepted')) {
      users.fields.add(
        new BoolField({
          name: 'lgpd_accepted',
          required: false,
        }),
      )
    }

    if (!users.fields.getByName('lgpd_accepted_at')) {
      users.fields.add(
        new TextField({
          name: 'lgpd_accepted_at',
          required: false,
        }),
      )
    }

    if (!users.fields.getByName('failed_login_attempts')) {
      users.fields.add(
        new NumberField({
          name: 'failed_login_attempts',
          required: false,
        }),
      )
    }

    if (!users.fields.getByName('locked_until')) {
      users.fields.add(
        new TextField({
          name: 'locked_until',
          required: false,
        }),
      )
    }

    // Users rule: contador can list/view/update/delete all, client can only access own record
    users.listRule =
      "@request.auth.id != '' && (@request.auth.role = 'contador' || id = @request.auth.id)"
    users.viewRule =
      "@request.auth.id != '' && (@request.auth.role = 'contador' || id = @request.auth.id)"
    users.updateRule =
      "@request.auth.id != '' && (@request.auth.role = 'contador' || id = @request.auth.id)"

    app.save(users)
  },
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    const fieldNames = [
      'role',
      'empresa_id',
      'must_change_password',
      'lgpd_accepted',
      'lgpd_accepted_at',
      'failed_login_attempts',
      'locked_until',
    ]
    fieldNames.forEach((fn) => {
      const f = users.fields.getByName(fn)
      if (f) users.fields.removeByName(fn)
    })
    app.save(users)
  },
)
