import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table'
import { Calendar, Layers, ArrowUpRight, TrendingUp } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/lib/pocketbase/authContext'
import { LancamentoFaturamento } from '@/types/dominus'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'

export const HistoricoCliente: React.FC = () => {
  const { empresa } = useAuth()
  const [lancamentos, setLancamentos] = useState<LancamentoFaturamento[]>([])
  const [carregando, setCarregando] = useState(true)

  const carregarHistorico = useCallback(async () => {
    if (!empresa?.id) return
    setCarregando(true)
    try {
      const res = await pb.collection('lancamentos_faturamento').getList(1, 24, {
        filter: `empresa_id = '${empresa.id}'`,
        sort: '-competencia',
      })
      setLancamentos(res.items as unknown as LancamentoFaturamento[])
    } catch (e) {
      console.warn('Erro ao carregar histórico:', e)
    } finally {
      setCarregando(false)
    }
  }, [empresa?.id])

  useEffect(() => {
    carregarHistorico()
  }, [carregarHistorico])

  const dadosGrafico = [...lancamentos].reverse().map((l) => ({
    competencia: l.competencia,
    faturamento: l.total_faturamento_liquido,
    imposto: l.imposto_estimado || 0,
  }))

  const badgeStatus = (st: string) => {
    switch (st) {
      case 'Validado':
        return (
          <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            Validado
          </Badge>
        )
      case 'Devolvido para correção':
        return (
          <Badge className="bg-rose-500/15 text-rose-400 border border-rose-500/30">
            Devolvido
          </Badge>
        )
      case 'Em análise':
        return (
          <Badge className="bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
            Em Análise
          </Badge>
        )
      default:
        return (
          <Badge className="bg-amber-500/15 text-amber-400 border border-amber-500/30">
            Enviado
          </Badge>
        )
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Histórico de Lançamentos (24 Meses)</h2>
          <p className="text-xs text-muted-foreground">
            Acompanhamento histórico do faturamento e impostos gerados pela empresa.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={carregarHistorico} className="text-xs">
          <Calendar className="w-3.5 h-3.5 mr-1.5" />
          Atualizar Lista
        </Button>
      </div>

      {/* Gráfico de Evolução dos Lançamentos */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            Evolução de Faturamento dos Últimos Meses
          </CardTitle>
          <CardDescription className="text-xs">
            Comparativo de faturamento líquido e imposto apurado por competência.
          </CardDescription>
        </CardHeader>
        <CardContent className="h-64 pt-2">
          {dadosGrafico.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
              Sem dados históricos para plotagem.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dadosGrafico} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="corFaturamento" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#eab308" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#eab308" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="competencia" stroke="#888" fontSize={11} tickLine={false} />
                <YAxis
                  stroke="#888"
                  fontSize={11}
                  tickLine={false}
                  tickFormatter={(v) => `R$${v / 1000}k`}
                />
                <Tooltip
                  formatter={(
                    value: string | number | readonly (string | number)[] | undefined,
                  ) => [
                    `R$ ${Number(value ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
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
                  name="Faturamento Líquido"
                  stroke="#eab308"
                  fillOpacity={1}
                  fill="url(#corFaturamento)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Tabela de Lançamentos */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Layers className="w-4 h-4 text-primary" />
            Registros Detalhados por Competência
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="text-xs">
                <TableHead>Competência</TableHead>
                <TableHead>Faturamento Bruto</TableHead>
                <TableHead>Deduções</TableHead>
                <TableHead>Faturamento Líquido</TableHead>
                <TableHead>Imposto Estimado</TableHead>
                <TableHead>Alíquota Efetiva</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data Envio</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="text-xs font-mono">
              {carregando ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="text-center py-6 text-muted-foreground font-sans"
                  >
                    Carregando histórico...
                  </TableCell>
                </TableRow>
              ) : lancamentos.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="text-center py-6 text-muted-foreground font-sans"
                  >
                    Nenhum faturamento registrado até o momento.
                  </TableCell>
                </TableRow>
              ) : (
                lancamentos.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-bold text-foreground font-mono">
                      {item.competencia}
                      {item.sem_faturamento && (
                        <span className="ml-1 text-[10px] text-muted-foreground font-sans">
                          (Sem Mov.)
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      R${' '}
                      {item.total_faturamento_bruto.toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                      })}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      R${' '}
                      {(item.total_notas_canceladas || 0).toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                      })}
                    </TableCell>
                    <TableCell className="font-semibold text-primary">
                      R${' '}
                      {item.total_faturamento_liquido.toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                      })}
                    </TableCell>
                    <TableCell className="font-semibold text-foreground">
                      R${' '}
                      {(item.imposto_estimado || 0).toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                      })}
                    </TableCell>
                    <TableCell>{((item.aliquota_efetiva || 0) * 100).toFixed(2)}%</TableCell>
                    <TableCell className="font-sans">{badgeStatus(item.status)}</TableCell>
                    <TableCell className="text-muted-foreground text-[11px] font-sans">
                      {new Date(item.created).toLocaleDateString('pt-BR')}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          <div className="mt-4 p-3 bg-muted/20 border border-border rounded-lg text-xs text-muted-foreground flex items-center justify-between">
            <span>Estimativas fornecidas para planejamento financeiro e tributário.</span>
            <span className="font-semibold text-foreground flex items-center gap-1">
              Escritório Dominus Contábil <ArrowUpRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
