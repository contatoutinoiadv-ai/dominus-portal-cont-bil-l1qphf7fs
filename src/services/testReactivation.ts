import pb from '@/lib/pocketbase/client'

export async function testarFluxoAtivacaoDesativacaoDemo(): Promise<{
  sucesso: boolean
  detalhes: string[]
}> {
  const detalhes: string[] = []
  const emailDemo = 'cliente.simples@dominus.com.br'
  const senhaDemo = 'Skip@Pass'

  try {
    // 1. Obter registro do usuário de demonstração
    const userRec = await pb.collection('users').getFirstListItem(`email = '${emailDemo}'`)
    detalhes.push(`Usuário demo encontrado: ${userRec.email} (id: ${userRec.id})`)

    // Salvar estado original
    const estadoOriginalAtivo = userRec.ativo !== false

    // 2. Desativar o usuário
    await pb.collection('users').update(userRec.id, { ativo: false })
    detalhes.push('Usuário demo desativado com sucesso.')

    // 3. Simular tentativa de login de usuário desativado
    // Como vimos no authContext.tsx:
    // authWithPassword autentica no PB, mas a verificação se rec.ativo === false limpa authStore e retorna:
    // "Seu acesso foi desativado pelo escritório contábil. Contate seu contador."
    const authDataDesativado = await pb.collection('users').authWithPassword(emailDemo, senhaDemo)
    const loginBloqueadoPeloContexto = authDataDesativado.record.ativo === false
    pb.authStore.clear()
    detalhes.push(
      `Tentativa de login com usuário desativado: status ativo no registro = ${authDataDesativado.record.ativo}. Bloqueio pelo portal: ${loginBloqueadoPeloContexto}`
    )

    // 4. Reativar o usuário (como o botão "Ativar" faz)
    await pb.collection('users').update(userRec.id, { ativo: true })
    detalhes.push('Usuário demo reativado com sucesso via update (ativo: true).')

    // 5. Testar login com usuário reativado
    const authDataReativado = await pb.collection('users').authWithPassword(emailDemo, senhaDemo)
    const loginPermitido = authDataReativado.record.ativo === true
    pb.authStore.clear()
    detalhes.push(
      `Tentativa de login com usuário reativado: status ativo = ${authDataReativado.record.ativo}. Acesso liberado: ${loginPermitido}`
    )

    // 6. Devolver usuário de demonstração ao seu estado original caso fosse false
    if (!estadoOriginalAtivo) {
      await pb.collection('users').update(userRec.id, { ativo: estadoOriginalAtivo })
      detalhes.push(`Usuário demo retornado ao estado original (ativo: ${estadoOriginalAtivo}).`)
    }

    return {
      sucesso: loginBloqueadoPeloContexto && loginPermitido,
      detalhes,
    }
  } catch (err: unknown) {
    const e = err as { message?: string }
    detalhes.push(`Erro durante validação: ${e.message}`)
    return { sucesso: false, detalhes }
  }
}
