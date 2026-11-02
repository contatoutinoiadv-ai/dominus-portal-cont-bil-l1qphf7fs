import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  AlertTriangle,
  Flame,
  ArrowUpRight,
  TrendingDown,
  TrendingUp,
  Building,
} from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { Empresa, LancamentoFaturamento } from '@/types/dominus'

export interface ItemRisco {
  empresa: Empresa
  tipoRisco: 'sublimite' | 'limite_teto' | 'fator_r_transicao' | 'desvio_atipico' | 'inadimplente'
  titulo: string
  descricao: string
  nivel: 'atencao' | 'alerta' | 'critico'
  valorAtual: string
}

export const RadarRiscosFiscais: React.FC = () => {
  const [itensRisco, setItensRisco] = useState<ItemRisco[]>([])
  const [carregando, setCarregando] = useState(true)

  const analisarRiscos = useCallback(async () => {
    setCarregando(true)
    try {
      const empresasRes = await pb.collection('empresas').getList(1, 100)
      const lancamentosRes = await pb.collection('lancamentos_faturamento').getList(1, 200, {
        sort: '-competencia',
      })

      const empresas = empresasRes.items as unknown as Empresa[]
      const lancamentos = lancamentosRes.items as unknown as LancamentoFaturamento[]

      const listaRiscos: ItemRisco[] = []

      for (const emp of empresas) {
        const lancsEmp = lancamentos.filter((l) => l.empresa_id === emp.id)
        const soma12m = lancsEmp
          .slice(0, 12)
          .reduce((a, b) => a + (b.total_faturamento_liquido || 0), 0)

        // 1. Risco de Limite e Sublimite (Simples)
        if (emp.regime_vigente === 'Simples Nacional') {
          const teto = emp.limite_anual_simples || 4800000
          const sub = emp.sublimite_estadual || 3600000

          const percTeto = (soma12m / teto) * 100
          if (percTeto >= 95) {
            listaRiscos.push({
              empresa: emp,
              tipoRisco: 'limite_teto',
              titulo: 'Risco Crítico de Exclusão do Simples',
              descricao: `RBT12 de R$ ${soma12m.toLocaleString('pt-BR')} atingiu ${percTeto.toFixed(1)}% do teto anual de R$ ${teto.toLocaleString('pt-BR')}.`,
              nivel: 'critico',
              valorAtual: `${percTeto.toFixed(1)}% do teto`,
            })
          } else if (percTeto >= 80) {
            listaRiscos.push({
              empresa: emp,
              tipoRisco: 'limite_teto',
              titulo: 'Aproximação do Teto do Simples Nacional',
              descricao: `RBT12 em ${percTeto.toFixed(1)}% do limite máximo de faturamento anual.`,
              nivel: 'alerta',
              valorAtual: `${percTeto.toFixed(1)}% do teto`,
            })
          }

          if (soma12m > sub) {
            listaRiscos.push({
              empresa: emp,
              tipoRisco: 'sublimite',
              titulo: 'Sublimite Estadual Ultrapassado',
              descricao: `RBT12 ultrapassou o sublimite de R$ ${sub.toLocaleString('pt-BR')}. ICMS e ISS devem ser recolhidos fora do DAS.`,
              nivel: 'critico',
              valorAtual: `R$ ${soma12m.toLocaleString('pt-BR')}`,
            })
          }
        }

        // 2. Risco de Limite (MEI)
        if (emp.regime_vigente === 'MEI') {
          const tetoMei = emp.limite_anual_mei || 81000
          const percMei = (soma12m / tetoMei) * 100
          if (percMei >= 85) {
            listaRiscos.push({
              empresa: emp,
              tipoRisco: 'limite_teto',
              titulo: 'Risco de Desenquadramento do MEI',
              descricao: `Faturamento acumulado em ${percMei.toFixed(1)}% do limite de R$ 81.000. Recomenda-se simular migração para Simples ME.`,
              nivel: percMei >= 95 ? 'critico' : 'alerta',
              valorAtual: `${percMei.toFixed(1)}% do teto MEI`,
            })
          }
        }

        // 3. Desvios Atípicos (Salto ou Queda > 50% em relação ao mês anterior)
        if (lancsEmp.length >= 2) {
          const atual = lancsEmp[0].total_faturamento_liquido || 0
          const anterior = lancsEmp[1].total_faturamento_liquido || 0
          if (anterior > 0) {
            const variacao = ((atual - anterior) / anterior) * 100
            if (variacao > 60) {
              listaRiscos.push({
                empresa: emp,
                tipoRisco: 'desvio_atipico',
                titulo: 'Salto Atípico de Faturamento',
                descricao: `O faturamento subiu +${variacao.toFixed(0)}% de ${lancsEmp[1].competencia} para ${lancsEmp[0].competencia}. Conferir emissão de notas.`,
                nivel: 'atencao',
                valorAtual: `+${variacao.toFixed(0)}% no mês`,
              })
            } else if (variacao < -50) {
              listaRiscos.push({
                empresa: emp,
                tipoRisco: 'desvio_atipico',
                titulo: 'Queda Brusca de Faturamento',
                descricao: `Queda de ${Math.abs(variacao).toFixed(0)}% no faturamento mensal. Verificar encerramento de contratos ou retenções.`,
                nivel: 'atencao',
                valorAtual: `${variacao.toFixed(0)}% no mês`,
              })
            }
          }
        }
      }

      setItensRisco(listaRiscos)
    } catch (e) {
      console.warn('Erro ao analisar riscos:', e)
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    analisarRiscos()
  }, [analisarRiscos])

  const badgeNivel = (nivel: ItemRisco['nivel']) => {
    switch (nivel) {
      case 'critico':
        return (
          <Badge className="bg-rose-500/20 text-rose-400 border border-rose-500/30">Crítico</Badge>
        )
      case 'alerta':
        return (
          <Badge className="bg-amber-500/20 text-amber-400 border border-amber-500/30">
            Alerta
          </Badge>
        )
      default:
        return (
          <Badge className="bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">Atenção</Badge>
        )
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Radar Proativo de Riscos Fiscais</h2>
        <p className="text-xs text-muted-foreground">
          Monitoramento contínuo de estouro de limites, proximidade de sublimite e anomalias de
          faturamento na carteira.
        </p>
      </div>

      {/* Cartões Rápidos de Sumário */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-card border border-border flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Alertas Críticos Ativos</p>
            <p className="text-2xl font-bold font-mono text-rose-400">
              {itensRisco.filter((i) => i.nivel === 'critico').length}
            </p>
          </div>
          <div className="p-2.5 rounded-lg bg-rose-500/10 text-rose-400">
            <Flame className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-card border border-border flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Pontos em Alerta</p>
            <p className="text-2xl font-bold font-mono text-amber-400">
              {itensRisco.filter((i) => i.nivel === 'alerta').length}
            </p>
          </div>
          <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-400">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-card border border-border flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Desvios em Análise</p>
            <p className="text-2xl font-bold font-mono text-cyan-400">
              {itensRisco.filter((i) => i.nivel === 'atencao').length}
            </p>
          </div>
          <div className="p-2.5 rounded-lg bg-cyan-500/10 text-cyan-400">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Lista de Alertas Ativos */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            Ocorrências Identificadas na Carteira ({itensRisco.length})
          </CardTitle>
          <CardDescription className="text-xs">
            Medidas preventivas recomendadas para salvaguardar a regularidade fiscal das empresas.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-3">
          {carregando ? (
            <p className="text-xs text-muted-foreground text-center py-6">
              Auditando indicadores da carteira...
            </p>
          ) : itensRisco.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground">
              Nenhum risco tributário crítico identificado na carteira no momento.
            </div>
          ) : (
            itensRisco.map((item, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl border border-border bg-muted/15 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Building className="w-3.5 h-3.5 text-primary" />
                    <strong className="text-foreground font-semibold">
                      {item.empresa.razao_social}
                    </strong>
                    <span className="font-mono text-muted-foreground text-[10px]">
                      ({item.empresa.cnpj})
                    </span>
                    {badgeNivel(item.nivel)}
                  </div>
                  <h4 className="font-bold text-foreground mt-0.5">{item.titulo}</h4>
                  <p className="text-muted-foreground leading-relaxed">{item.descricao}</p>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[10px] text-muted-foreground uppercase block">
                    Métrica Apurada
                  </span>
                  <span className="font-mono font-bold text-primary text-sm">
                    {item.valorAtual}
                  </span>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
