export interface CenaIntro {
  id: number
  titulo: string
  tipo?: 'monograma_e_letras' | 'padrao' | 'final'
  frase1?: string
  frase2?: string
  subtitulo?: string
  destaques?: string[]
}

export interface IntroConfig {
  id?: string
  ativo: boolean
  assinatura: string
  cor_destaque: string
  cenas: CenaIntro[]
  svg_monograma?: string
  svg_logotipo?: string
  duracao_versao_curta_ms?: number
}

export const INTRO_CONFIG_FALLBACK: IntroConfig = {
  ativo: true,
  assinatura: 'Contabilidade que pensa à frente.',
  cor_destaque: '#f59e0b',
  duracao_versao_curta_ms: 3000,
  cenas: [
    {
      id: 1,
      titulo: 'MARCA',
      tipo: 'monograma_e_letras',
      subtitulo: 'Contabilidade que pensa à frente.',
      destaques: ['DOMINUS'],
    },
    {
      id: 2,
      titulo: 'QUEM SOMOS',
      tipo: 'padrao',
      frase1: 'Somos a Dominus.',
      frase2: 'Cuidamos do seu fisco para você cuidar do seu negócio.',
      destaques: ['Dominus', 'seu negócio'],
    },
    {
      id: 3,
      titulo: 'O QUE FAZEMOS',
      tipo: 'padrao',
      frase1: 'Contabilidade, estratégia e tecnologia sob o mesmo olhar.',
      frase2: 'Cada número da sua empresa tem dono, prazo e propósito.',
      destaques: ['estratégia e tecnologia', 'propósito'],
    },
    {
      id: 4,
      titulo: 'A DIFERENÇA',
      tipo: 'padrao',
      frase1: 'Você informa o faturamento. Nós cuidamos de todo o resto.',
      frase2: 'Em tempo real. Sem surpresas. Sem atrasos.',
      destaques: ['todo o resto', 'tempo real'],
    },
    {
      id: 5,
      titulo: 'A PROMESSA',
      tipo: 'padrao',
      frase1: 'Enquanto outros entregam guias, nós entregamos clareza.',
      frase2: 'Aqui, o empresário enxerga o próprio imposto antes de pagar.',
      destaques: ['clareza', 'antes de pagar'],
    },
    {
      id: 6,
      titulo: 'CONVITE E TRANSIÇÃO',
      tipo: 'final',
      frase1: 'Acesse seu painel.',
      destaques: ['seu painel'],
    },
  ],
}

const STORAGE_LAST_FULL_INTRO = 'dominus_intro_last_full_ts'
const STORAGE_LAST_VISIT = 'dominus_intro_last_visit_ts'
const SETE_DIAS_MS = 7 * 24 * 60 * 60 * 1000

export type ModoExibicaoIntro = 'completa' | 'curta' | 'desativada'

/**
 * Função pura para ler cookies caso localStorage esteja bloqueado ou para garantir persistência.
 */
function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null
  return null
}

function setCookie(name: string, val: string, days = 365) {
  if (typeof document === 'undefined') return
  const d = new Date()
  d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000)
  document.cookie = `${name}=${val};path=/;expires=${d.toUTCString()};SameSite=Lax`
}

/**
 * Avalia se o visitante deve ver a versão completa ou a versão curta.
 * Regra:
 * "A versão completa aparece na primeira visita, após 7 dias sem acesso e uma vez por semana.
 * Nas demais visitas, exibir apenas a versão curta."
 */
export function determinarModoApresentacao(forcarModo?: 'completa' | 'curta'): ModoExibicaoIntro {
  if (forcarModo) return forcarModo

  try {
    const agora = Date.now()
    const lastFullStr =
      localStorage.getItem(STORAGE_LAST_FULL_INTRO) || getCookie(STORAGE_LAST_FULL_INTRO)
    const lastVisitStr = localStorage.getItem(STORAGE_LAST_VISIT) || getCookie(STORAGE_LAST_VISIT)

    // Atualiza o timestamp de visita
    localStorage.setItem(STORAGE_LAST_VISIT, agora.toString())
    setCookie(STORAGE_LAST_VISIT, agora.toString())

    // 1. Primeira visita: nunca viu a completa
    if (!lastFullStr) {
      registrarExibicaoCompleta()
      return 'completa'
    }

    const lastFullTs = parseInt(lastFullStr, 10)
    if (isNaN(lastFullTs)) {
      registrarExibicaoCompleta()
      return 'completa'
    }

    // 2. Após 7 dias sem acesso
    if (lastVisitStr) {
      const lastVisitTs = parseInt(lastVisitStr, 10)
      if (!isNaN(lastVisitTs) && agora - lastVisitTs >= SETE_DIAS_MS) {
        registrarExibicaoCompleta()
        return 'completa'
      }
    }

    // 3. Uma vez por semana (7 dias desde a última versão completa)
    if (agora - lastFullTs >= SETE_DIAS_MS) {
      registrarExibicaoCompleta()
      return 'completa'
    }

    // 4. Demais visitas: versão curta
    return 'curta'
  } catch (e) {
    console.warn('Erro ao avaliar frequência da intro:', e)
    return 'curta'
  }
}

export function registrarExibicaoCompleta() {
  try {
    const agora = Date.now().toString()
    localStorage.setItem(STORAGE_LAST_FULL_INTRO, agora)
    setCookie(STORAGE_LAST_FULL_INTRO, agora)
  } catch {
    /* ignore */
  }
}
