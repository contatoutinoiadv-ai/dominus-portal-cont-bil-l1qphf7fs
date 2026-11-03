/// <reference path="../pb_data/types.d.ts" />

//
// 0007 — Substituição da base de demonstração pela base REAL (relatório PGDAS-D de 03/11/2026).
//
// Parte 1: exclusão LÓGICA (deleted_at) das empresas fictícias e dos dados dependentes,
//          preservando o histórico de auditoria.
// Parte 2: cadastro das 5 empresas reais (Simples Nacional, regime de caixa, mercado interno).
// Parte 3: lançamento do histórico de receita bruta (12 meses 10/2025-09/2026 + anteriores).
// Parte 4: pendências de conferência registradas nas observações internas do enquadramento,
//          nas notificações do contador e na Trilha de Auditoria.
//
// Município/UF/e-mail/responsável NÃO são preenchidos (não constam no relatório) — por isso
// os campos municipio, uf e email_responsavel da collection empresas deixam de ser
// obrigatórios, para que o contador complete depois sem inventar dados.
//

const OBS_JANEIRO =
  'Conferir: a competência 01/2026 consta R$ 0,00 na declaração PGDAS-D — confirmar se realmente não houve receita em janeiro.'

const OBS_ENQUADRAMENTO =
  'Enquadramento pendente de preenchimento: anexo do Simples Nacional, Fator R e ISS não constam no relatório PGDAS-D importado — completar em Cadastro de Empresas e Enquadramento Fiscal.'

const CONF_N_MOTA =
  'A CONFIRMAR: a declaração PGDAS-D registra R$ 3.535,49 em 06/2026 e o usuário informou 0,00 (zerado). Mantido o valor declarado; se 06/2026 for confirmado como zero, o total dos 12 meses passa a R$ 26.600,36.'

const REAL_CNPJS = [
  '61.140.152/0001-84',
  '55.418.576/0001-65',
  '54.924.383/0001-13',
  '61.214.944/0001-56',
  '19.113.126/0001-09',
]

// Cada mês: [competencia, valor (R$), origem?, status?, observacao?]
const EMPRESAS_REAIS = [
  {
    razao_social: 'MDI COMERCIO DE CAPAS E ACESSORIOS LTDA',
    cnpj: '61.140.152/0001-84',
    data_abertura: '2025-06-03',
    tipo_atividade: 'comercio',
    tipo_receita: 'comercio',
    numero_declaracao: '61140152202609001',
    pa_declaracao: '09/2026',
    total12m: 'R$ 207.463,67',
    meses: [
      ['2025-06', 0],
      ['2025-07', 0],
      ['2025-08', 7708.75],
      ['2025-09', 16545.06],
      ['2025-10', 21675.72],
      ['2025-11', 13400.0],
      ['2025-12', 6370.59],
      ['2026-01', 0, 'PGDAS-D', 'Validado', OBS_JANEIRO],
      ['2026-02', 10855.3],
      ['2026-03', 22038.15],
      ['2026-04', 20798.5],
      ['2026-05', 26959.0],
      ['2026-06', 21945.61],
      ['2026-07', 21915.0],
      ['2026-08', 22506.8],
      ['2026-09', 18999.0],
    ],
  },
  {
    razao_social: 'CLINICA ODONTO MAIS LTDA',
    cnpj: '55.418.576/0001-65',
    data_abertura: '2024-06-06',
    tipo_atividade: 'servicos',
    tipo_receita: 'servicos',
    numero_declaracao: '55418576202608001',
    pa_declaracao: '08/2026',
    total12m: 'R$ 490,00',
    meses: [
      ['2025-01', 0],
      ['2025-02', 1260.0],
      ['2025-03', 0],
      ['2025-04', 0],
      ['2025-05', 490.0],
      ['2025-06', 0],
      ['2025-07', 0],
      ['2025-08', 490.0],
      ['2025-09', 0],
      ['2025-10', 0],
      ['2025-11', 0],
      ['2025-12', 0],
      ['2026-01', 0, 'PGDAS-D', 'Validado', OBS_JANEIRO],
      ['2026-02', 490.0],
      ['2026-03', 0],
      ['2026-04', 0],
      ['2026-05', 0],
      ['2026-06', 0],
      ['2026-07', 0],
      ['2026-08', 0],
      ['2026-09', 0, 'Informado'],
    ],
  },
  {
    razao_social: 'WESLEY THIEKO DE AGUIAR KUMAGAI LTDA',
    cnpj: '54.924.383/0001-13',
    data_abertura: '2024-04-29',
    tipo_atividade: '',
    tipo_receita: 'servicos',
    numero_declaracao: '54924383202609001',
    pa_declaracao: '09/2026',
    total12m: 'R$ 550.025,92',
    meses: [
      ['2025-01', 0],
      ['2025-02', 0],
      ['2025-03', 0],
      ['2025-04', 0],
      ['2025-05', 0],
      ['2025-06', 9996.99],
      ['2025-07', 35114.57],
      ['2025-08', 34515.0],
      ['2025-09', 39515.0],
      ['2025-10', 37099.86],
      ['2025-11', 37882.99],
      ['2025-12', 48166.83],
      ['2026-01', 0, 'PGDAS-D', 'Validado', OBS_JANEIRO],
      ['2026-02', 49766.86],
      ['2026-03', 53664.61],
      ['2026-04', 62638.63],
      ['2026-05', 53356.0],
      ['2026-06', 50409.14],
      ['2026-07', 54574.0],
      ['2026-08', 52285.0],
      ['2026-09', 50182.0],
    ],
  },
  {
    razao_social: 'N. MOTA LEMOS E J. EDSON DA SILVA PAES LTDA',
    cnpj: '61.214.944/0001-56',
    data_abertura: '2025-06-09',
    tipo_atividade: '',
    tipo_receita: 'servicos',
    numero_declaracao: '61214944202606001',
    pa_declaracao: '06/2026',
    total12m: 'R$ 30.135,85',
    meses: [
      ['2025-06', 3799.6],
      ['2025-07', 6352.16],
      ['2025-08', 4971.2],
      ['2025-09', 5390.0],
      ['2025-10', 0],
      ['2025-11', 5316.28],
      ['2025-12', 3339.76],
      ['2026-01', 0, 'PGDAS-D', 'Validado', OBS_JANEIRO],
      ['2026-02', 4112.44],
      ['2026-03', 3973.0],
      ['2026-04', 5910.56],
      ['2026-05', 3948.32],
      ['2026-06', 3535.49, 'A confirmar', 'Em análise', CONF_N_MOTA],
      ['2026-07', 0, 'Informado'],
      ['2026-08', 0, 'Informado'],
      ['2026-09', 0, 'Informado'],
    ],
  },
  {
    razao_social: 'UTINOI E TSUHA ASSESSORIA E SERVICOS LTDA',
    cnpj: '19.113.126/0001-09',
    data_abertura: '2013-10-22',
    tipo_atividade: 'servicos',
    tipo_receita: 'servicos',
    numero_declaracao: '19113126202609001',
    pa_declaracao: '09/2026',
    recibo: '01.07.26293.0623706-9',
    total12m: 'R$ 198.079,42',
    meses: [
      ['2025-01', 0],
      ['2025-02', 0],
      ['2025-03', 0],
      ['2025-04', 0],
      ['2025-05', 8332.0],
      ['2025-06', 6179.5],
      ['2025-07', 6621.56],
      ['2025-08', 12848.0],
      ['2025-09', 12724.0],
      ['2025-10', 18436.0],
      ['2025-11', 16169.46],
      ['2025-12', 20119.86],
      ['2026-01', 0, 'PGDAS-D', 'Validado', OBS_JANEIRO],
      ['2026-02', 15255.0],
      ['2026-03', 15214.74],
      ['2026-04', 15195.28],
      ['2026-05', 15148.15],
      ['2026-06', 22193.0],
      ['2026-07', 17647.0],
      ['2026-08', 23348.21],
      ['2026-09', 19352.72],
    ],
  },
]

function coletarPorEmpresa(app, collection, empresaId) {
  return app.findRecordsByFilter(collection, "empresa_id = '" + empresaId + "'", '-created', 0, 0)
}

function excluirLogicamente(app, registros, agora) {
  for (const rec of registros) {
    rec.set('deleted_at', agora)
    app.save(rec)
  }
}

function excluirFisicamente(app, registros) {
  for (const rec of registros) {
    app.delete(rec)
  }
}

migrate(
  (app) => {
    const agora = new Date().toISOString()

    // ------------------------------------------------------------------
    // 0. Município/UF/e-mail deixam de ser obrigatórios (não constam no
    //    relatório PGDAS-D e o usuário pediu que fiquem em branco).
    // ------------------------------------------------------------------
    const colEmpresas = app.findCollectionByNameOrId('empresas')
    for (const nomeCampo of ['municipio', 'uf', 'email_responsavel']) {
      const campo = colEmpresas.fields.getByName(nomeCampo)
      if (campo) {
        campo.required = false
      }
    }
    app.save(colEmpresas)

    const colEnqSchema = app.findCollectionByNameOrId('enquadramentos')
    const campoAtiv = colEnqSchema.fields.getByName('tipo_atividade')
    if (campoAtiv) {
      campoAtiv.required = false
    }
    app.save(colEnqSchema)

    // ------------------------------------------------------------------
    // 1. Contador preservado (não é alterado — apenas carregado para
    //    assinar a importação).
    // ------------------------------------------------------------------
    let contador = null
    try {
      contador = app.findAuthRecordByEmail('_pb_users_auth_', 'contatoutinoiadv@gmail.com')
    } catch (_) {
      contador = null
    }
    const contadorId = contador ? contador.id : ''
    const contadorNome = contador ? contador.getString('name') : 'Contador Dominus'

    // ------------------------------------------------------------------
    // 2. Empresas fictícias: exclusão lógica + dados dependentes.
    // ------------------------------------------------------------------
    const todasEmpresas = app.findRecordsByFilter('empresas', "cnpj != ''", '-created', 0, 0)
    const demoEmpresas = todasEmpresas.filter((e) => REAL_CNPJS.indexOf(e.getString('cnpj')) === -1)

    const idsDemo = demoEmpresas.map((e) => e.id)

    for (const emp of demoEmpresas) {
      const eid = emp.id

      // Coleções com deleted_at: exclusão lógica
      excluirLogicamente(app, coletarPorEmpresa(app, 'enquadramentos', eid), agora)
      excluirLogicamente(app, coletarPorEmpresa(app, 'linhas_receita', eid), agora)
      excluirLogicamente(app, coletarPorEmpresa(app, 'lancamentos_faturamento', eid), agora)

      // Coleções sem deleted_at: exclusão física (não há convenção de soft delete)
      excluirFisicamente(app, coletarPorEmpresa(app, 'lancamento_itens', eid))
      excluirFisicamente(app, coletarPorEmpresa(app, 'folha_mensal', eid))
      excluirFisicamente(app, coletarPorEmpresa(app, 'apuracoes', eid))
      excluirFisicamente(app, coletarPorEmpresa(app, 'apuracao_detalhes', eid))
      excluirFisicamente(app, coletarPorEmpresa(app, 'documentos', eid))
      excluirFisicamente(app, coletarPorEmpresa(app, 'comentarios', eid))
      excluirFisicamente(app, coletarPorEmpresa(app, 'notificacoes', eid))
      excluirFisicamente(app, coletarPorEmpresa(app, 'calendario_fiscal', eid))

      // A própria empresa
      emp.set('deleted_at', agora)
      emp.set('status_ativa', false)
      app.save(emp)
    }

    // ------------------------------------------------------------------
    // 3. Logins de clientes fictícios: exclusão lógica (bloqueia login).
    // ------------------------------------------------------------------
    if (idsDemo.length > 0) {
      const filtroClientes = idsDemo.map((id) => "empresa_id = '" + id + "'").join(' || ')
      const clientesDemo = app.findRecordsByFilter('_pb_users_auth_', filtroClientes, '', 0, 0)
      for (const u of clientesDemo) {
        u.set('deleted_at', agora)
        u.set('ativo', false)
        app.save(u)
      }
    }

    // ------------------------------------------------------------------
    // 4. Cadastro das 5 empresas reais + enquadramento básico + linha
    //    genérica + histórico de receita bruta.
    // ------------------------------------------------------------------
    const colEnq = app.findCollectionByNameOrId('enquadramentos')
    const colLinhas = app.findCollectionByNameOrId('linhas_receita')
    const colLanc = app.findCollectionByNameOrId('lancamentos_faturamento')
    const colNotif = app.findCollectionByNameOrId('notificacoes')
    const colAud = app.findCollectionByNameOrId('auditoria')

    for (const dados of EMPRESAS_REAIS) {
      // idempotência: não recriar se o CNPJ já existir
      let empRec = null
      try {
        empRec = app.findFirstRecordByData('empresas', 'cnpj', dados.cnpj)
      } catch (_) {
        empRec = null
      }

      if (!empRec) {
        empRec = new Record(colEmpresas)
        empRec.set('razao_social', dados.razao_social)
        empRec.set('nome_fantasia', '')
        empRec.set('cnpj', dados.cnpj)
        empRec.set('municipio', '')
        empRec.set('uf', '')
        empRec.set('email_responsavel', '')
        empRec.set('telefone_responsavel', '')
        empRec.set('data_abertura', dados.data_abertura)
        empRec.set('regime_vigente', 'Simples Nacional')
        empRec.set('data_inicio_regime', dados.data_abertura)
        empRec.set('limite_anual_simples', 4800000)
        empRec.set('sublimite_estadual', 3600000)
        empRec.set('status_ativa', true)
        empRec.set('permitir_cliente_ver_comparador', true)
        empRec.set('permitir_cliente_ver_diagnostico', true)
        empRec.set('percentual_alerta_diagnostico', 10)
        empRec.set('deleted_at', '')
        app.save(empRec)
      }

      const eid = empRec.id

      // 4a. Enquadramento básico (sem inventar anexo/Fator R/ISS)
      let enqRec = null
      try {
        enqRec = app.findFirstRecordByData('enquadramentos', 'empresa_id', eid)
      } catch (_) {
        enqRec = null
      }
      if (!enqRec) {
        enqRec = new Record(colEnq)
        enqRec.set('empresa_id', eid)
        enqRec.set('regime', 'Simples Nacional')
        if (dados.tipo_atividade) {
          enqRec.set('tipo_atividade', dados.tipo_atividade)
        }
        enqRec.set('data_vigencia_inicio', dados.data_abertura)
        enqRec.set(
          'rotulo_enquadramento',
          'Simples Nacional — pendente de preenchimento (anexo/Fator R/ISS)',
        )
        let obs = OBS_ENQUADRAMENTO + ' | ' + OBS_JANEIRO
        if (dados.cnpj === '61.214.944/0001-56') {
          obs = obs + ' | ' + CONF_N_MOTA
        }
        if (dados.recibo) {
          obs = obs + ' | Recibo da declaração ' + dados.pa_declaracao + ': ' + dados.recibo
        }
        enqRec.set('observacoes_internas', obs)
        enqRec.set('ativo', true)
        enqRec.set('deleted_at', '')
        app.save(enqRec)
      }

      // 4b. Linha de receita genérica, sem anexo definido
      let linhaRec = null
      try {
        linhaRec = app.findFirstRecordByData('linhas_receita', 'empresa_id', eid)
      } catch (_) {
        linhaRec = null
      }
      if (!linhaRec) {
        linhaRec = new Record(colLinhas)
        linhaRec.set('empresa_id', eid)
        linhaRec.set('nome_linha', 'Receita bruta')
        linhaRec.set('tipo_receita', dados.tipo_receita)
        linhaRec.set('anexo_simples', 'Nenhum')
        linhaRec.set('ordem', 1)
        linhaRec.set('ativo', true)
        linhaRec.set('deleted_at', '')
        app.save(linhaRec)
      }

      // 4c. Histórico de receita bruta (origem e status conforme o relatório)
      const existentes = app.findRecordsByFilter(
        'lancamentos_faturamento',
        "empresa_id = '" + eid + "'",
        '',
        0,
        0,
      )
      if (existentes.length === 0) {
        for (const mes of dados.meses) {
          const competencia = mes[0]
          const valor = Number(mes[1])
          const origem = mes[2] || 'PGDAS-D'
          const status = mes[3] || 'Validado'
          const obs = mes[4] || ''

          const lanc = new Record(colLanc)
          lanc.set('empresa_id', eid)
          lanc.set('competencia', competencia)
          lanc.set('sem_faturamento', valor === 0)
          lanc.set('total_faturamento_bruto', valor)
          lanc.set('total_notas_canceladas', 0)
          lanc.set('total_faturamento_liquido', valor)
          lanc.set('imposto_estimado', 0)
          lanc.set('aliquota_efetiva', 0)
          lanc.set('status', status)
          lanc.set('observacao_cliente', obs)
          lanc.set('enviado_por_user_id', contadorId)
          if (status === 'Validado') {
            lanc.set('validado_por_user_id', contadorId)
            lanc.set('validado_em', agora)
          }
          lanc.set(
            'memoria_calculo_json',
            JSON.stringify({
              origem: origem,
              fonte: 'Relatório PGDAS-D de 03/11/2026 (importação inicial)',
              numero_declaracao: dados.numero_declaracao || '',
              pa_declaracao: dados.pa_declaracao || '',
              observacao_interna: obs,
            }),
          )
          lanc.set('deleted_at', '')
          app.save(lanc)
        }
      }

      // 4d. Notificações de pendência para o contador
      const notifs = [
        {
          titulo: 'Enquadramento pendente de preenchimento',
          mensagem:
            dados.razao_social +
            ' foi importada do PGDAS-D sem detalhamento de anexo, Fator R e ISS. Complete o enquadramento em Cadastro de Empresas e Enquadramento Fiscal.',
        },
        {
          titulo: 'Conferir competência 01/2026',
          mensagem:
            'A competência 01/2026 da ' +
            dados.razao_social +
            ' consta R$ 0,00 na declaração PGDAS-D. Confirme se realmente não houve receita em janeiro.',
        },
      ]
      if (dados.cnpj === '61.214.944/0001-56') {
        notifs.push({
          titulo: 'Conferir competência 06/2026 (A confirmar)',
          mensagem: CONF_N_MOTA,
        })
      }
      for (const n of notifs) {
        app.save(
          (() => {
            const rec = new Record(colNotif)
            rec.set('empresa_id', eid)
            rec.set('destinatario_role', 'contador')
            rec.set('titulo', n.titulo)
            rec.set('mensagem', n.mensagem)
            rec.set('tipo', 'geral')
            rec.set('lida', false)
            return rec
          })(),
        )
      }

      // 4e. Trilha de Auditoria — importação registrada em nome do contador
      const aud = new Record(colAud)
      aud.set('usuario_id', contadorId)
      aud.set('usuario_nome', contadorNome)
      aud.set('usuario_role', 'contador')
      aud.set('empresa_id', eid)
      aud.set('acao', 'LANCAMENTO_CRIADO')
      aud.set('entidade', 'empresas')
      aud.set('entidade_id', eid)
      aud.set(
        'detalhes',
        'IMPORTAÇÃO PGDAS-D (origem: relatório PGDAS-D de 03/11/2026): empresa ' +
          dados.razao_social +
          ' (CNPJ ' +
          dados.cnpj +
          ') cadastrada no Simples Nacional com ' +
          dados.meses.length +
          ' competências de receita bruta lançadas. Total dos 12 meses (10/2025 a 09/2026): ' +
          dados.total12m +
          '. Nº da declaração: ' +
          (dados.numero_declaracao || 'n/d') +
          '.',
      )
      app.save(aud)
    }
  },
  (app) => {
    // Importação de dados reais — sem reversão automática.
  },
)
