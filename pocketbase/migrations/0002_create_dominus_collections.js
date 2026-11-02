migrate(
  (app) => {
    // 1. empresas
    const empresas = new Collection({
      name: 'empresas',
      type: 'base',
      listRule:
        "@request.auth.id != '' && (@request.auth.role = 'contador' || @request.auth.empresa_id = id)",
      viewRule:
        "@request.auth.id != '' && (@request.auth.role = 'contador' || @request.auth.empresa_id = id)",
      createRule: "@request.auth.id != '' && @request.auth.role = 'contador'",
      updateRule: "@request.auth.id != '' && @request.auth.role = 'contador'",
      deleteRule: "@request.auth.id != '' && @request.auth.role = 'contador'",
      fields: [
        { name: 'razao_social', type: 'text', required: true },
        { name: 'nome_fantasia', type: 'text', required: false },
        { name: 'cnpj', type: 'text', required: true },
        { name: 'municipio', type: 'text', required: true },
        { name: 'uf', type: 'text', required: true },
        { name: 'email_responsavel', type: 'email', required: true },
        { name: 'telefone_responsavel', type: 'text', required: false },
        { name: 'data_abertura', type: 'text', required: true },
        {
          name: 'regime_vigente',
          type: 'select',
          values: ['MEI', 'Simples Nacional', 'Lucro Presumido', 'Lucro Real'],
          maxSelect: 1,
          required: true,
        },
        { name: 'data_inicio_regime', type: 'text', required: true },
        { name: 'sublimite_estadual', type: 'number', required: false },
        { name: 'limite_anual_mei', type: 'number', required: false },
        { name: 'limite_anual_simples', type: 'number', required: false },
        { name: 'permitir_cliente_ver_comparador', type: 'bool', required: false },
        { name: 'status_ativa', type: 'bool', required: false },
        { name: 'deleted_at', type: 'text', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_empresas_cnpj ON empresas (cnpj)',
        'CREATE INDEX idx_empresas_regime ON empresas (regime_vigente)',
      ],
    })
    app.save(empresas)

    // 2. enquadramentos (interno contador)
    const enquadramentos = new Collection({
      name: 'enquadramentos',
      type: 'base',
      listRule: "@request.auth.id != '' && @request.auth.role = 'contador'",
      viewRule: "@request.auth.id != '' && @request.auth.role = 'contador'",
      createRule: "@request.auth.id != '' && @request.auth.role = 'contador'",
      updateRule: "@request.auth.id != '' && @request.auth.role = 'contador'",
      deleteRule: "@request.auth.id != '' && @request.auth.role = 'contador'",
      fields: [
        { name: 'empresa_id', type: 'text', required: true },
        {
          name: 'regime',
          type: 'select',
          values: ['MEI', 'Simples Nacional', 'Lucro Presumido', 'Lucro Real'],
          maxSelect: 1,
          required: true,
        },
        {
          name: 'tipo_atividade',
          type: 'select',
          values: ['servicos', 'comercio', 'industria', 'mista'],
          maxSelect: 1,
          required: true,
        },
        { name: 'data_vigencia_inicio', type: 'text', required: true },
        { name: 'data_vigencia_fim', type: 'text', required: false },
        { name: 'rotulo_enquadramento', type: 'text', required: false },
        { name: 'observacoes_internas', type: 'text', required: false },
        { name: 'ativo', type: 'bool', required: false },
        { name: 'deleted_at', type: 'text', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_enquadramentos_empresa ON enquadramentos (empresa_id)'],
    })
    app.save(enquadramentos)

    // 3. linhas_receita
    const linhasReceita = new Collection({
      name: 'linhas_receita',
      type: 'base',
      listRule:
        "@request.auth.id != '' && (@request.auth.role = 'contador' || @request.auth.empresa_id = empresa_id)",
      viewRule:
        "@request.auth.id != '' && (@request.auth.role = 'contador' || @request.auth.empresa_id = empresa_id)",
      createRule: "@request.auth.id != '' && @request.auth.role = 'contador'",
      updateRule: "@request.auth.id != '' && @request.auth.role = 'contador'",
      deleteRule: "@request.auth.id != '' && @request.auth.role = 'contador'",
      fields: [
        { name: 'empresa_id', type: 'text', required: true },
        { name: 'enquadramento_id', type: 'text', required: false },
        { name: 'nome_linha', type: 'text', required: true },
        {
          name: 'tipo_receita',
          type: 'select',
          values: ['servicos', 'comercio', 'industria'],
          maxSelect: 1,
          required: true,
        },
        {
          name: 'anexo_simples',
          type: 'select',
          values: ['I', 'II', 'III', 'IV', 'V', 'Nenhum'],
          maxSelect: 1,
          required: false,
        },
        { name: 'sujeito_fator_r', type: 'bool', required: false },
        {
          name: 'local_incidencia_iss',
          type: 'select',
          values: ['mesmo_municipio', 'outro_municipio', 'exterior'],
          maxSelect: 1,
          required: false,
        },
        { name: 'municipio_outro_iss', type: 'text', required: false },
        { name: 'aliquota_outro_iss', type: 'number', required: false },
        { name: 'iss_retido_fonte', type: 'bool', required: false },
        { name: 'percentual_iss_retido', type: 'number', required: false },
        {
          name: 'icms_tratamento',
          type: 'select',
          values: ['tributado_normal', 'st', 'isento', 'monofasico'],
          maxSelect: 1,
          required: false,
        },
        {
          name: 'pis_cofins_tratamento',
          type: 'select',
          values: ['normal', 'monofasico'],
          maxSelect: 1,
          required: false,
        },
        { name: 'aliquota_municipal_iss', type: 'number', required: false },
        { name: 'percentual_presuncao_irpj', type: 'number', required: false },
        { name: 'percentual_presuncao_csll', type: 'number', required: false },
        { name: 'ordem', type: 'number', required: false },
        { name: 'ativo', type: 'bool', required: false },
        { name: 'deleted_at', type: 'text', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_linhas_receita_empresa ON linhas_receita (empresa_id)'],
    })
    app.save(linhasReceita)

    // 4. lancamentos_faturamento
    const lancamentos = new Collection({
      name: 'lancamentos_faturamento',
      type: 'base',
      listRule:
        "@request.auth.id != '' && (@request.auth.role = 'contador' || @request.auth.empresa_id = empresa_id)",
      viewRule:
        "@request.auth.id != '' && (@request.auth.role = 'contador' || @request.auth.empresa_id = empresa_id)",
      createRule:
        "@request.auth.id != '' && (@request.auth.role = 'contador' || @request.auth.empresa_id = empresa_id)",
      updateRule:
        "@request.auth.id != '' && (@request.auth.role = 'contador' || (@request.auth.empresa_id = empresa_id && (status = 'Enviado' || status = 'Devolvido para correção')))",
      deleteRule: "@request.auth.id != '' && @request.auth.role = 'contador'",
      fields: [
        { name: 'empresa_id', type: 'text', required: true },
        { name: 'competencia', type: 'text', required: true }, // YYYY-MM
        { name: 'sem_faturamento', type: 'bool', required: false },
        { name: 'total_faturamento_bruto', type: 'number', required: false },
        { name: 'total_notas_canceladas', type: 'number', required: false },
        { name: 'total_faturamento_liquido', type: 'number', required: false },
        { name: 'imposto_estimado', type: 'number', required: false },
        { name: 'aliquota_efetiva', type: 'number', required: false },
        {
          name: 'status',
          type: 'select',
          values: ['Enviado', 'Em análise', 'Validado', 'Devolvido para correção'],
          maxSelect: 1,
          required: true,
        },
        { name: 'observacao_cliente', type: 'text', required: false },
        { name: 'motivo_devolucao', type: 'text', required: false },
        {
          name: 'arquivo_comprovante',
          type: 'file',
          maxSelect: 1,
          maxSize: 10485760,
          required: false,
        },
        { name: 'enviado_por_user_id', type: 'text', required: false },
        { name: 'validado_por_user_id', type: 'text', required: false },
        { name: 'validado_em', type: 'text', required: false },
        { name: 'memoria_calculo_json', type: 'text', required: false },
        { name: 'deleted_at', type: 'text', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_lancamentos_empresa_comp ON lancamentos_faturamento (empresa_id, competencia)',
      ],
    })
    app.save(lancamentos)

    // 5. lancamento_itens
    const lancamentoItens = new Collection({
      name: 'lancamento_itens',
      type: 'base',
      listRule:
        "@request.auth.id != '' && (@request.auth.role = 'contador' || @request.auth.empresa_id = empresa_id)",
      viewRule:
        "@request.auth.id != '' && (@request.auth.role = 'contador' || @request.auth.empresa_id = empresa_id)",
      createRule:
        "@request.auth.id != '' && (@request.auth.role = 'contador' || @request.auth.empresa_id = empresa_id)",
      updateRule:
        "@request.auth.id != '' && (@request.auth.role = 'contador' || @request.auth.empresa_id = empresa_id)",
      deleteRule: "@request.auth.id != '' && @request.auth.role = 'contador'",
      fields: [
        { name: 'lancamento_id', type: 'text', required: true },
        { name: 'empresa_id', type: 'text', required: true },
        { name: 'linha_receita_id', type: 'text', required: true },
        { name: 'nome_linha', type: 'text', required: true },
        { name: 'tipo_receita', type: 'text', required: false },
        { name: 'valor_bruto', type: 'number', required: true },
        { name: 'valor_deducoes', type: 'number', required: false },
        { name: 'valor_liquido', type: 'number', required: true },
        { name: 'imposto_estimado_item', type: 'number', required: false },
        { name: 'detalhes_item_json', type: 'text', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_itens_lancamento ON lancamento_itens (lancamento_id)'],
    })
    app.save(lancamentoItens)

    // 6. folha_mensal
    const folhaMensal = new Collection({
      name: 'folha_mensal',
      type: 'base',
      listRule:
        "@request.auth.id != '' && (@request.auth.role = 'contador' || @request.auth.empresa_id = empresa_id)",
      viewRule:
        "@request.auth.id != '' && (@request.auth.role = 'contador' || @request.auth.empresa_id = empresa_id)",
      createRule:
        "@request.auth.id != '' && (@request.auth.role = 'contador' || @request.auth.empresa_id = empresa_id)",
      updateRule:
        "@request.auth.id != '' && (@request.auth.role = 'contador' || @request.auth.empresa_id = empresa_id)",
      deleteRule: "@request.auth.id != '' && @request.auth.role = 'contador'",
      fields: [
        { name: 'empresa_id', type: 'text', required: true },
        { name: 'competencia', type: 'text', required: true }, // YYYY-MM
        { name: 'valor_salarios', type: 'number', required: false },
        { name: 'valor_pro_labore', type: 'number', required: false },
        { name: 'valor_fgts', type: 'number', required: false },
        { name: 'valor_encargos', type: 'number', required: false },
        { name: 'valor_total_folha', type: 'number', required: true },
        {
          name: 'origem',
          type: 'select',
          values: ['cliente', 'contador', 'historico_importado'],
          maxSelect: 1,
          required: false,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_folha_empresa_comp ON folha_mensal (empresa_id, competencia)',
      ],
    })
    app.save(folhaMensal)

    // 7. apuracoes
    const apuracoes = new Collection({
      name: 'apuracoes',
      type: 'base',
      listRule:
        "@request.auth.id != '' && (@request.auth.role = 'contador' || @request.auth.empresa_id = empresa_id)",
      viewRule:
        "@request.auth.id != '' && (@request.auth.role = 'contador' || @request.auth.empresa_id = empresa_id)",
      createRule: "@request.auth.id != '' && @request.auth.role = 'contador'",
      updateRule: "@request.auth.id != '' && @request.auth.role = 'contador'",
      deleteRule: "@request.auth.id != '' && @request.auth.role = 'contador'",
      fields: [
        { name: 'empresa_id', type: 'text', required: true },
        { name: 'lancamento_id', type: 'text', required: false },
        { name: 'competencia', type: 'text', required: true },
        { name: 'regime', type: 'text', required: true },
        { name: 'rbt12', type: 'number', required: false },
        { name: 'folha12m', type: 'number', required: false },
        { name: 'fator_r_percentual', type: 'number', required: false },
        { name: 'fator_r_enquadrado_anexo3', type: 'bool', required: false },
        { name: 'faturamento_competencia', type: 'number', required: true },
        { name: 'imposto_total_apurado', type: 'number', required: true },
        { name: 'aliquota_efetiva', type: 'number', required: true },
        { name: 'versao_parametros', type: 'text', required: false },
        { name: 'memoria_calculo_completa', type: 'text', required: false },
        { name: 'ultrapassou_sublimite', type: 'bool', required: false },
        { name: 'ultrapassou_limite', type: 'bool', required: false },
        {
          name: 'alerta_limite_nivel',
          type: 'select',
          values: ['ok', 'atencao_70', 'alerta_85', 'critico_95', 'estouro'],
          maxSelect: 1,
          required: false,
        },
        { name: 'oficial_contador', type: 'bool', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_apuracoes_empresa_comp ON apuracoes (empresa_id, competencia)'],
    })
    app.save(apuracoes)

    // 8. apuracao_detalhes
    const apuracaoDetalhes = new Collection({
      name: 'apuracao_detalhes',
      type: 'base',
      listRule:
        "@request.auth.id != '' && (@request.auth.role = 'contador' || @request.auth.empresa_id = empresa_id)",
      viewRule:
        "@request.auth.id != '' && (@request.auth.role = 'contador' || @request.auth.empresa_id = empresa_id)",
      createRule: "@request.auth.id != '' && @request.auth.role = 'contador'",
      updateRule: "@request.auth.id != '' && @request.auth.role = 'contador'",
      deleteRule: "@request.auth.id != '' && @request.auth.role = 'contador'",
      fields: [
        { name: 'apuracao_id', type: 'text', required: true },
        { name: 'empresa_id', type: 'text', required: true },
        {
          name: 'tributo',
          type: 'select',
          values: [
            'IRPJ',
            'CSLL',
            'PIS',
            'COFINS',
            'CPP',
            'ICMS',
            'ISS',
            'DAS_TOTAL',
            'CBS',
            'IBS',
            'IS',
          ],
          maxSelect: 1,
          required: true,
        },
        { name: 'base_calculo', type: 'number', required: true },
        { name: 'aliquota_nominal', type: 'number', required: false },
        { name: 'aliquota_efetiva', type: 'number', required: true },
        { name: 'parcela_deduzir', type: 'number', required: false },
        { name: 'valor_tributo', type: 'number', required: true },
        {
          name: 'tipo_recolhimento',
          type: 'select',
          values: [
            'das_unificado',
            'guia_propria_estadual',
            'guia_propria_municipal',
            'darf_federal',
          ],
          maxSelect: 1,
          required: false,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_detalhes_apuracao ON apuracao_detalhes (apuracao_id)'],
    })
    app.save(apuracaoDetalhes)

    // 9. parametros_fiscais
    const parametros = new Collection({
      name: 'parametros_fiscais',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != '' && @request.auth.role = 'contador'",
      updateRule: "@request.auth.id != '' && @request.auth.role = 'contador'",
      deleteRule: "@request.auth.id != '' && @request.auth.role = 'contador'",
      fields: [
        { name: 'codigo', type: 'text', required: true },
        {
          name: 'tipo',
          type: 'select',
          values: [
            'simples_tabela',
            'mei_regras',
            'presumido_aliquotas',
            'lucro_real_estimativa',
            'limites_sublimites',
            'reforma_tributaria',
          ],
          maxSelect: 1,
          required: true,
        },
        { name: 'descricao', type: 'text', required: true },
        { name: 'dados_json', type: 'text', required: true },
        { name: 'vigencia_inicio', type: 'text', required: true },
        { name: 'vigencia_fim', type: 'text', required: false },
        { name: 'versao', type: 'text', required: true },
        { name: 'ativo', type: 'bool', required: false },
        { name: 'conferido_pelo_contador', type: 'bool', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_parametros_codigo_vigencia ON parametros_fiscais (codigo, vigencia_inicio)',
      ],
    })
    app.save(parametros)

    // 10. documentos
    const documentos = new Collection({
      name: 'documentos',
      type: 'base',
      listRule:
        "@request.auth.id != '' && (@request.auth.role = 'contador' || @request.auth.empresa_id = empresa_id)",
      viewRule:
        "@request.auth.id != '' && (@request.auth.role = 'contador' || @request.auth.empresa_id = empresa_id)",
      createRule:
        "@request.auth.id != '' && (@request.auth.role = 'contador' || @request.auth.empresa_id = empresa_id)",
      updateRule:
        "@request.auth.id != '' && (@request.auth.role = 'contador' || @request.auth.empresa_id = empresa_id)",
      deleteRule: "@request.auth.id != '' && @request.auth.role = 'contador'",
      fields: [
        { name: 'empresa_id', type: 'text', required: true },
        { name: 'lancamento_id', type: 'text', required: false },
        { name: 'titulo', type: 'text', required: true },
        {
          name: 'tipo',
          type: 'select',
          values: [
            'nota_fiscal_pdf',
            'xml_nfe',
            'das_guia',
            'relatorio_faturamento',
            'folha_pgto',
            'outro',
          ],
          maxSelect: 1,
          required: true,
        },
        { name: 'arquivo', type: 'file', maxSelect: 1, maxSize: 15728640, required: true },
        { name: 'competencia', type: 'text', required: false },
        {
          name: 'enviado_por_role',
          type: 'select',
          values: ['contador', 'cliente'],
          maxSelect: 1,
          required: true,
        },
        { name: 'observacao', type: 'text', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_documentos_empresa ON documentos (empresa_id)'],
    })
    app.save(documentos)

    // 11. comentarios
    const comentarios = new Collection({
      name: 'comentarios',
      type: 'base',
      listRule:
        "@request.auth.id != '' && (@request.auth.role = 'contador' || @request.auth.empresa_id = empresa_id)",
      viewRule:
        "@request.auth.id != '' && (@request.auth.role = 'contador' || @request.auth.empresa_id = empresa_id)",
      createRule:
        "@request.auth.id != '' && (@request.auth.role = 'contador' || @request.auth.empresa_id = empresa_id)",
      updateRule: "@request.auth.id != '' && @request.auth.id = autor_user_id",
      deleteRule:
        "@request.auth.id != '' && (@request.auth.role = 'contador' || @request.auth.id = autor_user_id)",
      fields: [
        { name: 'empresa_id', type: 'text', required: true },
        { name: 'lancamento_id', type: 'text', required: false },
        { name: 'autor_user_id', type: 'text', required: true },
        { name: 'autor_nome', type: 'text', required: true },
        {
          name: 'autor_role',
          type: 'select',
          values: ['contador', 'cliente'],
          maxSelect: 1,
          required: true,
        },
        { name: 'texto', type: 'text', required: true },
        { name: 'lido', type: 'bool', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_comentarios_lancamento ON comentarios (lancamento_id)'],
    })
    app.save(comentarios)

    // 12. notificacoes
    const notificacoes = new Collection({
      name: 'notificacoes',
      type: 'base',
      listRule:
        "@request.auth.id != '' && (@request.auth.role = 'contador' || destinatario_user_id = @request.auth.id || empresa_id = @request.auth.empresa_id)",
      viewRule:
        "@request.auth.id != '' && (@request.auth.role = 'contador' || destinatario_user_id = @request.auth.id || empresa_id = @request.auth.empresa_id)",
      createRule: "@request.auth.id != ''",
      updateRule:
        "@request.auth.id != '' && (@request.auth.role = 'contador' || destinatario_user_id = @request.auth.id || empresa_id = @request.auth.empresa_id)",
      deleteRule: "@request.auth.id != '' && @request.auth.role = 'contador'",
      fields: [
        { name: 'empresa_id', type: 'text', required: false },
        { name: 'destinatario_user_id', type: 'text', required: false },
        {
          name: 'destinatario_role',
          type: 'select',
          values: ['contador', 'cliente', 'todos'],
          maxSelect: 1,
          required: true,
        },
        { name: 'titulo', type: 'text', required: true },
        { name: 'mensagem', type: 'text', required: true },
        {
          name: 'tipo',
          type: 'select',
          values: [
            'faturamento_enviado',
            'faturamento_validado',
            'faturamento_devolvido',
            'lembrete_prazo',
            'alerta_limite',
            'comentario_novo',
            'geral',
          ],
          maxSelect: 1,
          required: true,
        },
        { name: 'lida', type: 'bool', required: false },
        { name: 'link', type: 'text', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_notificacoes_destinatario ON notificacoes (destinatario_user_id, lida)',
      ],
    })
    app.save(notificacoes)

    // 13. calendario_fiscal
    const calendario = new Collection({
      name: 'calendario_fiscal',
      type: 'base',
      listRule:
        "@request.auth.id != '' && (@request.auth.role = 'contador' || @request.auth.empresa_id = empresa_id)",
      viewRule:
        "@request.auth.id != '' && (@request.auth.role = 'contador' || @request.auth.empresa_id = empresa_id)",
      createRule: "@request.auth.id != '' && @request.auth.role = 'contador'",
      updateRule: "@request.auth.id != '' && @request.auth.role = 'contador'",
      deleteRule: "@request.auth.id != '' && @request.auth.role = 'contador'",
      fields: [
        { name: 'empresa_id', type: 'text', required: false }, // null para geral
        { name: 'competencia', type: 'text', required: true },
        { name: 'obrigacao', type: 'text', required: true }, // DAS, DCTFWeb, etc.
        { name: 'data_vencimento', type: 'text', required: true },
        {
          name: 'tipo',
          type: 'select',
          values: ['das', 'dctfweb', 'trimestral', 'envio_faturamento', 'interno'],
          maxSelect: 1,
          required: true,
        },
        {
          name: 'status',
          type: 'select',
          values: ['pendente', 'concluido', 'atrasado'],
          maxSelect: 1,
          required: true,
        },
        { name: 'descricao', type: 'text', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_calendario_vencimento ON calendario_fiscal (data_vencimento)'],
    })
    app.save(calendario)

    // 14. auditoria
    const auditoria = new Collection({
      name: 'auditoria',
      type: 'base',
      listRule: "@request.auth.id != '' && @request.auth.role = 'contador'",
      viewRule: "@request.auth.id != '' && @request.auth.role = 'contador'",
      createRule: "@request.auth.id != ''",
      updateRule: null, // imutável
      deleteRule: null, // imutável
      fields: [
        { name: 'usuario_id', type: 'text', required: true },
        { name: 'usuario_nome', type: 'text', required: true },
        { name: 'usuario_role', type: 'text', required: true },
        { name: 'empresa_id', type: 'text', required: false },
        {
          name: 'acao',
          type: 'select',
          values: [
            'LANCAMENTO_CRIADO',
            'LANCAMENTO_ALTERADO',
            'LANCAMENTO_VALIDADO',
            'LANCAMENTO_DEVOLVIDO',
            'LANCAMENTO_EXCLUIDO',
            'ENQUADRAMENTO_ALTERADO',
            'PARAMETRO_ALTERADO',
            'LOGIN_SUCESSO',
            'LOGIN_FALHA',
            'SENHA_ALTERADA',
            'CONSENTIMENTO_LGPD',
          ],
          maxSelect: 1,
          required: true,
        },
        { name: 'entidade', type: 'text', required: true },
        { name: 'entidade_id', type: 'text', required: false },
        { name: 'valor_anterior_json', type: 'text', required: false },
        { name: 'valor_novo_json', type: 'text', required: false },
        { name: 'detalhes', type: 'text', required: false },
        { name: 'ip_origem', type: 'text', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_auditoria_empresa ON auditoria (empresa_id, created DESC)'],
    })
    app.save(auditoria)
  },
  (app) => {
    const colNames = [
      'auditoria',
      'calendario_fiscal',
      'notificacoes',
      'comentarios',
      'documentos',
      'parametros_fiscais',
      'apuracao_detalhes',
      'apuracoes',
      'folha_mensal',
      'lancamento_itens',
      'lancamentos_faturamento',
      'linhas_receita',
      'enquadramentos',
      'empresas',
    ]
    colNames.forEach((name) => {
      try {
        const col = app.findCollectionByNameOrId(name)
        app.delete(col)
      } catch (_) {}
    })
  },
)
