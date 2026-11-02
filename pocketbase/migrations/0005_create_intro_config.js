migrate(
  (app) => {
    // Verificar se intro_config já existe
    try {
      app.findCollectionByNameOrId('intro_config')
      return // Já existe
    } catch (_) {}

    const introConfig = new Collection({
      name: 'intro_config',
      type: 'base',
      listRule: '', // Leitura pública permitida para pré-carregamento anônimo sem login
      viewRule: '', // Leitura pública permitida
      createRule: "@request.auth.id != '' && @request.auth.role = 'contador'",
      updateRule: "@request.auth.id != '' && @request.auth.role = 'contador'",
      deleteRule: "@request.auth.id != '' && @request.auth.role = 'contador'",
      fields: [
        { name: 'ativo', type: 'bool', required: false },
        { name: 'assinatura', type: 'text', required: true },
        { name: 'cor_destaque', type: 'text', required: false }, // ex: #f59e0b ou amber
        { name: 'cenas_json', type: 'text', required: true }, // JSON com as frases de cada cena
        { name: 'svg_monograma', type: 'text', required: false }, // SVG customizado do monograma
        { name: 'svg_logotipo', type: 'text', required: false }, // SVG customizado do logotipo
        { name: 'duracao_versao_curta_ms', type: 'number', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [],
    })
    app.save(introConfig)

    // Inserir registro inicial pré-configurado com os textos exatos do roteiro
    const record = new Record(introConfig)
    record.set('ativo', true)
    record.set('assinatura', 'Contabilidade que pensa à frente.')
    record.set('cor_destaque', '#f59e0b')
    record.set('duracao_versao_curta_ms', 3000)

    const cenasIniciais = [
      {
        id: 1,
        titulo: 'MARCA',
        tipo: 'monograma_e_letras',
        subtitulo: 'Contabilidade que pensa à frente.',
        destaque: 'DOMINUS',
      },
      {
        id: 2,
        titulo: 'QUEM SOMOS',
        frase1: 'Somos a Dominus.',
        frase2: 'Cuidamos do seu fisco para você cuidar do seu negócio.',
        destaques: ['Dominus', 'seu negócio'],
      },
      {
        id: 3,
        titulo: 'O QUE FAZEMOS',
        frase1: 'Contabilidade, estratégia e tecnologia sob o mesmo olhar.',
        frase2: 'Cada número da sua empresa tem dono, prazo e propósito.',
        destaques: ['estratégia e tecnologia', 'propósito'],
      },
      {
        id: 4,
        titulo: 'A DIFERENÇA',
        frase1: 'Você informa o faturamento. Nós cuidamos de todo o resto.',
        frase2: 'Em tempo real. Sem surpresas. Sem atrasos.',
        destaques: ['todo o resto', 'tempo real'],
      },
      {
        id: 5,
        titulo: 'A PROMESSA',
        frase1: 'Enquanto outros entregam guias, nós entregamos clareza.',
        frase2: 'Aqui, o empresário enxerga o próprio imposto antes de pagar.',
        destaques: ['clareza', 'antes de pagar'],
      },
      {
        id: 6,
        titulo: 'CONVITE E TRANSIÇÃO',
        frase1: 'Acesse seu painel.',
        destaques: ['seu painel'],
      },
    ]

    record.set('cenas_json', JSON.stringify(cenasIniciais))
    app.save(record)
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('intro_config')
      app.delete(col)
    } catch (_) {}
  },
)
