import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { CalendarDays, Plus, CheckCircle2, AlertCircle, Clock, Calendar } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { CalendarioEvento } from '@/types/dominus'

export const CalendarioFiscal: React.FC = () => {
  const [eventos, setEventos] = useState<CalendarioEvento[]>([])
  const [carregando, setCarregando] = useState(true)
  const [modalNovoAberto, setModalNovoAberto] = useState(false)

  const [novoEvento, setNovoEvento] = useState({
    competencia: '2025-05',
    obrigacao: '',
    data_vencimento: '2025-05-20',
    tipo: 'das' as 'das' | 'dctfweb' | 'trimestral' | 'envio_faturamento' | 'interno',
    status: 'pendente' as 'pendente' | 'concluido' | 'atrasado',
    descricao: '',
  })

  const carregarEventos = useCallback(async () => {
    setCarregando(true)
    try {
      const res = await pb.collection('calendario_fiscal').getList(1, 50, {
        sort: 'data_vencimento',
      })
      setEventos(res.items as unknown as CalendarioEvento[])
    } catch (e) {
      console.warn('Erro ao carregar calendário:', e)
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    carregarEventos()
  }, [carregarEventos])

  const handleSalvarEvento = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await pb.collection('calendario_fiscal').create(novoEvento)
      setModalNovoAberto(false)
      setNovoEvento({
        competencia: '2025-05',
        obrigacao: '',
        data_vencimento: '2025-05-20',
        tipo: 'das',
        status: 'pendente',
        descricao: '',
      })
      carregarEventos()
    } catch (e) {
      console.error(e)
    }
  }

  const handleConcluirEvento = async (id: string) => {
    try {
      await pb.collection('calendario_fiscal').update(id, { status: 'concluido' })
      carregarEventos()
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Calendário de Obrigações Fiscais</h2>
          <p className="text-xs text-muted-foreground">
            Vencimentos federais, estaduais e prazos internos de faturamento da carteira.
          </p>
        </div>
        <Button
          onClick={() => setModalNovoAberto(true)}
          className="bg-primary text-primary-foreground text-xs font-semibold"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Adicionar Vencimento
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Vencimentos Próximos */}
        <div className="md:col-span-2 space-y-3">
          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-primary" />
                Cronograma de Vencimentos do Mês
              </CardTitle>
              <CardDescription className="text-xs">
                Guia DAS, DCTFWeb Previdenciária e Prazos do Escritório.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {carregando ? (
                <p className="text-xs text-muted-foreground py-4 text-center">
                  Carregando cronograma...
                </p>
              ) : eventos.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">
                  Nenhuma obrigação registrada.
                </p>
              ) : (
                eventos.map((ev) => (
                  <div
                    key={ev.id}
                    className="p-3.5 rounded-xl border border-border bg-muted/15 flex items-center justify-between text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <strong className="text-foreground font-semibold">{ev.obrigacao}</strong>
                        <Badge variant="outline" className="text-[9px] uppercase font-mono">
                          {ev.tipo}
                        </Badge>
                        {ev.status === 'concluido' ? (
                          <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[9px]">
                            Concluído
                          </Badge>
                        ) : (
                          <Badge className="bg-amber-500/15 text-amber-400 border border-amber-500/30 text-[9px]">
                            Pendente
                          </Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground">{ev.descricao}</p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-[10px] text-muted-foreground block uppercase">
                          Vencimento
                        </span>
                        <span className="font-mono font-bold text-primary">
                          {ev.data_vencimento.split('-').reverse().join('/')}
                        </span>
                      </div>
                      {ev.status !== 'concluido' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleConcluirEvento(ev.id)}
                          className="h-8 text-emerald-400 hover:text-emerald-300"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Lembretes Automáticos */}
        <div className="space-y-4">
          <Card className="border-border bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Clock className="w-4 h-4 text-accent" />
                Lembretes Automáticos aos Clientes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs text-muted-foreground">
              <div className="p-3 rounded-lg bg-muted/30 border border-border space-y-1">
                <strong className="text-foreground block">Cronograma de Disparos:</strong>
                <p>
                  • <strong>Dia 1 do mês:</strong> Aviso de abertura da competência.
                </p>
                <p>
                  • <strong>Dia 3 do mês:</strong> Lembrete de pendência para quem não transmitiu.
                </p>
                <p>
                  • <strong>Dia 5 do mês:</strong> Alerta urgente de prazo final para emissão das
                  guias.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 text-primary">
                <p className="text-[11px] font-medium leading-relaxed">
                  Preparado para integração futura via WhatsApp API e SMTP de e-mail institucional
                  do escritório.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal Novo Vencimento */}
      <Dialog open={modalNovoAberto} onOpenChange={setModalNovoAberto}>
        <DialogContent className="max-w-md bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Novo Vencimento Fiscal</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Cadastre datas limites para acompanhamento da equipe contábil.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSalvarEvento} className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <label>Nome da Obrigação</label>
              <Input
                required
                placeholder="Ex: Vencimento DAS Mensal"
                value={novoEvento.obrigacao}
                onChange={(e) => setNovoEvento({ ...novoEvento, obrigacao: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label>Data Vencimento</label>
                <Input
                  type="date"
                  required
                  value={novoEvento.data_vencimento}
                  onChange={(e) =>
                    setNovoEvento({ ...novoEvento, data_vencimento: e.target.value })
                  }
                />
              </div>

              <div className="space-y-1">
                <label>Tipo</label>
                <select
                  value={novoEvento.tipo}
                  onChange={(e) =>
                    setNovoEvento({
                      ...novoEvento,
                      tipo: e.target.value as
                        | 'das'
                        | 'dctfweb'
                        | 'trimestral'
                        | 'envio_faturamento'
                        | 'interno',
                    })
                  }
                  className="w-full bg-muted/50 border border-border rounded-lg px-2.5 py-2 text-foreground"
                >
                  <option value="das">Guia DAS</option>
                  <option value="dctfweb">DCTFWeb</option>
                  <option value="trimestral">Trimestral (IRPJ/CSLL)</option>
                  <option value="envio_faturamento">Envio de Faturamento</option>
                  <option value="interno">Prazo Interno</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label>Descrição</label>
              <Input
                placeholder="Ex: Emissão e entrega das guias de arrecadação"
                value={novoEvento.descricao}
                onChange={(e) => setNovoEvento({ ...novoEvento, descricao: e.target.value })}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalNovoAberto(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-primary text-primary-foreground font-semibold"
              >
                Salvar Vencimento
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
