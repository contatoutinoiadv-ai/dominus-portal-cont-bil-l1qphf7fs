/**
 * Migração 0017 — manageRule na collection `users`.
 *
 * BUG: ao usar "Redefinir Senha" na tela Equipe e Acessos, o PATCH em
 * /api/collections/users/records/{id} (que envia password/passwordConfirm)
 * respondia 400 "Failed to update record.".
 *
 * CAUSA RAIZ: no PocketBase, alterar a senha de um registro auth via API de
 * records exige `oldPassword`, EXCETO quando o requisitante é superusuário
 * OU satisfaz o `manageRule` da auth collection ("Manage API rule"). O
 * contador não é superusuário e a collection não tinha manageRule, então o
 * PocketBase rejeitava a mudança de senha (e também de e-mail de outros
 * usuários) com 400.
 *
 * CORREÇÃO: define manageRule permitindo que contadores (não excluídos,
 * ativos) gerenciem registros auth de seus clientes e de outros membros da
 * equipe — mesma política já aplicada nas demais regras da collection.
 * O próprio usuário continua sem manage sobre si mesmo (a troca da própria
 * senha segue exigindo oldPassword, proteção mantida de propósito).
 */
migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users')

    users.manageRule =
      "@request.auth.id != '' && @request.auth.role = 'contador' && " +
      "@request.auth.ativo = true && (@request.auth.deleted_at = '' || @request.auth.deleted_at = null) && " +
      "id != @request.auth.id && (@request.auth.role = 'contador' || @request.auth.role = 'cliente')"

    app.save(users)
  },
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    users.manageRule = ''
    app.save(users)
  },
)
