import React, { useState, useEffect } from 'react'
import {
  Sparkles,
  Save,
  Play,
  RotateCcw,
  Eye,
  Sliders,
  Type,
  FileCode,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { IntroConfig, INTRO_CONFIG_FALLBACK, CenaIntro } from '@/config/introConfig'
import { carregarConfigIntro, salvarConfigIntro } from '@/services/introService'
import { ApresentacaoCinematografica } from '@/components/intro/ApresentacaoCinematografica'
import { useToast } from '@/hooks/use-toast'

export const VozDaDominusTela: React.FC = () => {
  const { toast } = useToast()
  const [config, setConfig] = useState<IntroConfig>(INTRO_CONFIG_FALLBACK)
  const [carregando, setCarregando] = useState<boolean>(true)
  const [salvando, setSalvando] = useState<boolean>(false)

  // Estados de pré-visualização
  const [previewAtivo, setPreviewAtivo] = useState<boolean>(false)
  const [modoPreview, setModoPreview] = useState<'completa' | 'curta'>('completa')

  useEffect(() => {
    carregarConfigIntro()
      .then((cfg) => {
        setConfig(cfg)
      })
      .finally(() => {
        setCarregando(false)
      })
  }, [])

  const handleSalvar = async () => {
    setSalvando(true)
    try {
      const atualizado = await salvarConfigIntro(config)
      setConfig(atualizado)
      toast({
        title: 'Configurações salvas com sucesso',
        description:
          'A apresentação pré-login foi atualizada em tempo real para todos os usuários.',
      })
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar',
        description: 'Não foi possível gravar as alterações. Tente novamente.',
      })
    } finally {
      setSalvando(false)
    }
  }

  const handleRestaurarPadrao = () => {
    if (confirm('Deseja restaurar os textos e tempos padrão da apresentação cinematográfica?')) {
      setConfig((prev) => ({
        ...INTRO_CONFIG_FALLBACK,
        id: prev.id,
      }))
      toast({
        title: 'Padrão restaurado',
        description: 'Clique em "Salvar Alterações" para aplicar no portal.',
      })
    }
  }

  const atualizarCena = (index: number, campo: keyof CenaIntro, valor: unknown) => {
    setConfig((prev) => {
      const novasCenas = [...prev.cenas]
      novasCenas[index] = {
        ...novasCenas[index],
        [campo]: valor,
      }
      return { ...prev, cenas: novasCenas }
    })
  }

  const atualizarDestaquesCena = (index: number, textoDestaques: string) => {
    const lista = textoDestaques
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    atualizarCena(index, 'destaques', lista)
  }

  const handleUploadSvgMonograma = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.svg') && file.type !== 'image/svg+xml') {
      alert('Selecione um arquivo no formato SVG.')
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const conteudo = event.target?.result as string
      if (conteudo && conteudo.includes('<svg')) {
        setConfig((prev) => ({ ...prev, svg_monograma: conteudo }))
        toast({
          title: 'SVG carregado',
          description: 'Monograma em SVG importado com sucesso.',
        })
      }
    }
    reader.readAsText(file)
  }

  const handleUploadSvgLogotipo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.svg') && file.type !== 'image/svg+xml') {
      alert('Selecione um arquivo no formato SVG.')
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const conteudo = event.target?.result as string
      if (conteudo && conteudo.includes('<svg')) {
        setConfig((prev) => ({ ...prev, svg_logotipo: conteudo }))
        toast({
          title: 'SVG carregado',
          description: 'Logotipo em SVG importado com sucesso.',
        })
      }
    }
    reader.readAsText(file)
  }

  return (
    <div className="space-y-6">
      {/* Visualização em tela cheia caso o preview esteja rodando */}
      {previewAtivo && (
        <ApresentacaoCinematografica
          modo={modoPreview}
          configCustomizada={config}
          isPrevisualizacao={true}
          onFinalizar={() => setPreviewAtivo(false)}
        />
      )}

      {/* Topo: Título e Ações */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold">
              <Sparkles className="w-4 h-4" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground font-heading">
              Voz da Dominus
            </h1>
            <Badge variant="outline" className="border-amber-500/40 text-amber-400 text-xs">
              Apresentação Pré-Login
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Configure e personalize as frases cinematográficas exibidas antes da tela de login,
            cores de destaque, upload de SVGs e chave geral de ativação.
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRestaurarPadrao}
            className="text-xs gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Restaurar Padrão
          </Button>

          <Button
            onClick={handleSalvar}
            disabled={salvando || carregando}
            className="text-xs bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold gap-1.5 shadow-md shadow-amber-500/20"
          >
            <Save className="w-3.5 h-3.5" />
            {salvando ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </div>
      </div>

      {/* Cartão de Controle Geral e Pré-Visualização */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Ativação Geral */}
        <Card className="border-border bg-card/60">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-semibold flex items-center justify-between">
              <span>Status da Apresentação</span>
              <Badge variant={config.ativo ? 'default' : 'secondary'}>
                {config.ativo ? 'Ativa no Portal' : 'Desativada'}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1 space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-xs font-medium">Exibir antes do login</Label>
                <p className="text-[11px] text-muted-foreground">
                  Se desativada, a tela de login entra direto.
                </p>
              </div>
              <Switch
                checked={config.ativo}
                onCheckedChange={(val) => setConfig((prev) => ({ ...prev, ativo: val }))}
              />
            </div>
          </CardContent>
        </Card>

        {/* Pré-visualizar no Navegador */}
        <Card className="border-border bg-card/60 md:col-span-2">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Eye className="w-4 h-4 text-amber-400" />
              <span>Testar e Pré-visualizar no Portal</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Rode a apresentação exatamente como o cliente enxerga, sem precisar fazer logout.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-2 flex flex-wrap gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setModoPreview('completa')
                setPreviewAtivo(true)
              }}
              className="text-xs gap-1.5 border-amber-500/30 hover:border-amber-500 text-amber-300"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Rolar Versão Completa (~12s)
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setModoPreview('curta')
                setPreviewAtivo(true)
              }}
              className="text-xs gap-1.5 border-cyan-500/30 hover:border-cyan-500 text-cyan-300"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Rolar Versão Curta (~3s)
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Abas: Cenas do Roteiro / Identidade Visual e SVGs */}
      <Tabs defaultValue="cenas" className="w-full">
        <TabsList className="bg-muted/40 border border-border">
          <TabsTrigger value="cenas" className="text-xs gap-1.5">
            <Type className="w-3.5 h-3.5" />
            Roteiro e Frases por Cena
          </TabsTrigger>
          <TabsTrigger value="identidade" className="text-xs gap-1.5">
            <Sliders className="w-3.5 h-3.5" />
            Cores e SVGs da Marca
          </TabsTrigger>
        </TabsList>

        {/* Aba 1: Edição do Roteiro */}
        <TabsContent value="cenas" className="space-y-4 mt-4">
          {/* Assinatura da marca */}
          <Card className="border-border">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-semibold">Assinatura da Marca</CardTitle>
              <CardDescription className="text-xs">
                Frase menor que surge abaixo do monograma na Cena 1 e na versão curta.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-2">
              <Input
                value={config.assinatura}
                onChange={(e) => setConfig((prev) => ({ ...prev, assinatura: e.target.value }))}
                placeholder="Ex: Contabilidade que pensa à frente."
                className="bg-muted/30 text-sm font-medium"
              />
            </CardContent>
          </Card>

          {/* Cenas individuais */}
          <div className="space-y-4">
            {config.cenas.map((cena, index) => (
              <Card key={cena.id || index} className="border-border bg-card/40">
                <CardHeader className="p-4 pb-3 flex flex-row items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center font-mono text-[11px] font-bold">
                        {cena.id}
                      </span>
                      <CardTitle className="text-sm font-semibold">
                        CENA {cena.id}: {cena.titulo}
                      </CardTitle>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-4 pt-0 space-y-3">
                  {/* Cena 1: Monograma */}
                  {cena.id === 1 && (
                    <div className="p-3 rounded-lg bg-muted/20 border border-border/60 text-xs text-muted-foreground space-y-1">
                      <p className="font-semibold text-foreground">Abertura com Monograma</p>
                      <p>
                        O monograma DOMINUS se desenha em traço dourado no centro da tela. Em
                        seguida, as letras "D O M I N U S" aparecem uma a uma, seguidas pela
                        assinatura da marca.
                      </p>
                    </div>
                  )}

                  {/* Cenas 2 a 5: Frases com desvanecimento */}
                  {cena.id >= 2 && cena.id <= 5 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-300">
                          Primeira Frase
                        </Label>
                        <Textarea
                          rows={2}
                          value={cena.frase1 || ''}
                          onChange={(e) => atualizarCena(index, 'frase1', e.target.value)}
                          className="bg-muted/30 text-xs leading-relaxed"
                          placeholder="Digite a primeira frase centralizada..."
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-300">
                          Segunda Frase (desvanecimento)
                        </Label>
                        <Textarea
                          rows={2}
                          value={cena.frase2 || ''}
                          onChange={(e) => atualizarCena(index, 'frase2', e.target.value)}
                          className="bg-muted/30 text-xs leading-relaxed"
                          placeholder="Digite a segunda frase da transição..."
                        />
                      </div>

                      <div className="md:col-span-2 space-y-1">
                        <Label className="text-xs text-amber-300/90 font-medium">
                          Palavras-chave em Ouro Champanhe (separadas por vírgula)
                        </Label>
                        <Input
                          value={(cena.destaques || []).join(', ')}
                          onChange={(e) => atualizarDestaquesCena(index, e.target.value)}
                          placeholder="Ex: Dominus, seu negócio, tempo real"
                          className="bg-muted/30 text-xs text-amber-400"
                        />
                      </div>
                    </div>
                  )}

                  {/* Cena 6: Convite e Transição */}
                  {cena.id === 6 && (
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-300">
                          Frase de Acesso ao Painel
                        </Label>
                        <Input
                          value={cena.frase1 || ''}
                          onChange={(e) => atualizarCena(index, 'frase1', e.target.value)}
                          className="bg-muted/30 text-xs"
                          placeholder="Acesse seu painel."
                        />
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Nesta cena final, o monograma reaparece menor no centro, a aurora se
                        concentra em um ponto de luz e se dissolve, revelando a tela de login.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Aba 2: Identidade Visual, Cores e SVGs */}
        <TabsContent value="identidade" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Cor de Destaque */}
            <Card className="border-border">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm font-semibold">
                  Cor de Destaque das Palavras
                </CardTitle>
                <CardDescription className="text-xs">
                  Padrão: Ouro Champanhe da paleta DOMINUS (#f59e0b).
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-2 space-y-3">
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={config.cor_destaque || '#f59e0b'}
                    onChange={(e) =>
                      setConfig((prev) => ({ ...prev, cor_destaque: e.target.value }))
                    }
                    className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border border-border"
                  />
                  <Input
                    value={config.cor_destaque || '#f59e0b'}
                    onChange={(e) =>
                      setConfig((prev) => ({ ...prev, cor_destaque: e.target.value }))
                    }
                    className="bg-muted/30 font-mono text-xs uppercase"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Duração Versão Curta */}
            <Card className="border-border">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm font-semibold">
                  Duração da Versão Curta (ms)
                </CardTitle>
                <CardDescription className="text-xs">
                  Para visitas recorrentes (padrão: 3000 ms).
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-2 space-y-3">
                <Input
                  type="number"
                  min={1500}
                  max={6000}
                  step={500}
                  value={config.duracao_versao_curta_ms || 3000}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      duracao_versao_curta_ms: parseInt(e.target.value, 10) || 3000,
                    }))
                  }
                  className="bg-muted/30 font-mono text-xs"
                />
              </CardContent>
            </Card>

            {/* Upload Monograma SVG */}
            <Card className="border-border">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm font-semibold flex items-center justify-between">
                  <span>Monograma em SVG</span>
                  {config.svg_monograma ? (
                    <Badge variant="default" className="text-[10px]">
                      Personalizado
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px]">
                      Padrão em Código
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription className="text-xs">
                  Substitua o desenho vetorial animado do monograma sem mexer em código.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-2 space-y-3">
                <input
                  type="file"
                  accept=".svg,image/svg+xml"
                  onChange={handleUploadSvgMonograma}
                  className="text-xs text-muted-foreground file:mr-2 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-primary-foreground hover:file:opacity-80"
                />
                {config.svg_monograma && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setConfig((prev) => ({ ...prev, svg_monograma: '' }))}
                    className="text-xs text-rose-400 hover:text-rose-300"
                  >
                    Remover SVG e usar padrão
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Upload Logotipo SVG */}
            <Card className="border-border">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm font-semibold flex items-center justify-between">
                  <span>Logotipo em SVG</span>
                  {config.svg_logotipo ? (
                    <Badge variant="default" className="text-[10px]">
                      Personalizado
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px]">
                      Padrão em Código
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription className="text-xs">
                  Vetor da marca completa para transições de marca.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-2 space-y-3">
                <input
                  type="file"
                  accept=".svg,image/svg+xml"
                  onChange={handleUploadSvgLogotipo}
                  className="text-xs text-muted-foreground file:mr-2 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-primary-foreground hover:file:opacity-80"
                />
                {config.svg_logotipo && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setConfig((prev) => ({ ...prev, svg_logotipo: '' }))}
                    className="text-xs text-rose-400 hover:text-rose-300"
                  >
                    Remover SVG e usar padrão
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
