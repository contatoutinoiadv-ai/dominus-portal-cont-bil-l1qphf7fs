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
import { Checkbox } from '@/components/ui/checkbox'
import { ShieldCheck, Lock } from 'lucide-react'
import { useAuth } from '@/lib/pocketbase/authContext'

export const ModalLgpd: React.FC = () => {
  const { user, acceptLgpd } = useAuth()
  const [concordou, setConcordou] = useState(false)
  const [salvando, setSalvando] = useState(false)

  // Mostrar se usuário estiver logado e não tiver aceito ainda
  const aberto = !!user && !user.lgpd_accepted

  const handleAceitar = async () => {
    if (!concordou) return
    setSalvando(true)
    try {
      await acceptLgpd()
    } finally {
      setSalvando(false)
    }
  }

  if (!aberto) return null

  return (
    <Dialog open={aberto} onOpenChange={() => {}}>
      <DialogContent className="max-w-xl bg-card border-border text-foreground">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <DialogTitle className="text-xl font-semibold">
                Termo de Consentimento e Privacidade (LGPD)
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Lei Geral de Proteção de Dados (Lei nº 13.709/2018)
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-3 text-sm max-h-[340px] overflow-y-auto pr-2 border rounded-md p-3.5 bg-muted/30">
          <p className="font-medium text-foreground">
            Bem-vindo ao DOMINUS PORTAL CONTÁBIL. Para garantir a segurança institucional e o
            cumprimento legal de obrigações contábeis e fiscais, informamos como seus dados são
            tratados:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-xs text-muted-foreground leading-relaxed">
            <li>
              <strong>Finalidade:</strong> Coleta e processamento exclusivo de dados fiscais,
              receitas, folhas de pagamento e faturamentos para apuração tributária de sua empresa.
            </li>
            <li>
              <strong>Segurança e Isolamento:</strong> Seus dados são rigorosamente isolados no
              servidor. Usuários de outras empresas não possuem permissão de leitura nem gravação
              dos seus registros.
            </li>
            <li>
              <strong>Trilha de Auditoria:</strong> Toda inserção, alteração ou exclusão de dados é
              registrada com carimbo de data, hora e identificação de usuário para transparência
              fiscal e contábil.
            </li>
            <li>
              <strong>Compartilhamento:</strong> Apenas os contadores credenciados do escritório
              Dominus possuem acesso às suas informações para apuração e cumprimento de obrigações
              acessórias perante a Receita Federal, Estados e Municípios.
            </li>
          </ul>
        </div>

        <div className="flex items-center space-x-2 pt-2">
          <Checkbox
            id="lgpd-check"
            checked={concordou}
            onCheckedChange={(v) => setConcordou(!!v)}
          />
          <label
            htmlFor="lgpd-check"
            className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
          >
            Li e manifesto consentimento com as diretrizes de tratamento de dados e auditoria fiscal
            do Dominus Portal.
          </label>
        </div>

        <DialogFooter className="mt-4">
          <Button
            onClick={handleAceitar}
            disabled={!concordou || salvando}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
          >
            <Lock className="w-4 h-4 mr-2" />
            {salvando ? 'Registrando consentimento...' : 'Confirmar e Acessar o Portal'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
