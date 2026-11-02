import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Users,
  UserPlus,
  ShieldCheck,
  Building2,
  Briefcase,
  KeyRound,
  Unlock,
  UserCheck,
  UserX,
  Trash2,
  Edit2,
  RefreshCw,
  Search,
  Lock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Copy,
  Mail,
  Phone,
} from 'lucide-react'
import { useAuth } from '@/lib/pocketbase/authContext'
import pb from '@/lib/pocketbase/client'
import { Empresa } from '@/types/dominus'
import {
  UsuarioComEmpresa,
  listarUsuarios,
  cadastrarUsuarioEquipe,
  cadastrarUsuarioCliente,
  editarUsuario,
  redefinirSenhaUsuario,
  alternarStatusUsuario,
  desbloquearUsuario,
  excluirUsuario,
} from '@/services/usuariosService'

interface GestaoUsuariosTelaProps {
  empresaFiltroInicialId?: string
  onVoltarParaCadastroEmpresas?: () => void
}

export const GestaoUsuariosTela: React.FC<GestaoUsuariosTelaProps> = ({
  empresaFiltroInicialId,
  onVoltarParaCadastroEmpresas,
}) => {
  const { user, isContador } = useAuth()
  const [usuarios, setUsuarios] = useState<UsuarioComEmpresa[]>([])
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [carregando, setCarregando] = useState(true)

  // Filtros e Abas
  const [abaAtiva, setAbaAtiva] = useState<'equipe' | 'clientes' | 'todos'>('equipe')
  const [busca, setBusca] = useState('')
  const [filtroEmpresa, setFiltroEmpresa] = useState<string>(empresaFiltroInicialId || '')

  // Modais de Criação
  const [modalNovoMembroEquipeAberto, setModalNovoMembroEquipeAberto] = useState(false)
  const [modalNovoClienteAberto, setModalNovoClienteAberto] = useState(false)

  // Formulário Novo Membro Equipe
  const [formEquipe, setFormEquipe] = useState({
    name: '',
    email: '',
    password: '',
    cargo: '',
    telefone: '',
    observacoes: '',
    must_change_password: true,
  })

  // Formulário Novo Cliente
  const [formCliente, setFormCliente] = useState({
    name: '',
    email: '',
    password: '',
    empresa_id: empresaFiltroInicialId || '',
    telefone: '',
    cargo: '',
    observacoes: '',
    must_change_password: true,
  })

  // Modal e Estado de Edição
  const [usuarioEditando, setUsuarioEditando] = useState<UsuarioComEmpresa | null>(null)
  const [formEdicao, setFormEdicao] = useState({
    name: '',
    email: '',
    telefone: '',
    cargo: '',
    observacoes: '',
    empresa_id: '',
    role: 'cliente' as 'contador' | 'cliente',
  })

  // Modal Redefinir Senha
  const [usuarioRedefinir, setUsuarioRedefinir] = useState<UsuarioComEmpresa | null>(null)
  const [novaSenhaTemp, setNovaSenhaTemp] = useState('')
  const [senhaCopiada, setSenhaCopiada] = useState(false)

  // Modal Confirmação Exclusão
  const [usuarioExcluindo, setUsuarioExcluindo] = useState<UsuarioComEmpresa | null>(null)

  // Estado de Ação em Andamento
  const [salvando, setSalvando] = useState(false)
  const [msgSucesso, setMsgSucesso] = useState('')
  const [msgErro, setMsgErro] = useState('')

  // Carregar dados
  const carregarDados = useCallback(async () => {
    setCarregando(true)
    setMsgErro('')
    try {
      const [usersList, empList] = await Promise.all([
        listarUsuarios(false),
        pb.collection('empresas').getFullList({ sort: 'razao_social' }),
      ])
      setUsuarios(usersList)
      setEmpresas(empList as unknown as Empresa[])
    } catch (err: unknown) {
      const e = err as { message?: string }
      setMsgErro(e.message || 'Erro ao carregar lista de usuários e acessos.')
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    carregarDados()
  }, [carregarDados])

  // Gerador de senha temporária segura
  const gerarSenhaAleatoria = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*'
    let pass = ''
    for (let i = 0; i < 10; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return pass
  }

  // Abertura de Modais com senhas pré-geradas
  const handleAbrirNovoEquipe = () => {
    setFormEquipe({
      name: '',
      email: '',
      password: gerarSenhaAleatoria(),
      cargo: 'Analista Fiscal / Contábil',
      telefone: '',
      observacoes: '',
      must_change_password: true,
    })
    setMsgErro('')
    setModalNovoMembroEquipeAberto(true)
  }

  const handleAbrirNovoCliente = (empresaIdPredefinida?: string) => {
    setFormCliente({
      name: '',
      email: '',
      password: gerarSenhaAleatoria(),
      empresa_id: empresaIdPredefinida || filtroEmpresa || (empresas[0]?.id ?? ''),
      telefone: '',
      cargo: 'Sócio / Administrador',
      observacoes: '',
      must_change_password: true,
    })
    setMsgErro('')
    setModalNovoClienteAberto(true)
  }

  // Abertura de Edição
  const handleAbrirEdicao = (u: UsuarioComEmpresa) => {
    setUsuarioEditando(u)
    setFormEdicao({
      name: u.name,
      email: u.email,
      telefone: u.telefone || '',
      cargo: u.cargo || '',
      observacoes: u.observacoes || '',
      empresa_id: u.empresa_id || '',
      role: u.role,
    })
    setMsgErro('')
  }

  // Abertura de Redefinição de Senha
  const handleAbrirRedefinir = (u: UsuarioComEmpresa) => {
    setUsuarioRedefinir(u)
    setNovaSenhaTemp(gerarSenhaAleatoria())
    setSenhaCopiada(false)
    setMsgErro('')
  }

  // Submissão: Novo Membro da Equipe
  const handleCriarMembroEquipe = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setSalvando(true)
    setMsgErro('')
    try {
      await cadastrarUsuarioEquipe(formEquipe, user)
      setMsgSucesso(`Membro da equipe "${formEquipe.name}" cadastrado com sucesso!`)
      setModalNovoMembroEquipeAberto(false)
      await carregarDados()
      setTimeout(() => setMsgSucesso(''), 5000)
    } catch (err: unknown) {
      const errorObj = err as { message?: string }
      setMsgErro(errorObj.message || 'Falha ao cadastrar membro da equipe.')
    } finally {
      setSalvando(false)
    }
  }

  // Submissão: Novo Cliente
  const handleCriarCliente = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setSalvando(true)
    setMsgErro('')
    try {
      await cadastrarUsuarioCliente(formCliente, user)
      setMsgSucesso(`Usuário cliente "${formCliente.name}" cadastrado e vinculado com sucesso!`)
      setModalNovoClienteAberto(false)
      await carregarDados()
      setTimeout(() => setMsgSucesso(''), 5000)
    } catch (err: unknown) {
      const errorObj = err as { message?: string }
      setMsgErro(errorObj.message || 'Falha ao cadastrar cliente.')
    } finally {
      setSalvando(false)
    }
  }

  // Submissão: Salvar Edição
  const handleSalvarEdicao = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !usuarioEditando) return
    setSalvando(true)
    setMsgErro('')
    try {
      await editarUsuario(
        usuarioEditando.id,
        {
          name: formEdicao.name,
          email: formEdicao.email,
          telefone: formEdicao.telefone,
          cargo: formEdicao.cargo,
          observacoes: formEdicao.observacoes,
          empresa_id: formEdicao.role === 'cliente' ? formEdicao.empresa_id : '',
          role: formEdicao.role,
        },
        user,
        usuarioEditando,
      )
      setMsgSucesso(`Dados de "${formEdicao.name}" atualizados com sucesso!`)
      setUsuarioEditando(null)
      await carregarDados()
      setTimeout(() => setMsgSucesso(''), 5000)
    } catch (err: unknown) {
      const errorObj = err as { message?: string }
      setMsgErro(errorObj.message || 'Falha ao atualizar dados do usuário.')
    } finally {
      setSalvando(false)
    }
  }

  // Submissão: Redefinir Senha
  const handleConfirmarRedefinirSenha = async () => {
    if (!user || !usuarioRedefinir) return
    setSalvando(true)
    setMsgErro('')
    try {
      await redefinirSenhaUsuario(usuarioRedefinir.id, novaSenhaTemp, user, usuarioRedefinir.name)
      setMsgSucesso(
        `Senha temporária de "${usuarioRedefinir.name}" gerada. Copie e envie ao usuário.`,
      )
      setUsuarioRedefinir(null)
      await carregarDados()
      setTimeout(() => setMsgSucesso(''), 6000)
    } catch (err: unknown) {
      const errorObj = err as { message?: string }
      setMsgErro(errorObj.message || 'Falha ao redefinir senha.')
    } finally {
      setSalvando(false)
    }
  }

  // Alternar Status Ativo/Inativo
  const handleAlternarStatus = async (u: UsuarioComEmpresa) => {
    if (!user) return
    const novoStatus = !u.ativo
    const ehProprioUsuario = u.id === user.id

    if (ehProprioUsuario && !novoStatus) {
      setMsgErro('Você não pode desativar seu próprio acesso — peça a outro contador-chefe.')
      return
    }

    const acaoTexto = novoStatus ? 'ativar' : 'desativar'
    if (
      !confirm(
        `Tem certeza de que deseja ${acaoTexto} o acesso de "${u.name}"? ${
          !novoStatus ? 'O usuário não conseguirá mais entrar no portal.' : ''
        }`,
      )
    ) {
      return
    }

    try {
      await alternarStatusUsuario(u.id, novoStatus, user, u.name)
      setMsgSucesso(`Acesso de "${u.name}" foi ${novoStatus ? 'ativado' : 'desativado'}.`)
      await carregarDados()
      setTimeout(() => setMsgSucesso(''), 4000)
    } catch (err: unknown) {
      const errorObj = err as { message?: string }
      setMsgErro(errorObj.message || 'Falha ao alterar status de acesso.')
    }
  }

  // Desbloquear Tentativas Incorretas
  const handleDesbloquear = async (u: UsuarioComEmpresa) => {
    if (!user) return
    try {
      await desbloquearUsuario(u.id, user, u.name, u.email)
      setMsgSucesso(`Usuário "${u.name}" foi desbloqueado com sucesso. Ele já pode efetuar login.`)
      await carregarDados()
      setTimeout(() => setMsgSucesso(''), 5000)
    } catch (err: unknown) {
      const errorObj = err as { message?: string }
      alert(errorObj.message || 'Falha ao desbloquear usuário.')
    }
  }

  // Excluir Usuário com Confirmação
  const handleConfirmarExclusao = async () => {
    if (!user || !usuarioExcluindo) return
    setSalvando(true)
    try {
      await excluirUsuario(usuarioExcluindo.id, user, usuarioExcluindo.name)
      setMsgSucesso(
        `Usuário "${usuarioExcluindo.name}" excluído logicamente. Histórico e auditoria preservados.`,
      )
      setUsuarioExcluindo(null)
      await carregarDados()
      setTimeout(() => setMsgSucesso(''), 5000)
    } catch (err: unknown) {
      const errorObj = err as { message?: string }
      alert(errorObj.message || 'Falha ao excluir usuário.')
    } finally {
      setSalvando(false)
    }
  }

  // Copiar senha temporária para a área de transferência
  const copiarSenha = () => {
    navigator.clipboard.writeText(novaSenhaTemp)
    setSenhaCopiada(true)
    setTimeout(() => setSenhaCopiada(false), 3000)
  }

  // Verificação de segurança: tela restrita ao contador
  if (!isContador) {
    return (
      <div className="p-8 text-center bg-card border border-border rounded-xl space-y-3">
        <Lock className="w-8 h-8 text-rose-500 mx-auto" />
        <h3 className="text-lg font-bold text-foreground">Acesso Restrito</h3>
        <p className="text-xs text-muted-foreground max-w-md mx-auto">
          Esta tela de gerenciamento de equipe e acessos é restrita à administração contábil da
          Dominus.
        </p>
      </div>
    )
  }

  // Filtragem dos usuários exibidos
  const usuariosFiltrados = usuarios.filter((u) => {
    // Filtro por aba
    if (abaAtiva === 'equipe' && u.role !== 'contador') return false
    if (abaAtiva === 'clientes' && u.role !== 'cliente') return false

    // Filtro por empresa
    if (filtroEmpresa && u.role === 'cliente' && u.empresa_id !== filtroEmpresa) return false

    // Filtro por busca textual
    if (busca.trim()) {
      const termo = busca.toLowerCase().trim()
      const matchNome = u.name.toLowerCase().includes(termo)
      const matchEmail = u.email.toLowerCase().includes(termo)
      const matchCargo = (u.cargo || '').toLowerCase().includes(termo)
      const matchEmpresa = (u.empresa_nome || '').toLowerCase().includes(termo)
      const matchCnpj = (u.empresa_cnpj || '').includes(termo)
      return matchNome || matchEmail || matchCargo || matchEmpresa || matchCnpj
    }

    return true
  })

  // Contagens
  const totalEquipe = usuarios.filter((u) => u.role === 'contador').length
  const totalClientes = usuarios.filter((u) => u.role === 'cliente').length

  return (
    <div className="space-y-6">
      {/* Cabeçalho da Tela */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-primary font-bold px-2 py-0.5 rounded bg-primary/10 border border-primary/20">
              Administração Contábil
            </span>
            {empresaFiltroInicialId && onVoltarParaCadastroEmpresas && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onVoltarParaCadastroEmpresas}
                className="text-xs text-muted-foreground hover:text-foreground h-6 px-2"
              >
                &larr; Voltar à Ficha da Empresa
              </Button>
            )}
          </div>
          <h2 className="text-2xl font-bold tracking-tight mt-1 flex items-center gap-2.5">
            <Users className="w-6 h-6 text-primary" />
            Equipe e Gerenciamento de Acessos
          </h2>
          <p className="text-xs text-muted-foreground">
            Controle centralizado de logins: membros do escritório contábil e usuários clientes
            vinculados às empresas da carteira.
          </p>
        </div>

        {/* Botões de Ação Rápida no Topo */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            onClick={handleAbrirNovoEquipe}
            className="bg-primary text-primary-foreground text-xs font-semibold shadow-sm"
          >
            <UserPlus className="w-4 h-4 mr-1.5" />
            Cadastrar Membro da Equipe
          </Button>
          <Button
            onClick={() => handleAbrirNovoCliente()}
            variant="outline"
            className="text-xs font-semibold border-primary/30 hover:bg-primary/10 text-primary"
          >
            <Building2 className="w-4 h-4 mr-1.5" />
            Cadastrar Login de Cliente
          </Button>
        </div>
      </div>

      {/* Alertas de Sucesso / Erro */}
      {msgSucesso && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2.5 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{msgSucesso}</span>
        </div>
      )}

      {msgErro && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5 animate-in fade-in">
          <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{msgErro}</span>
        </div>
      )}

      {/* Barra de Filtros, Abas e Busca */}
      <Card className="border-border bg-card shadow-sm">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Abas de Navegação */}
            <div className="flex items-center p-1 rounded-xl bg-muted/30 border border-border w-fit">
              <button
                type="button"
                onClick={() => setAbaAtiva('equipe')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-2 ${
                  abaAtiva === 'equipe'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Briefcase className="w-3.5 h-3.5" />
                <span>Equipe Contábil</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-background/20 font-mono">
                  {totalEquipe}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setAbaAtiva('clientes')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-2 ${
                  abaAtiva === 'clientes'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Clientes da Carteira</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-background/20 font-mono">
                  {totalClientes}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setAbaAtiva('todos')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                  abaAtiva === 'todos'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <span>Todos</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-background/20 font-mono">
                  {usuarios.length}
                </span>
              </button>
            </div>

            {/* Campo de Busca e Filtro de Empresa */}
            <div className="flex items-center gap-2.5 flex-1 max-w-xl">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, e-mail, cargo ou empresa..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="pl-8 text-xs bg-muted/20 border-border h-9"
                />
              </div>

              {(abaAtiva === 'clientes' || abaAtiva === 'todos') && (
                <div className="w-48 sm:w-56 shrink-0">
                  <select
                    value={filtroEmpresa}
                    onChange={(e) => setFiltroEmpresa(e.target.value)}
                    className="w-full bg-muted/20 border border-border rounded-lg px-2.5 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary h-9"
                  >
                    <option value="">Todas as Empresas</option>
                    {empresas.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.razao_social}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <Button
                variant="ghost"
                size="icon"
                onClick={carregarDados}
                className="text-muted-foreground hover:text-foreground shrink-0 h-9 w-9"
                title="Atualizar lista"
              >
                <RefreshCw className={`w-4 h-4 ${carregando ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Usuários em Tabela / Cartões */}
      <Card className="border-border bg-card">
        <CardHeader className="p-4 border-b border-border flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-primary" />
              <span>
                {abaAtiva === 'equipe'
                  ? 'Membros da Equipe Contábil'
                  : abaAtiva === 'clientes'
                    ? 'Logins de Clientes Vinculados'
                    : 'Todos os Usuários Cadastrados'}
              </span>
              <Badge variant="outline" className="text-[10px] font-mono ml-2">
                {usuariosFiltrados.length} encontrados
              </Badge>
            </CardTitle>
            <CardDescription className="text-xs">
              Apenas perfis ativos conseguem autenticar. Bloqueios por tentativas podem ser
              liberados pelo contador.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {carregando ? (
            <div className="p-8 text-center text-xs text-muted-foreground">
              Carregando registros de usuários e acessos...
            </div>
          ) : usuariosFiltrados.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground space-y-2">
              <p>Nenhum usuário encontrado com os filtros selecionados.</p>
              <div className="flex justify-center gap-2 pt-2">
                {abaAtiva === 'equipe' ? (
                  <Button size="sm" onClick={handleAbrirNovoEquipe} className="text-xs">
                    Cadastrar Membro da Equipe
                  </Button>
                ) : (
                  <Button size="sm" onClick={() => handleAbrirNovoCliente()} className="text-xs">
                    Cadastrar Novo Cliente
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {usuariosFiltrados.map((u) => {
                const ehProprioUsuario = u.id === user?.id
                const estaBloqueado =
                  (u.failed_login_attempts && u.failed_login_attempts >= 5) ||
                  (u.locked_until && new Date(u.locked_until).getTime() > Date.now())

                const estaDesativado = u.ativo === false

                return (
                  <div
                    key={u.id}
                    className={`p-4 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 transition ${
                      estaDesativado
                        ? 'bg-muted/10 opacity-75'
                        : estaBloqueado
                          ? 'bg-amber-500/5'
                          : ehProprioUsuario
                            ? 'bg-primary/[0.04] border-l-2 border-l-primary'
                            : 'hover:bg-muted/20'
                    }`}
                  >
                    {/* Identificação e Dados Principais */}
                    <div className="flex items-start gap-3 min-w-[280px]">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs uppercase shrink-0 border ${
                          u.role === 'contador'
                            ? 'bg-primary/20 text-primary border-primary/30'
                            : 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
                        }`}
                      >
                        {u.name?.slice(0, 2) || 'US'}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-foreground">{u.name}</span>

                          {/* Badge Você para o usuário logado */}
                          {ehProprioUsuario && (
                            <Badge className="bg-primary text-primary-foreground font-semibold text-[10px]">
                              Você
                            </Badge>
                          )}

                          {/* Badge de Perfil */}
                          <Badge
                            className={`text-[10px] font-semibold ${
                              u.role === 'contador'
                                ? 'bg-primary/20 text-primary border border-primary/30'
                                : 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                            }`}
                          >
                            {u.role === 'contador' ? 'Equipe Contador' : 'Cliente'}
                          </Badge>

                          {/* Status de Acesso */}
                          {estaDesativado ? (
                            <Badge className="bg-rose-500/15 text-rose-400 border border-rose-500/30 text-[10px]">
                              Acesso Desativado
                            </Badge>
                          ) : (
                            <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px]">
                              Ativo
                            </Badge>
                          )}

                          {/* Alerta de Bloqueio */}
                          {estaBloqueado && (
                            <Badge className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] flex items-center gap-1 animate-pulse">
                              <AlertTriangle className="w-3 h-3" />
                              Bloqueado (Tentativas)
                            </Badge>
                          )}

                          {/* Troca de Senha Obrigatória */}
                          {u.must_change_password && (
                            <Badge
                              variant="outline"
                              className="text-[9px] text-amber-400 border-amber-400/30"
                            >
                              Trocar senha no 1º acesso
                            </Badge>
                          )}
                        </div>

                        {/* Contatos */}
                        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1 text-foreground/80">
                            <Mail className="w-3 h-3 text-muted-foreground" />
                            {u.email}
                          </span>
                          {u.telefone && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3 text-muted-foreground" />
                              {u.telefone}
                            </span>
                          )}
                          {u.cargo && (
                            <span className="italic text-muted-foreground">Cargo: {u.cargo}</span>
                          )}
                        </div>

                        {/* Vínculo Empresarial */}
                        {u.role === 'cliente' && (
                          <div className="text-[11px] text-muted-foreground flex items-center gap-1 pt-0.5">
                            <Building2 className="w-3.5 h-3.5 text-primary" />
                            <span>Empresa Vinculada:</span>
                            <strong className="text-foreground">
                              {u.empresa_nome || 'Empresa não encontrada'}
                            </strong>
                            {u.empresa_cnpj && (
                              <span className="font-mono text-[10px]">({u.empresa_cnpj})</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Data de Cadastro e Observação */}
                    <div className="text-[11px] text-muted-foreground space-y-0.5 hidden md:block">
                      <p>
                        Cadastrado em:{' '}
                        <strong className="font-mono text-foreground/80">
                          {new Date(u.created).toLocaleDateString('pt-BR')}
                        </strong>
                      </p>
                      {u.lgpd_accepted ? (
                        <p className="text-emerald-400 text-[10px]">Termo LGPD Aceito</p>
                      ) : (
                        <p className="text-amber-400/80 text-[10px]">Pendente de aceite LGPD</p>
                      )}
                    </div>

                    {/* Ações do Contador */}
                    <div className="flex items-center gap-1.5 flex-wrap self-end lg:self-center">
                      {/* Desbloquear (se aplicável) */}
                      {estaBloqueado && (
                        <Button
                          size="sm"
                          onClick={() => handleDesbloquear(u)}
                          className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs h-8"
                          title="Desbloquear tentativas de login"
                        >
                          <Unlock className="w-3.5 h-3.5 mr-1" />
                          Desbloquear
                        </Button>
                      )}

                      {/* Redefinir Senha */}
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={ehProprioUsuario}
                        onClick={() => handleAbrirRedefinir(u)}
                        className="text-xs h-8 border-border hover:bg-muted/50 text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                        title={
                          ehProprioUsuario
                            ? 'Você não pode redefinir a própria senha nesta tela — use seu perfil.'
                            : 'Gerar nova senha temporária'
                        }
                      >
                        <KeyRound className="w-3.5 h-3.5 mr-1 text-amber-400" />
                        Redefinir Senha
                      </Button>

                      {/* Editar Dados */}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAbrirEdicao(u)}
                        className="text-xs h-8 border-border hover:bg-muted/50 text-foreground"
                        title="Editar dados cadastrais"
                      >
                        <Edit2 className="w-3.5 h-3.5 mr-1 text-primary" />
                        Editar
                      </Button>

                      {/* Ativar / Desativar */}
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={ehProprioUsuario && !estaDesativado}
                        onClick={() => handleAlternarStatus(u)}
                        className={`text-xs h-8 disabled:opacity-40 disabled:cursor-not-allowed ${
                          estaDesativado
                            ? 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10'
                            : 'text-amber-400 hover:text-amber-300 hover:bg-amber-500/10'
                        }`}
                        title={
                          ehProprioUsuario && !estaDesativado
                            ? 'Você não pode desativar seu próprio acesso — peça a outro contador-chefe.'
                            : estaDesativado
                              ? 'Ativar acesso'
                              : 'Desativar acesso'
                        }
                      >
                        {estaDesativado ? (
                          <>
                            <UserCheck className="w-3.5 h-3.5 mr-1" />
                            Ativar
                          </>
                        ) : (
                          <>
                            <UserX className="w-3.5 h-3.5 mr-1" />
                            Desativar
                          </>
                        )}
                      </Button>

                      {/* Excluir Logicamente */}
                      {ehProprioUsuario ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled
                          className="text-muted-foreground opacity-30 cursor-not-allowed text-xs h-8 px-2"
                          title="Você não pode excluir seu próprio acesso — peça a outro contador-chefe."
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setUsuarioExcluindo(u)}
                          className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 text-xs h-8 px-2"
                          title="Excluir usuário"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* --------------------------------------------------------------------- */}
      {/* MODAL: Novo Membro da Equipe Contábil                                 */}
      {/* --------------------------------------------------------------------- */}
      <Dialog open={modalNovoMembroEquipeAberto} onOpenChange={setModalNovoMembroEquipeAberto}>
        <DialogContent className="max-w-md bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-primary" />
              Cadastrar Membro da Equipe Contábil
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Crie o acesso para um contador, analista ou assistente com permissões administrativas
              de carteira.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCriarMembroEquipe} className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label>Nome Completo *</Label>
              <Input
                required
                placeholder="Ex: Beatriz Lima"
                value={formEquipe.name}
                onChange={(e) => setFormEquipe({ ...formEquipe, name: e.target.value })}
              />
            </div>

            <div className="space-y-1">
              <Label>E-mail Corporativo (Login de Acesso) *</Label>
              <Input
                type="email"
                required
                placeholder="beatriz@dominuscontabil.com.br"
                value={formEquipe.email}
                onChange={(e) => setFormEquipe({ ...formEquipe, email: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Cargo / Função</Label>
                <Input
                  placeholder="Ex: Analista Fiscal"
                  value={formEquipe.cargo}
                  onChange={(e) => setFormEquipe({ ...formEquipe, cargo: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <Label>Telefone / Ramal</Label>
                <Input
                  placeholder="(11) 98765-4321"
                  value={formEquipe.telefone}
                  onChange={(e) => setFormEquipe({ ...formEquipe, telefone: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Senha Inicial Provisória *</Label>
              <div className="flex gap-2">
                <Input
                  required
                  value={formEquipe.password}
                  onChange={(e) => setFormEquipe({ ...formEquipe, password: e.target.value })}
                  className="font-mono"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setFormEquipe({ ...formEquipe, password: gerarSenhaAleatoria() })}
                  className="text-xs shrink-0"
                >
                  Gerar
                </Button>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-muted/20 border border-border flex items-center gap-2">
              <input
                type="checkbox"
                id="equipe-troca-senha"
                checked={formEquipe.must_change_password}
                onChange={(e) =>
                  setFormEquipe({ ...formEquipe, must_change_password: e.target.checked })
                }
                className="rounded border-border text-primary"
              />
              <label htmlFor="equipe-troca-senha" className="text-xs font-semibold cursor-pointer">
                Exigir troca obrigatória de senha no primeiro acesso
              </label>
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalNovoMembroEquipeAberto(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={salvando}
                className="bg-primary text-primary-foreground font-semibold"
              >
                {salvando ? 'Cadastrando...' : 'Cadastrar Membro da Equipe'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* --------------------------------------------------------------------- */}
      {/* MODAL: Novo Usuário Cliente                                          */}
      {/* --------------------------------------------------------------------- */}
      <Dialog open={modalNovoClienteAberto} onOpenChange={setModalNovoClienteAberto}>
        <DialogContent className="max-w-md bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" />
              Cadastrar Login de Usuário Cliente
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Vincule um representante à sua empresa para envio de faturamentos e consulta de guias.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCriarCliente} className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label>Empresa Cliente Vinculada *</Label>
              <select
                required
                value={formCliente.empresa_id}
                onChange={(e) => setFormCliente({ ...formCliente, empresa_id: e.target.value })}
                className="w-full bg-muted/50 border border-border rounded-lg px-2.5 py-2 text-foreground"
              >
                <option value="">Selecione uma empresa da carteira...</option>
                {empresas.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.razao_social} ({emp.cnpj})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <Label>Nome Completo do Responsável *</Label>
              <Input
                required
                placeholder="Ex: João da Silva"
                value={formCliente.name}
                onChange={(e) => setFormCliente({ ...formCliente, name: e.target.value })}
              />
            </div>

            <div className="space-y-1">
              <Label>E-mail de Login do Cliente *</Label>
              <Input
                type="email"
                required
                placeholder="joao@empresa.com.br"
                value={formCliente.email}
                onChange={(e) => setFormCliente({ ...formCliente, email: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Telefone / WhatsApp</Label>
                <Input
                  placeholder="(11) 99999-8888"
                  value={formCliente.telefone}
                  onChange={(e) => setFormCliente({ ...formCliente, telefone: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <Label>Cargo / Relação</Label>
                <Input
                  placeholder="Ex: Sócio-Administrador"
                  value={formCliente.cargo}
                  onChange={(e) => setFormCliente({ ...formCliente, cargo: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Senha Inicial Provisória *</Label>
              <div className="flex gap-2">
                <Input
                  required
                  value={formCliente.password}
                  onChange={(e) => setFormCliente({ ...formCliente, password: e.target.value })}
                  className="font-mono"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setFormCliente({ ...formCliente, password: gerarSenhaAleatoria() })
                  }
                  className="text-xs shrink-0"
                >
                  Gerar
                </Button>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-muted/20 border border-border flex items-center gap-2">
              <input
                type="checkbox"
                id="cliente-troca-senha"
                checked={formCliente.must_change_password}
                onChange={(e) =>
                  setFormCliente({ ...formCliente, must_change_password: e.target.checked })
                }
                className="rounded border-border text-primary"
              />
              <label htmlFor="cliente-troca-senha" className="text-xs font-semibold cursor-pointer">
                Exigir troca obrigatória de senha no primeiro acesso
              </label>
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalNovoClienteAberto(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={salvando}
                className="bg-primary text-primary-foreground font-semibold"
              >
                {salvando ? 'Cadastrando...' : 'Cadastrar Login do Cliente'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* --------------------------------------------------------------------- */}
      {/* MODAL: Editar Usuário                                                 */}
      {/* --------------------------------------------------------------------- */}
      <Dialog open={!!usuarioEditando} onOpenChange={(open) => !open && setUsuarioEditando(null)}>
        <DialogContent className="max-w-md bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Edit2 className="w-5 h-5 text-primary" />
              Editar Dados de Usuário
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Atualize nome, e-mail, telefone, cargo ou empresa vinculada.
            </DialogDescription>
          </DialogHeader>

          {usuarioEditando && (
            <form onSubmit={handleSalvarEdicao} className="space-y-3 py-2 text-xs">
              <div className="space-y-1">
                <Label>Nome Completo *</Label>
                <Input
                  required
                  value={formEdicao.name}
                  onChange={(e) => setFormEdicao({ ...formEdicao, name: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <Label>E-mail de Acesso *</Label>
                <Input
                  type="email"
                  required
                  value={formEdicao.email}
                  onChange={(e) => setFormEdicao({ ...formEdicao, email: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Telefone</Label>
                  <Input
                    value={formEdicao.telefone}
                    onChange={(e) => setFormEdicao({ ...formEdicao, telefone: e.target.value })}
                  />
                </div>

                <div className="space-y-1">
                  <Label>Cargo / Observação</Label>
                  <Input
                    value={formEdicao.cargo}
                    onChange={(e) => setFormEdicao({ ...formEdicao, cargo: e.target.value })}
                  />
                </div>
              </div>

              {/* Perfil */}
              <div className="space-y-1">
                <Label>Perfil de Acesso</Label>
                <select
                  value={formEdicao.role}
                  onChange={(e) =>
                    setFormEdicao({
                      ...formEdicao,
                      role: e.target.value as 'contador' | 'cliente',
                    })
                  }
                  className="w-full bg-muted/50 border border-border rounded-lg px-2.5 py-2 text-foreground"
                >
                  <option value="contador">Equipe do Contador (Administrador)</option>
                  <option value="cliente">Cliente (Acesso Restrito à Empresa)</option>
                </select>
              </div>

              {/* Empresa Vinculada (se for cliente) */}
              {formEdicao.role === 'cliente' && (
                <div className="space-y-1">
                  <Label>Empresa Vinculada *</Label>
                  <select
                    required
                    value={formEdicao.empresa_id}
                    onChange={(e) => setFormEdicao({ ...formEdicao, empresa_id: e.target.value })}
                    className="w-full bg-muted/50 border border-border rounded-lg px-2.5 py-2 text-foreground"
                  >
                    <option value="">Selecione uma empresa...</option>
                    {empresas.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.razao_social} ({emp.cnpj})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <DialogFooter className="pt-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setUsuarioEditando(null)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={salvando}
                  className="bg-primary text-primary-foreground font-semibold"
                >
                  {salvando ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* --------------------------------------------------------------------- */}
      {/* MODAL: Redefinir Senha                                                */}
      {/* --------------------------------------------------------------------- */}
      <Dialog open={!!usuarioRedefinir} onOpenChange={(open) => !open && setUsuarioRedefinir(null)}>
        <DialogContent className="max-w-md bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-amber-400" />
              Redefinir Senha de Acesso
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Gere uma senha temporária para <strong>{usuarioRedefinir?.name}</strong>. O usuário
              será obrigado a criar uma nova senha no primeiro acesso.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label>Nova Senha Temporária:</Label>
              <div className="flex gap-2">
                <Input
                  value={novaSenhaTemp}
                  onChange={(e) => setNovaSenhaTemp(e.target.value)}
                  className="font-mono text-sm"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setNovaSenhaTemp(gerarSenhaAleatoria())}
                  className="text-xs shrink-0"
                >
                  Nova
                </Button>
                <Button
                  type="button"
                  onClick={copiarSenha}
                  className="bg-primary text-primary-foreground text-xs shrink-0"
                  title="Copiar para a área de transferência"
                >
                  <Copy className="w-3.5 h-3.5 mr-1" />
                  {senhaCopiada ? 'Copiado!' : 'Copiar'}
                </Button>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-300 text-[11px] space-y-1">
              <p className="font-semibold">Política de Segurança Dominus:</p>
              <p>
                Ao redefinir, quaisquer bloqueios por tentativas incorretas serão zerados e o
                usuário terá que definir uma nova senha no próximo login.
              </p>
            </div>
          </div>

          <DialogFooter className="pt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setUsuarioRedefinir(null)}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmarRedefinirSenha}
              disabled={salvando}
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold"
            >
              {salvando ? 'Aplicando...' : 'Confirmar e Aplicar Nova Senha'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --------------------------------------------------------------------- */}
      {/* MODAL: Confirmação de Exclusão de Usuário                             */}
      {/* --------------------------------------------------------------------- */}
      <Dialog open={!!usuarioExcluindo} onOpenChange={(open) => !open && setUsuarioExcluindo(null)}>
        <DialogContent className="max-w-md bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-rose-400">
              <Trash2 className="w-5 h-5 text-rose-500" />
              Confirmar Exclusão de Usuário
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Você está prestes a excluir o acesso de <strong>{usuarioExcluindo?.name}</strong> (
              {usuarioExcluindo?.email}).
            </DialogDescription>
          </DialogHeader>

          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs space-y-1.5">
            <p className="font-semibold flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              Preservação de Trilha e Histórico Contábil
            </p>
            <p className="text-[11px] leading-relaxed">
              O sistema executará a <strong>exclusão lógica</strong> deste registro. O usuário não
              conseguirá mais efetuar login, mas os lançamentos, validações e logs de auditoria
              passados serão integralmente mantidos para conformidade legal e fiscal.
            </p>
          </div>

          <DialogFooter className="pt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setUsuarioExcluindo(null)}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              variant="destructive"
              disabled={salvando}
              onClick={handleConfirmarExclusao}
            >
              {salvando ? 'Excluindo...' : 'Confirmar Exclusão'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
