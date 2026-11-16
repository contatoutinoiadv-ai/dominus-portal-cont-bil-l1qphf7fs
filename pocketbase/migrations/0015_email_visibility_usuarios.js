migrate(
  (app) => {
    // Logins do portal são geridos pelo escritório contábil: o e-mail precisa
    // aparecer na listagem/edição de usuários (PocketBase oculta o e-mail de
    // registros auth com emailVisibility=false para não-proprietários).
    app.db().newQuery('UPDATE users SET emailVisibility = 1').execute()
  },
  (app) => {
    // Reversão segura: apenas volta a ocultar e-mails.
    app.db().newQuery('UPDATE users SET emailVisibility = 0').execute()
  },
)
