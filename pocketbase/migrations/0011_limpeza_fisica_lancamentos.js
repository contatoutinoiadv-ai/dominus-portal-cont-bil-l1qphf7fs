/// <reference path="../pb_data/types.d.ts" />

//
// 0011 — Limpeza FÍSICA de todos os lançamentos, a pedido do usuário
// ("APAGUE TAMBEM TODOS OOS LANCAMENTOS COLOCADOS" — recomeçar do zero).
//
// A rodada anterior (0010) fez exclusão LÓGICA das empresas e dos dados dependentes
// (deleted_at). Esta migração remove do banco, de vez, TODAS as linhas de:
//   lancamentos_faturamento, lancamento_itens, apuracoes, apuracao_detalhes,
//   folha_mensal, documentos, comentarios e notificacoes.
// São as coleções que representam lançamentos e seus dados dependentes — a remoção
// é por DELETE real (sem convenção de soft delete aqui), sobre qualquer registro que
// ainda exista, visível ou oculto (órfão).
//
// PRESERVADO e INTACTO:
//   - o login do administrador/contador contatoutinoiadv@gmail.com (usuários em geral),
//   - os parâmetros fiscais (parametros_fiscais),
//   - a estrutura de todas as collections,
//   - o histórico da trilha de auditoria (apenas recebe o novo evento LIMPEZA_BASE).
//
// Idempotente: um DELETE sobre tabela vazia não faz nada — é no-op em base zerada.
//

const limparFisicamente = (app, nomeColecao) => {
  if (!app.hasTable(nomeColecao)) {
    console.log('0011: ' + nomeColecao + ' não existe — nada a limpar.')
    return 0
  }
  const res = app
    .db()
    .newQuery('DELETE FROM ' + nomeColecao)
    .execute()
  return res
}

migrate(
  (app) => {
    const colecoes = [
      'apuracao_detalhes', // depende de apuracoes
      'apuracoes', // depende de lancamentos_faturamento
      'lancamento_itens', // depende de lancamentos_faturamento
      'documentos', // documentos de lançamento (e qualquer outro)
      'comentarios', // comentários ligados a lançamentos
      'notificacoes', // notificações ligadas a lançamentos/empresas
      'folha_mensal',
      'lancamentos_faturamento',
    ]

    for (const nome of colecoes) {
      limparFisicamente(app, nome)
    }
    console.log('0011: coleções de lançamentos e dependentes zeradas (DELETE físico).')

    // ------------------------------------------------------------------
    // Auditoria: novo evento LIMPEZA_BASE (em nome do admin) — a trilha
    // existente NÃO é tocada; o enum já tem LIMPEZA_BASE desde a 0010.
    // ------------------------------------------------------------------
    const colAud = app.findCollectionByNameOrId('auditoria')

    const contador = (() => {
      try {
        return app.findAuthRecordByEmail('_pb_users_auth_', 'contatoutinoiadv@gmail.com')
      } catch (_) {
        return null
      }
    })()
    const contadorId = contador ? contador.id : ''
    const contadorNome = contador ? contador.getString('name') : 'Contador Dominus'

    const aud = new Record(colAud)
    aud.set('usuario_id', contadorId)
    aud.set('usuario_nome', contadorNome)
    aud.set('usuario_role', 'contador')
    aud.set('acao', 'LIMPEZA_BASE')
    aud.set('entidade', 'lancamentos_faturamento')
    aud.set('entidade_id', '')
    aud.set(
      'detalhes',
      'LIMPEZA_BASE: exclusão FÍSICA de todos os lançamentos e dados dependentes ' +
        '(lancamentos_faturamento, lancamento_itens, apuracoes, apuracao_detalhes, folha_mensal, ' +
        'documentos, comentários e notificações ligados a lançamentos), incluindo quaisquer ' +
        'registros órfãos remanescentes, a pedido do usuário para recomeçar do zero. ' +
        'Usuários, parâmetros fiscais, estrutura das collections e o histórico da auditoria ' +
        'foram preservados intactos.',
    )
    app.save(aud)
    console.log('0011: auditoria LIMPEZA_BASE (exclusão física) registrada.')
  },
  (app) => {
    // Exclusão de dados solicitada pelo usuário — sem reversão automática.
  },
)
