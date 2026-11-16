/// <reference path="../pb_data/types.d.ts" />

//
// 0013 — Carga REAL das declarações PGDAS-D transmitidas (fonte oficial, sem arredondamentos).
//
// 11 empresas: 6 com dados completos (faturamento 01/2025–09/2026 por competência,
// RBT12 declarado do último PA e RBT12 atual do PA 10/2026) + 5 pendentes de documentação.
//
// Idempotente:
//   - empresas por CNPJ (14 dígitos, sem pontuação): update se existir, create se não;
//   - lançamentos por (empresa, competencia): update se existir, create se não;
//   - alertas (notificacoes) por chave fixa no campo link;
//   - auditoria: registra ações de importação apenas na primeira carga (chave em detalhes).
//
// Valores NÃO arredondados e NÃO alterados — exatamente como declarados.
// Zero é gravado como 0,00 (inclui os "zero complementado").
//

const CNPJ_FORMATO = (d) =>
  d.length === 14
    ? `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`
    : d

const DADOS_COMUNS = {
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
}

const PENDENTE_COMUM = {
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
  status_cadastro: 'Aguardando documentação',
}

// ---------------------------------------------------------------------------
// Empresas completas: abertura, enquadramento (linhas_receita), RBT12s,
// DAS do último PA e faturamento por competência (exato, sem arredondamento).
// ---------------------------------------------------------------------------
const EMPRESAS_COMPLETAS = [
  {
    n: 1,
    razao_social: 'CLINICA ODONTO MAIS LTDA',
    cnpj: '55418576000165',
    data_abertura: '2024-06-06',
    enquadramento: 'PENDENTE',
    rbt12_declarado: 980.0,
    rbt12_declarado_pa: '08/2026',
    rbt12_atual: 490.0,
    rbt12_atual_pa: '10/2026',
    das_ultimo_pa: 0,
    ultimo_pa: '08/2026',
    alerta_titulo: 'Pendente de enquadramento — CLINICA ODONTO MAIS LTDA',
    alerta_msg:
      'Anexo/atividade NÃO INFORMADO na declaração PGDAS-D. Marcar como pendente de enquadramento e definir o anexo correto do Simples Nacional.',
    faturamento: {
      '2025-01': 0,
      '2025-02': 1260.0,
      '2025-03': 0,
      '2025-04': 0,
      '2025-05': 490.0,
      '2025-06': 0,
      '2025-07': 0,
      '2025-08': 490.0,
      '2025-09': 0,
      '2025-10': 0,
      '2025-11': 0,
      '2025-12': 0,
      '2026-01': 0,
      '2026-02': 490.0,
      '2026-03': 0,
      '2026-04': 0,
      '2026-05': 0,
      '2026-06': 0,
      '2026-07': 0,
      '2026-08': 0,
      '2026-09': 0,
    },
  },
  {
    n: 2,
    razao_social: 'WESLEY THIEKO DE AGUIAR KUMAGAI LTDA',
    cnpj: '54924383000113',
    data_abertura: '2024-04-29',
    enquadramento: {
      nome_linha: 'Serviços — Anexo III (sem fator R)',
      tipo_receita: 'servicos',
      anexo_simples: 'III',
      sujeito_fator_r: false,
      local_incidencia_iss: 'mesmo_municipio',
      iss_retido_fonte: false,
      aliquota_municipal_iss: 0.05,
    },
    rbt12_declarado: 539358.92,
    rbt12_declarado_pa: '09/2026',
    rbt12_atual: 550025.92,
    rbt12_atual_pa: '10/2026',
    das_ultimo_pa: 5133.35,
    ultimo_pa: '09/2026',
    faturamento: {
      '2025-01': 0,
      '2025-02': 0,
      '2025-03': 0,
      '2025-04': 0,
      '2025-05': 0,
      '2025-06': 9996.99,
      '2025-07': 35114.57,
      '2025-08': 34515.0,
      '2025-09': 39515.0,
      '2025-10': 37099.86,
      '2025-11': 37882.99,
      '2025-12': 48166.83,
      '2026-01': 0,
      '2026-02': 49766.86,
      '2026-03': 53664.61,
      '2026-04': 62638.63,
      '2026-05': 53356.0,
      '2026-06': 50409.14,
      '2026-07': 54574.0,
      '2026-08': 52285.0,
      '2026-09': 50182.0,
    },
  },
  {
    n: 3,
    razao_social: 'MDI COMERCIO DE CAPAS E ACESSORIOS LTDA',
    cnpj: '61140152000184',
    data_abertura: '2025-06-03',
    enquadramento: {
      nome_linha: 'Serviços — Anexo III (sem fator R)',
      tipo_receita: 'servicos',
      anexo_simples: 'III',
      sujeito_fator_r: false,
      local_incidencia_iss: 'mesmo_municipio',
      iss_retido_fonte: false,
      aliquota_municipal_iss: 0.05,
    },
    alerta_titulo: 'Revisar enquadramento — MDI COMERCIO DE CAPAS E ACESSORIOS LTDA',
    alerta_msg:
      'Revisar enquadramento: razão social indica comércio (possível Anexo I). Declarada no Anexo III (serviços) na PGDAS-D.',
    rbt12_declarado: 205009.73,
    rbt12_declarado_pa: '09/2026',
    rbt12_atual: 207463.67,
    rbt12_atual_pa: '10/2026',
    das_ultimo_pa: 1260.47,
    ultimo_pa: '09/2026',
    faturamento: {
      '2025-06': 0,
      '2025-07': 0,
      '2025-08': 7708.75,
      '2025-09': 16545.06,
      '2025-10': 21675.72,
      '2025-11': 13400.0,
      '2025-12': 6370.59,
      '2026-01': 0,
      '2026-02': 10855.3,
      '2026-03': 22038.15,
      '2026-04': 20798.5,
      '2026-05': 26959.0,
      '2026-06': 21945.61,
      '2026-07': 21915.0,
      '2026-08': 22506.8,
      '2026-09': 18999.0,
    },
  },
  {
    n: 4,
    razao_social: 'N. MOTA LEMOS E J. EDSON DA SILVA PAES LTDA',
    cnpj: '61214944000156',
    data_abertura: '2025-06-09',
    enquadramento: {
      nome_linha: 'Serviços — Anexo III (sem fator R)',
      tipo_receita: 'servicos',
      anexo_simples: 'III',
      sujeito_fator_r: false,
      local_incidencia_iss: 'mesmo_municipio',
      iss_retido_fonte: false,
      aliquota_municipal_iss: 0.05,
    },
    alerta_titulo: 'Confirmar faturamento 07–09/2026 — N. MOTA LEMOS E J. EDSON DA SILVA PAES LTDA',
    alerta_msg:
      'Confirmar faturamento de 07 a 09/2026; declarações (PGDAS-D) não localizadas. Zero complementado gravado em 07/2026, 08/2026 e 09/2026.',
    rbt12_declarado: 47113.32,
    rbt12_declarado_pa: '06/2026',
    rbt12_atual: 30135.85,
    rbt12_atual_pa: '10/2026',
    das_ultimo_pa: 212.12,
    ultimo_pa: '06/2026',
    faturamento: {
      '2025-06': 3799.6,
      '2025-07': 6352.16,
      '2025-08': 4971.2,
      '2025-09': 5390.0,
      '2025-10': 0,
      '2025-11': 5316.28,
      '2025-12': 3339.76,
      '2026-01': 0,
      '2026-02': 4112.44,
      '2026-03': 3973.0,
      '2026-04': 5910.56,
      '2026-05': 3948.32,
      '2026-06': 3535.49,
      '2026-07': 0,
      '2026-08': 0,
      '2026-09': 0,
    },
  },
  {
    n: 5,
    razao_social: 'UTINOI E TSUHA ASSESSORIA E SERVICOS LTDA',
    cnpj: '19113126000109',
    data_abertura: '2013-10-22',
    enquadramento: {
      nome_linha: 'Serviços — Anexo III (sem fator R)',
      tipo_receita: 'servicos',
      anexo_simples: 'III',
      sujeito_fator_r: false,
      local_incidencia_iss: 'mesmo_municipio',
      iss_retido_fonte: false,
      aliquota_municipal_iss: 0.05,
    },
    rbt12_declarado: 191450.7,
    rbt12_declarado_pa: '09/2026',
    rbt12_atual: 198079.42,
    rbt12_atual_pa: '10/2026',
    das_ultimo_pa: 1221.35,
    ultimo_pa: '09/2026',
    faturamento: {
      '2025-01': 0,
      '2025-02': 0,
      '2025-03': 0,
      '2025-04': 0,
      '2025-05': 8332.0,
      '2025-06': 6179.5,
      '2025-07': 6621.56,
      '2025-08': 12848.0,
      '2025-09': 12724.0,
      '2025-10': 18436.0,
      '2025-11': 16169.46,
      '2025-12': 20119.86,
      '2026-01': 0,
      '2026-02': 15255.0,
      '2026-03': 15214.74,
      '2026-04': 15195.28,
      '2026-05': 15148.15,
      '2026-06': 22193.0,
      '2026-07': 17647.0,
      '2026-08': 23348.21,
      '2026-09': 19352.72,
    },
  },
  {
    n: 6,
    razao_social: 'MARIA JOSI BARBOSA MENDES',
    cnpj: '12892673000182',
    data_abertura: '2010-11-19',
    enquadramento: {
      nome_linha: 'Serviços — Anexo III (sem fator R)',
      tipo_receita: 'servicos',
      anexo_simples: 'III',
      sujeito_fator_r: false,
      local_incidencia_iss: 'mesmo_municipio',
      iss_retido_fonte: false,
      aliquota_municipal_iss: 0.05,
    },
    rbt12_declarado: 37040.56,
    rbt12_declarado_pa: '09/2026',
    rbt12_atual: 28094.56,
    rbt12_atual_pa: '10/2026',
    das_ultimo_pa: 82.8,
    ultimo_pa: '09/2026',
    faturamento: {
      '2025-01': 0,
      '2025-02': 0,
      '2025-03': 0,
      '2025-04': 0,
      '2025-05': 0,
      '2025-06': 2796.4,
      '2025-07': 2815.0,
      '2025-08': 8574.0,
      '2025-09': 10326.0,
      '2025-10': 5394.9,
      '2025-11': 1305.66,
      '2025-12': 2069.0,
      '2026-01': 0,
      '2026-02': 3600.0,
      '2026-03': 3000.0,
      '2026-04': 3587.0,
      '2026-05': 1360.0,
      '2026-06': 2120.0,
      '2026-07': 2210.0,
      '2026-08': 2068.0,
      '2026-09': 1380.0,
    },
  },
]

// ---------------------------------------------------------------------------
// Empresas pendentes: somente CNPJ + nome, status "Aguardando documentação".
// SEM faturamento, SEM RBT12 (campos ficam em branco/zero).
// ---------------------------------------------------------------------------
const EMPRESAS_PENDENTES = [
  {
    razao_social: 'R.M. DE A. CARBOLIN & CIA LTDA',
    cnpj: '13658367000149',
    tipo_pessoa: '',
    documento_pendente: 'PGDAS-D',
  },
  {
    razao_social: 'MAP MIX COMERCIO DE UTILIDADES LTDA',
    cnpj: '24810637000101',
    tipo_pessoa: '',
    documento_pendente: 'PGDAS-D',
  },
  {
    razao_social: 'ARAUJO E UTINOI NEGOCIOS',
    cnpj: '60686039000136',
    tipo_pessoa: '',
    documento_pendente: 'PGDAS-D',
  },
  {
    razao_social: 'NAIARA SANTOS (MEI)',
    cnpj: '61531726000145',
    tipo_pessoa: 'MEI',
    regime_vigente: 'MEI',
    limite_anual_simples: 0,
    limite_anual_mei: 81000,
    documento_pendente: 'DASN-SIMEI ou relatório mensal de receitas',
  },
  {
    razao_social: 'GILMAR GUTIERRES (MEI)',
    cnpj: '55991486000169',
    tipo_pessoa: 'MEI',
    regime_vigente: 'MEI',
    limite_anual_simples: 0,
    limite_anual_mei: 81000,
    documento_pendente: 'DASN-SIMEI ou relatório mensal de receitas',
  },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function admin(app) {
  try {
    const col = app.findCollectionByNameOrId('users')
    const recs = app.findRecordsByFilter(col, 'email = {:email}', '', 1, 0, {
      email: 'contatoutinoiadv@gmail.com',
    })
    return recs.length > 0 ? recs[0] : null
  } catch (e) {
    console.error('0013: admin não encontrado', e)
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
  } else {
    rec = new Record(col)
    criada = true
  }

  rec.set('razao_social', dados.razao_social)
  rec.set('cnpj', dados.cnpj)
  rec.set('municipio', dados.municipio)
  rec.set('uf', dados.uf)
  rec.set('email_responsavel', dados.email_responsavel || '')
  rec.set('telefone_responsavel', dados.telefone_responsavel || '')
  rec.set('data_abertura', dados.data_abertura || '')
  rec.set('regime_vigente', dados.regime_vigente)
  rec.set('data_inicio_regime', dados.data_abertura || '')
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
  if (col.fields.getByName('rbt12_declarado'))
    rec.set('rbt12_declarado', dados.rbt12_declarado || 0)
  if (col.fields.getByName('rbt12_declarado_pa'))
    rec.set('rbt12_declarado_pa', dados.rbt12_declarado_pa || '')
  if (col.fields.getByName('rbt12_atual')) rec.set('rbt12_atual', dados.rbt12_atual || 0)
  if (col.fields.getByName('rbt12_atual_pa')) rec.set('rbt12_atual_pa', dados.rbt12_atual_pa || '')

  app.save(rec)
  return { rec, criada }
}

function upsertEnquadramento(app, empresaRec) {
  const col = app.findCollectionByNameOrId('linhas_receita')
  const existentes = app.findRecordsByFilter(
    col,
    'empresa_id = {:eid} && nome_linha = {:nome}',
    '',
    1,
    0,
    { eid: empresaRec.id, nome: 'Serviços — Anexo III (sem fator R)' },
  )

  let rec
  if (existentes.length > 0) {
    rec = existentes[0]
  } else {
    rec = new Record(col)
    rec.set('empresa_id', empresaRec.id)
  }

  rec.set('nome_linha', 'Serviços — Anexo III (sem fator R)')
  rec.set('tipo_receita', 'servicos')
  rec.set('anexo_simples', 'III')
  rec.set('sujeito_fator_r', false)
  rec.set('local_incidencia_iss', 'mesmo_municipio')
  rec.set('iss_retido_fonte', false)
  rec.set('percentual_iss_retido', 0)
  rec.set('aliquota_municipal_iss', 0.05)
  rec.set('icms_tratamento', 'tributado_normal')
  rec.set('pis_cofins_tratamento', 'normal')
  rec.set('percentual_presuncao_irpj', 0.32)
  rec.set('percentual_presuncao_csll', 0.32)
  rec.set('ativo', true)
  app.save(rec)
  return rec
}

function upsertFaturamento(app, empresaRec, competencia, valor, adminRec, razaoSocial) {
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
  if (existentes.length > 0) {
    rec = existentes[0]
  } else {
    rec = new Record(col)
    rec.set('empresa_id', empresaRec.id)
    rec.set('competencia', competencia)
    rec.set('created', new Date().toISOString())
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
  app.save(rec)
}

function upsertAlerta(app, empresaRec, titulo, mensagem) {
  const col = app.findCollectionByNameOrId('notificacoes')
  const chave = 'pgdasd-carga-0013:' + (empresaRec ? empresaRec.id : titulo)
  const existentes = app.findRecordsByFilter(col, 'link = {:link}', '', 1, 0, { link: chave })
  if (existentes.length > 0) {
    // Atualiza a mensagem para o texto mais recente (idempotente).
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
// Migração
// ---------------------------------------------------------------------------
migrate(
  (app) => {
    const adminRec = admin(app)

    // ---- 6 empresas completas ------------------------------------------
    for (const e of EMPRESAS_COMPLETAS) {
      const { rec, criada } = upsertEmpresa(app, { ...DADOS_COMUNS, ...e })

      // Enquadramento (linha de receita), exceto a E1 (pendente de enquadramento).
      if (e.enquadramento !== 'PENDENTE') {
        upsertEnquadramento(app, rec)
      }

      // Faturamento por competência — idempotente por (empresa, competência).
      for (const [comp, valor] of Object.entries(e.faturamento)) {
        upsertFaturamento(app, rec, comp, valor, adminRec, e.razao_social)
      }

      upsertAuditoria(app, adminRec, {
        acao: criada ? 'EMPRESA_CRIADA' : 'EMPRESA_ALTERADA',
        entidade: 'empresas',
        entidadeId: rec.id,
        empresaId: rec.id,
        valorNovo: {
          razao_social: e.razao_social,
          cnpj: e.cnpj,
          regime_vigente: 'Simples Nacional',
          municipio: 'Campo Grande',
          uf: 'MS',
          status_cadastro: 'Completo',
          origem: 'PGDAS-D',
        },
        detalhes:
          'Importação PGDAS-D (carga 0013): ' +
          (criada ? 'criada' : 'atualizada') +
          ' empresa ' +
          e.razao_social +
          ' (CNPJ ' +
          CNPJ_FORMATO(e.cnpj) +
          '), regime ' +
          e.regime_vigente +
          ', apuração Caixa, Campo Grande/MS, RBT12 declarado (PA ' +
          e.rbt12_declarado_pa +
          ') = ' +
          e.rbt12_declarado.toFixed(2) +
          ', RBT12 atual (PA ' +
          e.rbt12_atual_pa +
          ') = ' +
          e.rbt12_atual.toFixed(2) +
          ', ' +
          Object.keys(e.faturamento).length +
          ' competências lançadas.',
      })
    }

    // ---- 5 empresas pendentes ------------------------------------------
    for (const p of EMPRESAS_PENDENTES) {
      const { rec, criada } = upsertEmpresa(app, { ...PENDENTE_COMUM, ...p })

      upsertAuditoria(app, adminRec, {
        acao: criada ? 'EMPRESA_CRIADA' : 'EMPRESA_ALTERADA',
        entidade: 'empresas',
        entidadeId: rec.id,
        empresaId: rec.id,
        valorNovo: {
          razao_social: p.razao_social,
          cnpj: p.cnpj,
          regime_vigente: p.regime_vigente || 'Simples Nacional',
          municipio: 'Campo Grande',
          uf: 'MS',
          status_cadastro: 'Aguardando documentação',
          documento_pendente: p.documento_pendente,
          origem: 'PGDAS-D',
        },
        detalhes:
          'Importação PGDAS-D (carga 0013): ' +
          (criada ? 'criada' : 'atualizada') +
          ' empresa pendente ' +
          p.razao_social +
          ' (CNPJ ' +
          CNPJ_FORMATO(p.cnpj) +
          '), status "Aguardando documentação", documento pendente: ' +
          p.documento_pendente +
          '.',
      })
    }

    // ---- Alertas ativos no painel do contador ---------------------------
    for (const e of EMPRESAS_COMPLETAS) {
      if (!e.alerta_titulo) continue
      const colEmp = app.findCollectionByNameOrId('empresas')
      const recs = app.findRecordsByFilter(colEmp, 'cnpj = {:cnpj}', '', 1, 0, { cnpj: e.cnpj })
      if (recs.length > 0) {
        upsertAlerta(app, recs[0], e.alerta_titulo, e.alerta_msg)
      }
    }
    for (const p of EMPRESAS_PENDENTES) {
      const colEmp = app.findCollectionByNameOrId('empresas')
      const recs = app.findRecordsByFilter(colEmp, 'cnpj = {:cnpj}', '', 1, 0, { cnpj: p.cnpj })
      if (recs.length > 0) {
        upsertAlerta(
          app,
          recs[0],
          'Aguardando documentação — ' + p.razao_social,
          'Documento pendente: ' +
            p.documento_pendente +
            '. Empresa cadastrada apenas com CNPJ e razão social, sem faturamento lançado.',
        )
      }
    }

    // ---- Registro geral da carga na auditoria ---------------------------
    upsertAuditoria(app, adminRec, {
      acao: 'LIMPEZA_BASE',
      entidade: 'empresas',
      entidadeId: '',
      empresaId: '',
      valorNovo: null,
      detalhes:
        'Importação PGDAS-D (carga 0013): 11 empresas cadastradas (6 completas + 5 aguardando documentação), faturamento 01/2025–09/2026 lançado por competência, RBT12 declarado e atual gravados. Origem: PGDAS-D. Executada em nome de contatoutinoiadv@gmail.com.',
    })
  },
  (app) => {
    // Reversão: remove empresas criadas com CNPJs desta carga (e dados vinculados).
    const cnpjs = EMPRESAS_COMPLETAS.map((e) => e.cnpj).concat(
      EMPRESAS_PENDENTES.map((p) => p.cnpj),
    )
    const colEmp = app.findCollectionByNameOrId('empresas')
    for (const cnpj of cnpjs) {
      const recs = app.findRecordsByFilter(colEmp, 'cnpj = {:cnpj}', '', 1, 0, { cnpj })
      for (const emp of recs) {
        for (const nomeCol of [
          'lancamentos_faturamento',
          'lancamento_itens',
          'linhas_receita',
          'notificacoes',
        ]) {
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
    }
  },
)
