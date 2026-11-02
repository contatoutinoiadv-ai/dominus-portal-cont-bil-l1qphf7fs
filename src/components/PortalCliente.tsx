import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  AlertTriangle,
  UploadCloud,
  CheckCircle2,
  Calendar,
  Lock,
  ArrowRight,
  RefreshCw,
  FileText,
  ShieldCheck,
  DollarSign,
  TrendingUp,
  Percent,
  Sparkles,
  Layers,
  MessageCircle,
  HelpCircle,
  Building2,
} from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/lib/pocketbase/authContext'
import { LinhaReceita, LancamentoFaturamento } from '@/types/dominus'
import {
  executarCalculoTributario,
  ResultadoCalculo,
  PARAMETROS_VIGENTES_PADRAO,
} from '@/lib/taxEngine'
import { registrarLogAuditoria } from '@/lib/pocketbase/auditService'
import { PORTAL_CONFIG } from '@/config/portalConfig'

interface PortalClienteProps {
  onVerHistorico?: () => void
  onNavegarParaSimulador?: () => void
}

export const PortalCliente: React.FC<PortalClienteProps> = ({
  onVerHistorico,
  onNavegarParaSimulador,
}) => {
  const { user, empresa } = useAuth()

  // Competência atual padrão (mês corrente)
  const agora = new Date()
  const anoAtual = agora.getFullYear()
  const mesAtual = String(agora.getMonth() + 1).padStart(2, '0')
  const competenciaPadrao = `${anoAtual}-${mesAtual}`

  const [competencia, setCompetencia] = useState(competenciaPadrao)
  const [linhasReceita, setLinhasReceita] = useState<LinhaReceita[]>([])
  const [valoresPorLinha, setValoresPorLinha] = useState<Record<string, number>>({})
  const [notasCanceladas, setNotasCanceladas] = useState<number>(0)
  const [observacao, setObservacao] = useState<string>('')
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [semFaturamento, setSemFaturamento] = useState<boolean>(false)

  const [lancamentoExistente, setLancamentoExistente] = useState<LancamentoFaturamento | null>(null)
  const [rbt12Acumulado, setRbt12Acumulado] = useState<number>(0)
  const [folha12mAcumulada, setFolha12mAcumulada] = useState<number>(0)
  const [salvando, setSalvando] = useState<boolean>(false)
  const [mensagemSucesso, setMensagemSucesso] = useState<string>('')
  const [detalhesTributosAberto, setDetalhesTributosAberto] = useState<boolean>(false)

  // 1. Carregar Linhas de Receita da empresa
  const carregarLinhas = useCallback(async () => {
    if (!empresa?.id) return
    try {
      const res = await pb.collection('linhas_receita').getList(1, 50, {
        filter: `empresa_id = '${empresa.id}' && ativo = true`,
        sort: 'ordem,created',
      })
      const itens = res.items as unknown as LinhaReceita[]
      setLinhasReceita(itens)

      const inicial: Record<string, number> = {}
      itens.forEach((l) => {
        inicial[l.id] = 0
      })
      setValoresPorLinha(inicial)
    } catch (e) {
      console.warn('Erro ao carregar linhas:', e)
    }
  }, [empresa?.id])

  // 2. Carregar histórico anterior (RBT12 e Folha 12m)
  const carregarHistoricoAnterior = useCallback(
    async (comp: string) => {
      if (!empresa?.id) return
      try {
        const [anoStr, mesStr] = comp.split('-')
        const anoNum = parseInt(anoStr, 10)
        const mesNum = parseInt(mesStr, 10)

        const mesesComp: string[] = []
        for (let i = 1; i <= 12; i++) {
          let m = mesNum - i
          let a = anoNum
          while (m <= 0) {
            m += 12
            a -= 1
          }
          mesesComp.push(`${a}-${String(m).padStart(2, '0')}`)
        }

        const filtroComp = mesesComp.map((c) => `competencia = '${c}'`).join(' || ')
        if (!filtroComp) return

        const lancList = await pb.collection('lancamentos_faturamento').getList(1, 50, {
          filter: `empresa_id = '${empresa.id}' && (${filtroComp})`,
        })

        const somaRbt12 = lancList.items.reduce(
          (acc, item) => acc + (Number(item.total_faturamento_liquido) || 0),
          0,
        )
        setRbt12Acumulado(somaRbt12)

        const folhaList = await pb.collection('folha_mensal').getList(1, 50, {
          filter: `empresa_id = '${empresa.id}' && (${filtroComp})`,
        })
        const somaFolha = folhaList.items.reduce(
          (acc, item) => acc + (Number(item.valor_total_folha) || 0),
          0,
        )
        setFolha12mAcumulada(somaFolha)
      } catch (e) {
        console.warn('Erro ao carregar histórico anterior:', e)
      }
    },
    [empresa?.id],
  )

  // 3. Verificar lançamento existente para a competência
  const checarLancamentoExistente = useCallback(
    async (comp: string) => {
      if (!empresa?.id) return
      try {
        const res = await pb.collection('lancamentos_faturamento').getList(1, 1, {
          filter: `empresa_id = '${empresa.id}' && competencia = '${comp}'`,
        })
        if (res.items.length > 0) {
          const item = res.items[0] as unknown as LancamentoFaturamento
          setLancamentoExistente(item)
          setSemFaturamento(!!item.sem_faturamento)
          setNotasCanceladas(item.total_notas_canceladas || 0)
          setObservacao(item.observacao_cliente || '')
        } else {
          setLancamentoExistente(null)
          setSemFaturamento(false)
          setNotasCanceladas(0)
          setObservacao('')
        }
      } catch (e) {
        console.warn('Erro ao verificar lançamento:', e)
      }
    },
    [empresa?.id],
  )

  useEffect(() => {
    carregarLinhas()
  }, [carregarLinhas])

  useEffect(() => {
    if (competencia) {
      checarLancamentoExistente(competencia)
      carregarHistoricoAnterior(competencia)
    }
  }, [competencia, checarLancamentoExistente, carregarHistoricoAnterior])

  // Cálculo imediato da estimativa em tempo real
  const calculoEstimativa: ResultadoCalculo = useMemo(() => {
    if (!empresa) {
      return {
        regime: 'Simples Nacional',
        competencia,
        faturamentoBrutoTotal: 0,
        faturamentoLiquidoTotal: 0,
        impostoTotal: 0,
        aliquotaEfetivaGlobal: 0,
        versaoParametros: '2025.1',
        detalhesTributos: [],
        passosMemoria: [],
        alertas: {
          ultrapassouSublimite: false,
          ultrapassouLimite: false,
          nivelRiscoLimite: 'ok',
          percentualLimiteUtilizado: 0,
        },
      }
    }

    if (semFaturamento) {
      return {
        regime: empresa.regime_vigente,
        competencia,
        faturamentoBrutoTotal: 0,
        faturamentoLiquidoTotal: 0,
        impostoTotal:
          empresa.regime_vigente === 'MEI' ? PARAMETROS_VIGENTES_PADRAO.mei.valorInss : 0,
        aliquotaEfetivaGlobal: 0,
        versaoParametros: '2025.1',
        detalhesTributos: [],
        passosMemoria: [],
        alertas: {
          ultrapassouSublimite: false,
          ultrapassouLimite: false,
          nivelRiscoLimite: 'ok',
          percentualLimiteUtilizado: 0,
        },
      }
    }

    const linhasInput = linhasReceita.map((l) => ({
      linhaId: l.id,
      nomeLinha: l.nome_linha,
      tipoReceita: l.tipo_receita,
      anexoSimples: l.anexo_simples,
      sujeitoFatorR: l.sujeito_fator_r,
      localIncidenciaIss: l.local_incidencia_iss,
      aliquotaMunicipalIss: l.aliquota_municipal_iss,
      issRetidoFonte: l.iss_retido_fonte,
      icmsTratamento: l.icms_tratamento,
      pisCofinsTratamento: l.pis_cofins_tratamento,
      valorBruto: valoresPorLinha[l.id] || 0,
      valorDeducoes: 0,
    }))

    return executarCalculoTributario({
      regime: empresa.regime_vigente,
      competencia,
      rbt12: rbt12Acumulado,
      folha12m: folha12mAcumulada,
      linhas: linhasInput,
    })
  }, [
    empresa,
    competencia,
    semFaturamento,
    linhasReceita,
    valoresPorLinha,
    rbt12Acumulado,
    folha12mAcumulada,
  ])

  const faturamentoTotalBruto = useMemo(() => {
    if (semFaturamento) return 0
    return Object.values(valoresPorLinha).reduce((a, b) => a + (Number(b) || 0), 0)
  }, [semFaturamento, valoresPorLinha])

  const faturamentoLiquido = Math.max(0, faturamentoTotalBruto - notasCanceladas)
  const travado = lancamentoExistente?.status === 'Validado'

  // Salvar lançamento mensal
  const handleSalvarLancamento = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!empresa?.id || travado) return
    setSalvando(true)
    setMensagemSucesso('')

    try {
      const dataPayload: Record<string, unknown> = {
        empresa_id: empresa.id,
        competencia,
        sem_faturamento: semFaturamento,
        total_faturamento_bruto: semFaturamento ? 0 : faturamentoTotalBruto,
        total_notas_canceladas: semFaturamento ? 0 : notasCanceladas,
        total_faturamento_liquido: semFaturamento ? 0 : faturamentoLiquido,
        imposto_estimado: calculoEstimativa.impostoTotal,
        aliquota_efetiva: calculoEstimativa.aliquotaEfetivaGlobal,
        status: 'Enviado',
        observacao_cliente: observacao,
        enviado_por_user_id: user?.id,
        memoria_calculo_json: JSON.stringify(calculoEstimativa),
      }

      let lancRecordId = lancamentoExistente?.id

      if (lancamentoExistente) {
        await pb.collection('lancamentos_faturamento').update(lancamentoExistente.id, dataPayload)
        await registrarLogAuditoria({
          usuarioId: user?.id || '',
          usuarioNome: user?.name || '',
          usuarioRole: user?.role || 'cliente',
          empresaId: empresa.id,
          acao: 'LANCAMENTO_ALTERADO',
          entidade: 'lancamentos_faturamento',
          entidadeId: lancamentoExistente.id,
          valorAnterior: lancamentoExistente,
          valorNovo: dataPayload,
          detalhes: `Receita Bruta atualizada pelo cliente para a competência ${competencia}.`,
        })
      } else {
        const novo = await pb.collection('lancamentos_faturamento').create(dataPayload)
        lancRecordId = novo.id
        await registrarLogAuditoria({
          usuarioId: user?.id || '',
          usuarioNome: user?.name || '',
          usuarioRole: user?.role || 'cliente',
          empresaId: empresa.id,
          acao: 'LANCAMENTO_CRIADO',
          entidade: 'lancamentos_faturamento',
          entidadeId: novo.id,
          valorNovo: dataPayload,
          detalhes: `Nova Receita Bruta mensal enviada pelo cliente para a competência ${competencia}.`,
        })

        // Notificar o contador responsável
        await pb.collection('notificacoes').create({
          empresa_id: empresa.id,
          destinatario_role: 'contador',
          titulo: 'Nova Receita Bruta Recebida',
          mensagem: `A empresa ${empresa.razao_social} informou a Receita Bruta de ${competencia} no valor total de R$ ${faturamentoTotalBruto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`,
          tipo: 'faturamento_enviado',
          lida: false,
        })
      }

      // Se houver arquivo anexado
      if (arquivo && lancRecordId) {
        const formData = new FormData()
        formData.append('empresa_id', empresa.id)
        formData.append('lancamento_id', lancRecordId)
        formData.append('titulo', `Comprovante / Notas Fiscais - ${competencia}`)
        formData.append('tipo', 'relatorio_faturamento')
        formData.append('arquivo', arquivo)
        formData.append('competencia', competencia)
        formData.append('enviado_por_role', 'cliente')
        formData.append('observacao', 'Anexado no envio de Receita Bruta')
        await pb.collection('documentos').create(formData)
      }

      setMensagemSucesso('Faturamento transmitido com sucesso ao seu contador!')
      checarLancamentoExistente(competencia)
    } catch (err: unknown) {
      console.error(err)
      alert('Erro ao salvar lançamento. Tente novamente.')
    } finally {
      setSalvando(false)
    }
  }

  // Nome do mês legível
  const nomeCompetencia = useMemo(() => {
    if (!competencia) return ''
    const [ano, mes] = competencia.split('-')
    const meses = [
      'Janeiro',
      'Fevereiro',
      'Março',
      'Abril',
      'Maio',
      'Junho',
      'Julho',
      'Agosto',
      'Setembro',
      'Outubro',
      'Novembro',
      'Dezembro',
    ]
    const idx = parseInt(mes, 10) - 1
    return `${meses[idx] || mes} de ${ano}`
  }, [competencia])

  const abrirWhatsAppSuporte = () => {
    const msg = `Olá! Sou da empresa ${empresa?.razao_social || ''} e gostaria de orientações sobre a apuração fiscal de ${competencia}.`
    window.open(PORTAL_CONFIG.linkWhatsAppContador(msg), '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="space-y-8 select-none">
      {/* --------------------------------------------------------------------- */}
      {/* 1. HERO INSTITUCIONAL DO CLIENTE: Visão executiva no nível private    */}
      {/* --------------------------------------------------------------------- */}
      <div className="relative rounded-3xl p-6 sm:p-8 overflow-hidden border border-white/10 bg-gradient-to-br from-[#0c121e] via-[#080c14] to-[#05070c] shadow-2xl">
        {/* Glows de fundo discretos */}
        <div className="absolute -top-16 -right-16 w-80 h-80 bg-amber-500/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute -bottom-20 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-300 text-[11px] font-mono font-semibold tracking-wider uppercase">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              <span>Painel do Empresário • Gestão Fiscal Exclusiva</span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-light tracking-tight text-white leading-tight">
              Olá,{' '}
              <span className="font-semibold text-white">
                {empresa?.nome_fantasia || empresa?.razao_social || 'Empresário'}
              </span>
            </h1>

            <p className="text-sm text-slate-400 leading-relaxed font-normal">
              Acompanhe sua carga tributária em tempo real e mantenha sua empresa regularizada com a
              supervisão do seu contador.
            </p>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-1 text-xs text-slate-400 font-mono">
              <span>
                CNPJ:{' '}
                <strong className="text-slate-200">{empresa?.cnpj || 'Não cadastrado'}</strong>
              </span>
              <span className="text-white/20">•</span>
              <span>
                Regime:{' '}
                <strong className="text-amber-400 font-sans">
                  {empresa?.regime_vigente || 'Simples Nacional'}
                </strong>
              </span>
              <span className="text-white/20">•</span>
              <span className="text-emerald-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Contabilidade Conectada
              </span>
            </div>
          </div>

          {/* Ações Rápidas no Topo */}
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={abrirWhatsAppSuporte}
              className="border-white/15 bg-white/[0.03] hover:bg-white/[0.08] hover:border-emerald-500/40 text-slate-200 hover:text-white text-xs font-semibold h-10 px-4 rounded-xl flex items-center gap-2"
            >
              <MessageCircle className="w-4 h-4 text-emerald-400" />
              <span>Falar com meu contador</span>
            </Button>

            {onVerHistorico && (
              <Button
                type="button"
                variant="outline"
                onClick={onVerHistorico}
                className="border-white/15 bg-white/[0.03] hover:bg-white/[0.08] text-slate-200 hover:text-white text-xs font-semibold h-10 px-4 rounded-xl flex items-center gap-2"
              >
                <Calendar className="w-4 h-4 text-amber-400" />
                <span>Histórico 24m</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Mensagem de sucesso animada */}
      {mensagemSucesso && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-sm flex items-center justify-between shadow-lg shadow-emerald-500/10 animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-300">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <p className="font-semibold text-white">{mensagemSucesso}</p>
              <p className="text-xs text-emerald-400/80">
                Os dados já foram disponibilizados na fila de conferência do seu escritório.
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMensagemSucesso('')}
            className="text-xs text-emerald-400 hover:text-white hover:bg-emerald-500/20 rounded-lg"
          >
            Dispensar
          </Button>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* 2. NÚMEROS DE ALTO IMPACTO (PRIVATE BANKING KPIS)                     */}
      {/* --------------------------------------------------------------------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* KPI 1: Faturamento Declarado do Mês */}
        <div className="relative rounded-2xl p-5 border border-white/10 bg-slate-900/60 backdrop-blur-md overflow-hidden group hover:border-amber-500/30 transition-all duration-300">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-300 font-medium">
              Faturamento do Mês
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xs font-mono text-amber-400 font-semibold">R$</span>
            <span className="text-3xl font-mono font-extrabold text-white tracking-tight">
              {faturamentoTotalBruto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-3 pt-3 border-t border-white/5">
            <span>Competência ativa:</span>
            <span className="font-mono text-slate-200 font-semibold">{competencia}</span>
          </div>
        </div>

        {/* KPI 2: Imposto Estimado do Mês (Destaque Principal) */}
        <div className="relative rounded-2xl p-5 border border-amber-500/30 bg-gradient-to-b from-amber-500/10 via-slate-900/70 to-slate-900/60 backdrop-blur-md overflow-hidden shadow-xl shadow-amber-500/5 group hover:border-amber-500/50 transition-all duration-300">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600" />
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-mono uppercase tracking-wider text-amber-300 font-semibold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Imposto Estimado do Mês
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xs font-mono text-amber-400 font-semibold">R$</span>
            <span className="text-3xl font-mono font-black text-amber-400 tracking-tight">
              {calculoEstimativa.impostoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-3 pt-3 border-t border-amber-500/15">
            <span>Alíquota Efetiva:</span>
            <span className="font-mono text-amber-300 font-bold">
              {rbt12Acumulado <= 0 && faturamentoTotalBruto <= 0
                ? 'Calculando...'
                : `${(calculoEstimativa.aliquotaEfetivaGlobal * 100).toFixed(2)}%`}
            </span>
          </div>
        </div>

        {/* KPI 3: Status da Apuração com o Escritório */}
        <div className="relative rounded-2xl p-5 border border-white/10 bg-slate-900/60 backdrop-blur-md overflow-hidden group hover:border-cyan-500/30 transition-all duration-300 sm:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-300 font-medium">
              Situação da Competência
            </span>
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>

          <div className="mt-1">
            {lancamentoExistente?.status === 'Validado' ? (
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xl font-bold text-emerald-400 font-sans">
                  Apurado pelo Escritório
                </span>
              </div>
            ) : lancamentoExistente ? (
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <span className="text-xl font-bold text-amber-300 font-sans">
                  Em Análise Contábil
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                <span className="text-xl font-bold text-cyan-300 font-sans">
                  Aguardando Informação
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-3 pt-3 border-t border-white/5">
            <span>Período:</span>
            <span className="text-slate-200 font-medium">{nomeCompetencia || competencia}</span>
          </div>
        </div>
      </div>

      {/* --------------------------------------------------------------------- */}
      {/* 3. FLUXO PRINCIPAL: Informar Faturamento + Estimativa Instantânea      */}
      {/* --------------------------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Formulário do Cliente: Simples, Rápido e Objetivo */}
        <div className="lg:col-span-7 space-y-6">
          <Card className="rounded-3xl border border-white/10 bg-slate-900/60 backdrop-blur-md shadow-2xl overflow-hidden">
            <div className="p-6 sm:p-7 space-y-6">
              {/* Cabeçalho do Card */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
                      <FileText className="w-4 h-4" />
                    </div>
                    <h2 className="text-lg font-bold text-white font-heading">
                      Informar Faturamento do Mês
                    </h2>
                  </div>
                  <p className="text-xs text-slate-400">
                    Preencha o total faturado no mês. O cálculo de imposto é imediato.
                  </p>
                </div>

                {/* Badge de status do lançamento */}
                {lancamentoExistente && (
                  <div>
                    {lancamentoExistente.status === 'Validado' ? (
                      <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-3 py-1 text-xs">
                        Validado pelo Contador
                      </Badge>
                    ) : lancamentoExistente.status === 'Devolvido para correção' ? (
                      <Badge className="bg-rose-500/15 text-rose-400 border border-rose-500/30 px-3 py-1 text-xs">
                        Ajuste Solicitado
                      </Badge>
                    ) : (
                      <Badge className="bg-amber-500/15 text-amber-400 border border-amber-500/30 px-3 py-1 text-xs">
                        Enviado ao Escritório
                      </Badge>
                    )}
                  </div>
                )}
              </div>

              {/* Mensagem se o lançamento já foi validado e travado */}
              {travado && (
                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 text-xs text-slate-300 flex items-center gap-3">
                  <Lock className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    A competência <strong>{competencia}</strong> já foi validada e apurada pelo seu
                    contador. Caso precise retificar algum dado, contate o escritório.
                  </span>
                </div>
              )}

              {/* Mensagem de devolução para correção */}
              {lancamentoExistente?.motivo_devolucao && (
                <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/25 text-xs text-rose-300 space-y-1.5">
                  <p className="font-semibold text-rose-400 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Orientação do seu contador:
                  </p>
                  <p className="leading-relaxed pl-6">{lancamentoExistente.motivo_devolucao}</p>
                </div>
              )}

              <form onSubmit={handleSalvarLancamento} className="space-y-5">
                {/* Seleção do Mês e Botão Sem Faturamento */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="competencia-input"
                      className="text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono"
                    >
                      Mês de Referência
                    </Label>
                    <Input
                      id="competencia-input"
                      type="month"
                      value={competencia}
                      onChange={(e) => setCompetencia(e.target.value)}
                      disabled={salvando}
                      required
                      className="bg-slate-950/70 border-white/10 text-white font-mono text-sm h-11 rounded-xl focus:border-amber-400 focus:ring-amber-400"
                    />
                  </div>

                  <div className="flex flex-col justify-end">
                    <Button
                      type="button"
                      variant={semFaturamento ? 'default' : 'outline'}
                      onClick={() => setSemFaturamento(!semFaturamento)}
                      disabled={travado || salvando}
                      className={`h-11 rounded-xl text-xs font-semibold justify-center transition-all ${
                        semFaturamento
                          ? 'bg-cyan-500 text-slate-950 hover:bg-cyan-400'
                          : 'border-white/15 bg-white/[0.02] hover:bg-white/[0.06] text-slate-300'
                      }`}
                    >
                      {semFaturamento ? (
                        <span className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4" />
                          Mês Declarado Sem Receita
                        </span>
                      ) : (
                        'Declarar mês sem faturamento (R$ 0)'
                      )}
                    </Button>
                  </div>
                </div>

                {/* Linhas de faturamento */}
                {!semFaturamento && (
                  <div className="space-y-4 pt-1">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono">
                          Receita Bruta do Mês:
                        </span>
                        <span className="text-xs font-mono font-bold text-amber-400">
                          Total: R${' '}
                          {faturamentoTotalBruto.toLocaleString('pt-BR', {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                      </div>

                      {linhasReceita.length === 0 ? (
                        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 text-xs text-slate-400 text-center">
                          Nenhuma categoria de receita configurada. Fale com seu contador para
                          cadastrar as atividades da sua empresa.
                        </div>
                      ) : (
                        linhasReceita.map((linha) => {
                          const rotulo = linha.nome_linha.toLowerCase().includes('receita')
                            ? linha.nome_linha
                            : `Receita — ${linha.nome_linha}`

                          return (
                            <div
                              key={linha.id}
                              className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-2 hover:border-white/20 transition"
                            >
                              <div className="flex items-center justify-between text-xs">
                                <Label
                                  htmlFor={`linha-${linha.id}`}
                                  className="font-semibold text-slate-200 cursor-pointer"
                                >
                                  {rotulo}
                                </Label>
                                <span className="text-[10px] font-mono text-slate-400 bg-white/[0.04] px-2 py-0.5 rounded-md">
                                  {linha.tipo_receita}
                                </span>
                              </div>

                              <div className="relative">
                                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-mono">
                                  R$
                                </span>
                                <Input
                                  id={`linha-${linha.id}`}
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  placeholder="0,00"
                                  disabled={travado || salvando}
                                  value={
                                    valoresPorLinha[linha.id] === undefined
                                      ? ''
                                      : valoresPorLinha[linha.id]
                                  }
                                  onChange={(e) => {
                                    const val = parseFloat(e.target.value) || 0
                                    setValoresPorLinha((prev) => ({ ...prev, [linha.id]: val }))
                                  }}
                                  className="pl-10 font-mono text-base bg-slate-950/80 border-white/10 text-white rounded-xl focus:border-amber-400 focus:ring-amber-400 h-11"
                                />
                              </div>
                            </div>
                          )
                        })
                      )}
                    </div>

                    {/* Notas canceladas ou devoluções */}
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="canceladas-input" className="text-xs text-slate-300">
                          Notas fiscais canceladas ou devoluções (R$)
                        </Label>
                        <span className="text-[10px] text-slate-500 font-mono">
                          Informativo contábil
                        </span>
                      </div>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-mono">
                          R$
                        </span>
                        <Input
                          id="canceladas-input"
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0,00"
                          disabled={travado || salvando}
                          value={notasCanceladas === 0 ? '' : notasCanceladas}
                          onChange={(e) => setNotasCanceladas(parseFloat(e.target.value) || 0)}
                          className="pl-10 font-mono text-sm bg-slate-950/80 border-white/10 text-white rounded-xl focus:border-amber-400 focus:ring-amber-400"
                        />
                      </div>
                    </div>

                    {/* Anexo de relatório ou XML opcional */}
                    <div className="space-y-1.5 pt-1">
                      <Label htmlFor="upload-relatorio" className="text-xs text-slate-300">
                        Extrato de faturamento ou XMLs das notas (Opcional)
                      </Label>
                      <div className="border border-dashed border-white/15 rounded-2xl p-4 bg-white/[0.02] text-center hover:bg-white/[0.04] transition">
                        <input
                          id="upload-relatorio"
                          type="file"
                          accept=".pdf,.xml,.csv,.xlsx,.zip"
                          disabled={travado || salvando}
                          onChange={(e) => setArquivo(e.target.files?.[0] || null)}
                          className="text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-amber-500 file:text-slate-950 hover:file:bg-amber-400"
                        />
                        {arquivo && (
                          <p className="text-xs text-emerald-400 mt-2 flex items-center justify-center gap-1.5 font-mono">
                            <UploadCloud className="w-3.5 h-3.5" /> Arquivo pronto para envio:{' '}
                            {arquivo.name}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Observações ao contador */}
                <div className="space-y-1.5">
                  <Label htmlFor="observacao-input" className="text-xs text-slate-300">
                    Mensagem ou observação para o seu contador (Opcional)
                  </Label>
                  <Textarea
                    id="observacao-input"
                    rows={2}
                    placeholder="Alguma particularidade no mês? Ex: notas com retenção de ISS, nova prestação de serviços..."
                    value={observacao}
                    disabled={travado || salvando}
                    onChange={(e) => setObservacao(e.target.value)}
                    className="text-xs bg-slate-950/80 border-white/10 text-white rounded-xl focus:border-amber-400 focus:ring-amber-400"
                  />
                </div>

                {/* Botão de Envio de Alto Padrão */}
                {!travado && (
                  <button
                    type="submit"
                    disabled={salvando}
                    className="group relative w-full h-12 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-slate-950 font-bold text-sm tracking-wide shadow-xl shadow-amber-500/20 hover:shadow-amber-500/35 transition-all duration-300 overflow-hidden flex items-center justify-center disabled:opacity-60"
                  >
                    <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out pointer-events-none" />

                    {salvando ? (
                      <span className="flex items-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Transmitindo ao escritório...</span>
                      </span>
                    ) : (
                      <span className="relative z-10 flex items-center gap-2">
                        <span>Transmitir Faturamento de {nomeCompetencia || competencia}</span>
                        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                      </span>
                    )}
                  </button>
                )}
              </form>
            </div>
          </Card>
        </div>

        {/* Coluna Direita: Estimativa Fiscal em Tempo Real & Transparência Financeira */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="rounded-3xl border border-white/10 bg-slate-900/60 backdrop-blur-md shadow-2xl overflow-hidden relative">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-400 via-amber-400 to-amber-500" />

            <div className="p-6 sm:p-7 space-y-5">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400 font-bold">
                    Cálculo Imediato
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 bg-white/[0.04] px-2 py-0.5 rounded-full">
                    {empresa?.regime_vigente || 'Simples Nacional'}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white font-heading flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  Previsão Fiscal da Empresa
                </h3>
              </div>

              {/* Caixa Dourada: Imposto Estimado */}
              <div className="p-5 rounded-2xl border border-amber-500/30 bg-gradient-to-b from-amber-500/15 via-amber-500/5 to-transparent space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-amber-200 font-semibold">Imposto Estimado do Mês</span>
                  <span className="font-mono text-amber-300 font-bold">
                    {(calculoEstimativa.aliquotaEfetivaGlobal * 100).toFixed(2)}% efetivo
                  </span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-sm font-mono text-amber-400 font-bold">R$</span>
                  <span className="text-4xl font-mono font-black text-white tracking-tight">
                    {calculoEstimativa.impostoTotal.toLocaleString('pt-BR', {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Calculado sobre a Receita Bruta de{' '}
                  <strong className="text-slate-200 font-mono">
                    R$ {faturamentoTotalBruto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </strong>
                  .
                </p>
              </div>

              {/* Informação sobre Fator R se aplicável ao Simples */}
              {calculoEstimativa.fatorR && (
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300 font-medium">Fator R da Empresa:</span>
                    <span
                      className={`font-mono font-bold ${
                        calculoEstimativa.fatorR.enquadradoAnexo3
                          ? 'text-emerald-400'
                          : 'text-amber-400'
                      }`}
                    >
                      {calculoEstimativa.fatorR.rbt12 <= 0
                        ? 'Aguardando 12m'
                        : `${(calculoEstimativa.fatorR.percentual * 100).toFixed(2)}%`}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    {calculoEstimativa.fatorR.rbt12 <= 0
                      ? 'O Fator R utiliza a média de salários e receitas dos últimos 12 meses para definir a menor alíquota permitida por lei.'
                      : calculoEstimativa.fatorR.mensagem}
                  </p>
                </div>
              )}

              {/* Detalhamento dos tributos incidentes */}
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setDetalhesTributosAberto(!detalhesTributosAberto)}
                  className="w-full flex items-center justify-between text-xs text-slate-300 hover:text-white p-2 rounded-xl hover:bg-white/[0.04] transition"
                >
                  <span className="flex items-center gap-1.5 font-medium">
                    <Layers className="w-3.5 h-3.5 text-cyan-400" />
                    Composição detalhada dos tributos
                  </span>
                  <span className="font-mono text-amber-400 text-[11px]">
                    {detalhesTributosAberto ? 'Ocultar' : 'Ver tributos'}
                  </span>
                </button>

                {detalhesTributosAberto && (
                  <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-2 text-xs divide-y divide-white/5 animate-in fade-in">
                    {calculoEstimativa.detalhesTributos.length === 0 ? (
                      <p className="text-slate-500 text-center py-2 text-[11px]">
                        Nenhum tributo incidente para os valores atuais.
                      </p>
                    ) : (
                      calculoEstimativa.detalhesTributos.map((det) => (
                        <div
                          key={det.tributo}
                          className="pt-2 first:pt-0 flex items-center justify-between font-mono"
                        >
                          <span className="text-slate-300 font-sans font-medium">
                            {det.tributo}
                          </span>
                          <span className="text-white font-bold">
                            R$ {det.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* AVISO LEGAL MANDATÓRIO */}
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-200/90 flex items-start gap-3 leading-relaxed">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                <div>
                  <strong className="font-semibold block text-amber-300">
                    Aviso Legal de Estimativa:
                  </strong>
                  &quot;Estimativa para planejamento. O valor oficial é apurado pelo
                  escritório.&quot;
                </div>
              </div>

              {/* Suporte direto do contador no rodapé do cálculo */}
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-slate-400" />
                  <span>Dúvidas na apuração?</span>
                </div>
                <button
                  type="button"
                  onClick={abrirWhatsAppSuporte}
                  className="text-amber-400 hover:text-amber-300 font-semibold hover:underline"
                >
                  Falar com contador &rarr;
                </button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
