import { useState } from 'react'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { AlertTriangle, Database, Loader2, ShieldCheck, Trash2 } from 'lucide-react'
import { excluirEmpresa } from '@/services/empresasService'
import { Empresa } from '@/types/dominus'

interface ModalExcluirEmpresaProps {
  aberto: boolean
  empresa: Empresa | null
  onFechar: () => void
  /** Chamado após a exclusão lógica + auditoria; recebe a razão social removida. */
  onExcluida: (empresa: Empresa) => void
  usuario: { id?: string; name?: string }
}

const FRASE_CONFIRMACAO = 'EXCLUIR'

export const ModalExcluirEmpresa: React.FC<ModalExcluirEmpresaProps> = ({
  aberto,
  empresa,
  onFechar,
  onExcluida,
  usuario,
}) => {
  const [digitado, setDigitado] = useState('')
  const [motivo, setMotivo] = useState('Erro de duplicidade')
  const [processando, setProcessando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const excluir = async () => {
    if (!empresa) return
    setProcessando(true)
    setErro(null)
    try {
      await excluirEmpresa(empresa, motivo.trim(), usuario)
      onExcluida(empresa)
    } catch (e) {
      console.error('Erro ao excluir empresa:', e)
      setErro('Não foi possível concluir a exclusão. Tente novamente.')
      setProcessando(false)
    }
  }

  const confirmacaoOk = digitado.trim().toUpperCase() === FRASE_CONFIRMACAO
  const podeConfirmar = confirmacaoOk && empresa != null && !processando
  const confirmar = () => {
    if (!confirmacaoOk) return
    excluir()
  }

  return (
    <Dialog open={aberto} onOpenChange={(novo) => !novo && !processando && onFechar()}>
      <DialogContent className="max-w-lg bg-card border-border text-foreground">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-400" />
            Excluir Empresa do Sistema
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Ação irreversível para o dia a dia do portal. A empresa{' '}
            <strong className="text-foreground">{empresa?.razao_social}</strong> deixa de constar em
            todas as listas do painel.
          </DialogDescription>
        </DialogHeader>

        {erro && (
          <div className="flex items-start gap-2 p-3 rounded-lg border border-rose-500/40 bg-rose-500/10 text-xs text-rose-400">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{erro}</span>
          </div>
        )}

        <div className="space-y-3 text-xs">
          <div className="p-3 rounded-lg border border-amber-500/40 bg-amber-500/10 space-y-2">
            <p className="font-semibold text-amber-400 flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5" />
              O que acontece com os dados
            </p>
            <ul className="space-y-1 text-[11px] text-muted-foreground">
              <li className="flex items-start gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-400" />
                A exclusão é lógica: <code>status_ativa = false</code> e <code>deleted_at</code>{' '}
                recebem a data/hora da ação.
              </li>
              <li className="flex items-start gap-1.5">
                <Database className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-400" />
                Lançamentos de faturamento, apurações, folha, documentos e comentários vinculados
                permanecem preservados para fins de auditoria fiscal.
              </li>
              <li className="flex items-start gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-400" />
                A ação é registrada na Trilha de Auditoria com o usuário, data/hora e o estado do
                cadastro antes da exclusão.
              </li>
            </ul>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="motivo-exclusao">Motivo da exclusão (registrado na auditoria)</Label>
            <Textarea
              id="motivo-exclusao"
              rows={2}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ex.: Cliente encerrou as atividades; cadastro duplicado."
              className="text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirmar-exclusao">
              Para confirmar, digite <span className="font-mono font-bold">EXCLUIR</span>
            </Label>
            <Input
              id="confirmar-exclusao"
              value={digitado}
              onChange={(e) => setDigitado(e.target.value)}
              placeholder="EXCLUIR"
              className="font-mono"
              autoComplete="off"
            />
            <p className="text-[11px] text-muted-foreground">
              A confirmação digitada é obrigatória. Não é possível desfazer por este painel.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onFechar}
            disabled={processando}
          >
            Cancelar
          </Button>
          <Button
            size="sm"
            onClick={confirmar}
            disabled={!podeConfirmar}
            className="bg-rose-600 hover:bg-rose-500 text-white font-semibold"
          >
            {processando ? (
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            ) : (
              <Trash2 className="w-3.5 h-3.5 mr-1.5" />
            )}
            {processando ? 'Excluindo...' : 'Excluir Definitivamente'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
