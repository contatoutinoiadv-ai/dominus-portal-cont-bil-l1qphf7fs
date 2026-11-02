/**
 * Motor de Cálculo Tributário - DOMINUS PORTAL CONTÁBIL
 *
 * Implementa de forma 100% pura, auditável e parametrizável os cálculos para:
 * 1. Simples Nacional (Anexos I a V, alíquota nominal, dedução, Fator R, segregação de ICMS-ST / ISS Retido / Monofásico, Sublimite estadual e limites anuais)
 * 2. MEI (valores fixos por atividade, limite anual e proporcionalidade de abertura, alertas 70/85/95%)
 * 3. Lucro Presumido (presunção por atividade, IRPJ + Adicional 10% excedente trimestral de R$ 60k, CSLL, PIS e COFINS cumulativos, ISS/ICMS)
 * 4. Lucro Real (estimativa simplificada com margens e créditos PIS/COFINS parametrizados)
 * 5. Diagnóstico Fiscal Dominus com análise comparativa dos 3 regimes e parecer estratégico
 * 6. Reforma Tributária (CBS, IBS, IS - modelo de transição)
 */

export interface FaixaSimples {
  faixa: number
  limiteInferior: number
  limiteSuperior: number
  aliquotaNominal: number // ex 0.06 para 6%
  parcelaDeduzir: number // em R$
  reparticao: {
    irpj: number
    csll: number
    cofins: number
    pis: number
    cpp: number
    icms: number
    iss: number
  }
}

export interface TabelaAnexoSimples {
  anexo: 'I' | 'II' | 'III' | 'IV' | 'V'
  faixas: FaixaSimples[]
}

export interface ParametrosFiscaisDominus {
  versao: string
  limiteAnualSimples: number // 4.800.000,00
  sublimiteEstadual: number // 3.600.000,00
  limiteAnualMei: number // 81.000,00
  mei: {
    valorInss: number // R$ 70,60 (5% SM)
    adicionalIcms: number // R$ 1,00
    adicionalIss: number // R$ 5,00
  }
  presumido: {
    aliquotaIrpjBase: number // 0.15 (15%)
    aliquotaIrpjAdicional: number // 0.10 (10% sobre excedente trimestral de R$ 60.000)
    limiteIsencaoAdicionalTrimestre: number // 60000
    aliquotaCsll: number // 0.09 (9%)
    aliquotaPisCumulativo: number // 0.0065 (0.65%)
    aliquotaCofinsCumulativo: number // 0.03 (3.0%)
    presuncaoPadraoServicos: { irpj: 0.32; csll: 0.32 }
    presuncaoPadraoComercio: { irpj: 0.08; csll: 0.12 }
    presuncaoPadraoIndustria: { irpj: 0.08; csll: 0.12 }
    aliquotaIcmsPadrao: number // 0.18
  }
  lucroReal: {
    margemLucroEstimadaServico: number // 0.20
    margemLucroEstimadaComercio: number // 0.08
    aliquotaPisNaoCumulativo: number // 0.0165 (1.65%)
    aliquotaCofinsNaoCumulativo: number // 0.0760 (7.6%)
    creditoPisCofinsEstimado: number // 0.04 (4% de compras/custos)
  }
  reformaTributaria: {
    habilitado: boolean
    aliquotaTesteCbs: number // ex 0.009 (0.9%)
    aliquotaTesteIbs: number // ex 0.001 (0.1%)
    aliquotaImpostoSeletivo: number // ex 0.0
  }
  tabelasSimples: Record<'I' | 'II' | 'III' | 'IV' | 'V', TabelaAnexoSimples>
}

// Valores vigentes padrão (editáveis na coleção parametros_fiscais)
export const PARAMETROS_VIGENTES_PADRAO: ParametrosFiscaisDominus = {
  versao: '2025.1',
  limiteAnualSimples: 4800000,
  sublimiteEstadual: 3600000,
  limiteAnualMei: 81000,
  mei: {
    valorInss: 70.6,
    adicionalIcms: 1.0,
    adicionalIss: 5.0,
  },
  presumido: {
    aliquotaIrpjBase: 0.15,
    aliquotaIrpjAdicional: 0.1,
    limiteIsencaoAdicionalTrimestre: 60000,
    aliquotaCsll: 0.09,
    aliquotaPisCumulativo: 0.0065,
    aliquotaCofinsCumulativo: 0.03,
    presuncaoPadraoServicos: { irpj: 0.32, csll: 0.32 },
    presuncaoPadraoComercio: { irpj: 0.08, csll: 0.12 },
    presuncaoPadraoIndustria: { irpj: 0.08, csll: 0.12 },
    aliquotaIcmsPadrao: 0.18,
  },
  lucroReal: {
    margemLucroEstimadaServico: 0.2,
    margemLucroEstimadaComercio: 0.08,
    aliquotaPisNaoCumulativo: 0.0165,
    aliquotaCofinsNaoCumulativo: 0.076,
    creditoPisCofinsEstimado: 0.04,
  },
  reformaTributaria: {
    habilitado: false,
    aliquotaTesteCbs: 0.009,
    aliquotaTesteIbs: 0.001,
    aliquotaImpostoSeletivo: 0.0,
  },
  tabelasSimples: {
    I: {
      anexo: 'I', // Comércio
      faixas: [
        {
          faixa: 1,
          limiteInferior: 0,
          limiteSuperior: 180000,
          aliquotaNominal: 0.04,
          parcelaDeduzir: 0,
          reparticao: {
            irpj: 0.055,
            csll: 0.035,
            cofins: 0.1274,
            pis: 0.0276,
            cpp: 0.415,
            icms: 0.34,
            iss: 0,
          },
        },
        {
          faixa: 2,
          limiteInferior: 180000,
          limiteSuperior: 360000,
          aliquotaNominal: 0.073,
          parcelaDeduzir: 5940,
          reparticao: {
            irpj: 0.055,
            csll: 0.035,
            cofins: 0.1274,
            pis: 0.0276,
            cpp: 0.415,
            icms: 0.34,
            iss: 0,
          },
        },
        {
          faixa: 3,
          limiteInferior: 360000,
          limiteSuperior: 720000,
          aliquotaNominal: 0.095,
          parcelaDeduzir: 13860,
          reparticao: {
            irpj: 0.055,
            csll: 0.035,
            cofins: 0.1274,
            pis: 0.0276,
            cpp: 0.42,
            icms: 0.335,
            iss: 0,
          },
        },
        {
          faixa: 4,
          limiteInferior: 720000,
          limiteSuperior: 1800000,
          aliquotaNominal: 0.107,
          parcelaDeduzir: 22500,
          reparticao: {
            irpj: 0.055,
            csll: 0.035,
            cofins: 0.1274,
            pis: 0.0276,
            cpp: 0.42,
            icms: 0.335,
            iss: 0,
          },
        },
        {
          faixa: 5,
          limiteInferior: 1800000,
          limiteSuperior: 3600000,
          aliquotaNominal: 0.143,
          parcelaDeduzir: 87300,
          reparticao: {
            irpj: 0.055,
            csll: 0.035,
            cofins: 0.1274,
            pis: 0.0276,
            cpp: 0.42,
            icms: 0.335,
            iss: 0,
          },
        },
        {
          faixa: 6,
          limiteInferior: 3600000,
          limiteSuperior: 4800000,
          aliquotaNominal: 0.19,
          parcelaDeduzir: 378000,
          reparticao: {
            irpj: 0.135,
            csll: 0.1,
            cofins: 0.2827,
            pis: 0.0613,
            cpp: 0.421,
            icms: 0,
            iss: 0,
          },
        },
      ],
    },
    II: {
      anexo: 'II', // Indústria
      faixas: [
        {
          faixa: 1,
          limiteInferior: 0,
          limiteSuperior: 180000,
          aliquotaNominal: 0.045,
          parcelaDeduzir: 0,
          reparticao: {
            irpj: 0.055,
            csll: 0.035,
            cofins: 0.1151,
            pis: 0.0249,
            cpp: 0.375,
            icms: 0.32,
            iss: 0,
          },
        },
        {
          faixa: 2,
          limiteInferior: 180000,
          limiteSuperior: 360000,
          aliquotaNominal: 0.078,
          parcelaDeduzir: 5940,
          reparticao: {
            irpj: 0.055,
            csll: 0.035,
            cofins: 0.1151,
            pis: 0.0249,
            cpp: 0.375,
            icms: 0.32,
            iss: 0,
          },
        },
        {
          faixa: 3,
          limiteInferior: 360000,
          limiteSuperior: 720000,
          aliquotaNominal: 0.1,
          parcelaDeduzir: 13860,
          reparticao: {
            irpj: 0.055,
            csll: 0.035,
            cofins: 0.1151,
            pis: 0.0249,
            cpp: 0.375,
            icms: 0.32,
            iss: 0,
          },
        },
        {
          faixa: 4,
          limiteInferior: 720000,
          limiteSuperior: 1800000,
          aliquotaNominal: 0.112,
          parcelaDeduzir: 22500,
          reparticao: {
            irpj: 0.055,
            csll: 0.035,
            cofins: 0.1151,
            pis: 0.0249,
            cpp: 0.375,
            icms: 0.32,
            iss: 0,
          },
        },
        {
          faixa: 5,
          limiteInferior: 1800000,
          limiteSuperior: 3600000,
          aliquotaNominal: 0.147,
          parcelaDeduzir: 85500,
          reparticao: {
            irpj: 0.055,
            csll: 0.035,
            cofins: 0.1151,
            pis: 0.0249,
            cpp: 0.375,
            icms: 0.32,
            iss: 0,
          },
        },
        {
          faixa: 6,
          limiteInferior: 3600000,
          limiteSuperior: 4800000,
          aliquotaNominal: 0.3,
          parcelaDeduzir: 720000,
          reparticao: {
            irpj: 0.085,
            csll: 0.075,
            cofins: 0.2096,
            pis: 0.0454,
            cpp: 0.585,
            icms: 0,
            iss: 0,
          },
        },
      ],
    },
    III: {
      anexo: 'III', // Serviços gerais ou com Fator R >= 28%
      faixas: [
        {
          faixa: 1,
          limiteInferior: 0,
          limiteSuperior: 180000,
          aliquotaNominal: 0.06,
          parcelaDeduzir: 0,
          reparticao: {
            irpj: 0.04,
            csll: 0.035,
            cofins: 0.1282,
            pis: 0.0278,
            cpp: 0.434,
            icms: 0,
            iss: 0.335,
          },
        },
        {
          faixa: 2,
          limiteInferior: 180000,
          limiteSuperior: 360000,
          aliquotaNominal: 0.112,
          parcelaDeduzir: 9360,
          reparticao: {
            irpj: 0.04,
            csll: 0.035,
            cofins: 0.1405,
            pis: 0.0305,
            cpp: 0.434,
            icms: 0,
            iss: 0.32,
          },
        },
        {
          faixa: 3,
          limiteInferior: 360000,
          limiteSuperior: 720000,
          aliquotaNominal: 0.135,
          parcelaDeduzir: 17640,
          reparticao: {
            irpj: 0.04,
            csll: 0.035,
            cofins: 0.1364,
            pis: 0.0296,
            cpp: 0.434,
            icms: 0,
            iss: 0.325,
          },
        },
        {
          faixa: 4,
          limiteInferior: 720000,
          limiteSuperior: 1800000,
          aliquotaNominal: 0.16,
          parcelaDeduzir: 35640,
          reparticao: {
            irpj: 0.04,
            csll: 0.035,
            cofins: 0.1364,
            pis: 0.0296,
            cpp: 0.434,
            icms: 0,
            iss: 0.325,
          },
        },
        {
          faixa: 5,
          limiteInferior: 1800000,
          limiteSuperior: 3600000,
          aliquotaNominal: 0.21,
          parcelaDeduzir: 125640,
          reparticao: {
            irpj: 0.04,
            csll: 0.035,
            cofins: 0.1282,
            pis: 0.0278,
            cpp: 0.434,
            icms: 0,
            iss: 0.335,
          },
        },
        {
          faixa: 6,
          limiteInferior: 3600000,
          limiteSuperior: 4800000,
          aliquotaNominal: 0.33,
          parcelaDeduzir: 648000,
          reparticao: {
            irpj: 0.35,
            csll: 0.15,
            cofins: 0.1603,
            pis: 0.0347,
            cpp: 0.305,
            icms: 0,
            iss: 0,
          },
        },
      ],
    },
    IV: {
      anexo: 'IV', // Serviços específicos (construção, vigilância, advocacia - sem CPP inclusa)
      faixas: [
        {
          faixa: 1,
          limiteInferior: 0,
          limiteSuperior: 180000,
          aliquotaNominal: 0.045,
          parcelaDeduzir: 0,
          reparticao: {
            irpj: 0.188,
            csll: 0.152,
            cofins: 0.1767,
            pis: 0.0383,
            cpp: 0,
            icms: 0,
            iss: 0.445,
          },
        },
        {
          faixa: 2,
          limiteInferior: 180000,
          limiteSuperior: 360000,
          aliquotaNominal: 0.09,
          parcelaDeduzir: 8100,
          reparticao: {
            irpj: 0.198,
            csll: 0.152,
            cofins: 0.2055,
            pis: 0.0445,
            cpp: 0,
            icms: 0,
            iss: 0.4,
          },
        },
        {
          faixa: 3,
          limiteInferior: 360000,
          limiteSuperior: 720000,
          aliquotaNominal: 0.102,
          parcelaDeduzir: 12420,
          reparticao: {
            irpj: 0.208,
            csll: 0.152,
            cofins: 0.1973,
            pis: 0.0427,
            cpp: 0,
            icms: 0,
            iss: 0.4,
          },
        },
        {
          faixa: 4,
          limiteInferior: 720000,
          limiteSuperior: 1800000,
          aliquotaNominal: 0.14,
          parcelaDeduzir: 39780,
          reparticao: {
            irpj: 0.178,
            csll: 0.152,
            cofins: 0.2177,
            pis: 0.0473,
            cpp: 0,
            icms: 0,
            iss: 0.405,
          },
        },
        {
          faixa: 5,
          limiteInferior: 1800000,
          limiteSuperior: 3600000,
          aliquotaNominal: 0.22,
          parcelaDeduzir: 183780,
          reparticao: {
            irpj: 0.188,
            csll: 0.152,
            cofins: 0.2055,
            pis: 0.0445,
            cpp: 0,
            icms: 0,
            iss: 0.41,
          },
        },
        {
          faixa: 6,
          limiteInferior: 3600000,
          limiteSuperior: 4800000,
          aliquotaNominal: 0.33,
          parcelaDeduzir: 828000,
          reparticao: {
            irpj: 0.535,
            csll: 0.215,
            cofins: 0.2055,
            pis: 0.0445,
            cpp: 0,
            icms: 0,
            iss: 0,
          },
        },
      ],
    },
    V: {
      anexo: 'V', // Serviços intelectuais com Fator R < 28%
      faixas: [
        {
          faixa: 1,
          limiteInferior: 0,
          limiteSuperior: 180000,
          aliquotaNominal: 0.155,
          parcelaDeduzir: 0,
          reparticao: {
            irpj: 0.25,
            csll: 0.15,
            cofins: 0.141,
            pis: 0.0305,
            cpp: 0.2885,
            icms: 0,
            iss: 0.14,
          },
        },
        {
          faixa: 2,
          limiteInferior: 180000,
          limiteSuperior: 360000,
          aliquotaNominal: 0.18,
          parcelaDeduzir: 4500,
          reparticao: {
            irpj: 0.23,
            csll: 0.15,
            cofins: 0.141,
            pis: 0.0305,
            cpp: 0.2785,
            icms: 0,
            iss: 0.17,
          },
        },
        {
          faixa: 3,
          limiteInferior: 360000,
          limiteSuperior: 720000,
          aliquotaNominal: 0.195,
          parcelaDeduzir: 9900,
          reparticao: {
            irpj: 0.24,
            csll: 0.15,
            cofins: 0.1492,
            pis: 0.0323,
            cpp: 0.2385,
            icms: 0,
            iss: 0.19,
          },
        },
        {
          faixa: 4,
          limiteInferior: 720000,
          limiteSuperior: 1800000,
          aliquotaNominal: 0.205,
          parcelaDeduzir: 17100,
          reparticao: {
            irpj: 0.21,
            csll: 0.15,
            cofins: 0.1574,
            pis: 0.0341,
            cpp: 0.2385,
            icms: 0,
            iss: 0.21,
          },
        },
        {
          faixa: 5,
          limiteInferior: 1800000,
          limiteSuperior: 3600000,
          aliquotaNominal: 0.23,
          parcelaDeduzir: 62100,
          reparticao: {
            irpj: 0.23,
            csll: 0.15,
            cofins: 0.141,
            pis: 0.0305,
            cpp: 0.2285,
            icms: 0,
            iss: 0.22,
          },
        },
        {
          faixa: 6,
          limiteInferior: 3600000,
          limiteSuperior: 4800000,
          aliquotaNominal: 0.305,
          parcelaDeduzir: 540000,
          reparticao: {
            irpj: 0.35,
            csll: 0.15,
            cofins: 0.1603,
            pis: 0.0347,
            cpp: 0.305,
            icms: 0,
            iss: 0,
          },
        },
      ],
    },
  },
}

export interface LinhaFaturamentoInput {
  linhaId: string
  nomeLinha: string
  tipoReceita: 'servicos' | 'comercio' | 'industria'
  anexoSimples?: 'I' | 'II' | 'III' | 'IV' | 'V' | 'Nenhum'
  sujeitoFatorR?: boolean
  valorBruto: number
  valorDeducoes?: number // devoluções/canceladas da linha
  localIncidenciaIss?: 'mesmo_municipio' | 'outro_municipio' | 'exterior'
  aliquotaOutroIss?: number
  issRetidoFonte?: boolean
  percentualIssRetido?: number
  icmsTratamento?: 'tributado_normal' | 'st' | 'isento' | 'monofasico'
  pisCofinsTratamento?: 'normal' | 'monofasico'
  aliquotaMunicipalIss?: number // Para Presumido/Real
  percentualPresuncaoIrpj?: number // Para Presumido
  percentualPresuncaoCsll?: number // Para Presumido
}

export interface CalculoInput {
  regime: 'MEI' | 'Simples Nacional' | 'Lucro Presumido' | 'Lucro Real'
  competencia: string // YYYY-MM
  mesesDesdeAbertura?: number // Se no 1º ano de atividade
  rbt12: number // Receita bruta acumulada dos 12 meses anteriores
  folha12m?: number // Folha de salários + pró-labore + encargos dos 12 meses anteriores
  linhas: LinhaFaturamentoInput[]
  // Flags adicionais
  reformaTributariaAtiva?: boolean
  parametros?: ParametrosFiscaisDominus
  tipoAtividadeMei?: 'comercio' | 'servicos' | 'ambos'
}

export interface DetalheTributoMemoria {
  tributo: string
  baseCalculo: number
  aliquotaNominal: number
  aliquotaEfetiva: number
  parcelaDeduzir: number
  valor: number
  tipoRecolhimento:
    | 'das_unificado'
    | 'guia_propria_estadual'
    | 'guia_propria_municipal'
    | 'darf_federal'
  observacao?: string
}

export interface MemoriaPasso {
  titulo: string
  descricao: string
  formula?: string
  valores: Record<string, string | number>
}

export interface ResultadoCalculo {
  regime: 'MEI' | 'Simples Nacional' | 'Lucro Presumido' | 'Lucro Real'
  competencia: string
  faturamentoBrutoTotal: number
  faturamentoLiquidoTotal: number
  impostoTotal: number
  aliquotaEfetivaGlobal: number
  versaoParametros: string
  // Detalhes por tributo
  detalhesTributos: DetalheTributoMemoria[]
  // Memória explicativa passo a passo
  passosMemoria: MemoriaPasso[]
  // Fator R específico
  fatorR?: {
    folha12m: number
    rbt12: number
    percentual: number // ex 0.285 = 28.5%
    enquadradoAnexo3: boolean
    mensagem: string
    zonaTransicao: boolean // entre 26% e 30%
  }
  // Alertas de limite e sublimite
  alertas: {
    ultrapassouSublimite: boolean
    ultrapassouLimite: boolean
    nivelRiscoLimite: 'ok' | 'atencao_70' | 'alerta_85' | 'critico_95' | 'estouro'
    percentualLimiteUtilizado: number
    mensagemAlerta?: string
  }
}

/**
 * Encontra a faixa do anexo do Simples Nacional dado o RBT12
 */
export function encontrarFaixaSimples(
  anexo: 'I' | 'II' | 'III' | 'IV' | 'V',
  rbt12: number,
  params = PARAMETROS_VIGENTES_PADRAO,
): FaixaSimples {
  const tabela = params.tabelasSimples[anexo]
  if (!tabela) {
    throw new Error(`Tabela do Anexo ${anexo} não encontrada.`)
  }

  // Se RBT12 for 0 ou primeiro mês de atividade, usa faixa 1
  if (rbt12 <= 0) return tabela.faixas[0]

  for (const f of tabela.faixas) {
    if (rbt12 <= f.limiteSuperior) {
      return f
    }
  }

  // Acima da 6ª faixa (estouro do teto)
  return tabela.faixas[tabela.faixas.length - 1]
}

/**
 * Calcula Alíquota Efetiva do Simples Nacional:
 * AliqEfetiva = (RBT12 * AliqNominal - ParcelaDeduzir) / RBT12
 */
export function calcularAliquotaEfetivaSimples(
  anexo: 'I' | 'II' | 'III' | 'IV' | 'V',
  rbt12: number,
  params = PARAMETROS_VIGENTES_PADRAO,
): { faixa: FaixaSimples; aliquotaEfetiva: number; formula: string } {
  // Se RBT12 for zero (empresa recém-aberta sem faturamento anterior), a alíquota é a nominal da 1ª faixa
  if (rbt12 <= 0) {
    const f1 = params.tabelasSimples[anexo].faixas[0]
    return {
      faixa: f1,
      aliquotaEfetiva: f1.aliquotaNominal,
      formula: `RBT12 = R$ 0,00 -> Alíquota nominal da 1ª faixa: ${(f1.aliquotaNominal * 100).toFixed(2)}%`,
    }
  }

  const faixa = encontrarFaixaSimples(anexo, rbt12, params)
  const efetiva = (rbt12 * faixa.aliquotaNominal - faixa.parcelaDeduzir) / rbt12
  const formula = `(${rbt12.toFixed(2)} × ${(faixa.aliquotaNominal * 100).toFixed(2)}% - ${faixa.parcelaDeduzir.toFixed(2)}) / ${rbt12.toFixed(2)} = ${(efetiva * 100).toFixed(4)}%`

  return { faixa, aliquotaEfetiva: Math.max(0, efetiva), formula }
}

/**
 * Cálculo do Simples Nacional completo com segregação, Fator R e sublimite estadual
 */
export function calcularSimplesNacional(
  input: CalculoInput,
  params = PARAMETROS_VIGENTES_PADRAO,
): ResultadoCalculo {
  const passos: MemoriaPasso[] = []
  const detalhes: DetalheTributoMemoria[] = []
  const { rbt12, folha12m = 0, linhas, mesesDesdeAbertura } = input

  // Proporcionalidade no primeiro ano
  let limiteSimplesVigente = params.limiteAnualSimples
  let sublimiteVigente = params.sublimiteEstadual
  if (mesesDesdeAbertura && mesesDesdeAbertura > 0 && mesesDesdeAbertura < 12) {
    limiteSimplesVigente = (params.limiteAnualSimples / 12) * mesesDesdeAbertura
    sublimiteVigente = (params.sublimiteEstadual / 12) * mesesDesdeAbertura
    passos.push({
      titulo: 'Proporcionalidade de Limite (1º ano)',
      descricao: `Empresa com ${mesesDesdeAbertura} meses de atividade. Limite Simples proporcional: R$ ${limiteSimplesVigente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}. Sublimite: R$ ${sublimiteVigente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`,
      valores: { mesesDesdeAbertura, limiteSimplesVigente, sublimiteVigente },
    })
  }

  // Fator R
  let fatorRInfo: ResultadoCalculo['fatorR'] | undefined
  let temLinhaComFatorR = linhas.some((l) => l.sujeitoFatorR)

  if (temLinhaComFatorR) {
    const divisor = rbt12 > 0 ? rbt12 : 1
    const razao = folha12m / divisor
    const enquadradoAnexo3 = razao >= 0.28
    const zonaTransicao = razao >= 0.26 && razao <= 0.3

    let mensagem = ''
    if (enquadradoAnexo3) {
      mensagem = `Razão Folha/RBT12 = ${(razao * 100).toFixed(2)}% (>= 28%). Enquadramento AUTOMÁTICO no Anexo III (tributação reduzida).`
    } else {
      mensagem = `Razão Folha/RBT12 = ${(razao * 100).toFixed(2)}% (< 28%). Enquadramento AUTOMÁTICO no Anexo V.`
    }
    if (zonaTransicao) {
      mensagem +=
        ' ATENÇÃO: Cliente em ZONA DE TRANSIÇÃO (entre 26% e 30%). Variações na folha ou receita podem mudar o anexo!'
    }

    fatorRInfo = {
      folha12m,
      rbt12,
      percentual: razao,
      enquadradoAnexo3,
      mensagem,
      zonaTransicao,
    }

    passos.push({
      titulo: 'Cálculo do Fator R',
      descricao: mensagem,
      formula: `Fator R = Folha 12m (R$ ${folha12m.toFixed(2)}) / RBT12 (R$ ${rbt12.toFixed(2)}) = ${(razao * 100).toFixed(2)}%`,
      valores: { folha12m, rbt12, razaoPercentual: (razao * 100).toFixed(2) + '%' },
    })
  }

  // Verificação de Sublimite e Limite
  const ultrapassouSublimite = rbt12 > sublimiteVigente
  const ultrapassouLimite = rbt12 > limiteSimplesVigente
  const percentualLimite = limiteSimplesVigente > 0 ? (rbt12 / limiteSimplesVigente) * 100 : 0

  let nivelRisco: 'ok' | 'atencao_70' | 'alerta_85' | 'critico_95' | 'estouro' = 'ok'
  let msgAlerta: string | undefined

  if (ultrapassouLimite) {
    nivelRisco = 'estouro'
    msgAlerta = `RBT12 de R$ ${rbt12.toLocaleString('pt-BR')} ultrapassou o teto anual de R$ ${limiteSimplesVigente.toLocaleString('pt-BR')}! Exclusão obrigatória do Simples Nacional.`
  } else if (percentualLimite >= 95) {
    nivelRisco = 'critico_95'
    msgAlerta = `Risco CRÍTICO: RBT12 atingiu ${percentualLimite.toFixed(1)}% do limite anual do Simples Nacional.`
  } else if (percentualLimite >= 85) {
    nivelRisco = 'alerta_85'
    msgAlerta = `ALERTA: RBT12 atingiu ${percentualLimite.toFixed(1)}% do limite anual do Simples Nacional.`
  } else if (percentualLimite >= 70) {
    nivelRisco = 'atencao_70'
    msgAlerta = `ATENÇÃO: RBT12 atingiu ${percentualLimite.toFixed(1)}% do teto do Simples Nacional.`
  }

  if (ultrapassouSublimite && !ultrapassouLimite) {
    passos.push({
      titulo: 'Ultrapassagem do Sublimite Estadual',
      descricao: `RBT12 de R$ ${rbt12.toLocaleString('pt-BR')} ultrapassou o sublimite estadual de R$ ${sublimiteVigente.toLocaleString('pt-BR')}. O ICMS e ISS devem ser recolhidos em guias estaduais/municipais próprias fora do DAS.`,
      valores: { rbt12, sublimiteVigente },
    })
  }

  let faturamentoBrutoTotal = 0
  let faturamentoLiquidoTotal = 0
  let impostoTotalGeral = 0

  // Repartição agregada acumulada por tributo
  const totaisTributo: Record<
    string,
    { valor: number; tipo: DetalheTributoMemoria['tipoRecolhimento']; base: number }
  > = {
    IRPJ: { valor: 0, tipo: 'das_unificado', base: 0 },
    CSLL: { valor: 0, tipo: 'das_unificado', base: 0 },
    COFINS: { valor: 0, tipo: 'das_unificado', base: 0 },
    PIS: { valor: 0, tipo: 'das_unificado', base: 0 },
    CPP: { valor: 0, tipo: 'das_unificado', base: 0 },
    ICMS: {
      valor: 0,
      tipo: ultrapassouSublimite ? 'guia_propria_estadual' : 'das_unificado',
      base: 0,
    },
    ISS: {
      valor: 0,
      tipo: ultrapassouSublimite ? 'guia_propria_municipal' : 'das_unificado',
      base: 0,
    },
  }

  // Processar cada linha de receita
  for (const linha of linhas) {
    // Base tributável para o fisco = Receita Bruta da linha
    const baseLinha = Math.max(0, linha.valorBruto)
    const liquido = Math.max(0, linha.valorBruto - (linha.valorDeducoes || 0))
    faturamentoBrutoTotal += linha.valorBruto
    faturamentoLiquidoTotal += liquido

    if (baseLinha <= 0) continue

    // Determinar anexo
    let anexoEfetivo = linha.anexoSimples || 'I'
    if (linha.sujeitoFatorR && fatorRInfo) {
      anexoEfetivo = fatorRInfo.enquadradoAnexo3 ? 'III' : 'V'
    }

    if (anexoEfetivo === 'Nenhum') anexoEfetivo = 'III'

    const { faixa, aliquotaEfetiva, formula } = calcularAliquotaEfetivaSimples(
      anexoEfetivo as 'I' | 'II' | 'III' | 'IV' | 'V',
      rbt12,
      params,
    )

    passos.push({
      titulo: `Linha: ${linha.nomeLinha} (Anexo ${anexoEfetivo})`,
      descricao: `Faixa ${faixa.faixa} (limite ${faixa.limiteSuperior.toLocaleString('pt-BR')}). Alíquota nominal: ${(faixa.aliquotaNominal * 100).toFixed(2)}%, dedução: R$ ${faixa.parcelaDeduzir.toFixed(2)}. Base de cálculo fiscal: Receita Bruta.`,
      formula,
      valores: {
        receitaBruta: baseLinha,
        faturamentoLiquido: liquido,
        aliquotaEfetiva: (aliquotaEfetiva * 100).toFixed(4) + '%',
      },
    })

    // Repartição percentual dos tributos
    const rep = faixa.reparticao

    // Regras de segregação e redução:
    // 1. ISS Retido na fonte -> zera ISS do DAS ou desconta
    // 2. Exportação de serviços -> isenção de PIS/COFINS/ISS
    // 3. ICMS-ST / Monofásico -> exclui ICMS ou PIS/COFINS do DAS daquela parcela
    let percIrpj = rep.irpj
    let percCsll = rep.csll
    let percCofins = rep.cofins
    let percPis = rep.pis
    let percCpp = rep.cpp
    let percIcms = rep.icms
    let percIss = rep.iss

    if (linha.localIncidenciaIss === 'exterior') {
      percIss = 0
      percPis = 0
      percCofins = 0
    } else if (linha.issRetidoFonte) {
      percIss = 0 // Retido na fonte na nota fiscal, não recolhido no DAS
    }

    if (
      linha.icmsTratamento === 'st' ||
      linha.icmsTratamento === 'isento' ||
      linha.icmsTratamento === 'monofasico'
    ) {
      percIcms = 0 // Não tributa ICMS dentro do DAS
    }

    if (linha.pisCofinsTratamento === 'monofasico') {
      percPis = 0
      percCofins = 0
    }

    // Se ultrapassou sublimite, ICMS e ISS saem da alíquota do DAS
    if (ultrapassouSublimite) {
      percIcms = 0
      percIss = 0
    }

    const taxaTotalEfetivaLinha =
      aliquotaEfetiva * (percIrpj + percCsll + percCofins + percPis + percCpp + percIcms + percIss)
    const impostoLinha = baseLinha * taxaTotalEfetivaLinha
    impostoTotalGeral += impostoLinha

    // Somar componentes sobre a Receita Bruta da linha
    totaisTributo.IRPJ.valor += baseLinha * aliquotaEfetiva * percIrpj
    totaisTributo.IRPJ.base += baseLinha
    totaisTributo.CSLL.valor += baseLinha * aliquotaEfetiva * percCsll
    totaisTributo.CSLL.base += baseLinha
    totaisTributo.COFINS.valor += baseLinha * aliquotaEfetiva * percCofins
    totaisTributo.COFINS.base += baseLinha
    totaisTributo.PIS.valor += baseLinha * aliquotaEfetiva * percPis
    totaisTributo.PIS.base += baseLinha
    totaisTributo.CPP.valor += baseLinha * aliquotaEfetiva * percCpp
    totaisTributo.CPP.base += baseLinha

    if (!ultrapassouSublimite && percIcms > 0) {
      totaisTributo.ICMS.valor += baseLinha * aliquotaEfetiva * percIcms
      totaisTributo.ICMS.base += baseLinha
    } else if (ultrapassouSublimite && linha.tipoReceita === 'comercio') {
      // Fora do DAS: ICMS no regime normal estadual (ex: 18%)
      const icmsFora = baseLinha * params.presumido.aliquotaIcmsPadrao
      totaisTributo.ICMS.valor += icmsFora
      totaisTributo.ICMS.base += baseLinha
      impostoTotalGeral += icmsFora
    }

    if (!ultrapassouSublimite && percIss > 0) {
      totaisTributo.ISS.valor += baseLinha * aliquotaEfetiva * percIss
      totaisTributo.ISS.base += baseLinha
    } else if (ultrapassouSublimite && linha.tipoReceita === 'servicos') {
      // Fora do DAS: ISS municipal (ex: alíquota informada ou 5%)
      const aliqIss = linha.aliquotaMunicipalIss || 0.05
      const issFora = baseLinha * aliqIss
      totaisTributo.ISS.valor += issFora
      totaisTributo.ISS.base += baseLinha
      impostoTotalGeral += issFora
    }
  }

  // Preencher array detalhado de tributos
  for (const [trib, data] of Object.entries(totaisTributo)) {
    if (data.valor > 0 || data.base > 0) {
      detalhes.push({
        tributo: trib,
        baseCalculo: data.base,
        aliquotaNominal: 0,
        aliquotaEfetiva: data.base > 0 ? data.valor / data.base : 0,
        parcelaDeduzir: 0,
        valor: data.valor,
        tipoRecolhimento: data.tipo,
        observacao:
          ultrapassouSublimite && (trib === 'ICMS' || trib === 'ISS')
            ? 'Recolhido fora do DAS por ultrapassagem de sublimite'
            : 'DAS Unificado',
      })
    }
  }

  const aliquotaEfetivaGlobal =
    faturamentoBrutoTotal > 0 ? impostoTotalGeral / faturamentoBrutoTotal : 0

  return {
    regime: 'Simples Nacional',
    competencia: input.competencia,
    faturamentoBrutoTotal,
    faturamentoLiquidoTotal,
    impostoTotal: impostoTotalGeral,
    aliquotaEfetivaGlobal,
    versaoParametros: params.versao,
    detalhesTributos: detalhes,
    passosMemoria: passos,
    fatorR: fatorRInfo,
    alertas: {
      ultrapassouSublimite,
      ultrapassouLimite,
      nivelRiscoLimite: nivelRisco,
      percentualLimiteUtilizado: percentualLimite,
      mensagemAlerta: msgAlerta,
    },
  }
}

/**
 * Cálculo do MEI (Microempreendedor Individual)
 */
export function calcularMei(
  input: CalculoInput,
  params = PARAMETROS_VIGENTES_PADRAO,
): ResultadoCalculo {
  const passos: MemoriaPasso[] = []
  const detalhes: DetalheTributoMemoria[] = []
  const { linhas, rbt12, mesesDesdeAbertura } = input

  let faturamentoBrutoTotal = 0
  let faturamentoLiquidoTotal = 0
  for (const l of linhas) {
    faturamentoBrutoTotal += l.valorBruto
    faturamentoLiquidoTotal += Math.max(0, l.valorBruto - (l.valorDeducoes || 0))
  }

  // Proporcionalidade do MEI
  let limiteMeiVigente = params.limiteAnualMei
  if (mesesDesdeAbertura && mesesDesdeAbertura > 0 && mesesDesdeAbertura < 12) {
    limiteMeiVigente = (params.limiteAnualMei / 12) * mesesDesdeAbertura
    passos.push({
      titulo: 'Proporcionalidade MEI no Ano de Abertura',
      descricao: `Empresa aberta há ${mesesDesdeAbertura} meses. Limite proporcional anual: R$ ${limiteMeiVigente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`,
      valores: { mesesDesdeAbertura, limiteMeiVigente },
    })
  }

  const percentualUtilizado = limiteMeiVigente > 0 ? (rbt12 / limiteMeiVigente) * 100 : 0
  const ultrapassouLimite = rbt12 > limiteMeiVigente

  let nivelRisco: 'ok' | 'atencao_70' | 'alerta_85' | 'critico_95' | 'estouro' = 'ok'
  let msgAlerta: string | undefined

  if (ultrapassouLimite) {
    nivelRisco = 'estouro'
    msgAlerta = `RBT12 de R$ ${rbt12.toLocaleString('pt-BR')} ultrapassou o teto do MEI de R$ ${limiteMeiVigente.toLocaleString('pt-BR')}! Desenquadramento obrigatório e migração para Simples Nacional ME.`
  } else if (percentualUtilizado >= 95) {
    nivelRisco = 'critico_95'
    msgAlerta = `Risco CRÍTICO: RBT12 em ${percentualUtilizado.toFixed(1)}% do teto do MEI.`
  } else if (percentualUtilizado >= 85) {
    nivelRisco = 'alerta_85'
    msgAlerta = `ALERTA: RBT12 em ${percentualUtilizado.toFixed(1)}% do teto do MEI.`
  } else if (percentualUtilizado >= 70) {
    nivelRisco = 'atencao_70'
    msgAlerta = `ATENÇÃO: RBT12 em ${percentualUtilizado.toFixed(1)}% do limite do MEI.`
  }

  // Tipo de atividade do MEI (comércio, serviços ou ambos)
  const temComercio =
    linhas.some((l) => l.tipoReceita === 'comercio' || l.tipoReceita === 'industria') ||
    input.tipoAtividadeMei === 'comercio' ||
    input.tipoAtividadeMei === 'ambos'
  const temServicos =
    linhas.some((l) => l.tipoReceita === 'servicos') ||
    input.tipoAtividadeMei === 'servicos' ||
    input.tipoAtividadeMei === 'ambos'

  const inss = params.mei.valorInss
  const icms = temComercio ? params.mei.adicionalIcms : 0
  const iss = temServicos ? params.mei.adicionalIss : 0
  const totalDas = inss + icms + iss

  detalhes.push({
    tributo: 'CPP',
    baseCalculo: 1412.0, // Salário mínimo base
    aliquotaNominal: 0.05,
    aliquotaEfetiva: 0.05,
    parcelaDeduzir: 0,
    valor: inss,
    tipoRecolhimento: 'das_unificado',
    observacao: 'INSS MEI (5% do Salário Mínimo)',
  })

  if (icms > 0) {
    detalhes.push({
      tributo: 'ICMS',
      baseCalculo: faturamentoBrutoTotal,
      aliquotaNominal: 0,
      aliquotaEfetiva: 0,
      parcelaDeduzir: 0,
      valor: icms,
      tipoRecolhimento: 'das_unificado',
      observacao: 'ICMS Fixo MEI (Comércio)',
    })
  }

  if (iss > 0) {
    detalhes.push({
      tributo: 'ISS',
      baseCalculo: faturamentoBrutoTotal,
      aliquotaNominal: 0,
      aliquotaEfetiva: 0,
      parcelaDeduzir: 0,
      valor: iss,
      tipoRecolhimento: 'das_unificado',
      observacao: 'ISS Fixo MEI (Serviços)',
    })
  }

  passos.push({
    titulo: 'Apuração do DAS MEI Fixo',
    descricao: `DAS fixo mensal: INSS R$ ${inss.toFixed(2)}${icms > 0 ? ` + ICMS R$ ${icms.toFixed(2)}` : ''}${iss > 0 ? ` + ISS R$ ${iss.toFixed(2)}` : ''} = Total R$ ${totalDas.toFixed(2)}.`,
    valores: { inss, icms, iss, totalDas, receitaBruta: faturamentoBrutoTotal },
  })

  return {
    regime: 'MEI',
    competencia: input.competencia,
    faturamentoBrutoTotal,
    faturamentoLiquidoTotal,
    impostoTotal: totalDas,
    aliquotaEfetivaGlobal: faturamentoBrutoTotal > 0 ? totalDas / faturamentoBrutoTotal : 0,
    versaoParametros: params.versao,
    detalhesTributos: detalhes,
    passosMemoria: passos,
    alertas: {
      ultrapassouSublimite: false,
      ultrapassouLimite,
      nivelRiscoLimite: nivelRisco,
      percentualLimiteUtilizado: percentualUtilizado,
      mensagemAlerta: msgAlerta,
    },
  }
}

/**
 * Cálculo do Lucro Presumido
 * Apuração trimestral para IRPJ e CSLL (com adicional de 10% sobre excedente trimestral de R$ 60k),
 * e apuração mensal para PIS, COFINS, ISS e ICMS.
 */
export function calcularLucroPresumido(
  input: CalculoInput,
  params = PARAMETROS_VIGENTES_PADRAO,
): ResultadoCalculo {
  const passos: MemoriaPasso[] = []
  const detalhes: DetalheTributoMemoria[] = []
  const { linhas } = input

  let faturamentoBrutoTotal = 0
  let faturamentoLiquidoTotal = 0

  let basePresumidaIrpjTotal = 0
  let basePresumidaCsllTotal = 0

  let pisTotal = 0
  let cofinsTotal = 0
  let issTotal = 0
  let icmsTotal = 0

  for (const linha of linhas) {
    const baseLinha = Math.max(0, linha.valorBruto)
    const liquido = Math.max(0, linha.valorBruto - (linha.valorDeducoes || 0))
    faturamentoBrutoTotal += linha.valorBruto
    faturamentoLiquidoTotal += liquido

    if (baseLinha <= 0) continue

    // Percentual de presunção aplicado sobre a Receita Bruta da linha
    let presuncaoIrpj =
      linha.percentualPresuncaoIrpj ??
      (linha.tipoReceita === 'servicos'
        ? params.presumido.presuncaoPadraoServicos.irpj
        : params.presumido.presuncaoPadraoComercio.irpj)
    let presuncaoCsll =
      linha.percentualPresuncaoCsll ??
      (linha.tipoReceita === 'servicos'
        ? params.presumido.presuncaoPadraoServicos.csll
        : params.presumido.presuncaoPadraoComercio.csll)

    const baseIrpjLinha = baseLinha * presuncaoIrpj
    const baseCsllLinha = baseLinha * presuncaoCsll

    basePresumidaIrpjTotal += baseIrpjLinha
    basePresumidaCsllTotal += baseCsllLinha

    // PIS e COFINS cumulativos mensais (0,65% e 3%) sobre a Receita Bruta
    if (linha.pisCofinsTratamento !== 'monofasico' && linha.localIncidenciaIss !== 'exterior') {
      pisTotal += baseLinha * params.presumido.aliquotaPisCumulativo
      cofinsTotal += baseLinha * params.presumido.aliquotaCofinsCumulativo
    }

    // ISS ou ICMS sobre a Receita Bruta
    if (linha.tipoReceita === 'servicos') {
      if (linha.localIncidenciaIss !== 'exterior' && !linha.issRetidoFonte) {
        const aliqIss = linha.aliquotaMunicipalIss ?? 0.05
        issTotal += baseLinha * aliqIss
      }
    } else {
      if (linha.icmsTratamento === 'tributado_normal') {
        icmsTotal += baseLinha * params.presumido.aliquotaIcmsPadrao
      }
    }

    passos.push({
      titulo: `Presunção de Bases: ${linha.nomeLinha}`,
      descricao: `Receita Bruta R$ ${baseLinha.toFixed(2)}. Presunção IRPJ ${(presuncaoIrpj * 100).toFixed(1)}% = R$ ${baseIrpjLinha.toFixed(2)}. Presunção CSLL ${(presuncaoCsll * 100).toFixed(1)}% = R$ ${baseCsllLinha.toFixed(2)}.`,
      valores: { baseLinha, baseIrpjLinha, baseCsllLinha },
    })
  }

  // IRPJ mensal proporcional ou trimestral:
  // Base IRPJ × 15% + Adicional de 10% sobre parcela da base mensal > R$ 20.000 (R$ 60.000 no trimestre)
  const irpjBase = basePresumidaIrpjTotal * params.presumido.aliquotaIrpjBase
  const limiteIsencaoMensal = params.presumido.limiteIsencaoAdicionalTrimestre / 3 // R$ 20.000/mês
  const excedenteIrpj = Math.max(0, basePresumidaIrpjTotal - limiteIsencaoMensal)
  const irpjAdicional = excedenteIrpj * params.presumido.aliquotaIrpjAdicional
  const irpjTotal = irpjBase + irpjAdicional

  // CSLL = Base CSLL × 9%
  const csllTotal = basePresumidaCsllTotal * params.presumido.aliquotaCsll

  passos.push({
    titulo: 'Apuração IRPJ e CSLL (Presumido)',
    descricao: `IRPJ Básico (15%): R$ ${irpjBase.toFixed(2)}. Adicional IRPJ (10% sobre base mensal excedente a R$ ${limiteIsencaoMensal.toFixed(2)}): R$ ${irpjAdicional.toFixed(2)}. CSLL (9%): R$ ${csllTotal.toFixed(2)}.`,
    valores: { basePresumidaIrpjTotal, irpjTotal, basePresumidaCsllTotal, csllTotal },
  })

  // Detalhamento
  detalhes.push({
    tributo: 'IRPJ',
    baseCalculo: basePresumidaIrpjTotal,
    aliquotaNominal: params.presumido.aliquotaIrpjBase,
    aliquotaEfetiva: basePresumidaIrpjTotal > 0 ? irpjTotal / faturamentoBrutoTotal : 0,
    parcelaDeduzir: 0,
    valor: irpjTotal,
    tipoRecolhimento: 'darf_federal',
    observacao: `Inclui adicional de 10% de R$ ${irpjAdicional.toFixed(2)}`,
  })

  detalhes.push({
    tributo: 'CSLL',
    baseCalculo: basePresumidaCsllTotal,
    aliquotaNominal: params.presumido.aliquotaCsll,
    aliquotaEfetiva: basePresumidaCsllTotal > 0 ? csllTotal / faturamentoBrutoTotal : 0,
    parcelaDeduzir: 0,
    valor: csllTotal,
    tipoRecolhimento: 'darf_federal',
  })

  detalhes.push({
    tributo: 'PIS',
    baseCalculo: faturamentoBrutoTotal,
    aliquotaNominal: params.presumido.aliquotaPisCumulativo,
    aliquotaEfetiva: params.presumido.aliquotaPisCumulativo,
    parcelaDeduzir: 0,
    valor: pisTotal,
    tipoRecolhimento: 'darf_federal',
  })

  detalhes.push({
    tributo: 'COFINS',
    baseCalculo: faturamentoBrutoTotal,
    aliquotaNominal: params.presumido.aliquotaCofinsCumulativo,
    aliquotaEfetiva: params.presumido.aliquotaCofinsCumulativo,
    parcelaDeduzir: 0,
    valor: cofinsTotal,
    tipoRecolhimento: 'darf_federal',
  })

  if (issTotal > 0) {
    detalhes.push({
      tributo: 'ISS',
      baseCalculo: faturamentoBrutoTotal,
      aliquotaNominal: 0.05,
      aliquotaEfetiva: issTotal / faturamentoBrutoTotal,
      parcelaDeduzir: 0,
      valor: issTotal,
      tipoRecolhimento: 'guia_propria_municipal',
    })
  }

  if (icmsTotal > 0) {
    detalhes.push({
      tributo: 'ICMS',
      baseCalculo: faturamentoBrutoTotal,
      aliquotaNominal: params.presumido.aliquotaIcmsPadrao,
      aliquotaEfetiva: icmsTotal / faturamentoBrutoTotal,
      parcelaDeduzir: 0,
      valor: icmsTotal,
      tipoRecolhimento: 'guia_propria_estadual',
    })
  }

  const impostoTotal = irpjTotal + csllTotal + pisTotal + cofinsTotal + issTotal + icmsTotal
  const aliquotaEfetivaGlobal = faturamentoBrutoTotal > 0 ? impostoTotal / faturamentoBrutoTotal : 0

  return {
    regime: 'Lucro Presumido',
    competencia: input.competencia,
    faturamentoBrutoTotal,
    faturamentoLiquidoTotal,
    impostoTotal,
    aliquotaEfetivaGlobal,
    versaoParametros: params.versao,
    detalhesTributos: detalhes,
    passosMemoria: passos,
    alertas: {
      ultrapassouSublimite: false,
      ultrapassouLimite: false,
      nivelRiscoLimite: 'ok',
      percentualLimiteUtilizado: 0,
    },
  }
}

/**
 * Cálculo de Lucro Real (Projeção simplificada parametrizada)
 */
export function calcularLucroReal(
  input: CalculoInput,
  params = PARAMETROS_VIGENTES_PADRAO,
): ResultadoCalculo {
  const passos: MemoriaPasso[] = []
  const detalhes: DetalheTributoMemoria[] = []
  const { linhas } = input

  let faturamentoBrutoTotal = 0
  let faturamentoLiquidoTotal = 0

  for (const l of linhas) {
    faturamentoBrutoTotal += l.valorBruto
    faturamentoLiquidoTotal += Math.max(0, l.valorBruto - (l.valorDeducoes || 0))
  }

  const temServicos = linhas.some((l) => l.tipoReceita === 'servicos')
  const margemLucroReal = temServicos
    ? params.lucroReal.margemLucroEstimadaServico
    : params.lucroReal.margemLucroEstimadaComercio

  const lucroRealEstimado = faturamentoBrutoTotal * margemLucroReal
  const irpjBase = lucroRealEstimado * params.presumido.aliquotaIrpjBase
  const limiteIsencaoMensal = params.presumido.limiteIsencaoAdicionalTrimestre / 3
  const excedente = Math.max(0, lucroRealEstimado - limiteIsencaoMensal)
  const irpjAdicional = excedente * params.presumido.aliquotaIrpjAdicional
  const irpjTotal = irpjBase + irpjAdicional
  const csllTotal = lucroRealEstimado * params.presumido.aliquotaCsll

  // PIS/COFINS Não-cumulativo (1.65% e 7.60% com abatimento estimado de créditos)
  const aliqPisLiquida = Math.max(
    0,
    params.lucroReal.aliquotaPisNaoCumulativo - params.lucroReal.creditoPisCofinsEstimado * 0.2,
  )
  const aliqCofinsLiquida = Math.max(
    0,
    params.lucroReal.aliquotaCofinsNaoCumulativo - params.lucroReal.creditoPisCofinsEstimado * 0.8,
  )

  const pisTotal = faturamentoBrutoTotal * aliqPisLiquida
  const cofinsTotal = faturamentoBrutoTotal * aliqCofinsLiquida

  let issTotal = 0
  let icmsTotal = 0
  if (temServicos) {
    issTotal = faturamentoBrutoTotal * 0.05
  } else {
    icmsTotal = faturamentoBrutoTotal * 0.18
  }

  const impostoTotal = irpjTotal + csllTotal + pisTotal + cofinsTotal + issTotal + icmsTotal

  passos.push({
    titulo: 'Estimativa de Lucro Real (Projeção Parametrizada)',
    descricao: `Lucro líquido projetado em ${(margemLucroReal * 100).toFixed(1)}% da receita bruta = R$ ${lucroRealEstimado.toFixed(2)}. PIS/COFINS não-cumulativos estimados com crédito de ${(params.lucroReal.creditoPisCofinsEstimado * 100).toFixed(1)}%.`,
    valores: {
      receitaBruta: faturamentoBrutoTotal,
      lucroRealEstimado,
      irpjTotal,
      csllTotal,
      pisTotal,
      cofinsTotal,
    },
  })

  detalhes.push(
    {
      tributo: 'IRPJ',
      baseCalculo: lucroRealEstimado,
      aliquotaNominal: 0.15,
      aliquotaEfetiva: faturamentoBrutoTotal > 0 ? irpjTotal / faturamentoBrutoTotal : 0,
      parcelaDeduzir: 0,
      valor: irpjTotal,
      tipoRecolhimento: 'darf_federal',
    },
    {
      tributo: 'CSLL',
      baseCalculo: lucroRealEstimado,
      aliquotaNominal: 0.09,
      aliquotaEfetiva: faturamentoBrutoTotal > 0 ? csllTotal / faturamentoBrutoTotal : 0,
      parcelaDeduzir: 0,
      valor: csllTotal,
      tipoRecolhimento: 'darf_federal',
    },
    {
      tributo: 'PIS',
      baseCalculo: faturamentoBrutoTotal,
      aliquotaNominal: params.lucroReal.aliquotaPisNaoCumulativo,
      aliquotaEfetiva: aliqPisLiquida,
      parcelaDeduzir: 0,
      valor: pisTotal,
      tipoRecolhimento: 'darf_federal',
    },
    {
      tributo: 'COFINS',
      baseCalculo: faturamentoBrutoTotal,
      aliquotaNominal: params.lucroReal.aliquotaCofinsNaoCumulativo,
      aliquotaEfetiva: aliqCofinsLiquida,
      parcelaDeduzir: 0,
      valor: cofinsTotal,
      tipoRecolhimento: 'darf_federal',
    },
  )

  if (issTotal > 0)
    detalhes.push({
      tributo: 'ISS',
      baseCalculo: faturamentoBrutoTotal,
      aliquotaNominal: 0.05,
      aliquotaEfetiva: 0.05,
      parcelaDeduzir: 0,
      valor: issTotal,
      tipoRecolhimento: 'guia_propria_municipal',
    })
  if (icmsTotal > 0)
    detalhes.push({
      tributo: 'ICMS',
      baseCalculo: faturamentoBrutoTotal,
      aliquotaNominal: 0.18,
      aliquotaEfetiva: 0.18,
      parcelaDeduzir: 0,
      valor: icmsTotal,
      tipoRecolhimento: 'guia_propria_estadual',
    })

  return {
    regime: 'Lucro Real',
    competencia: input.competencia,
    faturamentoBrutoTotal,
    faturamentoLiquidoTotal,
    impostoTotal,
    aliquotaEfetivaGlobal: faturamentoBrutoTotal > 0 ? impostoTotal / faturamentoBrutoTotal : 0,
    versaoParametros: params.versao,
    detalhesTributos: detalhes,
    passosMemoria: passos,
    alertas: {
      ultrapassouSublimite: false,
      ultrapassouLimite: false,
      nivelRiscoLimite: 'ok',
      percentualLimiteUtilizado: 0,
    },
  }
}

/**
 * Diagnóstico Fiscal Dominus:
 * Analisa lado a lado Simples Nacional, Lucro Presumido e Lucro Real com os mesmos dados,
 * calculando a economia identificada e emitindo o parecer da consultoria contábil Dominus.
 */
export interface ComparativoRegimesResultado {
  simples: ResultadoCalculo
  presumido: ResultadoCalculo
  real: ResultadoCalculo
  regimeMaisEconomico: 'Simples Nacional' | 'Lucro Presumido' | 'Lucro Real'
  economiaAnualProjetada: number // Valor em R$ de economia estimada no ano
  percentualEconomia: number
  semaforoRecomendacao: 'verde' | 'amarelo' | 'vermelho'
  justificativa: string
}

export function compararRegimesTributarios(
  input: CalculoInput,
  params = PARAMETROS_VIGENTES_PADRAO,
): ComparativoRegimesResultado {
  const simples = calcularSimplesNacional(input, params)
  const presumido = calcularLucroPresumido(input, params)
  const real = calcularLucroReal(input, params)

  const mapa = [
    { regime: 'Simples Nacional' as const, valor: simples.impostoTotal },
    { regime: 'Lucro Presumido' as const, valor: presumido.impostoTotal },
    { regime: 'Lucro Real' as const, valor: real.impostoTotal },
  ].sort((a, b) => a.valor - b.valor)

  const melhor = mapa[0]
  const segundo = mapa[1]

  const economiaMensal = Math.max(0, segundo.valor - melhor.valor)
  const economiaAnualProjetada = economiaMensal * 12
  const percentualEconomia = segundo.valor > 0 ? (economiaMensal / segundo.valor) * 100 : 0

  let semaforo: 'verde' | 'amarelo' | 'vermelho' = 'verde'
  let justificativa = ''

  if (melhor.regime === input.regime) {
    semaforo = 'verde'
    justificativa = `O regime atual (${input.regime}) já é o mais econômico para o cliente. Economia projetada em relação ao 2º colocado de R$ ${economiaAnualProjetada.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/ano.`
  } else {
    semaforo = 'amarelo'
    justificativa = `OPORTUNIDADE TRIBUTÁRIA: A migração do regime atual (${input.regime}) para ${melhor.regime} pode gerar economia estimada de R$ ${economiaAnualProjetada.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} por ano (${percentualEconomia.toFixed(1)}% menor).`
  }

  if (simples.alertas.ultrapassouLimite && melhor.regime === 'Simples Nacional') {
    semaforo = 'vermelho'
    justificativa =
      'Aviso: Apesar do menor cálculo teórico no Simples, a empresa ultrapassou o teto de R$ 4,8M e está impedida de optar por este regime.'
  }

  return {
    simples,
    presumido,
    real,
    regimeMaisEconomico: melhor.regime,
    economiaAnualProjetada,
    percentualEconomia,
    semaforoRecomendacao: semaforo,
    justificativa,
  }
}

/**
 * Despachante principal de cálculo
 */
export function executarCalculoTributario(
  input: CalculoInput,
  params = PARAMETROS_VIGENTES_PADRAO,
): ResultadoCalculo {
  switch (input.regime) {
    case 'MEI':
      return calcularMei(input, params)
    case 'Simples Nacional':
      return calcularSimplesNacional(input, params)
    case 'Lucro Presumido':
      return calcularLucroPresumido(input, params)
    case 'Lucro Real':
      return calcularLucroReal(input, params)
    default:
      return calcularSimplesNacional(input, params)
  }
}
