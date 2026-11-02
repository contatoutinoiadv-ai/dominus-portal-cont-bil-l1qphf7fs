import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  CheckCircle,
  RotateCcw,
  FileSearch,
  Filter,
  CheckSquare,
  Square,
  Send,
  Download,
  AlertCircle,
  Building,
} from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/lib/pocketbase/authContext'
import { LancamentoFaturamento, Empresa } from '@/types/dominus'
import { registrarLogAuditoria } from '@/lib/pocketbase/auditService'

export const FilaTrabalhoContador: React.FC = () => {
  const { user } = useAuth()
  const [lancamentos, setLancamentos] = useState<LancamentoFaturamento[]>([])
  const [empresas, setEmpresas] = useState<Record<string, Empresa>>({})
  const [carregando, setCarregando] = useState(true)

  // Filtros
  const [filtroRegime, setFiltroRegime] = useState<string>('todos')
  const [filtroStatus, setFiltroStatus] = useState<string>('todos')
  const [filtroCompetencia, setFiltroCompetencia] = useState<string>('')

  // Seleção em lote
  const [selecionados, setSelecionados] = useState<string[]>([])

  // Modal de devolução
  const [modalDevolucaoAberta, setModalDevolucaoAberta] = useState(false)
  const [itemParaDevolver, setItemParaDevolver] = useState<LancamentoFaturamento | null>(null)
  const [motivoDevolucao, setMotivoDevolucao] = useState('')

  // Modal de solicitação de documentos
  const [modalDocAberta, setModalDocAberta] = useState(false)
  const [itemParaDoc, setItemParaDoc] = useState<LancamentoFaturamento | null>(null)
  const [mensagemDoc, setMensagemDoc] = useState('')

  // Carregar empresas para indexação
  const carregarEmpresas = useCallback(async () => {
    try {
      const res = await pb.collection('empresas').getList(1, 100)
      const map: Record<string, Empresa> = {}
      res.items.forEach((e) => {
        map[e.id] = e as unknown as Empresa
      })
      setEmpresas(map)
    } catch (e) {
      console.warn('Erro ao carregar empresas:', e)
    }
  }, [])

  const carregarLancamentos = useCallback(async () => {
    setCarregando(true)
    try {
      const res = await pb.collection('lancamentos_faturamento').getList(1, 100, {
        sort: '-competencia,-created',
      })
      setLancamentos(res.items as unknown as LancamentoFaturamento[])
    } catch (e) {
      console.warn('Erro ao carregar fila:', e)
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    carregarEmpresas()
    carregarLancamentos()
  }, [carregarEmpresas, carregarLancamentos])

  // Filtragem
  const lancamentosFiltrados = lancamentos.filter((l) => {
    const emp = empresas[l.empresa_id]
    if (filtroRegime !== 'todos' && emp?.regime_vigente !== filtroRegime) return false
    if (filtroStatus !== 'todos' && l.status !== filtroStatus) return false
    if (filtroCompetencia && !l.competencia.includes(filtroCompetencia)) return false
    return true
  })

  // Ação: Validar individual ou em lote
  const handleValidarLote = async (ids: string[]) => {
    if (ids.length === 0) return
    try {
      for (const id of ids) {
        const item = lancamentos.find((l) => l.id === id)
        await pb.collection('lancamentos_faturamento').update(id, {
          status: 'Validado',
          validado_por_user_id: user?.id,
          validado_em: new Date().toISOString(),
        })

        if (item) {
          await registrarLogAuditoria({
            usuarioId: user?.id || '',
            usuarioNome: user?.name || 'Contador',
            usuarioRole: 'contador',
            empresaId: item.empresa_id,
            acao: 'LANCAMENTO_VALIDADO',
            entidade: 'lancamentos_faturamento',
            entidadeId: item.id,
            detalhes: `Faturamento da competência ${item.competencia} homologado e validado pelo contador.`,
          })

          // Notificar cliente
          await pb.collection('notificacoes').create({
            empresa_id: item.empresa_id,
            destinatario_role: 'cliente',
            titulo: 'Faturamento Validado',
            mensagem: `O faturamento de ${item.competencia} foi conferido e validado pelo escritório Dominus. As guias DAS/impostos serão emitidas.`,
            tipo: 'faturamento_validado',
            lida: false,
          })
        }
      }
      setSelecionados([])
      carregarLancamentos()
    } catch (e) {
      console.error(e)
      alert('Erro ao validar lançamentos.')
    }
  }

  // Ação: Devolver com comentário
  const handleConfirmarDevolucao = async () => {
    if (!itemParaDevolver || !motivoDevolucao) return
    try {
      await pb.collection('lancamentos_faturamento').update(itemParaDevolver.id, {
        status: 'Devolvido para correção',
        motivo_devolucao: motivoDevolucao,
      })

      await pb.collection('comentarios').create({
        empresa_id: itemParaDevolver.empresa_id,
        lancamento_id: itemParaDevolver.id,
        autor_user_id: user?.id,
        autor_nome: user?.name || 'Contador Responsável',
        autor_role: 'contador',
        texto: `DEVOLUÇÃO: ${motivoDevolucao}`,
      })

      await pb.collection('notificacoes').create({
        empresa_id: itemParaDevolver.empresa_id,
        destinatario_role: 'cliente',
        titulo: 'Faturamento Devolvido para Correção',
        mensagem: `O lançamento de ${itemParaDevolver.competencia} foi devolvido para correção. Motivo: ${motivoDevolucao}`,
        tipo: 'faturamento_devolvido',
        lida: false,
      })

      await registrarLogAuditoria({
        usuarioId: user?.id || '',
        usuarioNome: user?.name || 'Contador',
        usuarioRole: 'contador',
        empresaId: itemParaDevolver.empresa_id,
        acao: 'LANCAMENTO_DEVOLVIDO',
        entidade: 'lancamentos_faturamento',
        entidadeId: itemParaDevolver.id,
        detalhes: `Devolução do faturamento de ${itemParaDevolver.competencia}: ${motivoDevolucao}`,
      })

      setModalDevolucaoAberta(false)
      setItemParaDevolver(null)
      setMotivoDevolucao('')
      carregarLancamentos()
    } catch (e) {
      console.error(e)
      alert('Erro ao devolver lançamento.')
    }
  }

  // Ação: Solicitar documento
  const handleConfirmarSolicitarDoc = async () => {
    if (!itemParaDoc || !mensagemDoc) return
    try {
      await pb.collection('notificacoes').create({
        empresa_id: itemParaDoc.empresa_id,
        destinatario_role: 'cliente',
        titulo: 'Solicitação de Documento Fiscal',
        mensagem: `O contador solicita o envio de documentos para a competência ${itemParaDoc.competencia}: ${mensagemDoc}`,
        tipo: 'geral',
        lida: false,
      })
      setModalDocAberta(false)
      setItemParaDoc(null)
      setMensagemDoc('')
      alert('Solicitação de documentos transmitida ao cliente.')
    } catch (e) {
      console.error(e)
    }
  }

  // Alternar seleção
  const toggleSelecao = (id: string) => {
    setSelecionados((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const toggleSelecionarTodos = () => {
    if (selecionados.length === lancamentosFiltrados.length) {
      setSelecionados([])
    } else {
      setSelecionados(lancamentosFiltrados.map((l) => l.id))
    }
  }

  // Exportação CSV Simples
  const exportarCsv = () => {
    const cabecalho =
      'Empresa,CNPJ,Regime,Competencia,FaturamentoLiquido,ImpostoEstimado,AliquotaEfetiva,Status\n'
    const linhasCsv = lancamentosFiltrados
      .map((l) => {
        const emp = empresas[l.empresa_id]
        return `"${emp?.razao_social || ''}","${emp?.cnpj || ''}","${emp?.regime_vigente || ''}","${l.competencia}",${l.total_faturamento_liquido},${l.imposto_estimado || 0},${l.aliquota_efetiva || 0},"${l.status}"`
      })
      .join('\n')

    const blob = new Blob([cabecalho + linhasCsv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `fila_lancamentos_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

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
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Fila de Trabalho de Lançamentos</h2>
          <p className="text-xs text-muted-foreground">
            Central de validação, devolução e auditoria de faturamentos informados pelos clientes.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportarCsv} className="text-xs">
            <Download className="w-3.5 h-3.5 mr-1.5" />
            Exportar CSV / Excel
          </Button>
        </div>
      </div>

      {/* Barra de Filtros e Ações em Lote */}
      <Card className="border-border bg-card">
        <CardContent className="p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5 text-muted-foreground font-semibold">
              <Filter className="w-3.5 h-3.5" />
              Filtros:
            </div>

            {/* Filtro Regime */}
            <select
              value={filtroRegime}
              onChange={(e) => setFiltroRegime(e.target.value)}
              className="bg-muted/50 border border-border rounded-lg px-2.5 py-1.5 text-foreground"
            >
              <option value="todos">Todos os Regimes</option>
              <option value="MEI">MEI</option>
              <option value="Simples Nacional">Simples Nacional</option>
              <option value="Lucro Presumido">Lucro Presumido</option>
              <option value="Lucro Real">Lucro Real</option>
            </select>

            {/* Filtro Status */}
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              className="bg-muted/50 border border-border rounded-lg px-2.5 py-1.5 text-foreground"
            >
              <option value="todos">Todos os Status</option>
              <option value="Enviado">Enviado (Pendente)</option>
              <option value="Em análise">Em Análise</option>
              <option value="Validado">Validado</option>
              <option value="Devolvido para correção">Devolvido</option>
            </select>

            {/* Filtro Competência */}
            <Input
              type="text"
              placeholder="Competência (ex: 2025-04)"
              value={filtroCompetencia}
              onChange={(e) => setFiltroCompetencia(e.target.value)}
              className="h-8 w-36 text-xs font-mono"
            />
          </div>

          {/* Ações em Lote */}
          {selecionados.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-primary font-bold">
                {selecionados.length} selecionado(s)
              </span>
              <Button
                size="sm"
                onClick={() => handleValidarLote(selecionados)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8"
              >
                <CheckCircle className="w-3.5 h-3.5 mr-1" />
                Validar em Lote
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabela da Fila */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center justify-between">
            <span>Lançamentos Encontrados ({lancamentosFiltrados.length})</span>
            <Button variant="ghost" size="sm" onClick={toggleSelecionarTodos} className="text-xs">
              {selecionados.length === lancamentosFiltrados.length &&
              lancamentosFiltrados.length > 0 ? (
                <CheckSquare className="w-4 h-4 mr-1 text-primary" />
              ) : (
                <Square className="w-4 h-4 mr-1 text-muted-foreground" />
              )}
              Selecionar Todos
            </Button>
          </CardTitle>
          <CardDescription className="text-xs">
            Clique na linha para ver enquadramento, memória e ações.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="text-xs">
                <TableHead className="w-10"></TableHead>
                <TableHead>Empresa / CNPJ</TableHead>
                <TableHead>Regime</TableHead>
                <TableHead>Competência</TableHead>
                <TableHead>Receita Bruta</TableHead>
                <TableHead>Imposto Estimado</TableHead>
                <TableHead>Alíquota Efetiva</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="text-xs">
              {carregando ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    Carregando fila de lançamentos...
                  </TableCell>
                </TableRow>
              ) : lancamentosFiltrados.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    Nenhum lançamento corresponde aos filtros.
                  </TableCell>
                </TableRow>
              ) : (
                lancamentosFiltrados.map((item) => {
                  const emp = empresas[item.empresa_id]
                  const isSel = selecionados.includes(item.id)
                  return (
                    <TableRow key={item.id} className={isSel ? 'bg-primary/5' : ''}>
                      <TableCell>
                        <button type="button" onClick={() => toggleSelecao(item.id)}>
                          {isSel ? (
                            <CheckSquare className="w-4 h-4 text-primary" />
                          ) : (
                            <Square className="w-4 h-4 text-muted-foreground" />
                          )}
                        </button>
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold text-foreground flex items-center gap-1.5">
                          <Building className="w-3.5 h-3.5 text-primary" />
                          {emp?.razao_social || 'Empresa desconhecida'}
                        </div>
                        <div className="text-[10px] text-muted-foreground font-mono">
                          {emp?.cnpj}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">
                          {emp?.regime_vigente || 'N/A'}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono font-bold">{item.competencia}</TableCell>
                      <TableCell className="font-mono font-semibold">
                        R${' '}
                        {(
                          item.total_faturamento_bruto ?? item.total_faturamento_liquido
                        ).toLocaleString('pt-BR', {
                          minimumFractionDigits: 2,
                        })}
                      </TableCell>
                      <TableCell className="font-mono font-bold text-primary">
                        R${' '}
                        {(item.imposto_estimado || 0).toLocaleString('pt-BR', {
                          minimumFractionDigits: 2,
                        })}
                      </TableCell>
                      <TableCell className="font-mono">
                        {((item.aliquota_efetiva || 0) * 100).toFixed(2)}%
                      </TableCell>
                      <TableCell>{badgeStatus(item.status)}</TableCell>
                      <TableCell className="text-right space-x-1">
                        {item.status !== 'Validado' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleValidarLote([item.id])}
                            title="Validar Faturamento"
                            className="h-7 px-2 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                          </Button>
                        )}

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setItemParaDevolver(item)
                            setModalDevolucaoAberta(true)
                          }}
                          title="Devolver para Correção"
                          className="h-7 px-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </Button>

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setItemParaDoc(item)
                            setModalDocAberta(true)
                          }}
                          title="Solicitar Documento / Relatório"
                          className="h-7 px-2 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10"
                        >
                          <FileSearch className="w-3.5 h-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal de Devolução com Comentário */}
      <Dialog open={modalDevolucaoAberta} onOpenChange={setModalDevolucaoAberta}>
        <DialogContent className="max-w-md bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-rose-400">
              <RotateCcw className="w-5 h-5" />
              Devolver Faturamento para Correção
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              O cliente receberá uma notificação e o faturamento será reaberto para edição.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="p-2.5 rounded-lg bg-muted/30 border border-border">
              <p className="font-semibold text-foreground">
                Empresa: {empresas[itemParaDevolver?.empresa_id || '']?.razao_social}
              </p>
              <p className="text-muted-foreground font-mono">
                Competência: {itemParaDevolver?.competencia} • Receita Bruta: R${' '}
                {(
                  itemParaDevolver?.total_faturamento_bruto ??
                  itemParaDevolver?.total_faturamento_liquido ??
                  0
                ).toLocaleString('pt-BR')}
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="font-medium text-foreground">Motivo detalhado da devolução:</label>
              <Textarea
                rows={3}
                placeholder="Ex: O valor de notas canceladas não confere com o relatório anexo. Favor reajustar..."
                value={motivoDevolucao}
                onChange={(e) => setMotivoDevolucao(e.target.value)}
                className="text-xs"
              />
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setModalDevolucaoAberta(false)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={handleConfirmarDevolucao}
              disabled={!motivoDevolucao}
            >
              Confirmar Devolução
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Solicitação de Documento */}
      <Dialog open={modalDocAberta} onOpenChange={setModalDocAberta}>
        <DialogContent className="max-w-md bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-cyan-400">
              <FileSearch className="w-5 h-5" />
              Solicitar Documento ao Cliente
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Envie um lembrete direto solicitando extrato, PDF de notas ou relatório de fechamento.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1.5">
              <label className="font-medium text-foreground">
                Descrição do documento necessário:
              </label>
              <Textarea
                rows={3}
                placeholder="Ex: Favor realizar o upload do arquivo XML da NF-e 4589 para validação da retenção de ISS..."
                value={mensagemDoc}
                onChange={(e) => setMensagemDoc(e.target.value)}
                className="text-xs"
              />
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setModalDocAberta(false)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              className="bg-primary text-primary-foreground"
              onClick={handleConfirmarSolicitarDoc}
              disabled={!mensagemDoc}
            >
              <Send className="w-3.5 h-3.5 mr-1.5" />
              Enviar Solicitação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
