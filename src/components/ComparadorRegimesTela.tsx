import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Sliders,
  TrendingDown,
  Building,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Eye,
  EyeOff,
  FileDown,
} from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/lib/pocketbase/authContext'
import { Empresa } from '@/types/dominus'
import {
  compararRegimesTributarios,
  ComparativoRegimesResultado,
  PARAMETROS_VIGENTES_PADRAO,
} from '@/lib/taxEngine'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts'

export const ComparadorRegimesTela: React.FC = () => {
  const { user, isContador, empresa: empresaCliente } = useAuth()
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [empresaSelecionada, setEmpresaSelecionada] = useState<Empresa | null>(null)

  // Dados para simulação
  const [faturamentoSimulado, setFaturamentoSimulado] = useState<number>(60000)
  const [rbt12Simulado, setRbt12Simulado] = useState<number>(720000)
  const [folha12mSimulada, setFolha12mSimulada] = useState<number>(216000) // 30% Fator R
  const [reformaTributariaAtiva, setReformaTributariaAtiva] = useState<boolean>(false)
  const [liberadoParaCliente, setLiberadoParaCliente] = useState<boolean>(true)

  const carregarEmpresas = useCallback(async () => {
    try {
      if (isContador) {
        const res = await pb.collection('empresas').getList(1, 100, { sort: 'razao_social' })
        const itens = res.items as unknown as Empresa[]
        setEmpresas(itens)
        if (itens.length > 0 && !empresaSelecionada) {
          setEmpresaSelecionada(itens[0])
        }
      } else if (empresaCliente) {
        setEmpresas([empresaCliente])
        setEmpresaSelecionada(empresaCliente)
      }
    } catch (e) {
      console.warn('Erro ao carregar empresas para comparador:', e)
    }
  }, [isContador, empresaCliente, empresaSelecionada])

  useEffect(() => {
    carregarEmpresas()
  }, [carregarEmpresas])

  // Atualizar parâmetros simulados ao mudar de empresa
  useEffect(() => {
    if (empresaSelecionada) {
      setLiberadoParaCliente(!!empresaSelecionada.permitir_cliente_ver_comparador)
      // Carregar faturamento real mais recente
      const puxarUltimo = async () => {
        try {
          const res = await pb.collection('lancamentos_faturamento').getList(1, 1, {
            filter: `empresa_id = '${empresaSelecionada.id}'`,
            sort: '-competencia',
          })
          if (res.items.length > 0) {
            const fat = Number(res.items[0].total_faturamento_liquido) || 50000
            setFaturamentoSimulado(fat)
            setRbt12Simulado(fat * 12)
            setFolha12mSimulada(fat * 12 * 0.3)
          }
        } catch {
          /* intentionally ignored */
        }
      }
      puxarUltimo()
    }
  }, [empresaSelecionada])

  // Alternar permissão de visualização do cliente
  const toggleVisaoCliente = async () => {
    if (!empresaSelecionada || !isContador) return
    const novoStatus = !liberadoParaCliente
    try {
      await pb.collection('empresas').update(empresaSelecionada.id, {
        permitir_cliente_ver_comparador: novoStatus,
      })
      setLiberadoParaCliente(novoStatus)
    } catch (e) {
      console.error(e)
    }
  }

  // Executar simulação comparativa simultânea
  const comparativo: ComparativoRegimesResultado = useMemo(() => {
    const regAtual = empresaSelecionada?.regime_vigente || 'Simples Nacional'
    return compararRegimesTributarios(
      {
        regime: regAtual,
        competencia: '2025-05',
        rbt12: rbt12Simulado,
        folha12m: folha12mSimulada,
        reformaTributariaAtiva,
        linhas: [
          {
            linhaId: 'sim_1',
            nomeLinha: 'Receita Operacional Simulada',
            tipoReceita: 'servicos',
            anexoSimples: 'III',
            sujeitoFatorR: true,
            valorBruto: faturamentoSimulado,
            aliquotaMunicipalIss: 0.05,
          },
        ],
      },
      PARAMETROS_VIGENTES_PADRAO,
    )
  }, [
    empresaSelecionada,
    faturamentoSimulado,
    rbt12Simulado,
    folha12mSimulada,
    reformaTributariaAtiva,
  ])

  // Dados para o gráfico de barras comparativo lado a lado
  const dadosGrafico = [
    {
      nome: 'Simples Nacional',
      impostoMensal: comparativo.simples.impostoTotal,
      impostoAnual: comparativo.simples.impostoTotal * 12,
      aliquotaEfetiva: (comparativo.simples.aliquotaEfetivaGlobal * 100).toFixed(2),
    },
    {
      nome: 'Lucro Presumido',
      impostoMensal: comparativo.presumido.impostoTotal,
      impostoAnual: comparativo.presumido.impostoTotal * 12,
      aliquotaEfetiva: (comparativo.presumido.aliquotaEfetivaGlobal * 100).toFixed(2),
    },
    {
      nome: 'Lucro Real',
      impostoMensal: comparativo.real.impostoTotal,
      impostoAnual: comparativo.real.impostoTotal * 12,
      aliquotaEfetiva: (comparativo.real.aliquotaEfetivaGlobal * 100).toFixed(2),
    },
  ]

  const corSemaforo = (cor: 'verde' | 'amarelo' | 'vermelho') => {
    switch (cor) {
      case 'verde':
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
      case 'amarelo':
        return 'bg-amber-500/15 text-amber-400 border-amber-500/30'
      default:
        return 'bg-rose-500/15 text-rose-400 border-rose-500/30'
    }
  }

  // Exportar memória em TXT/PDF simples
  const exportarRelatorio = () => {
    const texto = `DOMINUS PORTAL CONTABIL - RELATORIO DE PLANEJAMENTO TRIBUTARIO
Data: ${new Date().toLocaleDateString('pt-BR')}
Empresa: ${empresaSelecionada?.razao_social || 'N/A'} (CNPJ: ${empresaSelecionada?.cnpj || 'N/A'})
Regime Atual: ${empresaSelecionada?.regime_vigente || 'N/A'}

CENARIO SIMULADO:
- Faturamento Mensal: R$ ${faturamentoSimulado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
- Receita Bruta 12m (RBT12 Projetado): R$ ${rbt12Simulado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
- Folha 12m Projetada: R$ ${folha12mSimulada.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}

COMPARATIVO DE CARGA TRIBUTARIA:
1. Simples Nacional:
   - Imposto Mensal Estimado: R$ ${comparativo.simples.impostoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
   - Carga Efetiva: ${(comparativo.simples.aliquotaEfetivaGlobal * 100).toFixed(2)}%
   - Custo Anual: R$ ${(comparativo.simples.impostoTotal * 12).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}

2. Lucro Presumido:
   - Imposto Mensal Estimado: R$ ${comparativo.presumido.impostoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
   - Carga Efetiva: ${(comparativo.presumido.aliquotaEfetivaGlobal * 100).toFixed(2)}%
   - Custo Anual: R$ ${(comparativo.presumido.impostoTotal * 12).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}

3. Lucro Real (Projecao Simplificada):
   - Imposto Mensal Estimado: R$ ${comparativo.real.impostoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
   - Carga Efetiva: ${(comparativo.real.aliquotaEfetivaGlobal * 100).toFixed(2)}%
   - Custo Anual: R$ ${(comparativo.real.impostoTotal * 12).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}

DIAGNOSTICO E RECOMENDACAO:
Regime Mais Economico: ${comparativo.regimeMaisEconomico}
Economia Anual Projetada: R$ ${comparativo.economiaAnualProjetada.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
Justificativa Tecnica: ${comparativo.justificativa}
`
    const blob = new Blob([texto], { type: 'text/plain;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `relatorio_comparativo_${empresaSelecionada?.cnpj || 'cliente'}.txt`
    a.click()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Comparador Simultâneo de Regimes Tributários
          </h2>
          <p className="text-xs text-muted-foreground">
            Simulação paralela dos 3 regimes (Simples Nacional vs Lucro Presumido vs Lucro Real) com
            cálculo de economia anual.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isContador && empresaSelecionada && (
            <Button
              variant="outline"
              size="sm"
              onClick={toggleVisaoCliente}
              className={`text-xs ${liberadoParaCliente ? 'border-primary text-primary' : 'text-muted-foreground'}`}
            >
              {liberadoParaCliente ? (
                <>
                  <Eye className="w-3.5 h-3.5 mr-1.5" />
                  Visão Liberada ao Cliente
                </>
              ) : (
                <>
                  <EyeOff className="w-3.5 h-3.5 mr-1.5" />
                  Visão Oculta ao Cliente (Interna)
                </>
              )}
            </Button>
          )}

          <Button variant="outline" size="sm" onClick={exportarRelatorio} className="text-xs">
            <FileDown className="w-3.5 h-3.5 mr-1.5" />
            Exportar Diagnóstico
          </Button>
        </div>
      </div>

      {/* Seletor de Empresa e Parâmetros de Simulação */}
      <Card className="border-border bg-card">
        <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          {isContador && (
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold text-muted-foreground">
                Empresa em Análise:
              </Label>
              <select
                value={empresaSelecionada?.id || ''}
                onChange={(e) => {
                  const emp = empresas.find((x) => x.id === e.target.value) || null
                  setEmpresaSelecionada(emp)
                }}
                className="w-full bg-muted/50 border border-border rounded-lg px-2.5 py-1.5 text-foreground"
              >
                {empresas.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.razao_social} ({e.regime_vigente})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-1">
            <Label className="text-[11px] font-semibold text-muted-foreground">
              Faturamento Mensal (R$):
            </Label>
            <Input
              type="number"
              step="1000"
              value={faturamentoSimulado}
              onChange={(e) => {
                const f = parseFloat(e.target.value) || 0
                setFaturamentoSimulado(f)
                setRbt12Simulado(f * 12)
                setFolha12mSimulada(f * 12 * 0.3)
              }}
              className="font-mono text-xs"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-[11px] font-semibold text-muted-foreground">
              Receita Bruta 12m / RBT12 Acumulado (R$):
            </Label>
            <Input
              type="number"
              step="1000"
              value={rbt12Simulado}
              onChange={(e) => setRbt12Simulado(parseFloat(e.target.value) || 0)}
              className="font-mono text-xs"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-[11px] font-semibold text-muted-foreground">
              Folha de Salários 12m (R$):
            </Label>
            <Input
              type="number"
              step="1000"
              value={folha12mSimulada}
              onChange={(e) => setFolha12mSimulada(parseFloat(e.target.value) || 0)}
              className="font-mono text-xs"
            />
          </div>
        </CardContent>
      </Card>

      {/* Banner de Diagnóstico e Semáforo de Recomendação */}
      <div
        className={`p-4 rounded-xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs ${corSemaforo(comparativo.semaforoRecomendacao)}`}
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            <strong className="text-sm font-bold uppercase tracking-wide">
              Recomendação Fiscal: {comparativo.regimeMaisEconomico}
            </strong>
          </div>
          <p className="leading-relaxed text-xs">{comparativo.justificativa}</p>
        </div>

        <div className="text-right shrink-0">
          <span className="text-[10px] uppercase font-mono block opacity-80">
            Economia Projetada Anual
          </span>
          <span className="text-2xl font-extrabold font-mono">
            R${' '}
            {comparativo.economiaAnualProjetada.toLocaleString('pt-BR', {
              minimumFractionDigits: 2,
            })}
          </span>
        </div>
      </div>

      {/* Grid de Cartões dos 3 Regimes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Cartão Simples Nacional */}
        <Card
          className={`border-border bg-card relative ${comparativo.regimeMaisEconomico === 'Simples Nacional' ? 'border-primary ring-1 ring-primary/40' : ''}`}
        >
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-bold">Simples Nacional</CardTitle>
              {comparativo.regimeMaisEconomico === 'Simples Nacional' && (
                <Badge className="bg-primary/20 text-primary border border-primary/30 text-[10px]">
                  Mais Econômico
                </Badge>
              )}
            </div>
            <CardDescription className="text-xs">
              Alíquota efetiva apurada:{' '}
              <strong className="text-foreground">
                {(comparativo.simples.aliquotaEfetivaGlobal * 100).toFixed(2)}%
              </strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="p-3 rounded-lg bg-muted/30 border border-border">
              <span className="text-[10px] text-muted-foreground uppercase block">
                Imposto Estimado Mensal
              </span>
              <p className="text-2xl font-extrabold font-mono text-primary mt-0.5">
                R${' '}
                {comparativo.simples.impostoTotal.toLocaleString('pt-BR', {
                  minimumFractionDigits: 2,
                })}
              </p>
            </div>
            <div className="space-y-1 font-mono text-[11px] text-muted-foreground">
              <div className="flex justify-between">
                <span>Custo Anual Projetado:</span>
                <span className="text-foreground font-semibold">
                  R${' '}
                  {(comparativo.simples.impostoTotal * 12).toLocaleString('pt-BR', {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Fator R Apurado:</span>
                <span className="text-foreground">
                  {comparativo.simples.fatorR
                    ? `${(comparativo.simples.fatorR.percentual * 100).toFixed(1)}%`
                    : 'N/A'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cartão Lucro Presumido */}
        <Card
          className={`border-border bg-card relative ${comparativo.regimeMaisEconomico === 'Lucro Presumido' ? 'border-primary ring-1 ring-primary/40' : ''}`}
        >
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-bold">Lucro Presumido</CardTitle>
              {comparativo.regimeMaisEconomico === 'Lucro Presumido' && (
                <Badge className="bg-primary/20 text-primary border border-primary/30 text-[10px]">
                  Mais Econômico
                </Badge>
              )}
            </div>
            <CardDescription className="text-xs">
              Alíquota efetiva apurada:{' '}
              <strong className="text-foreground">
                {(comparativo.presumido.aliquotaEfetivaGlobal * 100).toFixed(2)}%
              </strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="p-3 rounded-lg bg-muted/30 border border-border">
              <span className="text-[10px] text-muted-foreground uppercase block">
                Imposto Estimado Mensal
              </span>
              <p className="text-2xl font-extrabold font-mono text-primary mt-0.5">
                R${' '}
                {comparativo.presumido.impostoTotal.toLocaleString('pt-BR', {
                  minimumFractionDigits: 2,
                })}
              </p>
            </div>
            <div className="space-y-1 font-mono text-[11px] text-muted-foreground">
              <div className="flex justify-between">
                <span>Custo Anual Projetado:</span>
                <span className="text-foreground font-semibold">
                  R${' '}
                  {(comparativo.presumido.impostoTotal * 12).toLocaleString('pt-BR', {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Presunção Base IRPJ/CSLL:</span>
                <span className="text-foreground">32,0%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cartão Lucro Real */}
        <Card
          className={`border-border bg-card relative ${comparativo.regimeMaisEconomico === 'Lucro Real' ? 'border-primary ring-1 ring-primary/40' : ''}`}
        >
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-bold">Lucro Real (Projeção)</CardTitle>
              {comparativo.regimeMaisEconomico === 'Lucro Real' && (
                <Badge className="bg-primary/20 text-primary border border-primary/30 text-[10px]">
                  Mais Econômico
                </Badge>
              )}
            </div>
            <CardDescription className="text-xs">
              Alíquota efetiva apurada:{' '}
              <strong className="text-foreground">
                {(comparativo.real.aliquotaEfetivaGlobal * 100).toFixed(2)}%
              </strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="p-3 rounded-lg bg-muted/30 border border-border">
              <span className="text-[10px] text-muted-foreground uppercase block">
                Imposto Estimado Mensal
              </span>
              <p className="text-2xl font-extrabold font-mono text-primary mt-0.5">
                R${' '}
                {comparativo.real.impostoTotal.toLocaleString('pt-BR', {
                  minimumFractionDigits: 2,
                })}
              </p>
            </div>
            <div className="space-y-1 font-mono text-[11px] text-muted-foreground">
              <div className="flex justify-between">
                <span>Custo Anual Projetado:</span>
                <span className="text-foreground font-semibold">
                  R${' '}
                  {(comparativo.real.impostoTotal * 12).toLocaleString('pt-BR', {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
              <div className="flex justify-between">
                <span>PIS/COFINS Não-Cumulativo:</span>
                <span className="text-foreground">9,25% c/ crédito</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico Comparativo de Barras */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">
            Carga Tributária Anual Comparada (R$)
          </CardTitle>
        </CardHeader>
        <CardContent className="h-64 pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dadosGrafico} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
              <XAxis dataKey="nome" stroke="#888" fontSize={11} />
              <YAxis stroke="#888" fontSize={11} tickFormatter={(v) => `R$${v / 1000}k`} />
              <Tooltip
                formatter={(v: string | number | readonly (string | number)[] | undefined) => [
                  `R$ ${Number(v ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
                ]}
                contentStyle={{
                  backgroundColor: '#0f141f',
                  borderColor: 'rgba(255,255,255,0.1)',
                  fontSize: 12,
                }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar
                dataKey="impostoAnual"
                name="Custo Tributário Anual (R$)"
                fill="#eab308"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}
