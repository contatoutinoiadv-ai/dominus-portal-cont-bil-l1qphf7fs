import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DollarSign, TrendingUp, Percent, Calendar, Layers, Sparkles } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/lib/pocketbase/authContext'
import { LancamentoFaturamento } from '@/types/dominus'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'

const CORES_ROSCA = ['#eab308', '#06b6d4', '#10b981', '#6366f1', '#f43f5e', '#8b5cf6', '#ec4899']

export const DashboardCliente: React.FC = () => {
  const { empresa } = useAuth()
  const [lancamentos, setLancamentos] = useState<LancamentoFaturamento[]>([])
  const [carregando, setCarregando] = useState(true)

  const carregarDados = useCallback(async () => {
    if (!empresa?.id) return
    setCarregando(true)
    try {
      const res = await pb.collection('lancamentos_faturamento').getList(1, 24, {
        filter: `empresa_id = '${empresa.id}'`,
        sort: '-competencia',
      })
      setLancamentos(res.items as unknown as LancamentoFaturamento[])
    } catch (e) {
      console.warn('Erro ao carregar dashboard do cliente:', e)
    } finally {
      setCarregando(false)
    }
  }, [empresa?.id])

  useEffect(() => {
    carregarDados()
  }, [carregarDados])

  // Lançamento mais recente
  const lancamentoAtual = lancamentos[0]
  const faturamentoMes =
    lancamentoAtual?.total_faturamento_bruto ?? lancamentoAtual?.total_faturamento_liquido ?? 0
  const impostoMes = lancamentoAtual?.imposto_estimado || 0
  const aliquotaEfetiva = (lancamentoAtual?.aliquota_efetiva || 0) * 100

  // Acumulado do ano (2025)
  const lancamentosAno = lancamentos.filter((l) => l.competencia.startsWith('2025'))
  const faturamentoAcumuladoAno = lancamentosAno.reduce(
    (acc, l) => acc + (l.total_faturamento_bruto ?? l.total_faturamento_liquido ?? 0),
    0,
  )

  // RBT12 Acumulado (últimos 12 meses) - Receita Bruta Total
  const rbt12 = lancamentos
    .slice(0, 12)
    .reduce((acc, l) => acc + (l.total_faturamento_bruto ?? l.total_faturamento_liquido ?? 0), 0)

  // Medidor do Teto Anual
  const limiteAnual =
    empresa?.regime_vigente === 'MEI'
      ? empresa.limite_anual_mei || 81000
      : empresa?.limite_anual_simples || 4800000
  const percentualLimiteUsado = limiteAnual > 0 ? (rbt12 / limiteAnual) * 100 : 0

  let corLimite = 'text-emerald-400'
  let bgGauge = 'bg-emerald-500'
  if (percentualLimiteUsado >= 85) {
    corLimite = 'text-rose-400'
    bgGauge = 'bg-rose-500'
  } else if (percentualLimiteUsado >= 70) {
    corLimite = 'text-amber-400'
    bgGauge = 'bg-amber-500'
  }

  // Dados para gráficos
  const dadosGraficoArea = [...lancamentos]
    .reverse()
    .slice(-12)
    .map((l) => ({
      competencia: l.competencia,
      faturamento: l.total_faturamento_bruto ?? l.total_faturamento_liquido,
      imposto: l.imposto_estimado || 0,
    }))

  // Rosca de composição tributária típica
  const composicaoImposto =
    empresa?.regime_vigente === 'MEI'
      ? [
          { name: 'INSS MEI', value: 70.6 },
          { name: 'ICMS / ISS Fixo', value: 1.0 },
        ]
      : empresa?.regime_vigente === 'Lucro Presumido'
        ? [
            { name: 'IRPJ', value: impostoMes * 0.35 },
            { name: 'CSLL', value: impostoMes * 0.17 },
            { name: 'PIS', value: impostoMes * 0.04 },
            { name: 'COFINS', value: impostoMes * 0.18 },
            { name: 'ISS / ICMS', value: impostoMes * 0.26 },
          ]
        : [
            { name: 'CPP (Previdência)', value: impostoMes * 0.42 },
            { name: 'ISS / ICMS', value: impostoMes * 0.33 },
            { name: 'COFINS', value: impostoMes * 0.13 },
            { name: 'IRPJ', value: impostoMes * 0.05 },
            { name: 'CSLL', value: impostoMes * 0.04 },
            { name: 'PIS', value: impostoMes * 0.03 },
          ]

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div>
        <span className="text-[10px] font-mono tracking-widest text-primary font-bold uppercase">
          Painel de Inteligência Fiscal
        </span>
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-0.5">
          Desempenho da Empresa
        </h2>
        <p className="text-xs text-muted-foreground">
          {empresa?.razao_social} • Regime: <strong>{empresa?.regime_vigente}</strong>
        </p>
      </div>

      {/* Cartões Indicadores Animados */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Receita Bruta do Mês */}
        <div className="p-4 rounded-xl bg-card border border-border shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium">Receita Bruta do Mês</p>
            <p className="text-2xl font-extrabold font-mono text-foreground mt-0.5">
              R$ {faturamentoMes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <span className="text-[10px] text-muted-foreground font-mono">
              Comp: {lancamentoAtual?.competencia || 'N/A'}
            </span>
          </div>
          <div className="p-3 rounded-lg bg-primary/10 text-primary">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        {/* Acumulado do Ano */}
        <div className="p-4 rounded-xl bg-card border border-border shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium">Receita Bruta do Ano (2025)</p>
            <p className="text-2xl font-extrabold font-mono text-foreground mt-0.5">
              R$ {faturamentoAcumuladoAno.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <span className="text-[10px] text-emerald-400 font-medium font-mono">
              {lancamentosAno.length} competências apuradas
            </span>
          </div>
          <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-400">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        {/* Imposto Estimado do Mês */}
        <div className="p-4 rounded-xl bg-card border border-border shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium">Imposto Estimado do Mês</p>
            <p className="text-2xl font-extrabold font-mono text-primary mt-0.5">
              R$ {impostoMes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <span className="text-[10px] text-muted-foreground">Previsão para recolhimento</span>
          </div>
          <div className="p-3 rounded-lg bg-primary/10 text-primary">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>

        {/* Alíquota Efetiva */}
        <div className="p-4 rounded-xl bg-card border border-border shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium">Alíquota Efetiva Atual</p>
            <p className="text-2xl font-extrabold font-mono text-accent mt-0.5">
              {aliquotaEfetiva.toFixed(2)}%
            </p>
            <span className="text-[10px] text-muted-foreground">Incidência sobre faturamento</span>
          </div>
          <div className="p-3 rounded-lg bg-accent/10 text-accent">
            <Percent className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Grid: Gráfico de Evolução 12m + Medidor Circular (Gauge) do Limite Anual */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Gráfico de Área 12 Meses */}
        <div className="lg:col-span-8">
          <Card className="border-border bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">
                Evolução da Receita Bruta (Últimos 12 Meses)
              </CardTitle>
              <CardDescription className="text-xs">
                Valores apurados mês a mês para planejamento financeiro e tributário.
              </CardDescription>
            </CardHeader>
            <CardContent className="h-64 pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={dadosGraficoArea}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="areaClientFat" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#eab308" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#eab308" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                  <XAxis dataKey="competencia" stroke="#888" fontSize={11} />
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
                  <Area
                    type="monotone"
                    dataKey="faturamento"
                    name="Receita Bruta"
                    stroke="#eab308"
                    fill="url(#areaClientFat)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Medidor (Gauge) do Limite Anual */}
        <div className="lg:col-span-4">
          <Card className="border-border bg-card flex flex-col justify-between">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">
                Teto Anual ({empresa?.regime_vigente === 'MEI' ? 'MEI' : 'Simples Nacional'})
              </CardTitle>
              <CardDescription className="text-xs">
                Utilização do limite legal de faturamento acumulado.
              </CardDescription>
            </CardHeader>

            <CardContent className="py-4 space-y-4">
              <div className="flex flex-col items-center justify-center space-y-2">
                <div className="relative w-36 h-36 rounded-full border-8 border-muted/50 flex flex-col items-center justify-center overflow-hidden">
                  <span className={`text-3xl font-extrabold font-mono ${corLimite}`}>
                    {percentualLimiteUsado.toFixed(1)}%
                  </span>
                  <span className="text-[10px] text-muted-foreground uppercase font-mono mt-0.5">
                    Utilizado
                  </span>
                </div>

                <div className="text-center text-xs space-y-0.5 pt-1">
                  <p className="text-muted-foreground">
                    RBT12:{' '}
                    <strong className="font-mono text-foreground">
                      R$ {rbt12.toLocaleString('pt-BR')}
                    </strong>
                  </p>
                  <p className="text-muted-foreground">
                    Teto Legal:{' '}
                    <strong className="font-mono text-foreground">
                      R$ {limiteAnual.toLocaleString('pt-BR')}
                    </strong>
                  </p>
                </div>
              </div>

              {/* Barra de Progresso com Cores de Risco */}
              <div className="space-y-1">
                <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-2 rounded-full transition-all duration-500 ${bgGauge}`}
                    style={{ width: `${Math.min(100, percentualLimiteUsado)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                  <span>0%</span>
                  <span>70% (Atenção)</span>
                  <span>85% (Alerta)</span>
                  <span>100%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Grid: Rosca de Composição do Imposto + Linha do Tempo */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6">
          <Card className="border-border bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">
                Composição do Imposto Estimado
              </CardTitle>
              <CardDescription className="text-xs">
                Detalhamento dos tributos federais, estaduais e previdenciários.
              </CardDescription>
            </CardHeader>
            <CardContent className="h-64 pt-2 flex flex-col items-center justify-center">
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={composicaoImposto}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {composicaoImposto.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CORES_ROSCA[index % CORES_ROSCA.length]} />
                    ))}
                  </Pie>
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
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-2 text-[10px] justify-center mt-2">
                {composicaoImposto.map((item, i) => (
                  <span key={item.name} className="flex items-center gap-1 font-mono">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: CORES_ROSCA[i % CORES_ROSCA.length] }}
                    />
                    {item.name}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Linha do Tempo das Competências */}
        <div className="lg:col-span-6">
          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">
                Linha do Tempo das Competências
              </CardTitle>
              <CardDescription className="text-xs">
                Histórico recente de homologação dos lançamentos pelo escritório.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {lancamentos.slice(0, 5).map((l) => (
                  <div
                    key={l.id}
                    className="p-3 rounded-xl border border-border bg-muted/15 flex items-center justify-between text-xs"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <strong className="font-mono text-sm text-foreground">
                          {l.competencia}
                        </strong>
                        {l.status === 'Validado' ? (
                          <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[9px]">
                            Validado
                          </Badge>
                        ) : (
                          <Badge className="bg-amber-500/15 text-amber-400 border border-amber-500/30 text-[9px]">
                            {l.status}
                          </Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground font-mono">
                        Receita Bruta: R${' '}
                        {(l.total_faturamento_bruto ?? l.total_faturamento_liquido).toLocaleString(
                          'pt-BR',
                          {
                            minimumFractionDigits: 2,
                          },
                        )}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-muted-foreground uppercase block">
                        Imposto
                      </span>
                      <span className="font-mono font-bold text-primary">
                        R${' '}
                        {(l.imposto_estimado || 0).toLocaleString('pt-BR', {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
