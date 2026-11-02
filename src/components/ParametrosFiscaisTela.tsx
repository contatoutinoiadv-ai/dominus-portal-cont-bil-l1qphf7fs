import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Sliders,
  CheckCircle,
  AlertTriangle,
  FileCode,
  Calendar,
  Layers,
  Sparkles,
  Lock,
} from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/lib/pocketbase/authContext'
import { registrarLogAuditoria } from '@/lib/pocketbase/auditService'

interface ParametroRegistro {
  id: string
  codigo: string
  tipo: string
  descricao: string
  dados_json: string
  vigencia_inicio: string
  vigencia_fim?: string
  versao: string
  ativo: boolean
  conferido_pelo_contador: boolean
  updated: string
}

export const ParametrosFiscaisTela: React.FC = () => {
  const { user } = useAuth()
  const [parametros, setParametros] = useState<ParametroRegistro[]>([])
  const [parametroSelecionado, setParametroSelecionado] = useState<ParametroRegistro | null>(null)
  const [jsonEditavel, setJsonEditavel] = useState<string>('')
  const [vigenciaInicio, setVigenciaInicio] = useState<string>('')
  const [versao, setVersao] = useState<string>('')
  const [conferido, setConferido] = useState<boolean>(true)
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erroJson, setErroJson] = useState<string>('')

  const carregarParametros = useCallback(async () => {
    setCarregando(true)
    try {
      const res = await pb.collection('parametros_fiscais').getList(1, 50, {
        sort: 'codigo',
      })
      const itens = res.items as unknown as ParametroRegistro[]
      setParametros(itens)
      if (itens.length > 0 && !parametroSelecionado) {
        selecionarItem(itens[0])
      }
    } catch (e) {
      console.warn('Erro ao carregar parâmetros fiscais:', e)
    } finally {
      setCarregando(false)
    }
  }, [parametroSelecionado])

  const selecionarItem = (item: ParametroRegistro) => {
    setParametroSelecionado(item)
    try {
      // Formatar JSON com indentação para edição confortável
      const parsed = JSON.parse(item.dados_json)
      setJsonEditavel(JSON.stringify(parsed, null, 2))
    } catch {
      setJsonEditavel(item.dados_json)
    }
    setVigenciaInicio(item.vigencia_inicio)
    setVersao(item.versao)
    setConferido(item.conferido_pelo_contador)
    setErroJson('')
  }

  useEffect(() => {
    carregarParametros()
  }, [carregarParametros])

  const handleSalvarParametro = async () => {
    if (!parametroSelecionado) return
    setErroJson('')

    // Validar JSON
    try {
      JSON.parse(jsonEditavel)
    } catch {
      setErroJson('JSON inválido. Corrija a sintaxe antes de salvar.')
      return
    }

    setSalvando(true)
    try {
      await pb.collection('parametros_fiscais').update(parametroSelecionado.id, {
        dados_json: jsonEditavel,
        vigencia_inicio: vigenciaInicio,
        versao,
        conferido_pelo_contador: conferido,
      })

      await registrarLogAuditoria({
        usuarioId: user?.id || '',
        usuarioNome: user?.name || 'Contador',
        usuarioRole: 'contador',
        acao: 'PARAMETRO_ALTERADO',
        entidade: 'parametros_fiscais',
        entidadeId: parametroSelecionado.id,
        detalhes: `Parâmetro fiscal ${parametroSelecionado.codigo} atualizado com vigência a partir de ${vigenciaInicio}.`,
      })

      alert('Parâmetros fiscais atualizados com sucesso no banco de dados!')
      carregarParametros()
    } catch (e) {
      console.error(e)
      alert('Erro ao salvar parâmetros fiscais.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Parâmetros Fiscais Parametrizáveis</h2>
          <p className="text-xs text-muted-foreground">
            Todas as alíquotas, faixas e regras armazenadas em banco, editáveis com vigência
            temporal sem alteração de código.
          </p>
        </div>
      </div>

      {/* Banner de Aviso de Conferência */}
      <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 shrink-0 text-amber-400 mt-0.5" />
        <div className="space-y-1">
          <strong className="text-amber-200 font-semibold block">
            Atenção Contábil — Conferência Obrigatória das Tabelas Vigentes:
          </strong>
          <p className="text-amber-300/90 leading-relaxed">
            Os valores padrão 2025 foram pré-carregados no sistema (Anexos I a V da LC 123/2006,
            INSS MEI, presunções e Reforma Tributária). O contador responsável deve conferir
            anualmente os índices antes de rodar os cálculos oficiais.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Lista de Conjuntos de Parâmetros */}
        <div className="lg:col-span-4 space-y-2">
          <Card className="border-border bg-card">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Sliders className="w-4 h-4 text-primary" />
                Conjuntos de Regras ({parametros.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2 space-y-1.5">
              {carregando ? (
                <p className="text-xs text-muted-foreground p-3">Carregando tabelas...</p>
              ) : (
                parametros.map((item) => {
                  const sel = parametroSelecionado?.id === item.id
                  return (
                    <button
                      key={item.id}
                      onClick={() => selecionarItem(item)}
                      className={`w-full text-left p-3 rounded-xl border transition ${
                        sel
                          ? 'bg-primary/10 border-primary text-foreground shadow-sm'
                          : 'bg-muted/15 border-border hover:bg-muted/30 text-muted-foreground'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <strong className="text-xs text-foreground font-mono">{item.codigo}</strong>
                        {item.conferido_pelo_contador ? (
                          <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[9px]">
                            Conferido
                          </Badge>
                        ) : (
                          <Badge className="bg-amber-500/15 text-amber-400 border border-amber-500/30 text-[9px]">
                            Pendente
                          </Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1 line-clamp-1">
                        {item.descricao}
                      </p>
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-2 font-mono">
                        <span>Vigência: {item.vigencia_inicio}</span>
                        <span>v{item.versao}</span>
                      </div>
                    </button>
                  )
                })
              )}
            </CardContent>
          </Card>
        </div>

        {/* Editor do Parâmetro Selecionado */}
        <div className="lg:col-span-8">
          {parametroSelecionado ? (
            <Card className="border-border bg-card">
              <CardHeader className="pb-3 border-b border-border">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-mono tracking-widest text-primary font-bold">
                      Edição de Tabela Fiscal
                    </span>
                    <CardTitle className="text-base font-bold flex items-center gap-2 mt-0.5">
                      <FileCode className="w-4 h-4 text-primary" />
                      {parametroSelecionado.descricao}
                    </CardTitle>
                  </div>
                  <Badge variant="outline" className="font-mono text-xs">
                    Código: {parametroSelecionado.codigo}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-4 pt-4 text-xs">
                {erroJson && (
                  <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                    <span>{erroJson}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[11px]">Data de Início da Vigência</Label>
                    <Input
                      type="date"
                      value={vigenciaInicio}
                      onChange={(e) => setVigenciaInicio(e.target.value)}
                      className="font-mono text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px]">Versão dos Parâmetros</Label>
                    <Input
                      value={versao}
                      onChange={(e) => setVersao(e.target.value)}
                      className="font-mono text-xs"
                    />
                  </div>

                  <div className="flex items-center space-x-2 pt-5">
                    <input
                      type="checkbox"
                      id="check-conferido"
                      checked={conferido}
                      onChange={(e) => setConferido(e.target.checked)}
                      className="rounded border-border text-primary cursor-pointer"
                    />
                    <label
                      htmlFor="check-conferido"
                      className="font-semibold cursor-pointer text-foreground"
                    >
                      Conferido e Homologado
                    </label>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5" />
                      Estrutura de Dados e Alíquotas (JSON):
                    </Label>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      Editável em tempo real
                    </span>
                  </div>
                  <Textarea
                    rows={14}
                    value={jsonEditavel}
                    onChange={(e) => setJsonEditavel(e.target.value)}
                    className="font-mono text-[11px] bg-slate-950 text-emerald-400 border-border p-3 leading-relaxed"
                  />
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5" />
                    Alterações gravadas geram registro auditado com carimbo de tempo.
                  </span>
                  <Button
                    onClick={handleSalvarParametro}
                    disabled={salvando}
                    className="bg-primary text-primary-foreground font-semibold text-xs"
                  >
                    <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
                    {salvando ? 'Salvando no banco...' : 'Salvar Vigência de Parâmetros'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="p-8 text-center text-muted-foreground border border-dashed rounded-xl">
              Selecione um conjunto de parâmetros à esquerda para edição.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
