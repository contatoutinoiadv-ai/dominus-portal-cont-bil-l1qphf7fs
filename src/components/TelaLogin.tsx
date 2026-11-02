import React, { useState } from 'react'
import {
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  Award,
  Clock,
  MessageCircle,
  AlertCircle,
  ShieldAlert,
  Loader2,
  Building2,
  Briefcase,
  ChevronRight,
} from 'lucide-react'
import { useAuth } from '@/lib/pocketbase/authContext'
import { ModalRecuperacaoSenha } from '@/components/ModalRecuperacaoSenha'
import { PORTAL_CONFIG } from '@/config/portalConfig'
import { InteractiveMesh } from './login/InteractiveMesh'
import { FloatingPreviewShowcase } from './login/FloatingPreviewShowcase'

interface TelaLoginProps {
  onSuccess?: () => void
}

export const TelaLogin: React.FC<TelaLoginProps> = ({ onSuccess }) => {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')
  const [bloqueado, setBloqueado] = useState(false)
  const [modalRecuperacaoAberta, setModalRecuperacaoAberta] = useState(false)
  const [modoEscritorio, setModoEscritorio] = useState(false)
  const [painelDemoAberto, setPainelDemoAberto] = useState(false)

  // Floating label states
  const [emailFocado, setEmailFocado] = useState(false)
  const [senhaFocada, setSenhaFocada] = useState(false)

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro('')
    setCarregando(true)

    const res = await login(email, senha)
    setCarregando(false)

    if (res.success) {
      if (onSuccess) onSuccess()
    } else {
      setErro(res.error || 'Credenciais inválidas. Verifique os dados informados.')
      if (res.locked) {
        setBloqueado(true)
      }
    }
  }

  const preencherDemo = (demoEmail: string) => {
    setEmail(demoEmail)
    setSenha('Skip@Pass')
    setErro('')
  }

  const abrirWhatsAppContador = () => {
    window.open(PORTAL_CONFIG.linkWhatsAppContador(), '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="relative h-screen w-screen bg-[#070a0f] text-slate-100 flex flex-col lg:flex-row overflow-hidden select-none">
      {/* --------------------------------------------------------------------- */}
      {/* LADO ESQUERDO (60%): Vitrine cinematográfica com aurora e dados vivos */}
      {/* --------------------------------------------------------------------- */}
      <div className="relative hidden lg:flex lg:w-[60%] h-full flex-col justify-between p-10 xl:p-14 overflow-hidden border-r border-white/5 bg-gradient-to-b from-[#090d15] via-[#070a0f] to-[#05070a]">
        {/* Auroras animadas lentas em gradiente ciano e ouro champanhe */}
        <div className="absolute -top-24 -left-24 w-[620px] h-[620px] bg-gradient-to-tr from-amber-500/20 via-cyan-500/15 to-transparent rounded-full blur-[140px] pointer-events-none animate-aurora-slow" />
        <div
          className="absolute -bottom-32 left-1/3 w-[680px] h-[680px] bg-gradient-to-tl from-cyan-500/15 via-amber-500/10 to-blue-600/10 rounded-full blur-[160px] pointer-events-none animate-aurora-slow"
          style={{ animationDelay: '-6s' }}
        />

        {/* Malha de pontos e linhas com parallax reativo ao mouse */}
        <InteractiveMesh />

        {/* Grid sutil de profundidade */}
        <div
          className="absolute inset-0 opacity-[0.06] pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.6) 1px, transparent 1px)`,
            backgroundSize: '32px 32px',
          }}
        />

        {/* Topo do lado esquerdo: Monograma sutil e selo do produto */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 p-[1px] shadow-lg shadow-amber-500/20">
              <div className="w-full h-full bg-[#070a0f] rounded-[11px] flex items-center justify-center">
                <span className="font-serif text-amber-400 font-extrabold text-lg tracking-wider">
                  D
                </span>
              </div>
            </div>
            <div>
              <span className="font-heading font-extrabold text-lg tracking-tight text-white">
                DOMINUS
              </span>
              <span className="text-[10px] tracking-widest text-amber-400/90 font-mono ml-2 uppercase font-semibold">
                Private Fiscal
              </span>
            </div>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/[0.03] backdrop-blur-md text-[11px] font-mono text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Ambiente Seguro 256-bit</span>
          </div>
        </div>

        {/* Centro do lado esquerdo: Frase principal e cartões flutuantes */}
        <div className="relative z-10 my-auto py-6 space-y-8">
          <div className="space-y-3 max-w-xl">
            <h1 className="text-4xl xl:text-5xl 2xl:text-[54px] font-light tracking-tight text-white leading-[1.12]">
              Seu negócio, seus impostos, <br />
              <span className="font-medium bg-gradient-to-r from-amber-300 via-amber-400 to-amber-500 bg-clip-text text-transparent">
                em tempo real.
              </span>
            </h1>
            <p className="text-sm xl:text-base text-slate-400 font-normal leading-relaxed max-w-lg">
              Informe seu faturamento em segundos e veja, na hora, quanto de imposto está pagando e
              onde pode economizar.
            </p>
          </div>

          {/* Cartões flutuantes com dados vivos (gráfico de área, contador, medidor e selo) */}
          <FloatingPreviewShowcase />
        </div>

        {/* Rodapé do lado esquerdo: Três selos em linha com ícones finos */}
        <div className="relative z-10 pt-4 border-t border-white/10 grid grid-cols-3 gap-4 text-slate-400">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/10 flex items-center justify-center text-amber-400 shrink-0">
              <ShieldCheck className="w-4 h-4 stroke-[1.5]" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-200">Dados criptografados</p>
              <p className="text-[10px] text-slate-500">Conformidade e sigilo bancário</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/10 flex items-center justify-center text-cyan-400 shrink-0">
              <Award className="w-4 h-4 stroke-[1.5]" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-200">Apuração por especialistas</p>
              <p className="text-[10px] text-slate-500">Supervisão contábil dedicada</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/10 flex items-center justify-center text-emerald-400 shrink-0">
              <Clock className="w-4 h-4 stroke-[1.5]" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-200">Acesso 24 horas</p>
              <p className="text-[10px] text-slate-500">Disponível em qualquer dispositivo</p>
            </div>
          </div>
        </div>
      </div>

      {/* --------------------------------------------------------------------- */}
      {/* LADO DIREITO (40%): Acesso minimalista, limpo e de alto padrão        */}
      {/* --------------------------------------------------------------------- */}
      <div className="relative w-full lg:w-[40%] h-full flex flex-col justify-between p-6 sm:p-10 xl:p-12 bg-[#070a0f] overflow-y-auto lg:overflow-y-hidden">
        {/* Glow de fundo sutil no canto superior direito */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-[100px] pointer-events-none" />

        {/* Topo do lado direito: Logotipo DOMINUS com monograma elegante */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 font-serif font-black text-base shadow-md shadow-amber-500/20">
              D
            </div>
            <span className="font-heading font-black text-xl tracking-tight text-white">
              DOMINUS
            </span>
          </div>

          {/* Botão sutil para preenchimento de teste rápido */}
          <button
            type="button"
            onClick={() => setPainelDemoAberto(!painelDemoAberto)}
            className="text-[11px] font-mono text-slate-400 hover:text-amber-300 transition flex items-center gap-1 px-2.5 py-1 rounded-md border border-white/10 hover:border-amber-500/30 bg-white/[0.02]"
          >
            <span>Acesso Rápido / Demo</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        {/* Gaveta de Contas Demo (compacta e opcional) */}
        {painelDemoAberto && (
          <div className="relative z-20 mt-3 p-3 rounded-xl border border-amber-500/30 bg-slate-900/90 backdrop-blur-md space-y-2 animate-in fade-in slide-in-from-top-2">
            <p className="text-[10px] font-mono uppercase text-amber-300 font-semibold tracking-wider">
              Selecione um perfil demonstrativo:
            </p>
            <div className="grid grid-cols-2 gap-1.5 text-xs">
              <button
                type="button"
                onClick={() => {
                  preencherDemo('cliente.simples@dominus.com.br')
                  setModoEscritorio(false)
                }}
                className="p-2 rounded-lg border border-cyan-500/30 bg-cyan-500/5 hover:bg-cyan-500/15 text-left transition"
              >
                <p className="font-semibold text-cyan-300 text-[11px]">Empresário Simples</p>
                <p className="text-[10px] text-slate-400 truncate">Nexus Data</p>
              </button>
              <button
                type="button"
                onClick={() => {
                  preencherDemo('cliente.mei@dominus.com.br')
                  setModoEscritorio(false)
                }}
                className="p-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/15 text-left transition"
              >
                <p className="font-semibold text-emerald-300 text-[11px]">Empresário MEI</p>
                <p className="text-[10px] text-slate-400 truncate">Artes & Estilo</p>
              </button>
              <button
                type="button"
                onClick={() => {
                  preencherDemo('cliente.presumido@dominus.com.br')
                  setModoEscritorio(false)
                }}
                className="p-2 rounded-lg border border-indigo-500/30 bg-indigo-500/5 hover:bg-indigo-500/15 text-left transition"
              >
                <p className="font-semibold text-indigo-300 text-[11px]">Lucro Presumido</p>
                <p className="text-[10px] text-slate-400 truncate">Alpha Engenharia</p>
              </button>
              <button
                type="button"
                onClick={() => {
                  preencherDemo('contatoutinoiadv@gmail.com')
                  setModoEscritorio(true)
                }}
                className="p-2 rounded-lg border border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/15 text-left transition"
              >
                <p className="font-semibold text-amber-300 text-[11px]">Contador Chefe</p>
                <p className="text-[10px] text-slate-400 truncate">Dominus Contábil</p>
              </button>
            </div>
            <p className="text-[10px] text-slate-400 text-center pt-1 font-mono">
              Senha padrão: <span className="text-amber-300">Skip@Pass</span>
            </p>
          </div>
        )}

        {/* Centro do lado direito: Formulário minimalista e limpo */}
        <div className="relative z-10 my-auto py-4 space-y-6 max-w-sm w-full mx-auto">
          {/* Título e Subtítulo */}
          <div className="space-y-1.5 text-left">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-heading">
              {modoEscritorio ? 'Acesso do Escritório' : 'Bem-vindo de volta'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 font-normal">
              {modoEscritorio
                ? 'Painel restrito de apuração e gestão contábil.'
                : 'Acesse o painel da sua empresa.'}
            </p>
          </div>

          {/* Alertas de Erro e Bloqueio */}
          {erro && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <span className="leading-relaxed">{erro}</span>
            </div>
          )}

          {bloqueado && (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
              <span>
                Bloqueio preventivo ativado após 5 tentativas incorretas. Contate o escritório
                contábil.
              </span>
            </div>
          )}

          {/* Formulário com rótulos flutuantes e foco dourado */}
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            {/* Campo E-mail com rótulo flutuante */}
            <div className="relative">
              <div
                className={`relative rounded-xl border bg-slate-900/60 transition-all duration-200 ${
                  emailFocado
                    ? 'border-amber-400 ring-2 ring-amber-400/20 shadow-lg shadow-amber-500/10'
                    : 'border-white/10 hover:border-white/20'
                }`}
              >
                <input
                  id="email-input"
                  type="email"
                  value={email}
                  disabled={carregando || bloqueado}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setEmailFocado(true)}
                  onBlur={() => setEmailFocado(false)}
                  required
                  placeholder=" "
                  className="w-full bg-transparent px-4 pt-5 pb-2 text-sm text-white placeholder-transparent focus:outline-none disabled:opacity-50"
                />
                <label
                  htmlFor="email-input"
                  className={`absolute left-4 transition-all duration-200 pointer-events-none text-xs ${
                    emailFocado || email
                      ? 'top-1.5 text-[10px] text-amber-400 font-medium'
                      : 'top-3.5 text-xs text-slate-400'
                  }`}
                >
                  {modoEscritorio ? 'E-mail do Contador' : 'E-mail cadastrado da empresa'}
                </label>
              </div>
            </div>

            {/* Campo Senha com rótulo flutuante e ícone de olho */}
            <div className="relative">
              <div
                className={`relative rounded-xl border bg-slate-900/60 transition-all duration-200 flex items-center ${
                  senhaFocada
                    ? 'border-amber-400 ring-2 ring-amber-400/20 shadow-lg shadow-amber-500/10'
                    : 'border-white/10 hover:border-white/20'
                }`}
              >
                <input
                  id="senha-input"
                  type={mostrarSenha ? 'text' : 'password'}
                  value={senha}
                  disabled={carregando || bloqueado}
                  onChange={(e) => setSenha(e.target.value)}
                  onFocus={() => setSenhaFocada(true)}
                  onBlur={() => setSenhaFocada(false)}
                  required
                  placeholder=" "
                  className="w-full bg-transparent px-4 pt-5 pb-2 text-sm text-white placeholder-transparent focus:outline-none disabled:opacity-50 pr-10"
                />
                <label
                  htmlFor="senha-input"
                  className={`absolute left-4 transition-all duration-200 pointer-events-none text-xs ${
                    senhaFocada || senha
                      ? 'top-1.5 text-[10px] text-amber-400 font-medium'
                      : 'top-3.5 text-xs text-slate-400'
                  }`}
                >
                  Senha de acesso
                </label>

                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setMostrarSenha(!mostrarSenha)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition p-1"
                  title={mostrarSenha ? 'Ocultar senha' : 'Ver senha'}
                >
                  {mostrarSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Links e Recuperação de Senha */}
            <div className="flex items-center justify-between text-xs pt-0.5">
              <button
                type="button"
                onClick={() => setModalRecuperacaoAberta(true)}
                className="text-slate-400 hover:text-amber-400 transition hover:underline"
              >
                Esqueci minha senha
              </button>
            </div>

            {/* Botão Principal Largo com Gradiente Dourado e Brilho que percorre ao hover */}
            <button
              type="submit"
              disabled={carregando || bloqueado}
              className="group relative w-full h-12 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-slate-950 font-bold text-sm tracking-wide shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-all duration-300 overflow-hidden flex items-center justify-center disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {/* Efeito de brilho que percorre o botão ao passar o mouse */}
              <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out pointer-events-none" />

              {carregando ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Acessando com segurança...</span>
                </span>
              ) : (
                <span className="relative z-10 flex items-center gap-2">
                  <span>Entrar no Portal</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </span>
              )}
            </button>

            {/* Primeiro acesso */}
            <div className="text-center pt-1">
              <p className="text-xs text-slate-400">
                Primeiro acesso?{' '}
                <span className="text-slate-300 font-medium">
                  Use o link enviado pelo seu contador.
                </span>
              </p>
            </div>

            {/* Linha divisora sutil */}
            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase font-mono">
                <span className="bg-[#070a0f] px-2 text-slate-500">Suporte Direto</span>
              </div>
            </div>

            {/* Botão secundário de suporte: Falar com meu contador */}
            <button
              type="button"
              onClick={abrirWhatsAppContador}
              className="w-full h-11 rounded-xl border border-white/15 bg-white/[0.03] hover:bg-white/[0.07] hover:border-emerald-500/40 text-slate-200 hover:text-white text-xs font-semibold transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              <MessageCircle className="w-4 h-4 text-emerald-400" />
              <span>Falar com meu contador</span>
            </button>
          </form>
        </div>

        {/* Rodapé do lado direito: Acesso do Escritório + Mensagem de segurança em uma linha */}
        <div className="relative z-10 pt-4 border-t border-white/10 space-y-2 text-center">
          <div>
            <button
              type="button"
              onClick={() => {
                setModoEscritorio(!modoEscritorio)
                setErro('')
              }}
              className="text-[11px] text-slate-500 hover:text-amber-400 transition font-mono tracking-wider"
            >
              {modoEscritorio ? 'Voltar para Acesso da Empresa' : 'Acesso do escritório'}
            </button>
          </div>

          <p className="text-[11px] text-slate-500 flex items-center justify-center gap-1.5 font-normal">
            <Lock className="w-3 h-3 text-slate-500" />
            <span>Conexão criptografada de ponta a ponta. Dados protegidos pela LGPD.</span>
          </p>
        </div>
      </div>

      <ModalRecuperacaoSenha
        aberto={modalRecuperacaoAberta}
        onClose={() => setModalRecuperacaoAberta(false)}
      />
    </div>
  )
}
