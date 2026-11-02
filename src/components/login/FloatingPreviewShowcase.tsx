import React, { useState, useEffect } from 'react'
import { TrendingUp, ShieldCheck, Sparkles } from 'lucide-react'

export const FloatingPreviewShowcase: React.FC = () => {
  // 1. Contador que sobe em contagem animada (Imposto estimado do mês)
  const [contadorImposto, setContadorImposto] = useState<number>(14250)
  // 2. Medidor circular animado (percentual do limite anual)
  const [progressoTeto, setProgressoTeto] = useState<number>(38.4)
  // 3. Gráfico de área em loop de desenho contínuo
  const [graficoFase, setGraficoFase] = useState<number>(0)

  // Animação suave e contínua do imposto (número subindo/oscilando suavemente como tempo real)
  useEffect(() => {
    const timer = setInterval(() => {
      setContadorImposto((prev) => {
        const delta = Math.floor(Math.random() * 240) - 100
        const novo = prev + delta
        return novo > 17500 ? 14200 : novo < 13000 ? 14200 : novo
      })
    }, 2400)
    return () => clearInterval(timer)
  }, [])

  // Animação lenta do medidor circular (preenchendo suavemente)
  useEffect(() => {
    const timer = setInterval(() => {
      setProgressoTeto((prev) => {
        const novo = prev + 0.6
        return novo > 46 ? 34.2 : novo
      })
    }, 1800)
    return () => clearInterval(timer)
  }, [])

  // Pulso do gráfico de área em loop
  useEffect(() => {
    const timer = setInterval(() => {
      setGraficoFase((prev) => (prev + 1) % 6)
    }, 2200)
    return () => clearInterval(timer)
  }, [])

  // Dados da curva do gráfico de área simulado
  const pontosBase = [
    [0, 68],
    [32, 54],
    [64, 62],
    [96, 42],
    [128, 48],
    [160, 32],
    [192, 38],
    [224, 22],
    [256, 18],
  ]

  // Variação dos pontos conforme a fase para animação viva
  const pontosDinamicos = pontosBase.map(([x, y], idx) => {
    const offset = Math.sin((graficoFase + idx) * 0.8) * 4
    return [x, Math.max(12, Math.min(75, y + offset))]
  })

  const pathD = pontosDinamicos.reduce((acc, [x, y], idx) => {
    if (idx === 0) return `M ${x} ${y}`
    return `${acc} L ${x} ${y}`
  }, '')

  const pathAreaD = `${pathD} L 256 80 L 0 80 Z`

  // Cálculo da circunferência para medidor circular (r = 28, perímetro ~ 175.9)
  const raio = 28
  const circunferencia = 2 * Math.PI * raio
  const dashoffset = circunferencia - (circunferencia * progressoTeto) / 100

  return (
    <div className="relative w-full max-w-xl mx-auto h-[320px] select-none pointer-events-none">
      {/* 1. Cartão Principal de Fundo: Gráfico de Área Vivo que se desenha em loop */}
      <div className="absolute top-2 left-0 right-8 glass-cinematic rounded-2xl p-4 transition-all duration-700 animate-float-subtle">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-300 font-semibold">
              Evolução da Receita Bruta (Ao Vivo)
            </span>
          </div>
          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> +18.4% no trimestre
          </span>
        </div>

        {/* Gráfico SVG SVG auto-animado */}
        <div className="w-full h-24 overflow-hidden relative">
          <svg viewBox="0 0 256 80" className="w-full h-full overflow-visible">
            <defs>
              <linearGradient id="liveAreaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.35" />
                <stop offset="60%" stopColor="#eab308" stopOpacity="0.12" />
                <stop offset="100%" stopColor="#0f172a" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="liveStrokeGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#06b6d4" />
                <stop offset="70%" stopColor="#eab308" />
                <stop offset="100%" stopColor="#f59e0b" />
              </linearGradient>
            </defs>

            {/* Linhas de grade sutis */}
            <line
              x1="0"
              y1="20"
              x2="256"
              y2="20"
              stroke="rgba(255,255,255,0.05)"
              strokeDasharray="3 3"
            />
            <line
              x1="0"
              y1="45"
              x2="256"
              y2="45"
              stroke="rgba(255,255,255,0.05)"
              strokeDasharray="3 3"
            />
            <line
              x1="0"
              y1="70"
              x2="256"
              y2="70"
              stroke="rgba(255,255,255,0.05)"
              strokeDasharray="3 3"
            />

            {/* Área preenchida */}
            <path
              d={pathAreaD}
              fill="url(#liveAreaGradient)"
              className="transition-all duration-1000 ease-in-out"
            />

            {/* Linha principal com brilho */}
            <path
              d={pathD}
              fill="none"
              stroke="url(#liveStrokeGradient)"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="transition-all duration-1000 ease-in-out"
            />

            {/* Ponto atual ativo no final da linha */}
            {pontosDinamicos.length > 0 && (
              <g>
                <circle
                  cx={pontosDinamicos[pontosDinamicos.length - 1][0]}
                  cy={pontosDinamicos[pontosDinamicos.length - 1][1]}
                  r="5"
                  fill="#eab308"
                  className="animate-pulse"
                />
                <circle
                  cx={pontosDinamicos[pontosDinamicos.length - 1][0]}
                  cy={pontosDinamicos[pontosDinamicos.length - 1][1]}
                  r="2"
                  fill="#070a0f"
                />
              </g>
            )}
          </svg>
        </div>

        <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mt-1">
          <span>Out</span>
          <span>Nov</span>
          <span>Dez</span>
          <span>Jan</span>
          <span>Fev</span>
          <span className="text-amber-300 font-bold">Mar (Atual)</span>
        </div>
      </div>

      {/* 2. Cartão Frontal Esquerdo: Imposto Estimado do Mês (número que sobe em contagem animada) */}
      <div className="absolute -bottom-2 left-2 w-64 glass-cinematic rounded-2xl p-4 border border-amber-500/25 shadow-2xl animate-float-subtle-delayed">
        <div className="flex items-center justify-between text-slate-400 mb-1">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-300">
            Imposto estimado do mês
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-xs font-mono text-amber-400 font-semibold">R$</span>
          <span className="text-2xl font-mono font-extrabold tracking-tight text-white transition-all duration-500">
            {contadorImposto.toLocaleString('pt-BR', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        </div>
        <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2 pt-2 border-t border-white/5">
          <span>Alíquota Efetiva:</span>
          <span className="font-mono text-amber-300 font-bold">8.42%</span>
        </div>
      </div>

      {/* 3. Cartão Frontal Direito: Medidor Circular do Limite Anual */}
      <div className="absolute top-28 right-0 w-52 glass-cinematic rounded-2xl p-3.5 border border-cyan-500/25 shadow-2xl animate-float-subtle">
        <div className="flex items-center gap-3">
          {/* Gauge circular SVG */}
          <div className="relative w-16 h-16 shrink-0 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64">
              <circle
                cx="32"
                cy="32"
                r={raio}
                fill="none"
                stroke="rgba(255, 255, 255, 0.08)"
                strokeWidth="5"
              />
              <circle
                cx="32"
                cy="32"
                r={raio}
                fill="none"
                stroke="url(#gaugeCyanGold)"
                strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray={circunferencia}
                strokeDashoffset={dashoffset}
                className="transition-all duration-700 ease-out"
              />
              <defs>
                <linearGradient id="gaugeCyanGold" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#06b6d4" />
                  <stop offset="100%" stopColor="#eab308" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xs font-mono font-bold text-white">
                {progressoTeto.toFixed(0)}%
              </span>
            </div>
          </div>

          <div className="overflow-hidden">
            <p className="text-[10px] font-mono uppercase text-slate-400 tracking-wider">
              Teto Anual
            </p>
            <p className="text-xs font-semibold text-white mt-0.5">Faixa Segura</p>
            <p className="text-[10px] text-slate-400 truncate mt-0.5">R$ 1.84M de R$ 4.8M</p>
          </div>
        </div>
      </div>

      {/* 4. Selo 'Economia identificada' com valor pulsando suavemente */}
      <div className="absolute -top-3 right-6 glass-cinematic rounded-full px-3.5 py-1.5 border border-emerald-500/40 shadow-lg flex items-center gap-2 animate-pulse-glow">
        <Sparkles
          className="w-3.5 h-3.5 text-emerald-400 animate-spin"
          style={{ animationDuration: '6s' }}
        />
        <span className="text-[11px] font-semibold text-emerald-300">Economia identificada:</span>
        <span className="text-xs font-mono font-extrabold text-white">R$ 28.450/ano</span>
      </div>

      {/* Selo sutil de dados ilustrativos */}
      <div className="absolute bottom-1 right-2 opacity-50 flex items-center gap-1 text-[9px] font-mono text-slate-400">
        <ShieldCheck className="w-3 h-3 text-cyan-400" />
        <span>Demonstração ilustrativa em tempo real</span>
      </div>
    </div>
  )
}
