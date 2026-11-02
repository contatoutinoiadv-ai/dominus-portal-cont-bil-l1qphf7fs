/**
 * Testes Automatizados do Motor de Cálculo Tributário - Dominus Portal Contábil
 *
 * Cobre estritamente os casos exigidos pela especificação:
 * 1. Simples Nacional COM Fator R (Razão folha/RBT12 >= 28% -> enquadra Anexo III)
 * 2. Simples Nacional SEM Fator R / Fator R < 28% (enquadra Anexo V)
 * 3. Virada de Faixa no Simples Nacional (cálculo de alíquota efetiva progressiva com dedução)
 * 4. MEI com proporcionalidade de abertura e DAS fixo
 * 5. Lucro Presumido Trimestral com adicional de 10% sobre excedente
 * 6. Ultrapassagem de Sublimite Estadual (ICMS/ISS destacados para recolhimento fora do DAS)
 */

import {
  calcularSimplesNacional,
  calcularMei,
  calcularLucroPresumido,
  compararRegimesTributarios,
  PARAMETROS_VIGENTES_PADRAO,
  CalculoInput,
} from './taxEngine'

export interface TestResult {
  nome: string
  passou: boolean
  detalhes: string
}

export function executarTestesMotorTributario(): {
  todosPassaram: boolean
  resultados: TestResult[]
} {
  const resultados: TestResult[] = []

  // Teste 1: Simples Nacional COM Fator R (Razão Folha/RBT12 >= 28%)
  try {
    const inputFatorR: CalculoInput = {
      regime: 'Simples Nacional',
      competencia: '2025-05',
      rbt12: 300000, // Faixa 2
      folha12m: 90000, // 90.000 / 300.000 = 30% (>= 28% -> Anexo III)
      linhas: [
        {
          linhaId: 'l1',
          nomeLinha: 'Serviços de Desenvolvimento e Consultoria',
          tipoReceita: 'servicos',
          sujeitoFatorR: true,
          anexoSimples: 'V', // Declarado como V, mas o Fator R deve migrar para III
          valorBruto: 30000,
        },
      ],
    }

    const res = calcularSimplesNacional(inputFatorR, PARAMETROS_VIGENTES_PADRAO)
    const passouFatorR =
      res.fatorR !== undefined &&
      res.fatorR.enquadradoAnexo3 === true &&
      res.fatorR.percentual >= 0.28 &&
      res.impostoTotal > 0

    resultados.push({
      nome: '1. Simples Nacional COM Fator R (>= 28% -> migra automaticamente para Anexo III)',
      passou: passouFatorR,
      detalhes: `Razão obtida: ${(res.fatorR?.percentual ?? 0) * 100}%. Enquadrado Anexo III: ${res.fatorR?.enquadradoAnexo3}. Imposto: R$ ${res.impostoTotal.toFixed(2)}.`,
    })
  } catch (err: unknown) {
    const error = err as Error
    resultados.push({
      nome: '1. Simples Nacional COM Fator R',
      passou: false,
      detalhes: error?.message || 'Falha desconhecida',
    })
  }

  // Teste 2: Simples Nacional SEM Fator R / Fator R < 28% (mantém Anexo V)
  try {
    const inputFatorRBaixo: CalculoInput = {
      regime: 'Simples Nacional',
      competencia: '2025-05',
      rbt12: 300000,
      folha12m: 45000, // 45.000 / 300.000 = 15% (< 28% -> Anexo V)
      linhas: [
        {
          linhaId: 'l2',
          nomeLinha: 'Serviços Intelectuais',
          tipoReceita: 'servicos',
          sujeitoFatorR: true,
          anexoSimples: 'V',
          valorBruto: 30000,
        },
      ],
    }

    const res = calcularSimplesNacional(inputFatorRBaixo, PARAMETROS_VIGENTES_PADRAO)
    const manteveAnexo5 =
      res.fatorR !== undefined &&
      res.fatorR.enquadradoAnexo3 === false &&
      res.fatorR.percentual < 0.28

    resultados.push({
      nome: '2. Simples Nacional SEM Fator R / Fator R < 28% (mantém Anexo V)',
      passou: manteveAnexo5,
      detalhes: `Razão: ${(res.fatorR?.percentual ?? 0) * 100}%. Anexo III: ${res.fatorR?.enquadradoAnexo3}. Alíquota efetiva apurada: ${(res.aliquotaEfetivaGlobal * 100).toFixed(2)}%.`,
    })
  } catch (err: unknown) {
    const error = err as Error
    resultados.push({
      nome: '2. Simples Nacional SEM Fator R',
      passou: false,
      detalhes: error?.message || 'Falha',
    })
  }

  // Teste 3: Virada de Faixa do Simples Nacional (Faixa 1 até R$ 180k vs Faixa 2 com dedução)
  try {
    const inputFaixa1: CalculoInput = {
      regime: 'Simples Nacional',
      competencia: '2025-05',
      rbt12: 150000, // Faixa 1 do Anexo I (4.00% fixo sem dedução)
      linhas: [
        {
          linhaId: 'l3_1',
          nomeLinha: 'Comércio de Materiais',
          tipoReceita: 'comercio',
          anexoSimples: 'I',
          valorBruto: 10000,
        },
      ],
    }
    const res1 = calcularSimplesNacional(inputFaixa1, PARAMETROS_VIGENTES_PADRAO)

    const inputFaixa2: CalculoInput = {
      regime: 'Simples Nacional',
      competencia: '2025-05',
      rbt12: 300000, // Faixa 2 do Anexo I (7.3% nominal, dedução 5.940, efetiva = (300k*0.073 - 5940)/300k = 5.32%)
      linhas: [
        {
          linhaId: 'l3_2',
          nomeLinha: 'Comércio de Materiais',
          tipoReceita: 'comercio',
          anexoSimples: 'I',
          valorBruto: 10000,
        },
      ],
    }
    const res2 = calcularSimplesNacional(inputFaixa2, PARAMETROS_VIGENTES_PADRAO)

    // Aliq efetiva Faixa 1 deve ser exatamente 0.04 (4%)
    // Aliq efetiva Faixa 2 deve ser (300.000 * 0.073 - 5.940) / 300.000 = 0.0532 (5.32%)
    const aliq1Ok = Math.abs(res1.aliquotaEfetivaGlobal - 0.04) < 0.0001
    const aliq2Ok = Math.abs(res2.aliquotaEfetivaGlobal - 0.0532) < 0.001
    const viradaOk = aliq1Ok && aliq2Ok && res2.aliquotaEfetivaGlobal > res1.aliquotaEfetivaGlobal

    resultados.push({
      nome: '3. Virada de Faixa Simples Nacional (progressividade e dedução de parcela)',
      passou: viradaOk,
      detalhes: `Faixa 1 alíquota: ${(res1.aliquotaEfetivaGlobal * 100).toFixed(2)}% (esperado 4.00%). Faixa 2: ${(res2.aliquotaEfetivaGlobal * 100).toFixed(2)}% (esperado ~5.32%).`,
    })
  } catch (err: unknown) {
    const error = err as Error
    resultados.push({
      nome: '3. Virada de Faixa Simples Nacional',
      passou: false,
      detalhes: error?.message || 'Falha',
    })
  }

  // Teste 4: MEI com Proporcionalidade no Ano de Abertura e Alerta de Limite
  try {
    const inputMei: CalculoInput = {
      regime: 'MEI',
      competencia: '2025-05',
      mesesDesdeAbertura: 6, // 6 meses -> limite proporcional = 81.000 * (6/12) = 40.500
      rbt12: 36000, // 36.000 / 40.500 = 88.88% (deve disparar alerta_85)
      linhas: [
        {
          linhaId: 'l4',
          nomeLinha: 'Venda de Roupas',
          tipoReceita: 'comercio',
          valorBruto: 6000,
        },
      ],
      tipoAtividadeMei: 'comercio',
    }

    const resMei = calcularMei(inputMei, PARAMETROS_VIGENTES_PADRAO)
    // DAS MEI comércio = INSS 70.60 + ICMS 1.00 = 71.60
    const dasValorOk = Math.abs(resMei.impostoTotal - 71.6) < 0.01
    const alertaOk = resMei.alertas.nivelRiscoLimite === 'alerta_85'

    resultados.push({
      nome: '4. MEI com Proporcionalidade de Abertura (limite proporcional de R$ 40.500 e alerta 85%)',
      passou: dasValorOk && alertaOk,
      detalhes: `DAS apurado: R$ ${resMei.impostoTotal.toFixed(2)} (esperado 71.60). Risco: ${resMei.alertas.nivelRiscoLimite} (${resMei.alertas.percentualLimiteUtilizado.toFixed(1)}%).`,
    })
  } catch (err: unknown) {
    const error = err as Error
    resultados.push({
      nome: '4. MEI com Proporcionalidade de Abertura',
      passou: false,
      detalhes: error?.message || 'Falha',
    })
  }

  // Teste 5: Lucro Presumido Trimestral com Adicional de 10% de IRPJ
  try {
    const inputPresumido: CalculoInput = {
      regime: 'Lucro Presumido',
      competencia: '2025-05',
      rbt12: 1200000,
      linhas: [
        {
          linhaId: 'l5',
          nomeLinha: 'Honorários de Engenharia',
          tipoReceita: 'servicos',
          valorBruto: 100000, // Base Presumida 32% = R$ 32.000. Excede limite mensal de R$ 20.000 (R$ 60k trimestral)
          aliquotaMunicipalIss: 0.05,
        },
      ],
    }

    const resPresumido = calcularLucroPresumido(inputPresumido, PARAMETROS_VIGENTES_PADRAO)
    // Base IRPJ = 100.000 * 32% = 32.000
    // IRPJ Básico = 32.000 * 15% = 4.800
    // Adicional = (32.000 - 20.000) * 10% = 1.200
    // Total IRPJ = 6.000
    // CSLL = 32.000 * 9% = 2.880
    // PIS = 100.000 * 0.65% = 650
    // COFINS = 100.000 * 3.0% = 3.000
    // ISS = 100.000 * 5.0% = 5.000
    // Total Imposto = 6.000 + 2.880 + 650 + 3.000 + 5.000 = 17.530
    const irpjItem = resPresumido.detalhesTributos.find((d) => d.tributo === 'IRPJ')
    const irpjCorreto = irpjItem ? Math.abs(irpjItem.valor - 6000) < 0.1 : false
    const totalCorreto = Math.abs(resPresumido.impostoTotal - 17530) < 0.1

    resultados.push({
      nome: '5. Lucro Presumido com Adicional de IRPJ (10% sobre base mensal excedente a R$ 20.000)',
      passou: irpjCorreto && totalCorreto,
      detalhes: `IRPJ: R$ ${irpjItem?.valor.toFixed(2)} (esperado 6.000,00). Total Presumido: R$ ${resPresumido.impostoTotal.toFixed(2)} (esperado 17.530,00).`,
    })
  } catch (err: unknown) {
    const error = err as Error
    resultados.push({
      nome: '5. Lucro Presumido Trimestral',
      passou: false,
      detalhes: error?.message || 'Falha',
    })
  }

  // Teste 6: Ultrapassagem de Sublimite Estadual no Simples (> R$ 3,6M)
  try {
    const inputSublimite: CalculoInput = {
      regime: 'Simples Nacional',
      competencia: '2025-05',
      rbt12: 3800000, // Ultrapassou sublimite de R$ 3,6M mas abaixo do teto de R$ 4,8M
      linhas: [
        {
          linhaId: 'l6',
          nomeLinha: 'Prestação de Serviços Especializados',
          tipoReceita: 'servicos',
          anexoSimples: 'III',
          valorBruto: 50000,
          aliquotaMunicipalIss: 0.05,
        },
      ],
    }

    const resSublimite = calcularSimplesNacional(inputSublimite, PARAMETROS_VIGENTES_PADRAO)
    const alertouSublimite = resSublimite.alertas.ultrapassouSublimite === true
    const issForaDas = resSublimite.detalhesTributos.find(
      (d) => d.tributo === 'ISS' && d.tipoRecolhimento === 'guia_propria_municipal',
    )

    resultados.push({
      nome: '6. Ultrapassagem de Sublimite Estadual (RBT12 > R$ 3,6M -> ISS recolhido fora do DAS)',
      passou: alertouSublimite && !!issForaDas,
      detalhes: `Sublimite ultrapassado: ${alertouSublimite}. ISS com guia municipal própria: ${!!issForaDas} (R$ ${issForaDas?.valor.toFixed(2)}).`,
    })
  } catch (err: unknown) {
    const error = err as Error
    resultados.push({
      nome: '6. Ultrapassagem de Sublimite Estadual',
      passou: false,
      detalhes: error?.message || 'Falha',
    })
  }

  // Teste 7: Diagnóstico Fiscal Dominus (Simples vs Presumido vs Real com recomendação)
  try {
    const inputComp: CalculoInput = {
      regime: 'Simples Nacional',
      competencia: '2025-05',
      rbt12: 500000,
      folha12m: 160000,
      linhas: [
        {
          linhaId: 'l7',
          nomeLinha: 'Serviços de Tecnologia',
          tipoReceita: 'servicos',
          sujeitoFatorR: true,
          anexoSimples: 'III',
          valorBruto: 40000,
          aliquotaMunicipalIss: 0.05,
        },
      ],
    }

    const comp = compararRegimesTributarios(inputComp, PARAMETROS_VIGENTES_PADRAO)
    const comparouOk =
      comp.simples.impostoTotal > 0 &&
      comp.presumido.impostoTotal > 0 &&
      comp.real.impostoTotal > 0 &&
      comp.economiaAnualProjetada >= 0 &&
      ['verde', 'amarelo', 'vermelho'].includes(comp.semaforoRecomendacao)

    resultados.push({
      nome: '7. Diagnóstico Fiscal Dominus (Simples, Presumido e Real com economia identificada)',
      passou: comparouOk,
      detalhes: `Recomendado: ${comp.regimeMaisEconomico}. Economia identificada: R$ ${comp.economiaAnualProjetada.toFixed(2)}/ano. Semáforo: ${comp.semaforoRecomendacao}.`,
    })
  } catch (err: unknown) {
    const error = err as Error
    resultados.push({
      nome: '7. Diagnóstico Fiscal Dominus',
      passou: false,
      detalhes: `Falha: ${error?.message || 'erro desconhecido'}`,
    })
  }
  // Teste 8: Base de Cálculo Exclusiva de Receita Bruta (Cancelamentos/Devoluções não deduzem base nem imposto)
  try {
    const inputSemCancelamento: CalculoInput = {
      regime: 'Simples Nacional',
      competencia: '2025-05',
      rbt12: 300000,
      folha12m: 100000,
      linhas: [
        {
          linhaId: 'l8_sem',
          nomeLinha: 'Desenvolvimento e Licenciamento',
          tipoReceita: 'servicos',
          anexoSimples: 'III',
          valorBruto: 50000,
          valorDeducoes: 0,
        },
      ],
    }

    const inputComCancelamento: CalculoInput = {
      regime: 'Simples Nacional',
      competencia: '2025-05',
      rbt12: 300000,
      folha12m: 100000,
      linhas: [
        {
          linhaId: 'l8_com',
          nomeLinha: 'Desenvolvimento e Licenciamento',
          tipoReceita: 'servicos',
          anexoSimples: 'III',
          valorBruto: 50000,
          valorDeducoes: 12000, // Cancelamentos/devoluções não devem reduzir a base do cálculo fiscal
        },
      ],
    }

    const resSem = calcularSimplesNacional(inputSemCancelamento, PARAMETROS_VIGENTES_PADRAO)
    const resCom = calcularSimplesNacional(inputComCancelamento, PARAMETROS_VIGENTES_PADRAO)

    // Base de cálculo tributária em todos os tributos deve ser R$ 50.000 em ambos
    const baseIgual = resCom.detalhesTributos.every((d) => d.baseCalculo === 50000)
    const impostoInalterado = Math.abs(resSem.impostoTotal - resCom.impostoTotal) < 0.0001
    const aliquotaInalterada =
      Math.abs(resSem.aliquotaEfetivaGlobal - resCom.aliquotaEfetivaGlobal) < 0.0001

    // Memória de cálculo registra receitaBruta como base de cálculo
    const passoLinha = resCom.passosMemoria.find((p) => p.titulo.includes('Linha:'))
    const memoriaRegistrouReceitaBruta = passoLinha?.valores?.receitaBruta === 50000

    const passouRegraReceitaBruta =
      baseIgual && impostoInalterado && aliquotaInalterada && memoriaRegistrouReceitaBruta

    resultados.push({
      nome: '8. Base Fiscal = Receita Bruta (cancelamentos/devoluções não alteram base nem imposto estimado)',
      passou: passouRegraReceitaBruta,
      detalhes: `Imposto sem cancelamento: R$ ${resSem.impostoTotal.toFixed(2)}. Com cancelamento: R$ ${resCom.impostoTotal.toFixed(2)}. Alíquota: ${(resCom.aliquotaEfetivaGlobal * 100).toFixed(2)}%. Bases de cálculo tributos: ${resCom.detalhesTributos.map((d) => d.baseCalculo).join(', ')}.`,
    })
  } catch (err: unknown) {
    const error = err as Error
    resultados.push({
      nome: '8. Base Fiscal = Receita Bruta',
      passou: false,
      detalhes: error?.message || 'Falha',
    })
  }

  const todosPassaram = resultados.every((r) => r.passou)
  return { todosPassaram, resultados }
}
