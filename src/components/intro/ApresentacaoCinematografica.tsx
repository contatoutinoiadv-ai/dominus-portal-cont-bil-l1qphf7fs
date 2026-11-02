import React, { useState, useEffect, useRef, useCallback } from 'react'
import { IntroConfig, INTRO_CONFIG_FALLBACK } from '@/config/introConfig'
import { carregarConfigIntro } from '@/services/introService'
import { MonogramaAnimado } from './MonogramaAnimado'
import { InteractiveMesh } from '@/components/login/InteractiveMesh'

interface ApresentacaoCinematograficaProps {
  modo?: 'completa' | 'curta'
  onFinalizar: () => void
  configCustomizada?: IntroConfig
  isPrevisualizacao?: boolean
}

export const ApresentacaoCinematografica: React.FC<ApresentacaoCinematograficaProps> = ({
  modo = 'completa',
  onFinalizar,
  configCustomizada,
  isPrevisualizacao = false,
}) => {
  const [config, setConfig] = useState<IntroConfig>(configCustomizada || INTRO_CONFIG_FALLBACK)
  const [cenaAtualIndex, setCenaAtualIndex] = useState<number>(0)
  const [subfase, setSubfase] = useState<'a' | 'b'>('a')
  const [dissolvendo, setDissolvendo] = useState<boolean>(false)
  const [letrasReveladas, setLetrasReveladas] = useState<number>(0)
  const [mostrarAssinaturaCena1, setMostrarAssinaturaCena1] = useState<boolean>(false)
  const [pontoDeLuzAtivo, setPontoDeLuzAtivo] = useState<boolean>(false)

  // Detecção de acessibilidade (movimento reduzido) e Mobile
  const [movimentoReduzido, setMovimentoReduzido] = useState<boolean>(false)
  const [isMobile, setIsMobile] = useState<boolean>(false)

  const finalizadoRef = useRef(false)
  const timersRef = useRef<number[]>([])

  const limparTimers = useCallback(() => {
    timersRef.current.forEach((t) => window.clearTimeout(t))
    timersRef.current = []
  }, [])

  const encerrarApresentacao = useCallback(() => {
    if (finalizadoRef.current) return
    finalizadoRef.current = true
    limparTimers()
    setDissolvendo(true)

    // Desvanecimento suave de 600ms antes de desmontar
    window.setTimeout(() => {
      onFinalizar()
    }, 600)
  }, [limparTimers, onFinalizar])

  // Detectar mobile e reduced motion
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const mediaQueryReduced = window.matchMedia('(prefers-reduced-motion: reduce)')
      setMovimentoReduzido(mediaQueryReduced.matches)

      const handleMotionChange = (e: MediaQueryListEvent) => setMovimentoReduzido(e.matches)
      mediaQueryReduced.addEventListener('change', handleMotionChange)

      const checkMobile = () => {
        setIsMobile(window.innerWidth < 768)
      }
      checkMobile()
      window.addEventListener('resize', checkMobile)

      return () => {
        mediaQueryReduced.removeEventListener('change', handleMotionChange)
        window.removeEventListener('resize', checkMobile)
      }
    }
  }, [])

  // Carregar configuração remota (se não fornecida diretamente via props)
  useEffect(() => {
    if (configCustomizada) {
      setConfig(configCustomizada)
      return
    }

    let isMounted = true
    carregarConfigIntro().then((cfg) => {
      if (isMounted && cfg) {
        setConfig(cfg)
      }
    })

    return () => {
      isMounted = false
    }
  }, [configCustomizada])

  // Se desativado na configuração (e não for preview), encerra imediatamente
  useEffect(() => {
    if (!config.ativo && !isPrevisualizacao) {
      onFinalizar()
    }
  }, [config.ativo, isPrevisualizacao, onFinalizar])

  // Animação das letras "D O M I N U S" da Cena 1
  useEffect(() => {
    if (cenaAtualIndex === 0) {
      setLetrasReveladas(0)
      setMostrarAssinaturaCena1(false)

      const intervalLetters = window.setInterval(
        () => {
          setLetrasReveladas((prev) => {
            if (prev >= 7) {
              window.clearInterval(intervalLetters)
              return 7
            }
            return prev + 1
          })
        },
        isMobile ? 120 : 160,
      )

      const timerAssinatura = window.setTimeout(
        () => {
          setMostrarAssinaturaCena1(true)
        },
        isMobile ? 1200 : 1500,
      )

      return () => {
        window.clearInterval(intervalLetters)
        window.clearTimeout(timerAssinatura)
      }
    }
  }, [cenaAtualIndex, isMobile])

  // =========================================================================
  // CRONOGRAMA DE TEMPOS
  // =========================================================================
  useEffect(() => {
    limparTimers()
    finalizadoRef.current = false

    const addTimer = (fn: () => void, delayMs: number) => {
      const id = window.setTimeout(fn, delayMs)
      timersRef.current.push(id)
    }

    // -----------------------------------------------------------------------
    // VERSÃO CURTA (cerca de 3 segundos)
    // "Cena única: monograma DOMINUS se desenha em traço dourado (1,5 s),
    // assinatura 'Contabilidade que pensa à frente.' aparece abaixo (1,0 s),
    // dissolve para a tela de login (0,5 s). Botão 'Pular' permanece disponível."
    // -----------------------------------------------------------------------
    if (modo === 'curta') {
      setCenaAtualIndex(0)
      setSubfase('a')

      // Aos 1.5s, assinatura surge
      addTimer(() => {
        setMostrarAssinaturaCena1(true)
      }, 1500)

      // Aos 2.5s, inicia dissolve
      addTimer(() => {
        setPontoDeLuzAtivo(true)
      }, 2500)

      // Aos 3.0s, dissolve final
      addTimer(() => {
        encerrarApresentacao()
      }, 3000)

      return () => limparTimers()
    }

    // -----------------------------------------------------------------------
    // VERSÃO COMPLETA (~12 segundos desktop / <=10s mobile)
    // CENA 1: 0.0s a 2.5s (MARCA)
    // CENA 2: 2.5s a 4.5s (QUEM SOMOS - frase 1, pausa, frase 2)
    // CENA 3: 4.5s a 6.5s (O QUE FAZEMOS - frase 1, desvanece, frase 2)
    // CENA 4: 6.5s a 8.5s (A DIFERENÇA - frase 1, desvanece, frase 2)
    // CENA 5: 8.5s a 10.5s (A PROMESSA - frase 1, desvanece, frase 2)
    // CENA 6: 10.5s a 12.0s (CONVITE E TRANSIÇÃO)
    // -----------------------------------------------------------------------
    const mult = isMobile ? 0.8 : 1.0 // Mobile dura no máximo ~9.6s conforme especificação

    const tCena2 = 2500 * mult
    const tCena2Frase2 = 3500 * mult

    const tCena3 = 4500 * mult
    const tCena3Frase2 = 5500 * mult

    const tCena4 = 6500 * mult
    const tCena4Frase2 = 7500 * mult

    const tCena5 = 8500 * mult
    const tCena5Frase2 = 9500 * mult

    const tCena6 = 10500 * mult
    const tPontoLuz = 11400 * mult
    const tFim = 12000 * mult

    // Cena 1 (0 a 2.5s)
    setCenaAtualIndex(0)
    setSubfase('a')

    // Cena 2
    addTimer(() => {
      setCenaAtualIndex(1)
      setSubfase('a')
    }, tCena2)

    addTimer(() => {
      setSubfase('b')
    }, tCena2Frase2)

    // Cena 3
    addTimer(() => {
      setCenaAtualIndex(2)
      setSubfase('a')
    }, tCena3)

    addTimer(() => {
      setSubfase('b')
    }, tCena3Frase2)

    // Cena 4
    addTimer(() => {
      setCenaAtualIndex(3)
      setSubfase('a')
    }, tCena4)

    addTimer(() => {
      setSubfase('b')
    }, tCena4Frase2)

    // Cena 5
    addTimer(() => {
      setCenaAtualIndex(4)
      setSubfase('a')
    }, tCena5)

    addTimer(() => {
      setSubfase('b')
    }, tCena5Frase2)

    // Cena 6
    addTimer(() => {
      setCenaAtualIndex(5)
      setSubfase('a')
    }, tCena6)

    // Ponto de luz concentra
    addTimer(() => {
      setPontoDeLuzAtivo(true)
    }, tPontoLuz)

    // Fim e transição para login
    addTimer(() => {
      encerrarApresentacao()
    }, tFim)

    return () => limparTimers()
  }, [modo, isMobile, limparTimers, encerrarApresentacao])

  // Toque em qualquer lugar no mobile funciona como "Pular"
  const handleTouchOuCliqueMobile = (e: React.MouseEvent | React.TouchEvent) => {
    if (isMobile) {
      e.stopPropagation()
      encerrarApresentacao()
    }
  }

  // Renderizador de frase com destaque para palavras-chave
  const renderFraseComDestaque = (frase?: string, destaques: string[] = []) => {
    if (!frase) return null
    if (!destaques || destaques.length === 0) {
      return <span>{frase}</span>
    }

    // Criar regex seguro com todos os termos destacados
    const termosEscapados = destaques
      .filter((d) => d && d.trim().length > 0)
      .map((d) => d.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))

    if (termosEscapados.length === 0) return <span>{frase}</span>

    const regex = new RegExp(`(${termosEscapados.join('|')})`, 'gi')
    const partes = frase.split(regex)

    return (
      <>
        {partes.map((parte, idx) => {
          const isDestaque = destaques.some((d) => d.toLowerCase() === parte.toLowerCase())
          if (isDestaque) {
            return (
              <span
                key={idx}
                className="font-normal text-transparent bg-clip-text"
                style={{
                  backgroundImage: `linear-gradient(135deg, #fef08a 0%, ${config.cor_destaque || '#f59e0b'} 50%, #d97706 100%)`,
                  textShadow: '0 0 25px rgba(245, 158, 11, 0.35)',
                }}
              >
                {parte}
              </span>
            )
          }
          return <span key={idx}>{parte}</span>
        })}
      </>
    )
  }

  const cenaAtual = config.cenas[cenaAtualIndex] || config.cenas[0]
  const letrasDominus = ['D', 'O', 'M', 'I', 'N', 'U', 'S']

  return (
    <div
      onClick={handleTouchOuCliqueMobile}
      onTouchStart={handleTouchOuCliqueMobile}
      role="region"
      aria-label="Apresentação Cinematográfica Dominus"
      className={`fixed inset-0 z-50 flex items-center justify-center select-none overflow-hidden transition-opacity duration-700 ${
        dissolvendo ? 'opacity-0 pointer-events-none' : 'opacity-100'
      } ${isMobile ? 'cursor-pointer' : ''}`}
      style={{
        backgroundColor: '#070a0f', // Grafite profundo idêntico ao tema
      }}
    >
      {/* ------------------------------------------------------------------- */}
      {/* AURORA ANIMADA E GRADIENTES DOURADO E CIANO                         */}
      {/* ------------------------------------------------------------------- */}
      {!movimentoReduzido && (
        <>
          {/* No mobile: aurora simplificada (gradiente estático com opacidade suave) */}
          {isMobile ? (
            <div className="absolute inset-0 pointer-events-none opacity-40 bg-[radial-gradient(circle_at_50%_35%,rgba(245,158,11,0.18)_0%,rgba(6,182,212,0.12)_45%,transparent_70%)]" />
          ) : (
            <>
              {/* Aurora Dourada */}
              <div
                className={`absolute w-[720px] h-[720px] rounded-full blur-[160px] pointer-events-none transition-all duration-1000 ${
                  pontoDeLuzAtivo
                    ? 'scale-50 opacity-90 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2'
                    : '-top-32 -left-20 bg-gradient-to-tr from-amber-500/20 via-cyan-500/15 to-transparent animate-aurora-slow'
                }`}
              />

              {/* Aurora Ciano */}
              <div
                className={`absolute w-[780px] h-[780px] rounded-full blur-[180px] pointer-events-none transition-all duration-1000 ${
                  pontoDeLuzAtivo
                    ? 'scale-10 opacity-100 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2'
                    : '-bottom-40 right-10 bg-gradient-to-tl from-cyan-500/18 via-amber-500/12 to-blue-600/10 animate-aurora-slow'
                }`}
                style={{ animationDelay: '-8s' }}
              />

              {/* Malha fina de pontos e linhas reativa ao mouse (desativada no mobile) */}
              <InteractiveMesh className="opacity-45" />
            </>
          )}
        </>
      )}

      {/* Grid sutil de profundidade */}
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.5) 1px, transparent 1px)`,
          backgroundSize: '36px 36px',
        }}
      />

      {/* Ponto focal de concentração na transição final (Cena 6) */}
      {pontoDeLuzAtivo && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-8 h-8 rounded-full bg-amber-400 blur-sm animate-ping opacity-75" />
          <div className="w-3 h-3 rounded-full bg-white shadow-[0_0_50px_20px_rgba(245,158,11,0.8)]" />
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* CONTEÚDO CENTRAL: CADA FRASE OCUPA O CENTRO DA TELA                 */}
      {/* Tipografia: Space Grotesk / Sora, peso 300, 2rem a 4rem             */}
      {/* ------------------------------------------------------------------- */}
      <div className="relative z-10 max-w-4xl w-full px-6 text-center text-slate-100 flex flex-col items-center justify-center min-h-[320px]">
        {/* ================================================================= */}
        {/* CENA 1 ou VERSÃO CURTA: MONOGRAMA + LETRAS + ASSINATURA           */}
        {/* ================================================================= */}
        {cenaAtualIndex === 0 && (
          <div className="flex flex-col items-center justify-center space-y-6 animate-in fade-in duration-700">
            {/* Monograma DOMINUS que se desenha em traço dourado */}
            <div className="relative flex items-center justify-center">
              <MonogramaAnimado
                tamanho={isMobile ? 110 : 145}
                strokeColor={config.cor_destaque || '#f59e0b'}
                animar={!movimentoReduzido}
                duracaoSegundos={isMobile ? 1.3 : 1.7}
                svgPersonalizado={config.svg_monograma}
              />
            </div>

            {/* Letras D O M I N U S em espaçamento largo */}
            <div
              className="flex items-center justify-center gap-3 sm:gap-5 pt-2"
              aria-label="DOMINUS"
            >
              {letrasDominus.map((letra, idx) => {
                const visivel = letrasReveladas > idx
                return (
                  <span
                    key={idx}
                    className={`font-heading text-xl sm:text-2xl md:text-3xl font-light tracking-[0.35em] text-white transition-all duration-300 ${
                      visivel ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
                    }`}
                  >
                    {letra}
                  </span>
                )
              })}
            </div>

            {/* Assinatura da marca */}
            <div
              className={`transition-all duration-700 ${
                mostrarAssinaturaCena1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
              }`}
            >
              <p className="text-xs sm:text-sm md:text-base font-light tracking-[0.25em] uppercase text-amber-400/90 font-mono">
                {config.assinatura}
              </p>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* CENAS 2 A 5: FRASES CENTRALIZADAS COM DESVANECIMENTO CRUZADO       */}
        {/* ================================================================= */}
        {cenaAtualIndex >= 1 && cenaAtualIndex <= 4 && (
          <div className="w-full relative min-h-[180px] flex items-center justify-center">
            {/* Frase 1 da cena */}
            <div
              className={`absolute inset-0 flex items-center justify-center transition-all duration-700 ease-out ${
                subfase === 'a'
                  ? 'opacity-100 scale-100 blur-0'
                  : 'opacity-0 scale-[0.98] blur-[2px] pointer-events-none'
              }`}
            >
              <h2 className="text-2xl sm:text-3xl md:text-5xl lg:text-[54px] font-light leading-tight sm:leading-[1.2] tracking-tight max-w-3xl px-2 font-heading">
                {renderFraseComDestaque(cenaAtual.frase1, cenaAtual.destaques)}
              </h2>
            </div>

            {/* Frase 2 da cena */}
            <div
              className={`absolute inset-0 flex items-center justify-center transition-all duration-700 ease-out ${
                subfase === 'b'
                  ? 'opacity-100 scale-100 blur-0'
                  : 'opacity-0 scale-[0.98] blur-[2px] pointer-events-none'
              }`}
            >
              <h2 className="text-2xl sm:text-3xl md:text-5xl lg:text-[54px] font-light leading-tight sm:leading-[1.2] tracking-tight max-w-3xl px-2 font-heading">
                {renderFraseComDestaque(cenaAtual.frase2, cenaAtual.destaques)}
              </h2>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* CENA 6: CONVITE E TRANSIÇÃO (Monograma menor + Acesse seu painel)  */}
        {/* ================================================================= */}
        {cenaAtualIndex === 5 && (
          <div className="flex flex-col items-center justify-center space-y-6 animate-in fade-in zoom-in-95 duration-700">
            {/* Monograma menor no centro */}
            <MonogramaAnimado
              tamanho={isMobile ? 80 : 100}
              strokeColor={config.cor_destaque || '#f59e0b'}
              animar={false}
              svgPersonalizado={config.svg_monograma}
            />

            {/* Frase final */}
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-light tracking-tight font-heading">
              {renderFraseComDestaque(cenaAtual.frase1 || 'Acesse seu painel.', ['seu painel'])}
            </h2>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* BOTÃO 'PULAR' DISCRETO NO CANTO INFERIOR DIREITO                    */}
      {/* Visível desde o primeiro instante, texto em cinza claro             */}
      {/* ------------------------------------------------------------------- */}
      <div className="absolute bottom-6 right-6 z-20">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            encerrarApresentacao()
          }}
          className="text-xs sm:text-sm font-mono tracking-wider text-slate-400 hover:text-slate-200 px-3.5 py-1.5 rounded-lg border border-white/10 hover:border-white/20 bg-white/[0.02] hover:bg-white/[0.06] backdrop-blur-md transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-amber-400/40"
          title="Pular apresentação e ir direto para o login"
        >
          Pular
        </button>
      </div>

      {/* Indicador no mobile de que o toque na tela pula */}
      {isMobile && (
        <div className="absolute bottom-6 left-6 z-20 pointer-events-none">
          <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
            Toque para pular
          </p>
        </div>
      )}
    </div>
  )
}
