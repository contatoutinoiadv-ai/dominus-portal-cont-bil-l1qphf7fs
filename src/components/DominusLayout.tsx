import React, { useState, useEffect } from 'react'
import {
  Bell,
  Search,
  Moon,
  Sun,
  LogOut,
  Building2,
  Briefcase,
  Sliders,
  CalendarDays,
  FileSpreadsheet,
  Layers,
  ChevronDown,
  Menu,
  X,
  History,
  Info,
  CheckCircle,
  Sparkles,
} from 'lucide-react'
import { useAuth } from '@/lib/pocketbase/authContext'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import pb from '@/lib/pocketbase/client'
import { NotificacaoDominus } from '@/types/dominus'
import { ModalLgpd } from './ModalLgpd'
import { ModalTrocaSenhaObrigatoria } from './ModalTrocaSenhaObrigatoria'

interface DominusLayoutProps {
  children: React.ReactNode
  telaAtiva: string
  setTelaAtiva: (tela: string) => void
  termoBuscaGlobal?: string
  setTermoBuscaGlobal?: (busca: string) => void
}

export const DominusLayout: React.FC<DominusLayoutProps> = ({
  children,
  telaAtiva,
  setTelaAtiva,
  termoBuscaGlobal = '',
  setTermoBuscaGlobal,
}) => {
  const { user, empresa, logout, isContador } = useAuth()
  const [sidebarAberta, setSidebarAberta] = useState(true)
  const [menuMobileAberto, setMenuMobileAberto] = useState(false)
  const [temaDark, setTemaDark] = useState(true)
  const [notificacoes, setNotificacoes] = useState<NotificacaoDominus[]>([])
  const [notificacoesNaoLidas, setNotificacoesNaoLidas] = useState(0)

  // Controle de tema
  useEffect(() => {
    if (temaDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [temaDark])

  // Carregar e ouvir notificações em tempo real
  useEffect(() => {
    if (!user) return

    const carregarNotificacoes = async () => {
      try {
        const filter = isContador
          ? "destinatario_role = 'contador' || destinatario_role = 'todos'"
          : `destinatario_role = 'cliente' || destinatario_user_id = '${user.id}' || empresa_id = '${user.empresa_id || ''}'`

        const list = await pb.collection('notificacoes').getList(1, 15, {
          sort: '-created',
          filter,
        })
        const items = list.items as unknown as NotificacaoDominus[]
        setNotificacoes(items)
        setNotificacoesNaoLidas(items.filter((n) => !n.lida).length)
      } catch (err) {
        console.warn('Erro ao carregar notificações:', err)
      }
    }

    carregarNotificacoes()

    // Inscrição em tempo real no PocketBase
    try {
      pb.collection('notificacoes').subscribe('*', () => {
        carregarNotificacoes()
      })
    } catch {
      /* intentionally ignored */
    }

    return () => {
      try {
        pb.collection('notificacoes').unsubscribe('*')
      } catch {
        /* intentionally ignored */
      }
    }
  }, [user, isContador])

  const marcarTodasLidas = async () => {
    try {
      const naoLidas = notificacoes.filter((n) => !n.lida)
      for (const n of naoLidas) {
        await pb.collection('notificacoes').update(n.id, { lida: true })
      }
      setNotificacoes((prev) => prev.map((n) => ({ ...n, lida: true })))
      setNotificacoesNaoLidas(0)
    } catch (e) {
      console.warn('Erro ao marcar notificações:', e)
    }
  }

  // Itens de Menu conforme Perfil
  const itensMenu = isContador
    ? [
        { id: 'dashboard_contador', label: 'Painel Geral da Carteira', icone: Briefcase },
        { id: 'fila_trabalho', label: 'Fila de Lançamentos', icone: FileSpreadsheet },
        { id: 'radar_riscos', label: 'Radar de Riscos Fiscais', icone: Layers },
        { id: 'cadastro_empresas', label: 'Cadastro e Enquadramento', icone: Building2 },
        { id: 'comparador_regimes', label: 'Comparador de Regimes', icone: Sliders },
        { id: 'parametros_fiscais', label: 'Parâmetros Fiscais (Vigência)', icone: Sliders },
        { id: 'calendario_fiscal', label: 'Calendário de Obrigações', icone: CalendarDays },
        { id: 'auditoria', label: 'Trilha de Auditoria LGPD', icone: History },
        { id: 'voz_dominus', label: 'Voz da Dominus (Pré-Login)', icone: Sparkles },
        { id: 'documentacao', label: 'Pendências e Configurações', icone: Info },
      ]
    : [
        { id: 'portal_cliente', label: 'Visão Geral e Faturamento', icone: Building2 },
        { id: 'dashboard_cliente', label: 'Inteligência Fiscal', icone: Briefcase },
        { id: 'historico_lancamentos', label: 'Histórico de Faturamento', icone: FileSpreadsheet },
        { id: 'documentos_cliente', label: 'Guias e Documentos', icone: CalendarDays },
        ...(empresa?.permitir_cliente_ver_comparador
          ? [{ id: 'comparador_cliente', label: 'Simulação Tributária', icone: Sliders }]
          : []),
        { id: 'documentacao', label: 'Sobre o Sistema', icone: Info },
      ]

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col antialiased">
      <ModalLgpd />
      <ModalTrocaSenhaObrigatoria />

      {/* Barra Superior (TopBar) */}
      <header className="sticky top-0 z-40 w-full h-16 border-b border-border bg-card/85 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarAberta(!sidebarAberta)}
            className="hidden lg:flex text-muted-foreground hover:text-foreground"
            title="Recolher/Expandir menu"
          >
            <Menu className="w-5 h-5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMenuMobileAberto(!menuMobileAberto)}
            className="lg:hidden text-muted-foreground hover:text-foreground"
          >
            {menuMobileAberto ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-black text-sm shadow-md">
              D
            </div>
            <div>
              <span className="font-bold tracking-tight text-base sm:text-lg">DOMINUS</span>
              <span className="text-primary font-semibold text-xs ml-1.5 px-1.5 py-0.5 rounded bg-primary/10 border border-primary/20">
                PORTAL
              </span>
            </div>
          </div>
        </div>

        {/* Campo de Busca Global */}
        <div className="flex-1 max-w-md hidden md:block">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder={
                isContador
                  ? 'Buscar cliente por CNPJ, razão ou regime...'
                  : 'Filtrar competências, valores ou lançamentos...'
              }
              value={termoBuscaGlobal}
              onChange={(e) => setTermoBuscaGlobal && setTermoBuscaGlobal(e.target.value)}
              className="w-full bg-muted/40 border border-input rounded-lg pl-9 pr-4 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground"
            />
          </div>
        </div>

        {/* Ações da Direita */}
        <div className="flex items-center gap-2">
          {/* Alternador Dark/Light */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTemaDark(!temaDark)}
            className="text-muted-foreground hover:text-foreground rounded-lg"
            title={temaDark ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
          >
            {temaDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </Button>

          {/* Sino de Notificações */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative text-muted-foreground hover:text-foreground"
              >
                <Bell className="w-4 h-4" />
                {notificacoesNaoLidas > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-0 bg-card border-border shadow-xl">
              <div className="p-3 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold">Notificações</span>
                  {notificacoesNaoLidas > 0 && (
                    <span className="px-1.5 py-0.2 bg-rose-500/20 text-rose-400 text-[10px] rounded-full font-mono">
                      {notificacoesNaoLidas} novas
                    </span>
                  )}
                </div>
                {notificacoesNaoLidas > 0 && (
                  <button
                    onClick={marcarTodasLidas}
                    className="text-[11px] text-primary hover:underline flex items-center gap-1"
                  >
                    <CheckCircle className="w-3 h-3" />
                    Ler todas
                  </button>
                )}
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-border">
                {notificacoes.length === 0 ? (
                  <div className="p-4 text-center text-xs text-muted-foreground">
                    Nenhuma notificação no momento.
                  </div>
                ) : (
                  notificacoes.map((n) => (
                    <div
                      key={n.id}
                      className={`p-3 text-xs space-y-1 transition ${
                        !n.lida ? 'bg-primary/5 font-medium' : 'text-muted-foreground'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-foreground">{n.titulo}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(n.created).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                      <p className="text-[11px] leading-relaxed">{n.mensagem}</p>
                    </div>
                  ))
                )}
              </div>
            </PopoverContent>
          </Popover>

          {/* Menu Perfil */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="flex items-center gap-2 pl-2 pr-3 py-1 rounded-lg border border-border hover:bg-muted/50"
              >
                <div className="w-7 h-7 rounded-full bg-primary/20 text-primary border border-primary/30 flex items-center justify-center font-bold text-xs uppercase">
                  {user?.name?.slice(0, 2) || 'US'}
                </div>
                <div className="text-left hidden sm:block">
                  <p className="text-xs font-semibold leading-none">{user?.name || 'Usuário'}</p>
                  <p className="text-[10px] text-muted-foreground capitalize mt-0.5">
                    {user?.role === 'contador'
                      ? 'Contador Chefe'
                      : empresa?.nome_fantasia || 'Cliente'}
                  </p>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-card border-border">
              <DropdownMenuLabel className="font-normal text-xs text-muted-foreground">
                Conectado como <strong className="text-foreground">{user?.email}</strong>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {isContador && (
                <DropdownMenuItem
                  onClick={() => setTelaAtiva('voz_dominus')}
                  className="text-xs cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 mr-2 text-amber-400" />
                  Voz da Dominus (Apresentação)
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={() => setTelaAtiva('documentacao')}
                className="text-xs cursor-pointer"
              >
                <Info className="w-3.5 h-3.5 mr-2 text-primary" />
                Pendências e Parâmetros
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={logout}
                className="text-xs text-rose-500 focus:text-rose-500 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5 mr-2" />
                Sair da Conta
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Conteúdo Principal com Sidebar */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Desktop */}
        <aside
          className={`hidden lg:flex flex-col border-r border-border bg-card/60 transition-all duration-300 ${
            sidebarAberta ? 'w-64' : 'w-20'
          }`}
        >
          {/* Badge Informativo de Perfil */}
          <div className="p-4 border-b border-border">
            {sidebarAberta ? (
              <div className="p-2.5 rounded-lg bg-muted/40 border border-border flex items-center gap-2.5">
                <div className="p-2 rounded-md bg-primary/10 text-primary">
                  {isContador ? (
                    <Briefcase className="w-4 h-4" />
                  ) : (
                    <Building2 className="w-4 h-4" />
                  )}
                </div>
                <div className="overflow-hidden">
                  <p className="text-[11px] uppercase font-bold text-primary tracking-wider">
                    {isContador ? 'Perfil Contador' : 'Portal da Empresa'}
                  </p>
                  <p className="text-xs font-semibold text-foreground truncate">
                    {isContador ? 'Visão Multicliente' : empresa?.razao_social || 'Minha Empresa'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex justify-center">
                <div
                  className="p-2 rounded-md bg-primary/10 text-primary"
                  title={isContador ? 'Contador' : 'Cliente'}
                >
                  {isContador ? (
                    <Briefcase className="w-5 h-5" />
                  ) : (
                    <Building2 className="w-5 h-5" />
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Navegação */}
          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            {itensMenu.map((item) => {
              const Icone = item.icone
              const ativo = telaAtiva === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTelaAtiva(item.id)}
                  title={!sidebarAberta ? item.label : undefined}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition ${
                    ativo
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  } ${!sidebarAberta ? 'justify-center' : ''}`}
                >
                  <Icone className="w-4 h-4 shrink-0" />
                  {sidebarAberta && <span className="truncate">{item.label}</span>}
                </button>
              )
            })}
          </nav>

          {/* Rodapé da Sidebar */}
          {sidebarAberta && (
            <div className="p-3 border-t border-border text-[11px] text-muted-foreground text-center">
              <span>Dominus Portal v2025.1</span>
            </div>
          )}
        </aside>

        {/* Menu Mobile Flutuante */}
        {menuMobileAberto && (
          <div className="fixed inset-0 z-50 lg:hidden bg-background/95 backdrop-blur-md flex flex-col p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-4">
              <span className="font-bold text-lg">Menu do Sistema</span>
              <Button variant="ghost" size="icon" onClick={() => setMenuMobileAberto(false)}>
                <X className="w-6 h-6" />
              </Button>
            </div>
            <nav className="flex-1 space-y-2 overflow-y-auto">
              {itensMenu.map((item) => {
                const Icone = item.icone
                const ativo = telaAtiva === item.id
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setTelaAtiva(item.id)
                      setMenuMobileAberto(false)
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium ${
                      ativo
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    <Icone className="w-5 h-5" />
                    <span>{item.label}</span>
                  </button>
                )
              })}
            </nav>
            <Button variant="destructive" onClick={logout} className="w-full">
              <LogOut className="w-4 h-4 mr-2" />
              Sair da Conta
            </Button>
          </div>
        )}

        {/* Área Central de Conteúdo */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-background">
          <div className="max-w-7xl mx-auto space-y-6">{children}</div>
        </main>
      </div>
    </div>
  )
}
