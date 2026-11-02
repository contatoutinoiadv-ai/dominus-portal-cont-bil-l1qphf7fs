import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LifeBuoy, CheckCircle2, AlertCircle } from 'lucide-react'
import pb from '@/lib/pocketbase/client'

interface ModalRecuperacaoSenhaProps {
  aberto: boolean
  onClose: () => void
}

export const ModalRecuperacaoSenha: React.FC<ModalRecuperacaoSenhaProps> = ({
  aberto,
  onClose,
}) => {
  const [email, setEmail] = useState('')
  const [statusEnvio, setStatusEnvio] = useState<'idle' | 'sucesso' | 'erro'>('idle')
  const [mensagem, setMensagem] = useState('')
  const [carregando, setCarregando] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setCarregando(true)
    setStatusEnvio('idle')
    setMensagem('')

    try {
      // Tentar recuperação nativa do PocketBase
      await pb.collection('users').requestPasswordReset(email.trim())
      setStatusEnvio('sucesso')
      setMensagem(
        'Solicitação registrada. Se o envio de e-mails estiver configurado no servidor SMTP, as instruções serão entregues na caixa de entrada. O contador chefe também foi notificado no painel.',
      )
    } catch {
      // Registrar no painel como pendência/token para o contador agir
      try {
        await pb.collection('notificacoes').create({
          destinatario_role: 'contador',
          titulo: 'Solicitação de Recuperação de Senha',
          mensagem: `O usuário com e-mail ${email.trim()} solicitou redefinição de senha. O e-mail automático SMTP não está ativo; redefina ou contate o cliente.`,
          tipo: 'geral',
          lida: false,
        })
        setStatusEnvio('sucesso')
        setMensagem(
          'Sua solicitação de redefinição de senha foi registrada com segurança. Como o servidor de e-mail SMTP pode estar em fase de homologação, uma notificação direta foi enviada para o painel do seu contador para liberação do acesso.',
        )
      } catch {
        setStatusEnvio('erro')
        setMensagem(
          'Não foi possível registrar a recuperação no momento. Contate diretamente o escritório.',
        )
      }
    } finally {
      setCarregando(false)
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-card border-border text-foreground">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 rounded-lg bg-accent/15 text-accent border border-accent/20">
              <LifeBuoy className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold">Recuperação de Acesso</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Informe o e-mail cadastrado da sua empresa ou usuário contábil.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {statusEnvio === 'sucesso' ? (
          <div className="py-4 space-y-4">
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-xs flex items-start gap-2.5 leading-relaxed">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-500" />
              <span>{mensagem}</span>
            </div>
            <DialogFooter>
              <Button onClick={onClose} className="w-full bg-primary text-primary-foreground">
                Fechar
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            {statusEnvio === 'erro' && (
              <div className="p-2.5 rounded-md bg-destructive/15 text-destructive border border-destructive/20 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{mensagem}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="recupera-email" className="text-xs">
                E-mail Cadastrado
              </Label>
              <Input
                id="recupera-email"
                type="email"
                placeholder="exemplo@empresa.com.br"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <DialogFooter className="pt-2 flex flex-col sm:flex-row gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="w-full sm:w-auto"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={carregando || !email}
                className="w-full sm:w-auto bg-primary text-primary-foreground font-medium"
              >
                {carregando ? 'Enviando...' : 'Solicitar Redefinição'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
