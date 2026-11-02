import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
  TrendingUp,
  Building,
  ArrowUpRight,
  Sliders,
} from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { Empresa, LancamentoFaturamento } from '@/types/dominus'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from 'recharts'

const CORES_PIE = ['#eab308', '#06b6d4', '#10b981', '#6366f1', '#f43f5e']

export const DashboardContador: React.FC<{ onNavegarParaFila?: () => void }> = ({
  onNavegarParaFila,
}) => {
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [lancamentos, setLancamentos] = useState<LancamentoFaturamento[]>([])
  const [carregando, setCarregando] = useState(true)

  const competenciaAtual = '2025-04'

  const carregarDados = useCallback(async () => {
    setCarregando(true)
    try {
      const empRes = await pb.collection('empresas').getList(1, 100)
      const lancRes = await pb.collection('lancamentos_faturamento').getList(1, 200, {
        sort: '-competencia',
      })
      setEmpresas(empRes.items as unknown as Empresa[])
      setLancamentos(lancRes.items as unknown as LancamentoFaturamento[])
    } catch (e) {
      console.warn('Erro ao carregar dados do dashboard do contador:', e)
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    carregarDados()
  }, [carregarDados])

  // Métricas da Carteira
  const totalClientes = empresas.length
  const lancamentosMes = lancamentos.filter((l) => l.competencia === competenciaAtual)
  const qtdLancaram = lancamentosMes.length
  const qtdPendentes = Math.max(0, totalClientes - qtdLancaram)

  const faturamentoTotalCarteira = lancamentosMes.reduce(
    (acc, cur) => acc + (cur.total_faturamento_liquido || 0),
    0,
  )
  const impostoTotalEstimado = lancamentosMes.reduce(
    (acc, cur) => acc + (cur.imposto_estimado || 0),
    0,
  )

  // Ranking Maiores Clientes
  const rankingClientes = [...empresas]
    .map((emp) => {
      const lanc = lancamentosMes.find((l) => l.empresa_id === emp.id)
      return {
        id: emp.id,
        nome: emp.razao_social,
        cnpj: emp.cnpj,
        regime: emp.regime_vigente,
        faturamento: lanc?.total_faturamento_liquido || 0,
        imposto: lanc?.imposto_estimado || 0,
      }
    })
    .sort((a, b) => b.faturamento - a.faturamento)

  // Funil de Status
  const funilStatus = [
    {
      nome: 'Validados',
      valor: lancamentosMes.filter((l) => l.status === 'Validado').length,
      cor: '#10b981',
    },
    {
      nome: 'Em Análise',
      valor: lancamentosMes.filter((l) => l.status === 'Em análise').length,
      cor: '#06b6d4',
    },
    {
      nome: 'Enviados',
      valor: lancamentosMes.filter((l) => l.status === 'Enviado').length,
      cor: '#eab308',
    },
    {
      nome: 'Devolvidos',
      valor: lancamentosMes.filter((l) => l.status === 'Devolvido para correção').length,
      cor: '#f43f5e',
    },
    { nome: 'Pendentes de Envio', valor: qtdPendentes, cor: '#64748b' },
  ]

  // Distribuição por Regime Tributário
  const distribuicaoRegimes = [
    {
      name: 'Simples Nacional',
      value: empresas.filter((e) => e.regime_vigente === 'Simples Nacional').length,
    },
    { name: 'MEI', value: empresas.filter((e) => e.regime_vigente === 'MEI').length },
    {
      name: 'Lucro Presumido',
      value: empresas.filter((e) => e.regime_vigente === 'Lucro Presumido').length,
    },
    { name: 'Lucro Real', value: empresas.filter((e) => e.regime_vigente === 'Lucro Real').length },
  ].filter((d) => d.value > 0)

  return (
    <div className="space-y-6">
      {/* Header do Painel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-mono tracking-widest text-primary font-bold uppercase">
            Centro de Comando Tributário
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-0.5">
            Visão Consolidada da Carteira
          </h2>
          <p className="text-xs text-muted-foreground">
            Acompanhamento em tempo real das apurações, entregas e faturamentos da competência{' '}
            {competenciaAtual}.
          </p>
        </div>

        {onNavegarParaFila && (
          <Button
            onClick={onNavegarParaFila}
            className="bg-primary text-primary-foreground text-xs font-semibold"
          >
            Ir para Fila de Lançamentos ({qtdLancaram})
            <ArrowUpRight className="w-4 h-4 ml-1.5" />
          </Button>
        )}
      </div>

      {/* Cartões de Indicadores Chave */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-card border border-border shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium">Total de Clientes</p>
            <p className="text-2xl font-extrabold font-mono text-foreground mt-0.5">
              {totalClientes}
            </p>
            <span className="text-[10px] text-emerald-400 font-medium">100% ativos</span>
          </div>
          <div className="p-3 rounded-lg bg-primary/10 text-primary">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-card border border-border shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium">Transmitidos no Mês</p>
            <p className="text-2xl font-extrabold font-mono text-emerald-400 mt-0.5">
              {qtdLancaram}
            </p>
            <span className="text-[10px] text-muted-foreground">
              {totalClientes > 0 ? ((qtdLancaram / totalClientes) * 100).toFixed(0) : 0}% da
              carteira
            </span>
          </div>
          <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-card border border-border shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium">Pendentes de Envio</p>
            <p className="text-2xl font-extrabold font-mono text-amber-400 mt-0.5">
              {qtdPendentes}
            </p>
            <span className="text-[10px] text-amber-300">Lembretes disparados</span>
          </div>
          <div className="p-3 rounded-lg bg-amber-500/10 text-amber-400">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-card border border-border shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium">Faturamento Consolidado</p>
            <p className="text-xl font-extrabold font-mono text-primary mt-0.5 truncate max-w-[150px]">
              R$ {faturamentoTotalCarteira.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
            </p>
            <span className="text-[10px] text-muted-foreground">
              Imposto: R${' '}
              {impostoTotalEstimado.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
            </span>
          </div>
          <div className="p-3 rounded-lg bg-primary/10 text-primary">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Gráficos: Funil de Status + Distribuição de Regimes */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8">
          <Card className="border-border bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">
                Status das Entregas do Mês (Competência {competenciaAtual})
              </CardTitle>
              <CardDescription className="text-xs">
                Controle de fluxo dos lançamentos da carteira do escritório.
              </CardDescription>
            </CardHeader>
            <CardContent className="h-64 pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={funilStatus} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                  <XAxis dataKey="nome" stroke="#888" fontSize={11} />
                  <YAxis stroke="#888" fontSize={11} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f141f',
                      borderColor: 'rgba(255,255,255,0.1)',
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="valor" name="Empresas" fill="#eab308" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-4">
          <Card className="border-border bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Carteira por Regime</CardTitle>
              <CardDescription className="text-xs">
                Proporção de empresas por enquadramento.
              </CardDescription>
            </CardHeader>
            <CardContent className="h-64 pt-2 flex flex-col items-center justify-center">
              <ResponsiveContainer width="100%" height={170}>
                <PieChart>
                  <Pie
                    data={distribuicaoRegimes}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {distribuicaoRegimes.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CORES_PIE[index % CORES_PIE.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f141f',
                      borderColor: 'rgba(255,255,255,0.1)',
                      fontSize: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-2 text-[10px] justify-center mt-2">
                {distribuicaoRegimes.map((d, i) => (
                  <span key={d.name} className="flex items-center gap-1 font-mono">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: CORES_PIE[i % CORES_PIE.length] }}
                    />
                    {d.name}: {d.value}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Ranking de Clientes */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center justify-between">
            <span>Ranking dos Maiores Clientes da Carteira</span>
            <span className="text-xs text-muted-foreground font-mono">
              Comp. {competenciaAtual}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border text-xs">
            {rankingClientes.map((item, idx) => (
              <div
                key={item.id}
                className="p-4 flex items-center justify-between hover:bg-muted/15 transition"
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center font-mono font-bold text-[11px] text-muted-foreground">
                    #{idx + 1}
                  </span>
                  <div>
                    <strong className="text-foreground font-semibold flex items-center gap-1.5">
                      <Building className="w-3.5 h-3.5 text-primary" />
                      {item.nome}
                    </strong>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
                      <span className="font-mono">{item.cnpj}</span>
                      <span>•</span>
                      <Badge variant="outline" className="text-[9px]">
                        {item.regime}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-foreground font-mono font-bold block text-sm">
                    R$ {item.faturamento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-[11px] text-muted-foreground font-mono">
                    Imposto: R$ {item.imposto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
