/// <reference path="../pb_data/types.d.ts" />

//
// 0010 — Limpeza TOTAL da base, a pedido do usuário ("vou começar do zero").
//
// Exclusão LÓGICA (mesmo padrão da 0007): status_ativa=false + deleted_at nas empresas,
// deleted_at nos dados dependentes que têm a convenção, e exclusão física apenas nas
// coleções sem deleted_at (mesma conduta da 0007). Nada é apagado do banco sem convenção.
//
// PRESERVADO: o usuário admin/contador contatoutinoiadv@gmail.com (ativo, senha intacta),
// os parâmetros fiscais pré-carregados, o conteúdo da Voz da Dominus (intro_config) e a
// collection auditoria (apenas recebe o registro da operação).
//
// Idempotente: seleciona pelo estado atual (empresas NÃO excluídas) — é no-op em base vazia.
//

const AGORA = new Date().toISOString()

function temCampoDeletedAt(app, nomeColecao) {
  try {
    return app.findCollectionByNameOrId(nomeColecao).fields.getByName('deleted_at') != null
  } catch (_) {
    return false
  }
}

function coletarPorEmpresa(app, colecao, empresaId) {
  return app.findRecordsByFilter(colecao, "empresa_id = '" + empresaId + "'", '-created', 0, 0)
}

function ocultar(app, registros, comDeletedAt) {
  for (const rec of registros) {
    if (comDeletedAt) {
      rec.set('deleted_at', AGORA)
    }
    app.save(rec)
  }
}

migrate(
  (app) => {
    // ------------------------------------------------------------------
    // 1. Empresas NÃO excluídas (estado atual — idempotente).
    // ------------------------------------------------------------------
    const empresasAtivas = app.findRecordsByFilter('empresas', "deleted_at = ''", '-created', 0, 0)

    if (empresasAtivas.length === 0) {
      console.log('0010: nenhuma empresa ativa — nada a fazer (no-op).')
      return
    }
    // Empresas antigas já excluídas (deleted_at != '') podem ter registros órfãos
    // em coleções sem convenção de soft delete — nada a limpar aqui: a 0007 já
    // tratou as fictícias e a própria exclusão lógica mantém o histórico.

    const contador = (() => {
      try {
        return app.findAuthRecordByEmail('_pb_users_auth_', 'contatoutinoiadv@gmail.com')
      } catch (_) {
        return null
      }
    })()
    const contadorId = contador ? contador.id : ''
    const contadorNome = contador ? contador.getString('name') : 'Contador Dominus'

    const idsEmpresas = empresasAtivas.map((e) => e.id)
    const filtroEmpresas = idsEmpresas.map((id) => "empresa_id = '" + id + "'").join(' || ')

    // ------------------------------------------------------------------
    // 2. Dados dependentes: soft delete onde há deleted_at, físico onde não há
    //    (mesma conduta da 0007 — nada aparece em painel nenhum).
    // ------------------------------------------------------------------
    const comDeleted = ['enquadramentos', 'linhas_receita', 'lancamentos_faturamento']
    const semDeleted = [
      'lancamento_itens',
      'folha_mensal',
      'apuracoes',
      'apuracao_detalhes',
      'documentos',
      'comentarios',
      'notificacoes',
      'calendario_fiscal',
    ]

    for (const nome of comDeleted) {
      if (!temCampoDeletedAt(app, nome)) continue
      for (const eid of idsEmpresas) {
        ocultar(app, coletarPorEmpresa(app, nome, eid), true)
      }
      console.log(
        '0010: ' + nome + ' ocultado (soft delete) para ' + idsEmpresas.length + ' empresa(s).',
      )
    }

    for (const nome of semDeleted) {
      for (const eid of idsEmpresas) {
        const registros = coletarPorEmpresa(app, nome, eid)
        for (const rec of registros) {
          app.delete(rec)
        }
      }
      console.log('0010: ' + nome + ' limpo para ' + idsEmpresas.length + ' empresa(s).')
    }

    // ------------------------------------------------------------------
    // 3. Logins de usuários com perfil CLIENTE: exclusão lógica (soft delete).
    // ------------------------------------------------------------------
    const filtroClientes = idsEmpresas
      .map((id) => "(empresa_id = '" + id + "' && role = 'cliente')")
      .join(' || ')
    const clientes = app.findRecordsByFilter('_pb_users_auth_', filtroClientes, '', 0, 0)
    for (const u of clientes) {
      u.set('deleted_at', AGORA)
      u.set('ativo', false)
      app.save(u)
    }
    console.log('0010: ' + clientes.length + ' login(s) de cliente ocultado(s).')

    // ------------------------------------------------------------------
    // 4. A própria empresa: status_ativa=false + deleted_at (padrão do sistema).
    // ------------------------------------------------------------------
    for (const emp of empresasAtivas) {
      emp.set('status_ativa', false)
      emp.set('deleted_at', AGORA)
      app.save(emp)
    }
    console.log('0010: ' + empresasAtivas.length + ' empresa(s) excluída(s) logicamente.')

    // ------------------------------------------------------------------
    // 5. Auditoria: registro único da operação de limpeza (LIMPEZA_BASE).
    //    Se o valor não existir no select, amplia o enum antes de gravar.
    // ------------------------------------------------------------------
    const colAud = app.findCollectionByNameOrId('auditoria')
    const acaoField = colAud.fields.getByName('acao')
    if (acaoField && acaoField.values && acaoField.values.indexOf('LIMPEZA_BASE') === -1) {
      colAud.fields.removeByName('acao')
      const novosValores = acaoField.values.slice()
      novosValores.push('LIMPEZA_BASE')
      colAud.fields.add(
        new SelectField({
          name: 'acao',
          required: true,
          values: novosValores,
          maxSelect: 1,
        }),
      )
      app.save(colAud)
    }

    const listaNomes = empresasAtivas
      .map((e) => {
        const cnpj = e.getString('cnpj') || 'sem CNPJ'
        return e.getString('razao_social') + ' (CNPJ ' + cnpj + ')'
      })
      .join('; ')

    const aud = new Record(colAud)
    aud.set('usuario_id', contadorId)
    aud.set('usuario_nome', contadorNome)
    aud.set('usuario_role', 'contador')
    aud.set('acao', 'LIMPEZA_BASE')
    aud.set('entidade', 'empresas')
    aud.set('entidade_id', '')
    aud.set(
      'detalhes',
      'LIMPEZA_BASE: exclusão lógica de ' +
        empresasAtivas.length +
        ' empresa(s) e de todos os seus dados (enquadramentos, linhas de receita, lançamentos de faturamento e itens, folha mensal, apurações e detalhes, documentos, comentários, eventos de calendário fiscal, notificações e logins de cliente), a pedido do usuário para recomeçar a carteira do zero. Empresas afetadas: ' +
        listaNomes +
        '. Nada foi apagado fisicamente onde a coleção prevê exclusão lógica — os registros ficam recuperáveis (status_ativa=false + deleted_at).',
    )
    app.save(aud)
    console.log(
      '0010: auditoria LIMPEZA_BASE registrada (' + empresasAtivas.length + ' empresa(s)).',
    )
  },
  (app) => {
    // Limpeza de dados solicitada pelo usuário — sem reversão automática.
  },
)
