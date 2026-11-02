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
import { KeyRound, AlertCircle } from 'lucide-react'
import { useAuth } from '@/lib/pocketbase/authContext'

export const ModalTrocaSenhaObrigatoria: React.FC = () => {
  const { user, changePassword } = useAuth()
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmaSenha, setConfirmaSenha] = useState('')
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)

  const aberto = !!user && !!user.must_change_password

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro('')
    if (novaSenha.length < 8) {
      setErro('A nova senha deve possuir no mínimo 8 caracteres.')
      return
    }
    if (novaSenha !== confirmaSenha) {
      setErro('A confirmação da senha não coincide com a nova senha.')
      return
    }

    setSalvando(true)
    const res = await changePassword(novaSenha)
    setSalvando(false)
    if (!res.success) {
      setErro(res.error || 'Erro ao alterar senha.')
    }
  }

  if (!aberto) return null

  return (
    <Dialog open={aberto} onOpenChange={() => {}}>
      <DialogContent className="max-w-md bg-card border-border text-foreground">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 rounded-lg bg-primary/10 text-primary border border-primary/20">
              <KeyRound className="w-6 h-6" />
            </div>
            <div>
              <DialogTitle className="text-xl font-semibold">
                Troca Obrigatória de Senha
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Por motivos de segurança no primeiro acesso, defina uma nova senha forte.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {erro && (
            <div className="p-2.5 rounded-md bg-destructive/15 text-destructive border border-destructive/20 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{erro}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="nova-senha">Nova Senha (mínimo 8 dígitos)</Label>
            <Input
              id="nova-senha"
              type="password"
              placeholder="••••••••"
              value={novaSenha}
              onChange={(e) => setNovaSenha(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirma-senha">Confirme a Nova Senha</Label>
            <Input
              id="confirma-senha"
              type="password"
              placeholder="••••••••"
              value={confirmaSenha}
              onChange={(e) => setConfirmaSenha(e.target.value)}
              required
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="submit"
              disabled={salvando}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
            >
              {salvando ? 'Atualizando senha...' : 'Salvar Nova Senha'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
