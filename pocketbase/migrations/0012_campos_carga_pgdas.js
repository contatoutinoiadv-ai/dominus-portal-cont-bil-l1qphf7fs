/// <reference path="../pb_data/types.d.ts" />

//
// 0012 — Campos de carga real (declarações PGDAS-D transmitidas) na collection empresas.
//
// rbt12_declarado / rbt12_declarado_pa — RBT12 EXATAMENTE como consta no último PA
//     transmitido (fonte: declaração PGDAS-D). Nunca recalculado por cima.
// rbt12_atual / rbt12_atual_pa — RBT12 do PA 10/2026 (próxima apuração), informado
//     pelo escritório.
// status_cadastro — estado da carteira: "Completo" (dados completos) ou
//     "Aguardando documentação" (empresas pendentes de PGDAS-D/DASN-SIMEI).
// documento_pendente — qual documento falta nas pendentes (texto livre).
// tipo_pessoa — distingue MEI das demais (texto livre; o regime MEI já existe no enum).
// regime_apuracao — regime de apuração: "Caixa" (padrão do escritório) ou "Competência".
//
// Idempotente: cada campo só é criado se ainda não existir.
//

const CAMPOS = [
  { nome: 'rbt12_declarado', tipo: 'number' },
  { nome: 'rbt12_declarado_pa', tipo: 'text' },
  { nome: 'rbt12_atual', tipo: 'number' },
  { nome: 'rbt12_atual_pa', tipo: 'text' },
  { nome: 'status_cadastro', tipo: 'select', values: ['Completo', 'Aguardando documentação'], maxSelect: 1 },
  { nome: 'documento_pendente', tipo: 'text' },
  { nome: 'tipo_pessoa', tipo: 'text' },
  { nome: 'regime_apuracao', tipo: 'select', values: ['Caixa', 'Competência'], maxSelect: 1 },
]

migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('empresas')

    for (const c of CAMPOS) {
      if (col.fields.getByName(c.nome)) continue

      if (c.tipo === 'number') {
        col.fields.add(new NumberField({ name: c.nome, onlyInt: false }))
      } else if (c.tipo === 'text') {
        col.fields.add(new TextField({ name: c.nome }))
      } else if (c.tipo === 'select') {
        col.fields.add(new SelectField({ name: c.nome, values: c.values, maxSelect: c.maxSelect }))
      }
    }

    app.save(col)
  },
  (app) => {
    // Reversão: remove os campos adicionados (se existirem).
    const col = app.findCollectionByNameOrId('empresas')
    for (const c of CAMPOS) {
      const f = col.fields.getByName(c.nome)
      if (f) {
        col.fields.removeByName(c.nome)
      }
    }
    app.save(col)
  },
)
