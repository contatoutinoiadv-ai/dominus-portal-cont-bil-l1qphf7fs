import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  ShieldAlert,
  ArrowRight,
  UserCheck,
  Building2,
  Calculator,
  Briefcase,
  AlertCircle,
  HelpCircle,
  Lock,
} from 'lucide-react'
import { useAuth } from '@/lib/pocketbase/authContext'
import { ModalRecuperacaoSenha } from '@/components/ModalRecuperacaoSenha'

interface TelaLoginProps {
  onSuccess?: () => void
}

export const TelaLogin: React.FC<TelaLoginProps> = ({ onSuccess }) => {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')
  const [bloqueado, setBloqueado] = useState(false)
  const [modalRecuperacaoAberta, setModalRecuperacaoAberta] = useState(false)

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro('')
    setCarregando(true)

    const res = await login(email, senha)
    setCarregando(false)

    if (res.success) {
      if (onSuccess) onSuccess()
    } else {
      setErro(res.error || 'Credenciais inválidas.')
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

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-4 bg-[#070a0f] text-slate-100 overflow-hidden">
      {/* Aurora animada de fundo */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-gradient-to-tr from-amber-500/15 to-cyan-500/10 rounded-full blur-[120px] pointer-events-none animate-aurora-slow" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/3 translate-y-1/3 w-[600px] h-[600px] bg-gradient-to-bl from-blue-700/15 via-cyan-500/10 to-amber-500/10 rounded-full blur-[140px] pointer-events-none animate-aurora-slow" />

      {/* Grid de pontos sutil */}
      <div
        className="absolute inset-0 opacity-[0.14] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.4) 1px, transparent 1px)`,
          backgroundSize: '28px 28px',
        }}
      />

      <div className="relative z-10 w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Painel Esquerdo: Identidade do Produto */}
        <div className="lg:col-span-6 space-y-6 text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 text-amber-400 text-xs font-medium tracking-wide">
            <Calculator className="w-3.5 h-3.5" />
            <span>PLATAFORMA FISCAL CORPORATIVA</span>
          </div>

          <div className="space-y-2">
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white">
              DOMINUS <span className="text-amber-400 font-semibold">PORTAL</span>
            </h1>
            <p className="text-sm md:text-base text-slate-400 leading-relaxed max-w-md">
              A inteligência tributária do seu escritório contábil: apuração automática, comparador
              de regimes fiscais e portal do cliente em tempo real.
            </p>
          </div>

          {/* Destaques de Contas Demo Rápidas */}
          <div className="p-4 rounded-xl border border-white/10 bg-slate-900/60 backdrop-blur-md space-y-3">
            <p className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-cyan-400" />
              Contas de Demonstração (Clique para carregar):
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => preencherDemo('contatoutinoiadv@gmail.com')}
                className="p-2.5 rounded-lg border border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/15 text-left transition flex items-center gap-2 group"
              >
                <Briefcase className="w-4 h-4 text-amber-400 shrink-0" />
                <div>
                  <p className="font-semibold text-amber-300">Contador Chefe</p>
                  <p className="text-[10px] text-slate-400 truncate">contatoutinoiadv@...</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => preencherDemo('cliente.simples@dominus.com.br')}
                className="p-2.5 rounded-lg border border-cyan-500/30 bg-cyan-500/5 hover:bg-cyan-500/15 text-left transition flex items-center gap-2 group"
              >
                <Building2 className="w-4 h-4 text-cyan-400 shrink-0" />
                <div>
                  <p className="font-semibold text-cyan-300">Simples + Fator R</p>
                  <p className="text-[10px] text-slate-400 truncate">Nexus Data & Software</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => preencherDemo('cliente.mei@dominus.com.br')}
                className="p-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/15 text-left transition flex items-center gap-2 group"
              >
                <Building2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <div>
                  <p className="font-semibold text-emerald-300">MEI Vestuário</p>
                  <p className="text-[10px] text-slate-400 truncate">Artes & Estilo MEI</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => preencherDemo('cliente.presumido@dominus.com.br')}
                className="p-2.5 rounded-lg border border-indigo-500/30 bg-indigo-500/5 hover:bg-indigo-500/15 text-left transition flex items-center gap-2 group"
              >
                <Building2 className="w-4 h-4 text-indigo-300 shrink-0" />
                <div>
                  <p className="font-semibold text-indigo-200">Lucro Presumido</p>
                  <p className="text-[10px] text-slate-400 truncate">Alpha Engenharia</p>
                </div>
              </button>
            </div>
            <p className="text-[11px] text-slate-400">
              Senha padrão para todas as contas de demonstração:{' '}
              <code className="text-amber-300 font-mono">Skip@Pass</code>
            </p>
          </div>
        </div>

        {/* Painel Direito: Cartão de Vidro Cinematográfico de Login */}
        <div className="lg:col-span-6">
          <Card className="glass-panel border border-white/10 shadow-2xl relative overflow-hidden bg-slate-900/70">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-cyan-400 to-amber-500" />
            <CardHeader className="space-y-1 pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                  <Lock className="w-5 h-5 text-amber-400" />
                  Acesso Restrito
                </CardTitle>
                <span className="text-[10px] uppercase font-mono tracking-widest px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                  Dominus Cloud
                </span>
              </div>
              <CardDescription className="text-xs text-slate-400">
                Insira suas credenciais institucionais para acessar o painel.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {erro && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2.5 animate-shake">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                  <span className="leading-relaxed">{erro}</span>
                </div>
              )}

              {bloqueado && (
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-start gap-2.5">
                  <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                  <span>
                    Bloqueio preventivo ativado após 5 tentativas incorretas. Aguarde o tempo
                    expirar ou contate o escritório contábil.
                  </span>
                </div>
              )}

              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="login-email" className="text-xs font-medium text-slate-300">
                    E-mail Institucional
                  </Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="seu.email@dominus.com.br"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={carregando || bloqueado}
                    className="bg-slate-950/60 border-slate-700/80 text-slate-100 placeholder:text-slate-600 focus:border-amber-400 focus:ring-amber-400"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="login-senha" className="text-xs font-medium text-slate-300">
                      Senha de Acesso
                    </Label>
                    <button
                      type="button"
                      onClick={() => setModalRecuperacaoAberta(true)}
                      className="text-xs text-amber-400 hover:text-amber-300 transition hover:underline"
                    >
                      Esqueceu a senha?
                    </button>
                  </div>
                  <Input
                    id="login-senha"
                    type="password"
                    placeholder="••••••••"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    required
                    disabled={carregando || bloqueado}
                    className="bg-slate-950/60 border-slate-700/80 text-slate-100 placeholder:text-slate-600 focus:border-amber-400 focus:ring-amber-400"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={carregando || bloqueado}
                  className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-semibold py-2.5 shadow-lg shadow-amber-500/15 transition-all"
                >
                  {carregando ? (
                    'Validando credenciais...'
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      Entrar no Sistema
                      <ArrowRight className="w-4 h-4" />
                    </span>
                  )}
                </Button>
              </form>

              <div className="pt-2 text-center border-t border-slate-800">
                <p className="text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5" />
                  Conexão segura com criptografia TLS e isolamento estrito por empresa.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <ModalRecuperacaoSenha
        aberto={modalRecuperacaoAberta}
        onClose={() => setModalRecuperacaoAberta(false)}
      />
    </div>
  )
}
