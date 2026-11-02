import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
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
  Layers,
  Sparkles,
  Lock,
  ArrowRight,
  RefreshCw,
  FileText,
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

export const PortalCliente: React.FC<{ onVerHistorico?: () => void }> = ({ onVerHistorico }) => {
  const { user, empresa } = useAuth()

  // Competência atual padrão (ex: mês corrente ou mês anterior)
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

  // 2. Carregar RBT12 e Folha 12m dos 12 meses anteriores
  const carregarHistoricoAnterior = useCallback(
    async (comp: string) => {
      if (!empresa?.id) return
      try {
        // Obter os últimos 12 meses anteriores à competência
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

  // 3. Verificar se já existe lançamento para a competência selecionada
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

  // Cálculo imediato da estimativa em tempo real enquanto digita
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

  // Status de bloqueio: apenas se estiver Validado o cliente não pode mais editar
  const travado = lancamentoExistente?.status === 'Validado'

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
        // Atualizar
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
          detalhes: `Faturamento atualizado pelo cliente para a competência ${competencia}.`,
        })
      } else {
        // Criar novo
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
          detalhes: `Novo faturamento mensal enviado pelo cliente para a competência ${competencia}.`,
        })

        // Notificar o contador chefe em tempo real
        await pb.collection('notificacoes').create({
          empresa_id: empresa.id,
          destinatario_role: 'contador',
          titulo: 'Novo Faturamento Recebido',
          mensagem: `A empresa ${empresa.razao_social} enviou o faturamento de ${competencia} com receita bruta de R$ ${faturamentoTotalBruto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`,
          tipo: 'faturamento_enviado',
          lida: false,
        })
      }

      // Se houver arquivo anexado, salvar em documentos
      if (arquivo && lancRecordId) {
        const formData = new FormData()
        formData.append('empresa_id', empresa.id)
        formData.append('lancamento_id', lancRecordId)
        formData.append('titulo', `Comprovante / Notas Fiscais - ${competencia}`)
        formData.append('tipo', 'relatorio_faturamento')
        formData.append('arquivo', arquivo)
        formData.append('competencia', competencia)
        formData.append('enviado_por_role', 'cliente')
        formData.append('observacao', 'Anexado no envio de faturamento')
        await pb.collection('documentos').create(formData)
      }

      setMensagemSucesso('Faturamento enviado com sucesso ao escritório contábil!')
      checarLancamentoExistente(competencia)
    } catch (err: unknown) {
      console.error(err)
      alert('Erro ao salvar lançamento. Tente novamente.')
    } finally {
      setSalvando(false)
    }
  }

  const badgeStatus = (st?: string) => {
    switch (st) {
      case 'Validado':
        return (
          <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            Validado pelo Contador
          </Badge>
        )
      case 'Devolvido para correção':
        return (
          <Badge className="bg-rose-500/15 text-rose-400 border border-rose-500/30">
            Devolvido para Correção
          </Badge>
        )
      case 'Em análise':
        return (
          <Badge className="bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
            Em Análise Fiscal
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
      {/* Banner de Boas-Vindas */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-card via-card/90 to-primary/5 border border-border flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-mono tracking-widest text-primary uppercase font-bold">
            Portal da Empresa
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-0.5">
            Olá, {empresa?.razao_social || 'Empresa'}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            CNPJ: <span className="font-mono text-foreground">{empresa?.cnpj}</span> • Regime:{' '}
            <strong className="text-primary">{empresa?.regime_vigente}</strong>
          </p>
        </div>

        <div className="flex items-center gap-3">
          {onVerHistorico && (
            <Button variant="outline" size="sm" onClick={onVerHistorico} className="text-xs">
              <Calendar className="w-3.5 h-3.5 mr-1.5" />
              Ver Histórico 24m
            </Button>
          )}
        </div>
      </div>

      {mensagemSucesso && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>{mensagemSucesso}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMensagemSucesso('')}
            className="text-xs text-emerald-400"
          >
            Dispensar
          </Button>
        </div>
      )}

      {/* Grid Principal: Formulário + Estimativa Imediata */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Formulário de Lançamento */}
        <div className="lg:col-span-7 space-y-6">
          <Card className="border-border bg-card shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    Informar Faturamento Mensal
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    Preencha os valores da competência em menos de 1 minuto.
                  </CardDescription>
                </div>
                {lancamentoExistente && badgeStatus(lancamentoExistente.status)}
              </div>
            </CardHeader>

            <CardContent>
              {travado && (
                <div className="mb-4 p-3 rounded-lg bg-muted/60 border border-border text-xs flex items-center gap-2 text-muted-foreground">
                  <Lock className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    Este faturamento já foi <strong>Validado</strong> pelo escritório e está
                    bloqueado para edição.
                  </span>
                </div>
              )}

              {lancamentoExistente?.motivo_devolucao && (
                <div className="mb-4 p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 space-y-1">
                  <p className="font-semibold flex items-center gap-1.5 text-rose-400">
                    <AlertTriangle className="w-4 h-4" />
                    Motivo da Devolução pelo Contador:
                  </p>
                  <p className="leading-relaxed">{lancamentoExistente.motivo_devolucao}</p>
                </div>
              )}

              <form onSubmit={handleSalvarLancamento} className="space-y-4">
                {/* Seleção de Competência */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="comp-select" className="text-xs font-medium">
                      Competência (Mês/Ano)
                    </Label>
                    <Input
                      id="comp-select"
                      type="month"
                      value={competencia}
                      onChange={(e) => setCompetencia(e.target.value)}
                      disabled={salvando}
                      required
                      className="font-mono text-sm"
                    />
                  </div>

                  {/* Botão Mês Sem Faturamento */}
                  <div className="flex flex-col justify-end">
                    <Button
                      type="button"
                      variant={semFaturamento ? 'default' : 'outline'}
                      onClick={() => setSemFaturamento(!semFaturamento)}
                      disabled={travado || salvando}
                      className="w-full text-xs font-medium justify-center h-10"
                    >
                      {semFaturamento ? (
                        <span className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4" />
                          Mês Declarado Sem Faturamento
                        </span>
                      ) : (
                        'Declarar Mês Sem Faturamento (R$ 0)'
                      )}
                    </Button>
                  </div>
                </div>

                {!semFaturamento && (
                  <div className="space-y-4 pt-2">
                    <div className="border-t border-border pt-3">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        Linhas de Receita Cadastradas:
                      </p>

                      {linhasReceita.length === 0 ? (
                        <div className="p-3 bg-muted/40 rounded-lg text-xs text-muted-foreground">
                          Nenhuma linha de receita ativa cadastrada para sua empresa. Contate o
                          contador.
                        </div>
                      ) : (
                        linhasReceita.map((linha) => (
                          <div
                            key={linha.id}
                            className="p-3 bg-muted/20 border border-border rounded-xl mb-3 space-y-1.5"
                          >
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-foreground">
                                {linha.nome_linha}
                              </span>
                              <span className="text-[10px] text-muted-foreground uppercase bg-muted px-2 py-0.5 rounded">
                                {linha.tipo_receita}{' '}
                                {linha.anexo_simples ? `• Anexo ${linha.anexo_simples}` : ''}
                              </span>
                            </div>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-mono">
                                R$
                              </span>
                              <Input
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
                                className="pl-9 font-mono text-sm"
                              />
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Deduções e Cancelamentos */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="deducoes" className="text-xs">
                          Notas Fiscais Canceladas ou Devoluções do Mês (R$)
                        </Label>
                        <span className="text-[10px] text-muted-foreground font-medium">
                          Informativo contábil (não deduz a base fiscal)
                        </span>
                      </div>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-mono">
                          R$
                        </span>
                        <Input
                          id="deducoes"
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0,00"
                          disabled={travado || salvando}
                          value={notasCanceladas === 0 ? '' : notasCanceladas}
                          onChange={(e) => setNotasCanceladas(parseFloat(e.target.value) || 0)}
                          className="pl-9 font-mono text-sm"
                        />
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Dado gerencial gravado no lançamento para conferência do contador. A base
                        tributável do fisco permanece a Receita Bruta.
                      </p>
                    </div>

                    {/* Upload de Relatório/PDF/XML */}
                    <div className="space-y-1.5">
                      <Label htmlFor="upload-comprovante" className="text-xs">
                        Relatório de Vendas / PDF / XML das Notas Fiscais (Opcional)
                      </Label>
                      <div className="border border-dashed border-border rounded-xl p-3 bg-muted/10 text-center hover:bg-muted/20 transition">
                        <input
                          id="upload-comprovante"
                          type="file"
                          accept=".pdf,.xml,.csv,.xlsx,.zip"
                          disabled={travado || salvando}
                          onChange={(e) => setArquivo(e.target.files?.[0] || null)}
                          className="text-xs file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-primary-foreground hover:file:cursor-pointer"
                        />
                        {arquivo && (
                          <p className="text-[11px] text-emerald-400 mt-1 flex items-center justify-center gap-1">
                            <UploadCloud className="w-3.5 h-3.5" /> Arquivo selecionado:{' '}
                            {arquivo.name}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Observações */}
                <div className="space-y-1.5">
                  <Label htmlFor="obs-cliente" className="text-xs">
                    Observações ao Contador (Opcional)
                  </Label>
                  <Textarea
                    id="obs-cliente"
                    rows={2}
                    placeholder="Alguma particularidade no mês? Ex: faturamento com retenção de ISS, venda interestadual..."
                    value={observacao}
                    disabled={travado || salvando}
                    onChange={(e) => setObservacao(e.target.value)}
                    className="text-xs"
                  />
                </div>

                {!travado && (
                  <Button
                    type="submit"
                    disabled={salvando}
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold py-3 shadow-lg"
                  >
                    {salvando ? (
                      <span className="flex items-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Transmitindo ao Escritório...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        Transmitir Faturamento de {competencia}
                        <ArrowRight className="w-4 h-4" />
                      </span>
                    )}
                  </Button>
                )}
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Coluna Direita: Estimativa Imediata de Imposto e Aviso Legal */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="border-border bg-card shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-accent to-emerald-400" />
            <CardHeader className="pb-3">
              <span className="text-[10px] uppercase font-mono tracking-wider text-accent font-bold">
                Motor de Cálculo em Tempo Real
              </span>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                Estimativa Fiscal do Mês
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Base de Cálculo: Receita Bruta */}
              <div className="p-3.5 rounded-xl bg-muted/40 border border-border flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Receita Bruta</p>
                  <p className="text-xl font-bold font-mono text-foreground mt-0.5">
                    R$ {faturamentoTotalBruto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <Badge variant="outline" className="text-[10px] font-mono">
                  Comp. {competencia}
                </Badge>
              </div>

              {/* Imposto Estimado Principal */}
              <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-primary">
                    Imposto Estimado do Mês
                  </span>
                  <span className="text-xs font-mono font-bold text-foreground">
                    Alíquota Efetiva: {(calculoEstimativa.aliquotaEfetivaGlobal * 100).toFixed(2)}%
                  </span>
                </div>
                <p className="text-3xl font-extrabold font-mono text-primary">
                  R${' '}
                  {calculoEstimativa.impostoTotal.toLocaleString('pt-BR', {
                    minimumFractionDigits: 2,
                  })}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Regime Vigente:{' '}
                  <strong className="text-foreground">{empresa?.regime_vigente}</strong>
                </p>
              </div>

              {/* Fator R (se aplicável ao Simples) */}
              {calculoEstimativa.fatorR && (
                <div className="p-3 rounded-lg bg-muted/30 border border-border text-xs space-y-1">
                  <div className="flex items-center justify-between font-semibold">
                    <span>Fator R (Folha 12m / RBT12):</span>
                    <span
                      className={`font-mono ${
                        calculoEstimativa.fatorR.enquadradoAnexo3
                          ? 'text-emerald-400'
                          : 'text-amber-400'
                      }`}
                    >
                      {(calculoEstimativa.fatorR.percentual * 100).toFixed(2)}%
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {calculoEstimativa.fatorR.mensagem}
                  </p>
                </div>
              )}

              {/* Detalhes por tributo */}
              <div className="space-y-1.5 pt-1">
                <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5" />
                  Composição Estimada do Tributo:
                </p>
                <div className="divide-y divide-border text-xs">
                  {calculoEstimativa.detalhesTributos.length === 0 ? (
                    <p className="py-2 text-[11px] text-muted-foreground italic">
                      Nenhum tributo incidente para o valor atual.
                    </p>
                  ) : (
                    calculoEstimativa.detalhesTributos.map((det) => (
                      <div
                        key={det.tributo}
                        className="py-1.5 flex items-center justify-between font-mono"
                      >
                        <span className="text-foreground font-sans font-medium">{det.tributo}</span>
                        <span className="text-muted-foreground">
                          R$ {det.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* AVISO LEGAL MANDATÓRIO */}
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs flex items-start gap-2.5 leading-relaxed">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                <div>
                  <strong className="font-semibold block text-amber-200">
                    Aviso Legal de Estimativa:
                  </strong>
                  &quot;Estimativa para planejamento. O valor oficial é apurado pelo
                  escritório.&quot;
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
