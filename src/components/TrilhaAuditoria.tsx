import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table'
import { History, ShieldCheck, User } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { AuditoriaLog } from '@/types/dominus'

export const TrilhaAuditoria: React.FC = () => {
  const [logs, setLogs] = useState<AuditoriaLog[]>([])
  const [carregando, setCarregando] = useState(true)

  const carregarLogs = useCallback(async () => {
    setCarregando(true)
    try {
      const res = await pb.collection('auditoria').getList(1, 100, {
        sort: '-created',
      })
      setLogs(res.items as unknown as AuditoriaLog[])
    } catch (e) {
      console.warn('Erro ao carregar auditoria:', e)
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    carregarLogs()
  }, [carregarLogs])

  const badgeAcao = (acao: string) => {
    if (acao.includes('CRIADO')) {
      return (
        <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[9px]">
          {acao}
        </Badge>
      )
    }
    if (acao.includes('ALTERADO') || acao.includes('DEVOLVIDO')) {
      return (
        <Badge className="bg-amber-500/15 text-amber-400 border border-amber-500/30 text-[9px]">
          {acao}
        </Badge>
      )
    }
    if (acao.includes('VALIDADO')) {
      return (
        <Badge className="bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 text-[9px]">
          {acao}
        </Badge>
      )
    }
    if (acao.includes('EXCLUIDO')) {
      return (
        <Badge className="bg-rose-500/15 text-rose-400 border border-rose-500/30 text-[9px]">
          {acao}
        </Badge>
      )
    }
    return (
      <Badge variant="outline" className="text-[9px]">
        {acao}
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          Trilha de Auditoria e Conformidade LGPD
        </h2>
        <p className="text-xs text-muted-foreground">
          Registro imutável de todas as ações de faturamento, enquadramento e acessos com carimbo de
          data e hora.
        </p>
      </div>

      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-primary" />
            Logs Recentes de Atividades no Sistema ({logs.length})
          </CardTitle>
          <CardDescription className="text-xs">
            Isolamento e rastreabilidade total de dados para segurança contábil e fiscal.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="text-xs">
                <TableHead>Data / Hora</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead>Perfil</TableHead>
                <TableHead>Ação</TableHead>
                <TableHead>Entidade</TableHead>
                <TableHead>Detalhes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="text-xs">
              {carregando ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                    Carregando trilha de auditoria...
                  </TableCell>
                </TableRow>
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                    Nenhum registro de auditoria gravado até o momento.
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-mono text-muted-foreground whitespace-nowrap">
                      {new Date(log.created).toLocaleString('pt-BR')}
                    </TableCell>
                    <TableCell>
                      <div className="font-semibold text-foreground flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-muted-foreground" />
                        {log.usuario_nome}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="capitalize text-muted-foreground">{log.usuario_role}</span>
                    </TableCell>
                    <TableCell>{badgeAcao(log.acao)}</TableCell>
                    <TableCell className="font-mono text-[11px] text-muted-foreground">
                      {log.entidade}
                    </TableCell>
                    <TableCell className="text-foreground max-w-xs truncate" title={log.detalhes}>
                      {log.detalhes || 'Sem detalhes adicionais'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
