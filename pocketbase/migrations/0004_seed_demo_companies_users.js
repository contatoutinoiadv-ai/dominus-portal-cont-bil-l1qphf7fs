migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    const empresasCol = app.findCollectionByNameOrId('empresas')
    const enqCol = app.findCollectionByNameOrId('enquadramentos')
    const linhasCol = app.findCollectionByNameOrId('linhas_receita')
    const lancCol = app.findCollectionByNameOrId('lancamentos_faturamento')
    const folhaCol = app.findCollectionByNameOrId('folha_mensal')
    const calCol = app.findCollectionByNameOrId('calendario_fiscal')

    // 1. Contador Admin Geral (contatoutinoiadv@gmail.com)
    let contadorUser
    try {
      contadorUser = app.findAuthRecordByEmail('_pb_users_auth_', 'contatoutinoiadv@gmail.com')
      contadorUser.set('role', 'contador')
      contadorUser.set('must_change_password', false)
      contadorUser.set('lgpd_accepted', true)
      contadorUser.set('lgpd_accepted_at', '2025-01-01T10:00:00Z')
      app.save(contadorUser)
    } catch (_) {
      contadorUser = new Record(users)
      contadorUser.setEmail('contatoutinoiadv@gmail.com')
      contadorUser.setPassword('Skip@Pass')
      contadorUser.setVerified(true)
      contadorUser.set('name', 'Dr. Roberto Dominus (Contador Chefe)')
      contadorUser.set('role', 'contador')
      contadorUser.set('must_change_password', false)
      contadorUser.set('lgpd_accepted', true)
      contadorUser.set('lgpd_accepted_at', '2025-01-01T10:00:00Z')
      app.save(contadorUser)
    }

    // 2. EMPRESA 1: MEI (Artes e Confecção Express MEI)
    let empMei
    try {
      empMei = app.findFirstRecordByData('empresas', 'cnpj', '11.222.333/0001-44')
    } catch (_) {
      empMei = new Record(empresasCol)
      empMei.set('razao_social', 'Mariana Silva Confeccoes MEI')
      empMei.set('nome_fantasia', 'Artes & Estilo MEI')
      empMei.set('cnpj', '11.222.333/0001-44')
      empMei.set('municipio', 'São Paulo')
      empMei.set('uf', 'SP')
      empMei.set('email_responsavel', 'cliente.mei@dominus.com.br')
      empMei.set('telefone_responsavel', '(11) 98765-4321')
      empMei.set('data_abertura', '2023-03-15')
      empMei.set('regime_vigente', 'MEI')
      empMei.set('data_inicio_regime', '2023-03-15')
      empMei.set('limite_anual_mei', 81000)
      empMei.set('status_ativa', true)
      empMei.set('permitir_cliente_ver_comparador', true)
      app.save(empMei)
    }

    // Usuário Cliente MEI
    let userMei
    try {
      userMei = app.findAuthRecordByEmail('_pb_users_auth_', 'cliente.mei@dominus.com.br')
    } catch (_) {
      userMei = new Record(users)
      userMei.setEmail('cliente.mei@dominus.com.br')
      userMei.setPassword('Skip@Pass')
      userMei.setVerified(true)
      userMei.set('name', 'Mariana Silva (Artes & Estilo)')
      userMei.set('role', 'cliente')
      userMei.set('empresa_id', empMei.id)
      userMei.set('must_change_password', false)
      userMei.set('lgpd_accepted', true)
      userMei.set('lgpd_accepted_at', '2025-01-01T10:00:00Z')
      app.save(userMei)
    }

    // Linhas de receita MEI
    try {
      app.findFirstRecordByData('linhas_receita', 'empresa_id', empMei.id)
    } catch (_) {
      const lMei = new Record(linhasCol)
      lMei.set('empresa_id', empMei.id)
      lMei.set('nome_linha', 'Vendas de Vestuário e Acessórios')
      lMei.set('tipo_receita', 'comercio')
      lMei.set('ativo', true)
      app.save(lMei)
    }

    // 3. EMPRESA 2: SIMPLES SERVIÇOS COM FATOR R (Nexus Tecnologia e Dados LTDA)
    let empSimples
    try {
      empSimples = app.findFirstRecordByData('empresas', 'cnpj', '22.333.444/0001-55')
    } catch (_) {
      empSimples = new Record(empresasCol)
      empSimples.set('razao_social', 'Nexus Tecnologia da Informacao LTDA')
      empSimples.set('nome_fantasia', 'Nexus Data & Software')
      empSimples.set('cnpj', '22.333.444/0001-55')
      empSimples.set('municipio', 'Curitiba')
      empSimples.set('uf', 'PR')
      empSimples.set('email_responsavel', 'cliente.simples@dominus.com.br')
      empSimples.set('telefone_responsavel', '(41) 99123-8899')
      empSimples.set('data_abertura', '2021-08-10')
      empSimples.set('regime_vigente', 'Simples Nacional')
      empSimples.set('data_inicio_regime', '2021-08-10')
      empSimples.set('limite_anual_simples', 4800000)
      empSimples.set('sublimite_estadual', 3600000)
      empSimples.set('status_ativa', true)
      empSimples.set('permitir_cliente_ver_comparador', true)
      app.save(empSimples)
    }

    // Usuário Cliente Simples
    let userSimples
    try {
      userSimples = app.findAuthRecordByEmail('_pb_users_auth_', 'cliente.simples@dominus.com.br')
    } catch (_) {
      userSimples = new Record(users)
      userSimples.setEmail('cliente.simples@dominus.com.br')
      userSimples.setPassword('Skip@Pass')
      userSimples.setVerified(true)
      userSimples.set('name', 'Carlos Mendes (Nexus Tech)')
      userSimples.set('role', 'cliente')
      userSimples.set('empresa_id', empSimples.id)
      userSimples.set('must_change_password', false)
      userSimples.set('lgpd_accepted', true)
      userSimples.set('lgpd_accepted_at', '2025-01-01T10:00:00Z')
      app.save(userSimples)
    }

    // Enquadramento Simples com Fator R
    let enqSimples
    try {
      enqSimples = app.findFirstRecordByData('enquadramentos', 'empresa_id', empSimples.id)
    } catch (_) {
      enqSimples = new Record(enqCol)
      enqSimples.set('empresa_id', empSimples.id)
      enqSimples.set('regime', 'Simples Nacional')
      enqSimples.set('tipo_atividade', 'servicos')
      enqSimples.set('data_vigencia_inicio', '2024-01-01')
      enqSimples.set(
        'rotulo_enquadramento',
        'Desenvolvimento de Software, Sujeito a Fator R (Anexo III vs V)',
      )
      enqSimples.set(
        'observacoes_internas',
        'Monitorar folha mensal para garantir Fator R >= 28% e permanência no Anexo III.',
      )
      enqSimples.set('ativo', true)
      app.save(enqSimples)
    }

    // Linhas Simples
    try {
      app.findFirstRecordByData('linhas_receita', 'empresa_id', empSimples.id)
    } catch (_) {
      const l1 = new Record(linhasCol)
      l1.set('empresa_id', empSimples.id)
      l1.set('enquadramento_id', enqSimples.id)
      l1.set('nome_linha', 'Licenciamento e Desenvolvimento de Software')
      l1.set('tipo_receita', 'servicos')
      l1.set('anexo_simples', 'V')
      l1.set('sujeito_fator_r', true)
      l1.set('local_incidencia_iss', 'mesmo_municipio')
      l1.set('aliquota_municipal_iss', 0.05)
      l1.set('ativo', true)
      app.save(l1)

      const l2 = new Record(linhasCol)
      l2.set('empresa_id', empSimples.id)
      l2.set('enquadramento_id', enqSimples.id)
      l2.set('nome_linha', 'Consultoria Técnica em TI')
      l2.set('tipo_receita', 'servicos')
      l2.set('anexo_simples', 'III')
      l2.set('sujeito_fator_r', false)
      l2.set('local_incidencia_iss', 'mesmo_municipio')
      l2.set('aliquota_municipal_iss', 0.05)
      l2.set('ativo', true)
      app.save(l2)
    }

    // 4. EMPRESA 3: LUCRO PRESUMIDO (Alpha Logística e Engenharia S/A)
    let empPresumido
    try {
      empPresumido = app.findFirstRecordByData('empresas', 'cnpj', '33.444.555/0001-66')
    } catch (_) {
      empPresumido = new Record(empresasCol)
      empPresumido.set('razao_social', 'Alpha Engenharia e Consultoria LTDA')
      empPresumido.set('nome_fantasia', 'Alpha Engenharia')
      empPresumido.set('cnpj', '33.444.555/0001-66')
      empPresumido.set('municipio', 'Belo Horizonte')
      empPresumido.set('uf', 'MG')
      empPresumido.set('email_responsavel', 'cliente.presumido@dominus.com.br')
      empPresumido.set('telefone_responsavel', '(31) 98877-6655')
      empPresumido.set('data_abertura', '2019-05-20')
      empPresumido.set('regime_vigente', 'Lucro Presumido')
      empPresumido.set('data_inicio_regime', '2020-01-01')
      empPresumido.set('status_ativa', true)
      empPresumido.set('permitir_cliente_ver_comparador', true)
      app.save(empPresumido)
    }

    // Usuário Cliente Presumido
    let userPresumido
    try {
      userPresumido = app.findAuthRecordByEmail(
        '_pb_users_auth_',
        'cliente.presumido@dominus.com.br',
      )
    } catch (_) {
      userPresumido = new Record(users)
      userPresumido.setEmail('cliente.presumido@dominus.com.br')
      userPresumido.setPassword('Skip@Pass')
      userPresumido.setVerified(true)
      userPresumido.set('name', 'Eng. Fernando Rocha (Alpha Engenharia)')
      userPresumido.set('role', 'cliente')
      userPresumido.set('empresa_id', empPresumido.id)
      userPresumido.set('must_change_password', false)
      userPresumido.set('lgpd_accepted', true)
      userPresumido.set('lgpd_accepted_at', '2025-01-01T10:00:00Z')
      app.save(userPresumido)
    }

    // Linhas de receita Presumido
    try {
      app.findFirstRecordByData('linhas_receita', 'empresa_id', empPresumido.id)
    } catch (_) {
      const lp = new Record(linhasCol)
      lp.set('empresa_id', empPresumido.id)
      lp.set('nome_linha', 'Projetos de Engenharia Civil e Laudos')
      lp.set('tipo_receita', 'servicos')
      lp.set('aliquota_municipal_iss', 0.05)
      lp.set('percentual_presuncao_irpj', 0.32)
      lp.set('percentual_presuncao_csll', 0.32)
      lp.set('ativo', true)
      app.save(lp)
    }

    // 5. Histórico de faturamento de demonstração (2024 a 2025)
    // Folha mensal para Simples (assegura Fator R ~30%)
    const mesesDemonstracao = [
      {
        comp: '2024-05',
        fatMei: 5200,
        fatSimples: 45000,
        folhaSimples: 13500,
        fatPresumido: 85000,
      },
      {
        comp: '2024-06',
        fatMei: 5400,
        fatSimples: 48000,
        folhaSimples: 14400,
        fatPresumido: 90000,
      },
      {
        comp: '2024-07',
        fatMei: 5800,
        fatSimples: 50000,
        folhaSimples: 15000,
        fatPresumido: 95000,
      },
      {
        comp: '2024-08',
        fatMei: 6100,
        fatSimples: 52000,
        folhaSimples: 15600,
        fatPresumido: 92000,
      },
      {
        comp: '2024-09',
        fatMei: 5900,
        fatSimples: 55000,
        folhaSimples: 16500,
        fatPresumido: 98000,
      },
      {
        comp: '2024-10',
        fatMei: 6300,
        fatSimples: 58000,
        folhaSimples: 17400,
        fatPresumido: 105000,
      },
      {
        comp: '2024-11',
        fatMei: 6500,
        fatSimples: 60000,
        folhaSimples: 18000,
        fatPresumido: 110000,
      },
      {
        comp: '2024-12',
        fatMei: 7200,
        fatSimples: 70000,
        folhaSimples: 21000,
        fatPresumido: 130000,
      },
      {
        comp: '2025-01',
        fatMei: 5100,
        fatSimples: 50000,
        folhaSimples: 15000,
        fatPresumido: 92000,
      },
      {
        comp: '2025-02',
        fatMei: 5300,
        fatSimples: 53000,
        folhaSimples: 15900,
        fatPresumido: 96000,
      },
      {
        comp: '2025-03',
        fatMei: 5600,
        fatSimples: 56000,
        folhaSimples: 16800,
        fatPresumido: 102000,
      },
      {
        comp: '2025-04',
        fatMei: 5900,
        fatSimples: 62000,
        folhaSimples: 18600,
        fatPresumido: 115000,
      },
    ]

    mesesDemonstracao.forEach((m) => {
      // Folha Simples
      try {
        app.findFirstRecordByFilter(
          'folha_mensal',
          `empresa_id = '${empSimples.id}' && competencia = '${m.comp}'`,
        )
      } catch (_) {
        const f = new Record(folhaCol)
        f.set('empresa_id', empSimples.id)
        f.set('competencia', m.comp)
        f.set('valor_salarios', m.folhaSimples * 0.7)
        f.set('valor_pro_labore', m.folhaSimples * 0.2)
        f.set('valor_encargos', m.folhaSimples * 0.1)
        f.set('valor_total_folha', m.folhaSimples)
        f.set('origem', 'contador')
        app.save(f)
      }

      // Lancamento MEI
      try {
        app.findFirstRecordByFilter(
          'lancamentos_faturamento',
          `empresa_id = '${empMei.id}' && competencia = '${m.comp}'`,
        )
      } catch (_) {
        const l = new Record(lancCol)
        l.set('empresa_id', empMei.id)
        l.set('competencia', m.comp)
        l.set('sem_faturamento', false)
        l.set('total_faturamento_bruto', m.fatMei)
        l.set('total_notas_canceladas', 0)
        l.set('total_faturamento_liquido', m.fatMei)
        l.set('imposto_estimado', 71.6)
        l.set('aliquota_efetiva', 71.6 / m.fatMei)
        l.set('status', 'Validado')
        l.set('observacao_cliente', 'Faturamento regular apurado das vendas.')
        app.save(l)
      }

      // Lancamento Simples
      try {
        app.findFirstRecordByFilter(
          'lancamentos_faturamento',
          `empresa_id = '${empSimples.id}' && competencia = '${m.comp}'`,
        )
      } catch (_) {
        const l = new Record(lancCol)
        l.set('empresa_id', empSimples.id)
        l.set('competencia', m.comp)
        l.set('sem_faturamento', false)
        l.set('total_faturamento_bruto', m.fatSimples)
        l.set('total_notas_canceladas', 0)
        l.set('total_faturamento_liquido', m.fatSimples)
        const imp = m.fatSimples * 0.085 // ~8.5% Anexo III Faixa 3
        l.set('imposto_estimado', imp)
        l.set('aliquota_efetiva', 0.085)
        l.set('status', 'Validado')
        l.set('observacao_cliente', 'Emissão de notas fiscais de consultoria de software.')
        app.save(l)
      }

      // Lancamento Presumido
      try {
        app.findFirstRecordByFilter(
          'lancamentos_faturamento',
          `empresa_id = '${empPresumido.id}' && competencia = '${m.comp}'`,
        )
      } catch (_) {
        const l = new Record(lancCol)
        l.set('empresa_id', empPresumido.id)
        l.set('competencia', m.comp)
        l.set('sem_faturamento', false)
        l.set('total_faturamento_bruto', m.fatPresumido)
        l.set('total_notas_canceladas', 0)
        l.set('total_faturamento_liquido', m.fatPresumido)
        const imp = m.fatPresumido * 0.1633 // ~16.33% Presumido Serviços
        l.set('imposto_estimado', imp)
        l.set('aliquota_efetiva', 0.1633)
        l.set('status', 'Validado')
        l.set('observacao_cliente', 'Contratos de consultoria e projetos estruturais.')
        app.save(l)
      }
    })

    // Calendário Fiscal Inicial
    const eventosCalendario = [
      {
        comp: '2025-05',
        obrigacao: 'DAS - Simples Nacional e MEI',
        venc: '2025-05-20',
        tipo: 'das',
        desc: 'Vencimento da guia mensal do Simples Nacional e MEI',
      },
      {
        comp: '2025-05',
        obrigacao: 'DCTFWeb Mensal',
        venc: '2025-05-15',
        tipo: 'dctfweb',
        desc: 'Declaração de Débitos e Créditos Tributários Federais Previdenciários',
      },
      {
        comp: '2025-05',
        obrigacao: 'Prazo Envio de Faturamento',
        venc: '2025-05-05',
        tipo: 'envio_faturamento',
        desc: 'Data limite interna para envio do faturamento pelos clientes',
      },
    ]

    eventosCalendario.forEach((ev) => {
      try {
        app.findFirstRecordByFilter(
          'calendario_fiscal',
          `obrigacao = '${ev.obrigacao}' && competencia = '${ev.comp}'`,
        )
      } catch (_) {
        const c = new Record(calCol)
        c.set('competencia', ev.comp)
        c.set('obrigacao', ev.obrigacao)
        c.set('data_vencimento', ev.venc)
        c.set('tipo', ev.tipo)
        c.set('status', 'pendente')
        c.set('descricao', ev.desc)
        app.save(c)
      }
    })
  },
  (app) => {
    // Rollback do seed
  },
)
