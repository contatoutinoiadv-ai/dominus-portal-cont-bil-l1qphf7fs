import pb from './client'

export async function registrarLogAuditoria(params: {
  usuarioId: string
  usuarioNome: string
  usuarioRole: string
  empresaId?: string
  acao:
    | 'LANCAMENTO_CRIADO'
    | 'LANCAMENTO_ALTERADO'
    | 'LANCAMENTO_VALIDADO'
    | 'LANCAMENTO_DEVOLVIDO'
    | 'LANCAMENTO_EXCLUIDO'
    | 'ENQUADRAMENTO_ALTERADO'
    | 'PARAMETRO_ALTERADO'
    | 'LOGIN_SUCESSO'
    | 'LOGIN_FALHA'
    | 'SENHA_ALTERADA'
    | 'CONSENTIMENTO_LGPD'
  entidade: string
  entidadeId?: string
  valorAnterior?: unknown
  valorNovo?: unknown
  detalhes?: string
}) {
  try {
    await pb.collection('auditoria').create({
      usuario_id: params.usuarioId,
      usuario_nome: params.usuarioNome,
      usuario_role: params.usuarioRole,
      empresa_id: params.empresaId || '',
      acao: params.acao,
      entidade: params.entidade,
      entidade_id: params.entidadeId || '',
      valor_anterior_json: params.valorAnterior ? JSON.stringify(params.valorAnterior) : '',
      valor_novo_json: params.valorNovo ? JSON.stringify(params.valorNovo) : '',
      detalhes: params.detalhes || '',
      ip_origem: typeof window !== 'undefined' ? window.location.hostname : '',
    })
  } catch (err) {
    console.warn('Falha ao gravar trilha de auditoria:', err)
  }
}
