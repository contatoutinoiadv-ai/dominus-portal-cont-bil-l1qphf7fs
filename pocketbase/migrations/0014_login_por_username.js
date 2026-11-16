migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users')

    // 1. Campo username (text) — identificação alternativa ao e-mail
    if (!users.fields.getByName('username')) {
      users.fields.add(
        new TextField({
          name: 'username',
          required: false,
        }),
      )
    }
    app.save(users)

    // 2. Backfill: gera username único para usuários existentes sem username
    const semUsername = app.findRecordsByFilter('users', "username = ''", '-created', 0, 0)
    semUsername.forEach((rec) => {
      if (!rec.getString('username')) {
        rec.set('username', 'user_' + rec.id.slice(0, 10))
        app.save(rec)
      }
    })

    // 3. Índice UNIQUE parcial (ignora vazios, para não colidir com quem ainda não tem username)
    const temIndice = (users.indexes || []).some((ix) =>
      String(ix).includes('idx_users_username_unique'),
    )
    if (!temIndice) {
      users.indexes.push(
        "CREATE UNIQUE INDEX `idx_users_username_unique` ON `users` (`username`) WHERE `username` != ''",
      )
    }

    // 4. Login por senha aceita e-mail OU username
    const options = users.passwordAuth
    if (options) {
      options.identityFields = ['email', 'username']
    }

    app.save(users)
  },
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    users.indexes = (users.indexes || []).filter(
      (ix) => !String(ix).includes('idx_users_username_unique'),
    )
    const options = users.passwordAuth
    if (options) {
      options.identityFields = ['email']
    }
    app.save(users)
    const f = users.fields.getByName('username')
    if (f) users.fields.removeByName('username')
    app.save(users)
  },
)
