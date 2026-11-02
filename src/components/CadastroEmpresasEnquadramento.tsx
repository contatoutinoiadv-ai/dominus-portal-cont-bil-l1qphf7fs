import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
  Plus,
  Copy,
  Trash2,
  Sliders,
  CheckCircle2,
  Layers,
  Calendar,
} from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/lib/pocketbase/authContext'
import { Empresa, EnquadramentoFiscal, LinhaReceita, RegimeTributario } from '@/types/dominus'
import { registrarLogAuditoria } from '@/lib/pocketbase/auditService'

export const CadastroEmpresasEnquadramento: React.FC = () => {
  const { user } = useAuth()
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [empresaSelecionada, setEmpresaSelecionada] = useState<Empresa | null>(null)
  const [enquadramentos, setEnquadramentos] = useState<EnquadramentoFiscal[]>([])
  const [linhasReceita, setLinhasReceita] = useState<LinhaReceita[]>([])
  const [carregando, setCarregando] = useState(true)

  // Modais
  const [modalNovaEmpresaAberta, setModalNovaEmpresaAberta] = useState(false)
  const [modalNovaLinhaAberta, setModalNovaLinhaAberta] = useState(false)
  const [modalDuplicarAberta, setModalDuplicarAberta] = useState(false)
  const [empresaDestinoDuplicar, setEmpresaDestinoDuplicar] = useState<string>('')

  // Formulário Nova Empresa
  const [novaEmpresa, setNovaEmpresa] = useState({
    razao_social: '',
    nome_fantasia: '',
    cnpj: '',
    municipio: '',
    uf: 'SP',
    email_responsavel: '',
    telefone_responsavel: '',
    data_abertura: '2024-01-01',
    regime_vigente: 'Simples Nacional' as RegimeTributario,
    data_inicio_regime: '2024-01-01',
    sublimite_estadual: 3600000,
    limite_anual_simples: 4800000,
    limite_anual_mei: 81000,
    percentual_alerta_diagnostico: 10,
  })

  // Formulário Nova Linha de Receita
  const [novaLinha, setNovaLinha] = useState({
    nome_linha: '',
    tipo_receita: 'servicos' as 'servicos' | 'comercio' | 'industria',
    anexo_simples: 'III' as 'I' | 'II' | 'III' | 'IV' | 'V' | 'Nenhum',
    sujeito_fator_r: false,
    local_incidencia_iss: 'mesmo_municipio' as 'mesmo_municipio' | 'outro_municipio' | 'exterior',
    aliquota_municipal_iss: 0.05,
    iss_retido_fonte: false,
    percentual_iss_retido: 0,
    icms_tratamento: 'tributado_normal' as 'tributado_normal' | 'st' | 'isento' | 'monofasico',
    pis_cofins_tratamento: 'normal' as 'normal' | 'monofasico',
    percentual_presuncao_irpj: 0.32,
    percentual_presuncao_csll: 0.32,
  })

  // Formulário Enquadramento Atual
  const [rotuloEnquadramento, setRotuloEnquadramento] = useState('')
  const [obsInternas, setObsInternas] = useState('')
  const [salvandoEnq, setSalvandoEnq] = useState(false)

  const carregarEmpresas = useCallback(async () => {
    setCarregando(true)
    try {
      const res = await pb.collection('empresas').getList(1, 100, {
        sort: 'razao_social',
      })
      const itens = res.items as unknown as Empresa[]
      setEmpresas(itens)
      if (itens.length > 0 && !empresaSelecionada) {
        setEmpresaSelecionada(itens[0])
      }
    } catch (e) {
      console.warn('Erro ao carregar empresas:', e)
    } finally {
      setCarregando(false)
    }
  }, [empresaSelecionada])

  const carregarDetalhesEmpresa = useCallback(async (empresaId: string) => {
    try {
      // 1. Enquadramentos
      const enqRes = await pb.collection('enquadramentos').getList(1, 50, {
        filter: `empresa_id = '${empresaId}'`,
        sort: '-data_vigencia_inicio',
      })
      const enqs = enqRes.items as unknown as EnquadramentoFiscal[]
      setEnquadramentos(enqs)
      if (enqs.length > 0) {
        setRotuloEnquadramento(enqs[0].rotulo_enquadramento || '')
        setObsInternas(enqs[0].observacoes_internas || '')
      } else {
        setRotuloEnquadramento('')
        setObsInternas('')
      }

      // 2. Linhas de receita
      const linhasRes = await pb.collection('linhas_receita').getList(1, 50, {
        filter: `empresa_id = '${empresaId}' && ativo = true`,
        sort: 'ordem,created',
      })
      setLinhasReceita(linhasRes.items as unknown as LinhaReceita[])
    } catch (e) {
      console.warn('Erro ao carregar detalhes da empresa:', e)
    }
  }, [])

  useEffect(() => {
    carregarEmpresas()
  }, [carregarEmpresas])

  useEffect(() => {
    if (empresaSelecionada) {
      carregarDetalhesEmpresa(empresaSelecionada.id)
    }
  }, [empresaSelecionada, carregarDetalhesEmpresa])

  // Salvar Nova Empresa
  const handleCriarEmpresa = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const nova = await pb.collection('empresas').create({
        ...novaEmpresa,
        status_ativa: true,
        permitir_cliente_ver_diagnostico: true,
        permitir_cliente_ver_comparador: true,
      })

      // Criar enquadramento inicial
      await pb.collection('enquadramentos').create({
        empresa_id: nova.id,
        regime: novaEmpresa.regime_vigente,
        tipo_atividade: 'servicos',
        data_vigencia_inicio: novaEmpresa.data_inicio_regime,
        rotulo_enquadramento: `Enquadramento inicial ${novaEmpresa.regime_vigente}`,
        ativo: true,
      })

      // Criar linha de receita padrão inicial
      await pb.collection('linhas_receita').create({
        empresa_id: nova.id,
        nome_linha: 'Receita Operacional Principal',
        tipo_receita: 'servicos',
        anexo_simples: 'III',
        aliquota_municipal_iss: 0.05,
        ativo: true,
      })

      await registrarLogAuditoria({
        usuarioId: user?.id || '',
        usuarioNome: user?.name || 'Contador',
        usuarioRole: 'contador',
        empresaId: nova.id,
        acao: 'ENQUADRAMENTO_ALTERADO',
        entidade: 'empresas',
        entidadeId: nova.id,
        detalhes: `Cadastro da empresa ${novaEmpresa.razao_social} e enquadramento em ${novaEmpresa.regime_vigente}`,
      })

      setModalNovaEmpresaAberta(false)
      carregarEmpresas()
      alert('Empresa cadastrada com sucesso!')
    } catch (err) {
      console.error(err)
      alert('Erro ao cadastrar empresa. Verifique se o CNPJ é único.')
    }
  }

  // Salvar Nova Linha de Receita
  const handleCriarLinha = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!empresaSelecionada) return
    try {
      await pb.collection('linhas_receita').create({
        ...novaLinha,
        empresa_id: empresaSelecionada.id,
        ativo: true,
      })
      setModalNovaLinhaAberta(false)
      setNovaLinha({
        nome_linha: '',
        tipo_receita: 'servicos',
        anexo_simples: 'III',
        sujeito_fator_r: false,
        local_incidencia_iss: 'mesmo_municipio',
        aliquota_municipal_iss: 0.05,
        iss_retido_fonte: false,
        percentual_iss_retido: 0,
        icms_tratamento: 'tributado_normal',
        pis_cofins_tratamento: 'normal',
        percentual_presuncao_irpj: 0.32,
        percentual_presuncao_csll: 0.32,
      })
      carregarDetalhesEmpresa(empresaSelecionada.id)
    } catch (e) {
      console.error(e)
      alert('Erro ao criar linha de receita.')
    }
  }

  // Excluir Linha de Receita
  const handleExcluirLinha = async (linhaId: string) => {
    if (!confirm('Deseja realmente desativar esta linha de receita?')) return
    try {
      await pb.collection('linhas_receita').update(linhaId, { ativo: false })
      if (empresaSelecionada) carregarDetalhesEmpresa(empresaSelecionada.id)
    } catch (e) {
      console.error(e)
    }
  }

  // Atualizar Enquadramento Interno
  const handleSalvarEnquadramentoInterno = async () => {
    if (!empresaSelecionada) return
    setSalvandoEnq(true)
    try {
      const enqAtual = enquadramentos[0]
      if (enqAtual) {
        await pb.collection('enquadramentos').update(enqAtual.id, {
          rotulo_enquadramento: rotuloEnquadramento,
          observacoes_internas: obsInternas,
        })
      } else {
        await pb.collection('enquadramentos').create({
          empresa_id: empresaSelecionada.id,
          regime: empresaSelecionada.regime_vigente,
          tipo_atividade: 'servicos',
          data_vigencia_inicio: new Date().toISOString().slice(0, 10),
          rotulo_enquadramento: rotuloEnquadramento,
          observacoes_internas: obsInternas,
          ativo: true,
        })
      }

      await registrarLogAuditoria({
        usuarioId: user?.id || '',
        usuarioNome: user?.name || 'Contador',
        usuarioRole: 'contador',
        empresaId: empresaSelecionada.id,
        acao: 'ENQUADRAMENTO_ALTERADO',
        entidade: 'enquadramentos',
        entidadeId: enqAtual?.id,
        detalhes: `Atualização de enquadramento interno da empresa ${empresaSelecionada.razao_social}: ${rotuloEnquadramento}`,
      })

      alert('Enquadramento interno atualizado com sucesso!')
      carregarDetalhesEmpresa(empresaSelecionada.id)
    } catch (e) {
      console.error(e)
      alert('Erro ao atualizar enquadramento.')
    } finally {
      setSalvandoEnq(false)
    }
  }

  // Duplicar Enquadramento de uma empresa para outra
  const handleDuplicarEnquadramento = async () => {
    if (!empresaSelecionada || !empresaDestinoDuplicar) return
    try {
      for (const linha of linhasReceita) {
        await pb.collection('linhas_receita').create({
          empresa_id: empresaDestinoDuplicar,
          nome_linha: linha.nome_linha,
          tipo_receita: linha.tipo_receita,
          anexo_simples: linha.anexo_simples,
          sujeito_fator_r: linha.sujeito_fator_r,
          local_incidencia_iss: linha.local_incidencia_iss,
          aliquota_municipal_iss: linha.aliquota_municipal_iss,
          iss_retido_fonte: linha.iss_retido_fonte,
          percentual_iss_retido: linha.percentual_iss_retido,
          icms_tratamento: linha.icms_tratamento,
          pis_cofins_tratamento: linha.pis_cofins_tratamento,
          percentual_presuncao_irpj: linha.percentual_presuncao_irpj,
          percentual_presuncao_csll: linha.percentual_presuncao_csll,
          ativo: true,
        })
      }

      await pb.collection('enquadramentos').create({
        empresa_id: empresaDestinoDuplicar,
        regime: empresaSelecionada.regime_vigente,
        tipo_atividade: 'servicos',
        data_vigencia_inicio: new Date().toISOString().slice(0, 10),
        rotulo_enquadramento: `Duplicado de ${empresaSelecionada.razao_social}: ${rotuloEnquadramento}`,
        observacoes_internas: obsInternas,
        ativo: true,
      })

      setModalDuplicarAberta(false)
      setEmpresaDestinoDuplicar('')
      alert('Estrutura de enquadramento e linhas duplicada com sucesso para a empresa de destino!')
    } catch (e) {
      console.error(e)
      alert('Erro ao duplicar enquadramento.')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Cadastro de Empresas e Enquadramento Fiscal
          </h2>
          <p className="text-xs text-muted-foreground">
            Gerenciamento exclusivo do contador: regime tributário, linhas de receita, anexos e
            regras de vigência.
          </p>
        </div>
        <Button
          onClick={() => setModalNovaEmpresaAberta(true)}
          className="bg-primary text-primary-foreground text-xs font-semibold"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Cadastrar Nova Empresa
        </Button>
      </div>

      {/* Grid: Lista de Empresas + Ficha de Enquadramento */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Coluna 1: Lista de Empresas */}
        <div className="lg:col-span-4 space-y-3">
          <Card className="border-border bg-card">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-semibold flex items-center justify-between">
                <span>Empresas na Carteira ({empresas.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2 space-y-1.5 max-h-[600px] overflow-y-auto">
              {carregando ? (
                <p className="text-xs text-muted-foreground p-3">Carregando carteira...</p>
              ) : (
                empresas.map((emp) => {
                  const sel = empresaSelecionada?.id === emp.id
                  return (
                    <button
                      key={emp.id}
                      onClick={() => setEmpresaSelecionada(emp)}
                      className={`w-full text-left p-3 rounded-xl border transition ${
                        sel
                          ? 'bg-primary/10 border-primary shadow-sm text-foreground'
                          : 'bg-muted/15 border-border hover:bg-muted/40 text-muted-foreground'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs text-foreground truncate max-w-[190px]">
                          {emp.razao_social}
                        </span>
                        <Badge variant="outline" className="text-[9px] font-mono">
                          {emp.regime_vigente}
                        </Badge>
                      </div>
                      <p className="text-[11px] font-mono text-muted-foreground mt-0.5">
                        {emp.cnpj}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {emp.municipio}/{emp.uf}
                      </p>
                    </button>
                  )
                })
              )}
            </CardContent>
          </Card>
        </div>

        {/* Coluna 2: Detalhes e Enquadramento Fiscal Interno */}
        <div className="lg:col-span-8 space-y-6">
          {empresaSelecionada ? (
            <>
              {/* Cartão de Dados Cadastrais */}
              <Card className="border-border bg-card">
                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-primary" />
                      {empresaSelecionada.razao_social}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      CNPJ:{' '}
                      <strong className="font-mono text-foreground">
                        {empresaSelecionada.cnpj}
                      </strong>{' '}
                      • Aberta em: {empresaSelecionada.data_abertura}
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setModalDuplicarAberta(true)}
                    className="text-xs"
                    title="Duplicar regras para outra empresa"
                  >
                    <Copy className="w-3.5 h-3.5 mr-1.5" />
                    Duplicar Enquadramento
                  </Button>
                </CardHeader>
                <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs border-t border-border pt-3">
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase">
                      Regime Vigente
                    </span>
                    <strong className="text-primary font-semibold">
                      {empresaSelecionada.regime_vigente}
                    </strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase">
                      Diagnóstico Fiscal Dominus
                    </span>
                    <strong className="text-foreground">
                      {empresaSelecionada.permitir_cliente_ver_diagnostico ||
                      empresaSelecionada.permitir_cliente_ver_comparador
                        ? 'Liberado ao Cliente'
                        : 'Restrito ao Contador'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase">
                      Vigência Início
                    </span>
                    <strong className="font-mono">{empresaSelecionada.data_inicio_regime}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase">
                      Município / UF
                    </span>
                    <span>
                      {empresaSelecionada.municipio} - {empresaSelecionada.uf}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase">
                      Contato Responsável
                    </span>
                    <span className="truncate block">{empresaSelecionada.email_responsavel}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Bloco Enquadramento Fiscal Interno (Visível apenas ao contador) */}
              <Card className="border-border bg-card shadow-sm">
                <CardHeader className="pb-3 bg-muted/20 border-b border-border">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-wider text-primary font-bold">
                        Módulo Restrito ao Contador
                      </span>
                      <CardTitle className="text-sm font-bold flex items-center gap-2">
                        <Sliders className="w-4 h-4 text-primary" />
                        Enquadramento Fiscal Interno e Linhas de Receita
                      </CardTitle>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => setModalNovaLinhaAberta(true)}
                      className="bg-primary text-primary-foreground text-xs h-8"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      Adicionar Linha de Receita
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4 pt-4">
                  {/* Linhas de Receita */}
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5" />
                      Múltiplas Linhas de Receita Ativas ({linhasReceita.length})
                    </h4>
                    <div className="space-y-2">
                      {linhasReceita.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic p-2 border border-dashed rounded-lg">
                          Nenhuma linha de receita cadastrada para esta empresa.
                        </p>
                      ) : (
                        linhasReceita.map((linha) => (
                          <div
                            key={linha.id}
                            className="p-3 rounded-xl border border-border bg-muted/15 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <strong className="text-foreground text-sm">
                                  {linha.nome_linha}
                                </strong>
                                <Badge variant="outline" className="text-[10px] capitalize">
                                  {linha.tipo_receita}
                                </Badge>
                                {linha.anexo_simples && (
                                  <Badge className="bg-primary/20 text-primary border border-primary/30 text-[10px]">
                                    Anexo {linha.anexo_simples}
                                  </Badge>
                                )}
                                {linha.sujeito_fator_r && (
                                  <Badge className="bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 text-[10px]">
                                    Sujeito a Fator R
                                  </Badge>
                                )}
                              </div>
                              <p className="text-[11px] text-muted-foreground">
                                ISS: {linha.local_incidencia_iss || 'mesmo_municipio'}{' '}
                                {linha.iss_retido_fonte ? '(Retido na Fonte)' : ''} • Alíquota ISS:{' '}
                                {((linha.aliquota_municipal_iss || 0) * 100).toFixed(1)}% •
                                Presunção IRPJ:{' '}
                                {((linha.percentual_presuncao_irpj || 0.32) * 100).toFixed(0)}%
                              </p>
                            </div>

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleExcluirLinha(linha.id)}
                              className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 text-xs h-7 px-2"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Configurações de Rótulo e Observações Internas */}
                  <div className="border-t border-border pt-4 space-y-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="rotulo-enq" className="text-xs font-semibold">
                        Rótulo de Enquadramento Oficial (Registro do que será informado ao fisco):
                      </Label>
                      <Input
                        id="rotulo-enq"
                        placeholder='Ex: "Prestação de serviço de desenvolvimento, mesmo município, Anexo III via Fator R"'
                        value={rotuloEnquadramento}
                        onChange={(e) => setRotuloEnquadramento(e.target.value)}
                        className="text-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="obs-internas" className="text-xs font-semibold">
                        Observações Internas Privadas (Não visíveis ao cliente):
                      </Label>
                      <Textarea
                        id="obs-internas"
                        rows={2}
                        placeholder="Ex: Cliente tem sazonalidade em dezembro; monitorar pro-labore dos sócios para não estourar faixa..."
                        value={obsInternas}
                        onChange={(e) => setObsInternas(e.target.value)}
                        className="text-xs"
                      />
                    </div>

                    <div className="flex justify-end pt-1">
                      <Button
                        size="sm"
                        onClick={handleSalvarEnquadramentoInterno}
                        disabled={salvandoEnq}
                        className="bg-primary text-primary-foreground text-xs"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                        {salvandoEnq ? 'Salvando...' : 'Salvar Alterações de Enquadramento'}
                      </Button>
                    </div>
                  </div>

                  {/* Histórico de Alterações de Vigência */}
                  {enquadramentos.length > 0 && (
                    <div className="border-t border-border pt-3">
                      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-2 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        Histórico de Vigências de Enquadramento:
                      </span>
                      <div className="space-y-1.5">
                        {enquadramentos.map((enq) => (
                          <div
                            key={enq.id}
                            className="p-2 rounded-lg bg-muted/20 border border-border text-[11px] flex items-center justify-between font-mono"
                          >
                            <span className="font-sans text-foreground">
                              {enq.rotulo_enquadramento || `Regime: ${enq.regime}`}
                            </span>
                            <span className="text-muted-foreground">
                              Vigência desde: {enq.data_vigencia_inicio}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <div className="p-8 text-center text-muted-foreground border border-dashed rounded-xl">
              Selecione uma empresa na coluna esquerda para visualizar ou editar seu enquadramento.
            </div>
          )}
        </div>
      </div>

      {/* Modal Nova Empresa */}
      <Dialog open={modalNovaEmpresaAberta} onOpenChange={setModalNovaEmpresaAberta}>
        <DialogContent className="max-w-2xl bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Cadastrar Nova Empresa Cliente</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Insira os dados cadastrais e o regime tributário inicial da pessoa jurídica.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCriarEmpresa} className="space-y-3 py-2 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Razão Social</Label>
                <Input
                  required
                  placeholder="Ex: Sigma Consultoria LTDA"
                  value={novaEmpresa.razao_social}
                  onChange={(e) => setNovaEmpresa({ ...novaEmpresa, razao_social: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <Label>Nome Fantasia</Label>
                <Input
                  placeholder="Ex: Sigma Tech"
                  value={novaEmpresa.nome_fantasia}
                  onChange={(e) =>
                    setNovaEmpresa({ ...novaEmpresa, nome_fantasia: e.target.value })
                  }
                />
              </div>

              <div className="space-y-1">
                <Label>CNPJ</Label>
                <Input
                  required
                  placeholder="00.000.000/0001-00"
                  value={novaEmpresa.cnpj}
                  onChange={(e) => setNovaEmpresa({ ...novaEmpresa, cnpj: e.target.value })}
                  className="font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label>Regime Vigente</Label>
                <select
                  value={novaEmpresa.regime_vigente}
                  onChange={(e) =>
                    setNovaEmpresa({
                      ...novaEmpresa,
                      regime_vigente: e.target.value as RegimeTributario,
                    })
                  }
                  className="w-full bg-muted/50 border border-border rounded-lg px-2.5 py-2 text-foreground"
                >
                  <option value="MEI">MEI</option>
                  <option value="Simples Nacional">Simples Nacional</option>
                  <option value="Lucro Presumido">Lucro Presumido</option>
                  <option value="Lucro Real">Lucro Real</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label>Município</Label>
                <Input
                  required
                  placeholder="São Paulo"
                  value={novaEmpresa.municipio}
                  onChange={(e) => setNovaEmpresa({ ...novaEmpresa, municipio: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <Label>UF</Label>
                <Input
                  required
                  maxLength={2}
                  placeholder="SP"
                  value={novaEmpresa.uf}
                  onChange={(e) =>
                    setNovaEmpresa({ ...novaEmpresa, uf: e.target.value.toUpperCase() })
                  }
                />
              </div>

              <div className="space-y-1">
                <Label>E-mail do Responsável</Label>
                <Input
                  type="email"
                  required
                  placeholder="contato@empresa.com.br"
                  value={novaEmpresa.email_responsavel}
                  onChange={(e) =>
                    setNovaEmpresa({ ...novaEmpresa, email_responsavel: e.target.value })
                  }
                />
              </div>

              <div className="space-y-1">
                <Label>Data de Abertura</Label>
                <Input
                  type="date"
                  required
                  value={novaEmpresa.data_abertura}
                  onChange={(e) =>
                    setNovaEmpresa({ ...novaEmpresa, data_abertura: e.target.value })
                  }
                />
              </div>
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalNovaEmpresaAberta(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-primary text-primary-foreground font-semibold"
              >
                Salvar Empresa
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Nova Linha de Receita */}
      <Dialog open={modalNovaLinhaAberta} onOpenChange={setModalNovaLinhaAberta}>
        <DialogContent className="max-w-xl bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Adicionar Linha de Receita</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Configure o enquadramento fiscal específico para esta atividade da empresa.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCriarLinha} className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label>Nome da Linha de Receita</Label>
              <Input
                required
                placeholder='Ex: "Consultoria e Assessoria Técnica"'
                value={novaLinha.nome_linha}
                onChange={(e) => setNovaLinha({ ...novaLinha, nome_linha: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Tipo de Atividade</Label>
                <select
                  value={novaLinha.tipo_receita}
                  onChange={(e) =>
                    setNovaLinha({
                      ...novaLinha,
                      tipo_receita: e.target.value as 'servicos' | 'comercio' | 'industria',
                    })
                  }
                  className="w-full bg-muted/50 border border-border rounded-lg px-2.5 py-1.5 text-foreground"
                >
                  <option value="servicos">Prestação de Serviços</option>
                  <option value="comercio">Comércio</option>
                  <option value="industria">Indústria</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label>Anexo do Simples Nacional</Label>
                <select
                  value={novaLinha.anexo_simples}
                  onChange={(e) =>
                    setNovaLinha({
                      ...novaLinha,
                      anexo_simples: e.target.value as 'I' | 'II' | 'III' | 'IV' | 'V' | 'Nenhum',
                    })
                  }
                  className="w-full bg-muted/50 border border-border rounded-lg px-2.5 py-1.5 text-foreground"
                >
                  <option value="I">Anexo I (Comércio)</option>
                  <option value="II">Anexo II (Indústria)</option>
                  <option value="III">Anexo III (Serviços gerais ou Fator R &ge; 28%)</option>
                  <option value="IV">Anexo IV (Construção, advocacia, vigilância)</option>
                  <option value="V">Anexo V (Serviços intelectuais / Fator R &lt; 28%)</option>
                  <option value="Nenhum">Nenhum (Presumido/Real)</option>
                </select>
              </div>
            </div>

            <div className="p-3 bg-muted/20 border border-border rounded-lg space-y-2">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="fator-r-check"
                  checked={novaLinha.sujeito_fator_r}
                  onChange={(e) =>
                    setNovaLinha({ ...novaLinha, sujeito_fator_r: e.target.checked })
                  }
                  className="rounded border-border text-primary"
                />
                <label htmlFor="fator-r-check" className="font-semibold cursor-pointer">
                  Sujeito ao Fator R (Razão Folha 12m ÷ Receita Bruta 12m / RBT12 &ge; 28%)
                </label>
              </div>
              <p className="text-[11px] text-muted-foreground pl-5">
                O motor tributário recalcula automaticamente se a linha incide no Anexo III (&ge;
                28%) ou Anexo V (&lt; 28%).
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Alíquota Municipal ISS (%)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={novaLinha.aliquota_municipal_iss * 100}
                  onChange={(e) =>
                    setNovaLinha({
                      ...novaLinha,
                      aliquota_municipal_iss: (parseFloat(e.target.value) || 0) / 100,
                    })
                  }
                />
              </div>

              <div className="space-y-1">
                <Label>Local Incidência ISS</Label>
                <select
                  value={novaLinha.local_incidencia_iss}
                  onChange={(e) =>
                    setNovaLinha({
                      ...novaLinha,
                      local_incidencia_iss: e.target.value as
                        | 'mesmo_municipio'
                        | 'outro_municipio'
                        | 'exterior',
                    })
                  }
                  className="w-full bg-muted/50 border border-border rounded-lg px-2.5 py-1.5 text-foreground"
                >
                  <option value="mesmo_municipio">Mesmo Município</option>
                  <option value="outro_municipio">Outro Município</option>
                  <option value="exterior">Exterior (Exportação de Serviços)</option>
                </select>
              </div>
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalNovaLinhaAberta(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-primary text-primary-foreground font-semibold"
              >
                Salvar Linha de Receita
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Duplicar Enquadramento */}
      <Dialog open={modalDuplicarAberta} onOpenChange={setModalDuplicarAberta}>
        <DialogContent className="max-w-md bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Copy className="w-5 h-5 text-primary" />
              Duplicar Enquadramento Fiscal
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Copie todas as linhas de receita e parâmetros da empresa{' '}
              {empresaSelecionada?.razao_social} para outra empresa.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1.5">
              <Label>Selecione a Empresa de Destino:</Label>
              <select
                value={empresaDestinoDuplicar}
                onChange={(e) => setEmpresaDestinoDuplicar(e.target.value)}
                className="w-full bg-muted/50 border border-border rounded-lg px-2.5 py-2 text-foreground"
              >
                <option value="">Selecione uma empresa...</option>
                {empresas
                  .filter((e) => e.id !== empresaSelecionada?.id)
                  .map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.razao_social} ({e.cnpj})
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setModalDuplicarAberta(false)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleDuplicarEnquadramento}
              disabled={!empresaDestinoDuplicar}
              className="bg-primary text-primary-foreground"
            >
              Confirmar Duplicação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
