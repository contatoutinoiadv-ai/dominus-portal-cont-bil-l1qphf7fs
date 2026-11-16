/// <reference path="../pb_data/types.d.ts" />

//
// 0016 — Lançamento de faturamento da competência 10/2026 (informado pelo contador).
//
// 3 empresas já cadastradas (carga 0013) + 1 nova (L DE ALMEIDA CARBOLIN LTDA).
// R.M. DE A. CARBOLIN & CIA LTDA (13658367000149) permanece como está
// ("Aguardando documentação") — NÃO é a mesma empresa da nova Carbolin.
//
// Idempotente:
//   - empresas por CNPJ: update se existir, create se não;
//   - lançamentos por (empresa, competencia '2026-10'): update se existir, create se não;
//   - alerta (notificacoes) por chave fixa no campo link;
//   - auditoria: um registro por ação, chave única em detalhes (sem duplicar).
//
// Valores oficiais informados — NÃO arredondados, NÃO alterados.
//

const CNPJ_FORMATO = (d) =>
  d.length === 14
    ? `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`
    : d

const COMPETENCIA = '2026-10'

const FATURAMENTO_10_2026 = [
  { cnpj: '61140152000184', valor: 22031.35 }, // MDI COMERCIO DE CAPAS E ACESSORIOS LTDA
  { cnpj: '54924383000113', valor: 49608.0 }, // WESLEY THIEKO DE AGUIAR KUMAGAI LTDA
  { cnpj: '12892673000182', valor: 1275.0 }, // MARIA JOSI BARBOSA MENDES (Espaço Josi Mendes)
]

const NOVA_EMPRESA = {
  razao_social: 'L DE ALMEIDA CARBOLIN LTDA',
  cnpj: '67020554000121',
  valor: 23443.5,
}

const DADOS_NOVA_EMPRESA = {
  regime_vigente: 'Simples Nacional',
  regime_apuracao: 'Caixa',
  municipio: 'Campo Grande',
  uf: 'MS',
  status_ativa: true,
  deleted_at: '',
  sublimite_estadual: 3600000,
  limite_anual_simples: 4800000,
  percentual_alerta_diagnostico: 10,
  permitir_cliente_ver_comparador: true,
  permitir_cliente_ver_diagnostico: true,
  status_cadastro: 'Completo',
  // data_abertura / data_inicio_regime opcionais desde a 0013 — não preencher.
  data_abertura: '',
  data_inicio_regime: '',
}

// ---------------------------------------------------------------------------

function admin(app) {
  try {
    const col = app.findCollectionByNameOrId('users')
    const recs = app.findRecordsByFilter(col, 'email = {:email}', '', 1, 0, {
      email: 'contatoutinoiadv@gmail.com',
    })
    return recs.length > 0 ? recs[0] : null
  } catch (e) {
    console.error('0016: admin não encontrado', e)
    return null
  }
}

function upsertAuditoria(app, adminRec, dados) {
  const col = app.findCollectionByNameOrId('auditoria')
  const existentes = app.findRecordsByFilter(
    col,
    'acao = {:acao} && detalhes = {:detalhes}',
    '',
    1,
    0,
    { acao: dados.acao, detalhes: dados.detalhes },
  )
  if (existentes.length > 0) return // idempotente

  const rec = new Record(col)
  rec.set('usuario_id', adminRec ? adminRec.id : 'contatoutinoiadv@gmail.com')
  rec.set('usuario_nome', adminRec && adminRec.name ? adminRec.name : 'contatoutinoiadv@gmail.com')
  rec.set('usuario_role', 'contador')
  rec.set('empresa_id', dados.empresaId || '')
  rec.set('acao', dados.acao)
  rec.set('entidade', dados.entidade)
  rec.set('entidade_id', dados.entidadeId || '')
  rec.set('valor_novo_json', dados.valorNovo ? JSON.stringify(dados.valorNovo) : '')
  rec.set('detalhes', dados.detalhes)
  app.save(rec)
}

function upsertEmpresa(app, dados) {
  const col = app.findCollectionByNameOrId('empresas')
  const existentes = app.findRecordsByFilter(col, 'cnpj = {:cnpj}', '', 1, 0, { cnpj: dados.cnpj })

  let rec
  let criada = false
  if (existentes.length > 0) {
    rec = existentes[0]
    // Nunca reativar/alterar uma empresa existente aqui: só a nova é criada.
    return { rec, criada }
  }
  rec = new Record(col)
  criada = true

  rec.set('razao_social', dados.razao_social)
  rec.set('cnpj', dados.cnpj)
  rec.set('municipio', dados.municipio)
  rec.set('uf', dados.uf)
  rec.set('email_responsavel', dados.email_responsavel || '')
  rec.set('telefone_responsavel', dados.telefone_responsavel || '')
  rec.set('data_abertura', dados.data_abertura || '')
  rec.set('regime_vigente', dados.regime_vigente)
  rec.set('data_inicio_regime', dados.data_inicio_regime || '')
  rec.set('sublimite_estadual', dados.sublimite_estadual)
  rec.set('limite_anual_simples', dados.limite_anual_simples)
  rec.set('limite_anual_mei', dados.limite_anual_mei || 0)
  rec.set('percentual_alerta_diagnostico', dados.percentual_alerta_diagnostico)
  rec.set('permitir_cliente_ver_comparador', dados.permitir_cliente_ver_comparador)
  rec.set('permitir_cliente_ver_diagnostico', dados.permitir_cliente_ver_diagnostico)
  rec.set('status_ativa', dados.status_ativa)
  rec.set('deleted_at', dados.deleted_at)

  if (col.fields.getByName('status_cadastro')) rec.set('status_cadastro', dados.status_cadastro)
  if (col.fields.getByName('documento_pendente'))
    rec.set('documento_pendente', dados.documento_pendente || '')
  if (col.fields.getByName('tipo_pessoa')) rec.set('tipo_pessoa', dados.tipo_pessoa || '')
  if (col.fields.getByName('regime_apuracao')) rec.set('regime_apuracao', dados.regime_apuracao)

  app.save(rec)
  return { rec, criada }
}

function upsertFaturamento(app, empresaRec, competencia, valor, adminRec) {
  const col = app.findCollectionByNameOrId('lancamentos_faturamento')
  const existentes = app.findRecordsByFilter(
    col,
    'empresa_id = {:eid} && competencia = {:comp}',
    '',
    1,
    0,
    { eid: empresaRec.id, comp: competencia },
  )

  let rec
  let criado = false
  if (existentes.length > 0) {
    rec = existentes[0] // atualiza em vez de duplicar
  } else {
    rec = new Record(col)
    rec.set('empresa_id', empresaRec.id)
    rec.set('competencia', competencia)
    criado = true
  }

  rec.set('sem_faturamento', valor === 0)
  rec.set('total_faturamento_bruto', valor)
  rec.set('total_notas_canceladas', 0)
  rec.set('total_faturamento_liquido', valor)
  rec.set('imposto_estimado', 0)
  rec.set('status', 'Validado')
  rec.set('enviado_por_user_id', adminRec ? adminRec.id : '')
  rec.set('observacao_cliente', '')
  rec.set('motivo_devolucao', '')
  rec.set('deleted_at', '')
  app.save(rec)
  return criado
}

function upsertAlerta(app, empresaRec, titulo, mensagem) {
  const col = app.findCollectionByNameOrId('notificacoes')
  const chave = 'pgdasd-carga-0016:' + (empresaRec ? empresaRec.id : titulo)
  const existentes = app.findRecordsByFilter(col, 'link = {:link}', '', 1, 0, { link: chave })
  if (existentes.length > 0) {
    const rec = existentes[0]
    rec.set('titulo', titulo)
    rec.set('mensagem', mensagem)
    rec.set('lida', false)
    app.save(rec)
    return
  }

  const rec = new Record(col)
  rec.set('empresa_id', empresaRec ? empresaRec.id : '')
  rec.set('destinatario_role', 'contador')
  rec.set('titulo', titulo)
  rec.set('mensagem', mensagem)
  rec.set('tipo', 'alerta_limite')
  rec.set('lida', false)
  rec.set('link', chave)
  app.save(rec)
}

// ---------------------------------------------------------------------------

migrate(
  (app) => {
    const adminRec = admin(app)

    // ---- 1) Faturamento 10/2026 das 3 empresas existentes ---------------
    for (const f of FATURAMENTO_10_2026) {
      const colEmp = app.findCollectionByNameOrId('empresas')
      const recs = app.findRecordsByFilter(colEmp, 'cnpj = {:cnpj}', '', 1, 0, { cnpj: f.cnpj })
      if (recs.length === 0) {
        console.error('0016: empresa não encontrada para CNPJ ' + f.cnpj)
        continue
      }
      const emp = recs[0]

      const criado = upsertFaturamento(app, emp, COMPETENCIA, f.valor, adminRec)

      upsertAuditoria(app, adminRec, {
        acao: criado ? 'LANCAMENTO_CRIADO' : 'LANCAMENTO_ALTERADO',
        entidade: 'lancamentos_faturamento',
        entidadeId: '',
        empresaId: emp.id,
        valorNovo: {
          empresa_id: emp.id,
          competencia: COMPETENCIA,
          sem_faturamento: false,
          total_faturamento_bruto: f.valor,
          total_faturamento_liquido: f.valor,
          total_notas_canceladas: 0,
          imposto_estimado: 0,
          status: 'Validado',
          origem: 'Informado pelo contador/admin (competência 10/2026)',
        },
        detalhes:
          'Lançamento de faturamento 10/2026 (carga 0016): ' +
          (criado ? 'criado' : 'atualizado') +
          ' lançamento de ' +
          emp.getString('razao_social') +
          ' (CNPJ ' +
          CNPJ_FORMATO(f.cnpj) +
          ') — receita bruta R$ ' +
          f.valor.toFixed(2) +
          ', status Validado. Origem: informado pelo contador/admin.',
      })
    }

    // ---- 2) Nova empresa L DE ALMEIDA CARBOLIN LTDA ----------------------
    const { rec: carbolin, criada } = upsertEmpresa(app, {
      ...DADOS_NOVA_EMPRESA,
      razao_social: NOVA_EMPRESA.razao_social,
      cnpj: NOVA_EMPRESA.cnpj,
    })

    if (criada) {
      upsertAuditoria(app, adminRec, {
        acao: 'EMPRESA_CRIADA',
        entidade: 'empresas',
        entidadeId: carbolin.id,
        empresaId: carbolin.id,
        valorNovo: {
          razao_social: NOVA_EMPRESA.razao_social,
          cnpj: NOVA_EMPRESA.cnpj,
          regime_vigente: 'Simples Nacional',
          regime_apuracao: 'Caixa',
          municipio: 'Campo Grande',
          uf: 'MS',
          status_cadastro: 'Completo',
          status_ativa: true,
          origem: 'Informado pelo contador/admin (competência 10/2026)',
        },
        detalhes:
          'Nova empresa (carga 0016): ' +
          NOVA_EMPRESA.razao_social +
          ' (CNPJ ' +
          CNPJ_FORMATO(NOVA_EMPRESA.cnpj) +
          ') cadastrada como ativa, Simples Nacional, apuração Caixa, Campo Grande/MS, sem data de abertura/início de regime informadas (opcionais).',
      })
    }

    // ---- 3) Faturamento 10/2026 da Carbolin -----------------------------
    const criadoCarbolin = upsertFaturamento(
      app,
      carbolin,
      COMPETENCIA,
      NOVA_EMPRESA.valor,
      adminRec,
    )

    upsertAuditoria(app, adminRec, {
      acao: criadoCarbolin ? 'LANCAMENTO_CRIADO' : 'LANCAMENTO_ALTERADO',
      entidade: 'lancamentos_faturamento',
      entidadeId: '',
      empresaId: carbolin.id,
      valorNovo: {
        empresa_id: carbolin.id,
        competencia: COMPETENCIA,
        sem_faturamento: false,
        total_faturamento_bruto: NOVA_EMPRESA.valor,
        total_faturamento_liquido: NOVA_EMPRESA.valor,
        total_notas_canceladas: 0,
        imposto_estimado: 0,
        status: 'Validado',
        origem: 'Informado pelo contador/admin (competência 10/2026)',
      },
      detalhes:
        'Lançamento de faturamento 10/2026 (carga 0016): ' +
        (criadoCarbolin ? 'criado' : 'atualizado') +
        ' lançamento de ' +
        NOVA_EMPRESA.razao_social +
        ' (CNPJ ' +
        CNPJ_FORMATO(NOVA_EMPRESA.cnpj) +
        ') — receita bruta R$ ' +
        NOVA_EMPRESA.valor.toFixed(2) +
        ', status Validado. Origem: informado pelo contador/admin.',
    })

    // ---- 4) Alerta: pendente de enquadramento (Carbolin) ----------------
    upsertAlerta(
      app,
      carbolin,
      'Pendente de enquadramento — L DE ALMEIDA CARBOLIN LTDA',
      'Anexo/atividade NÃO INFORMADO. Marcar como pendente de enquadramento e definir o anexo correto do Simples Nacional.',
    )

    // ---- 5) Registro geral da carga na auditoria ------------------------
    upsertAuditoria(app, adminRec, {
      acao: 'LIMPEZA_BASE',
      entidade: 'lancamentos_faturamento',
      entidadeId: '',
      empresaId: '',
      valorNovo: null,
      detalhes:
        'Lançamento de faturamento 10/2026 (carga 0016): 4 empresas com receita bruta lançada ' +
        '(MDI COMERCIO DE CAPAS E ACESSORIOS LTDA R$ 22.031,35; WESLEY THIEKO DE AGUIAR KUMAGAI LTDA R$ 49.608,00; ' +
        'MARIA JOSI BARBOSA MENDES R$ 1.275,00; L DE ALMEIDA CARBOLIN LTDA R$ 23.443,50), todas status Validado, ' +
        'origem informada pelo contador/admin. Nova empresa L DE ALMEIDA CARBOLIN LTDA cadastrada como ativa ' +
        '(CNPJ ' +
        CNPJ_FORMATO(NOVA_EMPRESA.cnpj) +
        '), sem duplicar R.M. DE A. CARBOLIN & CIA LTDA (CNPJ 13.658.367/0001-49). ' +
        'Executada em nome de contatoutinoiadv@gmail.com.',
    })
  },
  (app) => {
    // Reversão: remove o lançamento 10/2026 da Carbolin e a empresa Carbolin
    // (somente se esta carga as criou); não toca nas demais empresas.
    try {
      const colEmp = app.findCollectionByNameOrId('empresas')
      const recs = app.findRecordsByFilter(colEmp, 'cnpj = {:cnpj}', '', 1, 0, {
        cnpj: NOVA_EMPRESA.cnpj,
      })
      for (const emp of recs) {
        for (const nomeCol of ['lancamentos_faturamento', 'lancamento_itens', 'notificacoes']) {
          try {
            const col = app.findCollectionByNameOrId(nomeCol)
            const filhos = app.findRecordsByFilter(col, 'empresa_id = {:eid}', '', 0, 0, {
              eid: emp.id,
            })
            for (const f of filhos) app.delete(f)
          } catch (e) {}
        }
        app.delete(emp)
      }
    } catch (e) {
      console.error('0016 down: falha ao reverter Carbolin', e)
    }
  },
)
