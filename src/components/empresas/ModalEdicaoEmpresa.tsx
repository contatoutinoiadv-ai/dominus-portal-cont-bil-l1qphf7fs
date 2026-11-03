import { useEffect, useMemo, useState } from 'react'
import { Label } from '@/components/ui/label'
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
import {
  Building2,
  Save,
  AlertCircle,
  Loader2,
  Pencil,
  FileText,
  MapPin,
  Sliders,
  ListChecks,
} from 'lucide-react'
import { RegimeTributario } from '@/types/dominus'
import {
  AlteracaoCampo,
  DadosEdicaoEmpresa,
  detectarAlteracoesCadastro,
  extrairDadosEdicao,
  mascararCnpjInput,
  temErros,
  validarDadosEdicao,
} from '@/services/empresasService'
import { Empresa } from '@/types/dominus'

const REGIMES: RegimeTributario[] = ['MEI', 'Simples Nacional', 'Lucro Presumido', 'Lucro Real']

interface ModalEdicaoEmpresaProps {
  aberto: boolean
  empresa: Empresa | null
  onFechar: () => void
  /** Deve retornar null em caso de sucesso ou a mensagem de erro a exibir. */
  onSalvar: (dados: DadosEdicaoEmpresa) => Promise<string | null>
}

function CampoErro({ mensagem }: { mensagem?: string }) {
  if (!mensagem) return null
  return (
    <p className="flex items-center gap-1 text-[11px] text-rose-400 mt-1">
      <AlertCircle className="w-3 h-3" />
      {mensagem}
    </p>
  )
}

function ResumoAlteracao({ alteracao }: { alteracao: AlteracaoCampo }) {
  const antes = String(alteracao.anterior ?? '').trim()
  const depois = String(alteracao.novo ?? '').trim()
  return (
    <li className="text-[11px] text-muted-foreground leading-relaxed">
      <span className="font-semibold text-foreground capitalize">{alteracao.rotulo}</span>
      {antes ? (
        <>
          : de <span className="line-through opacity-70">{antes}</span> para{' '}
          <span className="text-foreground">{depois || '(vazio)'}</span>
        </>
      ) : (
        <>
          : para <span className="text-foreground">{depois}</span>
        </>
      )}
    </li>
  )
}

export const ModalEdicaoEmpresa: React.FC<ModalEdicaoEmpresaProps> = ({
  aberto,
  empresa,
  onFechar,
  onSalvar,
}) => {
  const dadosIniciais = useMemo(
    () => (empresa ? extrairDadosEdicao(empresa) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [empresa?.id],
  )
  const [dados, setDados] = useState<DadosEdicaoEmpresa | null>(dadosIniciais)
  const [erros, setErros] = useState<Record<string, string>>({})
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    if (aberto && empresa) {
      setDados(extrairDadosEdicao(empresa))
      setErros({})
      setSalvando(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto, empresa?.id])

  if (!empresa || !dados) return null

  const alteracoes = detectarAlteracoesCadastro(empresa, dados)
  const errosCalculados = validarDadosEdicao(dados)

  const atualizar = <K extends keyof DadosEdicaoEmpresa>(
    campo: K,
    valor: DadosEdicaoEmpresa[K],
  ) => {
    setDados((atual) => (atual ? { ...atual, [campo]: valor } : atual))
  }

  const confirmar = async () => {
    const errosForm = validarDadosEdicao(dados)
    setErros(errosForm)
    if (temErros(errosForm)) return
    setSalvando(true)
    try {
      const erro = await onSalvar(dados)
      if (erro) setErros({ geral: erro })
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={(novo) => !novo && !salvando && onFechar()}>
      <DialogContent className="max-w-2xl bg-card border-border text-foreground max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <Pencil className="w-5 h-5 text-primary" />
            Editar Cadastro da Empresa
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Atualize os dados cadastrais e o regime tributário vigente de{' '}
            <strong className="text-foreground">{empresa.razao_social}</strong>. As alterações são
            registradas na Trilha de Auditoria.
          </DialogDescription>
        </DialogHeader>

        {erros.geral && (
          <div className="flex items-start gap-2 p-3 rounded-lg border border-rose-500/40 bg-rose-500/10 text-xs text-rose-400">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{erros.geral}</span>
          </div>
        )}

        <div className="space-y-4 py-1 text-xs">
          <section className="space-y-3">
            <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <Building2 className="w-3.5 h-3.5 text-primary" />
              Identificação
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1 sm:col-span-2">
                <Label>Razão Social</Label>
                <Input
                  value={dados.razao_social}
                  onChange={(e) => atualizar('razao_social', e.target.value)}
                  placeholder="Ex.: Sigma Consultoria LTDA"
                  className="text-xs"
                />
                <CampoErro mensagem={erros.razao_social} />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label>Nome Fantasia</Label>
                <Input
                  value={dados.nome_fantasia}
                  onChange={(e) => atualizar('nome_fantasia', e.target.value)}
                  placeholder="Ex.: Sigma Tech"
                  className="text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label>CNPJ</Label>
                <Input
                  value={dados.cnpj}
                  onChange={(e) => atualizar('cnpj', mascararCnpjInput(e.target.value))}
                  placeholder="00.000.000/0001-00"
                  className="font-mono text-xs"
                />
                <CampoErro mensagem={erros.cnpj} />
              </div>
              <div className="space-y-1">
                <Label>Data de Abertura</Label>
                <Input
                  type="date"
                  value={dados.data_abertura}
                  onChange={(e) => atualizar('data_abertura', e.target.value)}
                  className="text-xs"
                />
                <CampoErro mensagem={erros.data_abertura} />
              </div>
            </div>
          </section>

          <section className="space-y-3 border-t border-border pt-4">
            <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <MapPin className="w-3.5 h-3.5 text-primary" />
              Localização e Contato do Responsável
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label>Município</Label>
                <Input
                  value={dados.municipio}
                  onChange={(e) => atualizar('municipio', e.target.value)}
                  placeholder="Ex.: São Paulo"
                  className="text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label>UF</Label>
                <Input
                  value={dados.uf}
                  maxLength={2}
                  onChange={(e) => atualizar('uf', e.target.value.toUpperCase())}
                  placeholder="SP"
                  className="uppercase text-xs"
                />
                <CampoErro mensagem={erros.uf} />
              </div>
              <div className="space-y-1 sm:col-span-1">
                <Label>Telefone do Responsável</Label>
                <Input
                  value={dados.telefone_responsavel}
                  onChange={(e) => atualizar('telefone_responsavel', e.target.value)}
                  placeholder="(00) 00000-0000"
                  className="text-xs"
                />
              </div>
              <div className="space-y-1 sm:col-span-3">
                <Label>E-mail do Responsável</Label>
                <Input
                  type="email"
                  value={dados.email_responsavel}
                  onChange={(e) => atualizar('email_responsavel', e.target.value)}
                  placeholder="contato@empresa.com.br"
                  className="text-xs"
                />
                <CampoErro mensagem={erros.email_responsavel} />
              </div>
            </div>
          </section>

          <section className="space-y-3 border-t border-border pt-4">
            <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <Sliders className="w-3.5 h-3.5 text-primary" />
              Regime Tributário
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Regime Vigente</Label>
                <select
                  value={dados.regime_vigente}
                  onChange={(e) => atualizar('regime_vigente', e.target.value as RegimeTributario)}
                  className="w-full bg-muted/50 border border-border rounded-lg px-2.5 py-2 text-foreground text-xs"
                >
                  {REGIMES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label>Data de Início no Regime</Label>
                <Input
                  type="date"
                  value={dados.data_inicio_regime}
                  onChange={(e) => atualizar('data_inicio_regime', e.target.value)}
                  className="text-xs"
                />
                <CampoErro mensagem={erros.data_inicio_regime} />
              </div>
            </div>
            <div className="flex items-start gap-2 p-2.5 rounded-lg border border-border bg-muted/20 text-[11px] text-muted-foreground">
              <FileText className="w-3.5 h-3.5 mt-0.5 shrink-0 text-primary" />
              <span>
                A alteração do regime vigente na ficha cadastral registra a mudança na Trilha de
                Auditoria. A vigência formal por competência permanece no bloco de enquadramento
                fiscal da tela.
              </span>
            </div>
          </section>

          <section className="border-t border-border pt-4 space-y-2">
            <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <ListChecks className="w-3.5 h-3.5 text-primary" />
              Resumo para Auditoria ({alteracoes.length}{' '}
              {alteracoes.length === 1 ? 'campo alterado' : 'campos alterados'})
            </div>
            {alteracoes.length === 0 ? (
              <p className="text-[11px] text-muted-foreground">
                Nenhuma alteração pendente: os dados estão iguais ao cadastro atual.
              </p>
            ) : (
              <ul className="p-2.5 rounded-lg border border-border bg-muted/10 space-y-1">
                {alteracoes.map((a) => (
                  <ResumoAlteracao key={a.campo} alteracao={a} />
                ))}
              </ul>
            )}
          </section>
        </div>

        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onFechar} disabled={salvando}>
            Cancelar
          </Button>
          <Button
            size="sm"
            onClick={confirmar}
            disabled={salvando || temErros(errosCalculados)}
            className="bg-primary text-primary-foreground font-semibold"
          >
            {salvando ? (
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5 mr-1.5" />
            )}
            {salvando ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
