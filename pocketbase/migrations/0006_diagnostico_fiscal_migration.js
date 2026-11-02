migrate(
  (app) => {
    // 1. Atualizar collection 'empresas' para suportar a nova nomenclatura de diagnóstico fiscal
    // Adicionamos permitir_cliente_ver_diagnostico e percentual_alerta_diagnostico (padrão 10%)
    try {
      const empresasCol = app.findCollectionByNameOrId('empresas')

      if (!empresasCol.fields.getByName('permitir_cliente_ver_diagnostico')) {
        empresasCol.fields.add(
          new BoolField({
            name: 'permitir_cliente_ver_diagnostico',
            required: false,
          }),
        )
      }

      if (!empresasCol.fields.getByName('percentual_alerta_diagnostico')) {
        empresasCol.fields.add(
          new NumberField({
            name: 'percentual_alerta_diagnostico',
            required: false,
            min: 0,
            max: 100,
          }),
        )
      }

      app.save(empresasCol)

      // Backfill seguro e idempotente de registros existentes:
      // Copiar permitir_cliente_ver_comparador -> permitir_cliente_ver_diagnostico
      // E definir percentual_alerta_diagnostico = 10 por padrão
      try {
        app
          .db()
          .newQuery(
            `UPDATE empresas
             SET permitir_cliente_ver_diagnostico = COALESCE(permitir_cliente_ver_comparador, 1),
                 percentual_alerta_diagnostico = COALESCE(percentual_alerta_diagnostico, 10)`,
          )
          .execute()
      } catch (errDb) {
        console.log('Aviso ao sincronizar campos em empresas:', errDb)
      }
    } catch (e) {
      console.log('Erro ao atualizar collection empresas:', e)
    }

    // 2. Atualizar ou injetar frases da Voz da Dominus no intro_config
    try {
      const introCol = app.findCollectionByNameOrId('intro_config')
      const records = app.findRecordsByFilter(
        'intro_config',
        'ativo = true || ativo = false',
        '-created',
        1,
        0,
      )
      if (records && records.length > 0) {
        const introRec = records[0]
        let cenas = []
        try {
          cenas = JSON.parse(introRec.getString('cenas_json')) || []
        } catch (_) {
          cenas = []
        }

        // Grupo G3 (crescimento): "A {nome_fantasia} está crescendo, {nome}. Seu Diagnóstico Fiscal foi atualizado com a nova projeção."
        // Grupo L (Simples): "Seu Diagnóstico Fiscal está atualizado. No Simples, cada real conta, e a Dominus acompanha cada um deles."
        const temG3 = cenas.some((c) => c && c.codigo === 'G3')
        const temL = cenas.some((c) => c && c.codigo === 'L_SIMPLES')

        let alterou = false
        if (!temG3) {
          cenas.push({
            id: 7,
            codigo: 'G3',
            grupo: 'G - Crescimento',
            titulo: 'CRESCIMENTO (G3)',
            tipo: 'padrao',
            frase1: 'A {nome_fantasia} está crescendo, {nome}.',
            frase2: 'Seu Diagnóstico Fiscal foi atualizado com a nova projeção.',
            destaques: ['Diagnóstico Fiscal', 'nova projeção'],
          })
          alterou = true
        }

        if (!temL) {
          cenas.push({
            id: 8,
            codigo: 'L_SIMPLES',
            grupo: 'L - Padrão Simples',
            titulo: 'SIMPLES NACIONAL (L)',
            tipo: 'padrao',
            frase1: 'Seu Diagnóstico Fiscal está atualizado.',
            frase2: 'No Simples, cada real conta, e a Dominus acompanha cada um deles.',
            destaques: ['Diagnóstico Fiscal', 'Dominus'],
          })
          alterou = true
        }

        if (alterou) {
          introRec.set('cenas_json', JSON.stringify(cenas))
          app.save(introRec)
        }
      }
    } catch (eIntro) {
      console.log('Erro ao atualizar intro_config na migration 0006:', eIntro)
    }
  },
  (app) => {
    try {
      const empresasCol = app.findCollectionByNameOrId('empresas')
      const campoDiag = empresasCol.fields.getByName('permitir_cliente_ver_diagnostico')
      if (campoDiag) empresasCol.fields.removeByName('permitir_cliente_ver_diagnostico')
      const campoPerc = empresasCol.fields.getByName('percentual_alerta_diagnostico')
      if (campoPerc) empresasCol.fields.removeByName('percentual_alerta_diagnostico')
      app.save(empresasCol)
    } catch (_) {}
  },
)
