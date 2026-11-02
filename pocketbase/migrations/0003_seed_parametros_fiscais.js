migrate(
  (app) => {
    const paramsCol = app.findCollectionByNameOrId('parametros_fiscais')

    const parametrosIniciais = [
      {
        codigo: 'SIMPLES_2025',
        tipo: 'simples_tabela',
        descricao: 'Tabelas e Anexos I a V do Simples Nacional (LC 123/2006 atualizada)',
        vigencia_inicio: '2025-01-01',
        vigencia_fim: '2025-12-31',
        versao: '2025.1',
        ativo: true,
        conferido_pelo_contador: true,
        dados_json: JSON.stringify({
          limiteAnual: 4800000,
          sublimiteEstadual: 3600000,
          fatorRMinimo: 0.28,
          anexos: ['I', 'II', 'III', 'IV', 'V'],
        }),
      },
      {
        codigo: 'MEI_2025',
        tipo: 'mei_regras',
        descricao: 'Regras de apuração e limites do MEI 2025',
        vigencia_inicio: '2025-01-01',
        vigencia_fim: '2025-12-31',
        versao: '2025.1',
        ativo: true,
        conferido_pelo_contador: true,
        dados_json: JSON.stringify({
          limiteAnual: 81000,
          valorInss: 70.6,
          adicionalIcms: 1.0,
          adicionalIss: 5.0,
        }),
      },
      {
        codigo: 'PRESUMIDO_2025',
        tipo: 'presumido_aliquotas',
        descricao: 'Alíquotas e presunções do Lucro Presumido',
        vigencia_inicio: '2025-01-01',
        vigencia_fim: '2025-12-31',
        versao: '2025.1',
        ativo: true,
        conferido_pelo_contador: true,
        dados_json: JSON.stringify({
          irpjBase: 0.15,
          irpjAdicional: 0.1,
          limiteIsencaoAdicionalTrimestre: 60000,
          csll: 0.09,
          pisCumulativo: 0.0065,
          cofinsCumulativo: 0.03,
          presuncaoServicos: { irpj: 0.32, csll: 0.32 },
          presuncaoComercio: { irpj: 0.08, csll: 0.12 },
        }),
      },
      {
        codigo: 'REAL_2025',
        tipo: 'lucro_real_estimativa',
        descricao: 'Parâmetros para projeção simplificada do Lucro Real',
        vigencia_inicio: '2025-01-01',
        vigencia_fim: '2025-12-31',
        versao: '2025.1',
        ativo: true,
        conferido_pelo_contador: true,
        dados_json: JSON.stringify({
          margemServicos: 0.2,
          margemComercio: 0.08,
          pisNaoCumulativo: 0.0165,
          cofinsNaoCumulativo: 0.076,
          creditoPisCofinsEstimado: 0.04,
        }),
      },
      {
        codigo: 'REFORMA_TRIB_2026',
        tipo: 'reforma_tributaria',
        descricao:
          'Módulo de transição da Reforma Tributária (CBS, IBS, IS) - Desligado por padrão',
        vigencia_inicio: '2026-01-01',
        vigencia_fim: '2032-12-31',
        versao: 'EC132',
        ativo: false,
        conferido_pelo_contador: false,
        dados_json: JSON.stringify({
          habilitado: false,
          aliquotaTesteCbs: 0.009,
          aliquotaTesteIbs: 0.001,
          aliquotaImpostoSeletivo: 0.0,
        }),
      },
    ]

    parametrosIniciais.forEach((item) => {
      try {
        app.findFirstRecordByData('parametros_fiscais', 'codigo', item.codigo)
      } catch (_) {
        const rec = new Record(paramsCol)
        rec.set('codigo', item.codigo)
        rec.set('tipo', item.tipo)
        rec.set('descricao', item.descricao)
        rec.set('vigencia_inicio', item.vigencia_inicio)
        rec.set('vigencia_fim', item.vigencia_fim)
        rec.set('versao', item.versao)
        rec.set('ativo', item.ativo)
        rec.set('conferido_pelo_contador', item.conferido_pelo_contador)
        rec.set('dados_json', item.dados_json)
        app.save(rec)
      }
    })
  },
  (app) => {
    const codigos = ['SIMPLES_2025', 'MEI_2025', 'PRESUMIDO_2025', 'REAL_2025', 'REFORMA_TRIB_2026']
    codigos.forEach((cod) => {
      try {
        const rec = app.findFirstRecordByData('parametros_fiscais', 'codigo', cod)
        app.delete(rec)
      } catch (_) {}
    })
  },
)
