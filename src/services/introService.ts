import pb from '@/lib/pocketbase/client'
import { IntroConfig, INTRO_CONFIG_FALLBACK, CenaIntro } from '@/config/introConfig'

export async function carregarConfigIntro(): Promise<IntroConfig> {
  try {
    const list = await pb.collection('intro_config').getList(1, 1, {
      sort: '-created',
      requestKey: null,
    })

    if (list.items.length === 0) {
      return INTRO_CONFIG_FALLBACK
    }

    const rec = list.items[0]
    let cenas: CenaIntro[] = INTRO_CONFIG_FALLBACK.cenas

    try {
      const parsed = JSON.parse(rec.cenas_json)
      if (Array.isArray(parsed) && parsed.length > 0) {
        cenas = parsed
      }
    } catch (e) {
      console.warn('Erro ao parsear cenas_json da intro:', e)
    }

    return {
      id: rec.id,
      ativo: rec.ativo !== false,
      assinatura: rec.assinatura || INTRO_CONFIG_FALLBACK.assinatura,
      cor_destaque: rec.cor_destaque || INTRO_CONFIG_FALLBACK.cor_destaque,
      cenas,
      svg_monograma: rec.svg_monograma || '',
      svg_logotipo: rec.svg_logotipo || '',
      duracao_versao_curta_ms: rec.duracao_versao_curta_ms || 3000,
    }
  } catch (err) {
    // Tolerante a falha: se não autenticado ou offline, usa o fallback sem bloquear
    return INTRO_CONFIG_FALLBACK
  }
}

export async function salvarConfigIntro(config: Partial<IntroConfig>): Promise<IntroConfig> {
  const dadosParaSalvar: Record<string, unknown> = {}

  if (config.ativo !== undefined) dadosParaSalvar.ativo = config.ativo
  if (config.assinatura !== undefined) dadosParaSalvar.assinatura = config.assinatura
  if (config.cor_destaque !== undefined) dadosParaSalvar.cor_destaque = config.cor_destaque
  if (config.cenas !== undefined) dadosParaSalvar.cenas_json = JSON.stringify(config.cenas)
  if (config.svg_monograma !== undefined) dadosParaSalvar.svg_monograma = config.svg_monograma
  if (config.svg_logotipo !== undefined) dadosParaSalvar.svg_logotipo = config.svg_logotipo
  if (config.duracao_versao_curta_ms !== undefined)
    dadosParaSalvar.duracao_versao_curta_ms = config.duracao_versao_curta_ms

  let id = config.id

  if (!id) {
    // Tenta encontrar o registro existente
    try {
      const list = await pb.collection('intro_config').getList(1, 1, { sort: '-created' })
      if (list.items.length > 0) {
        id = list.items[0].id
      }
    } catch {
      /* ignore */
    }
  }

  if (id) {
    await pb.collection('intro_config').update(id, dadosParaSalvar)
  } else {
    const novo = await pb.collection('intro_config').create(dadosParaSalvar)
    id = novo.id
  }

  return carregarConfigIntro()
}
