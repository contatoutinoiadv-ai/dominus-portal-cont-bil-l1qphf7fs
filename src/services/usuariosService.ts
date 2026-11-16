import pb from '@/lib/pocketbase/client'
import { DominusUser, UserRole } from '@/types/dominus'
import { registrarLogAuditoria } from '@/lib/pocketbase/auditService'
import { getErrorMessage } from '@/lib/pocketbase/errors'

/**
 * Serviço de gestão de usuários (Equipe e Acessos).
 *
 * Observação sobre e-mail: registros auth do PocketBase com `emailVisibility=false`
 * não devolvem o campo email para quem não é o dono — na prática isso vinha como
 * undefined e estourava "Cannot read properties of undefined (reading 'toLowerCase')"
 * na tela de Equipe e Acessos. A partir daqui o email é SEMPRE normalizado para string.
 */

export const FILTRO_USUARIOS_NAO_EXCLUIDOS = "deleted_at = '' || deleted_at = null"

/** Normaliza qualquer valor vindo do PocketBase para string segura. */
export const textoSeguro = (valor: unknown): string => {
  if (typeof valor === 'string') return valor
  if (valor === null || valor === undefined) return ''
  return String(valor)
}

export interface UsuarioComEmpresa extends DominusUser {
  username?: string
  empresa_nome?: string
  empresa_cnpj?: string
}

/** Converte um registro PocketBase em UsuarioComEmpresa, com todos os campos de texto garantidos. */
const mapearUsuario = (
  rec: Record<string, unknown>,
  empresaNome?: string,
  empresaCnpj?: string,
): UsuarioComEmpresa => {
  const email = textoSeguro(rec.email)
  const nome = textoSeguro(rec.name) || email.split('@')[0] || 'Usuário'
  return {
    id: String(rec.id || ''),
    email,
    name: nome,
    username: textoSeguro(rec.username),
    role: (rec.role as UserRole) || 'cliente',
    empresa_id: textoSeguro(rec.empresa_id) || undefined,
    avatar: textoSeguro(rec.avatar) || undefined,
    must_change_password: !!rec.must_change_password,
    lgpd_accepted: !!rec.lgpd_accepted,
    lgpd_accepted_at: textoSeguro(rec.lgpd_accepted_at) || undefined,
    failed_login_attempts: (rec.failed_login_attempts as number) || 0,
    locked_until: textoSeguro(rec.locked_until) || undefined,
    ativo: rec.ativo !== false,
    cargo: textoSeguro(rec.cargo) || undefined,
    telefone: textoSeguro(rec.telefone) || undefined,
    observacoes: textoSeguro(rec.observacoes) || undefined,
    deleted_at: textoSeguro(rec.deleted_at) || undefined,
    empresa_nome: textoSeguro(empresaNome) || undefined,
    empresa_cnpj: textoSeguro(empresaCnpj) || undefined,
    created: String(rec.created || ''),
    updated: String(rec.updated || ''),
  }
}

/** Lista usuários não excluídos, com o nome da empresa vinculada quando houver. */
export const listarUsuarios = async (_soNaoExcluidos?: boolean): Promise<UsuarioComEmpresa[]> => {
  const registros = await pb.collection('users').getFullList({
    filter: FILTRO_USUARIOS_NAO_EXCLUIDOS,
    sort: '-created',
  })

  const lista: UsuarioComEmpresa[] = []
  for (const rec of registros as unknown as Record<string, unknown>[]) {
    const usuario = mapearUsuario(rec)
    if (usuario.empresa_id) {
      try {
        const emp = await pb.collection('empresas').getOne(usuario.empresa_id)
        usuario.empresa_nome = textoSeguro(emp?.razao_social)
        usuario.empresa_cnpj = textoSeguro((emp as Record<string, unknown>)?.cnpj)
      } catch {
        // empresa pode ter sido excluída; segue sem nome
      }
    }
    lista.push(usuario)
  }
  return lista
}

export interface CriarUsuarioEquipeInput {
  name: string
  email?: string
  username?: string
  password: string
  cargo?: string
  telefone?: string
  observacoes?: string
}

export interface CriarUsuarioClienteInput {
  name: string
  email?: string
  username?: string
  password: string
  empresa_id: string
  observacoes?: string
}

const normalizarUsername = (valor?: string): string =>
  (valor || '').trim().toLowerCase().replace(/\s+/g, '')

/** Normaliza username para busca de unicidade: sem espaços, em minúsculas. */
export const prepararUsername = normalizarUsername

export interface ValidacaoNovoUsuario {
  ok: boolean
  erros: Record<string, string>
}

const validarIdentificacao = (email?: string, username?: string): Record<string, string> => {
  const erros: Record<string, string> = {}
  const temEmail = !!(email && email.trim())
  const temUsername = !!(username && username.trim())

  if (!temEmail && !temUsername) {
    erros.identificacao = 'Informe um e-mail ou um nome de usuário para o acesso.'
    return erros
  }

  if (temEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email!.trim())) {
    erros.email = 'Informe um e-mail válido (ou deixe vazio e use apenas o usuário).'
  }

  if (temUsername) {
    const u = normalizarUsername(username)
    if (u.length < 3) {
      erros.username = 'O nome de usuário deve ter ao menos 3 caracteres.'
    } else if (!/^[a-z0-9._-]+$/.test(u)) {
      erros.username =
        'Use apenas letras (sem acento), números, ponto, hífen ou underline no nome de usuário.'
    }
  }
  return erros
}

/** Valida se username (ou e-mail) já está em uso por outro usuário ativo. */
export const erroIdentificacaoDuplicada = async (
  email?: string,
  username?: string,
  idIgnore?: string,
): Promise<Record<string, string>> => {
  const erros: Record<string, string> = {}
  const u = normalizarUsername(username)

  if (u) {
    const existentes = await pb.collection('users').getList(1, 1, {
      filter: `username ~ '${u}' && id != '${idIgnore || ''}'`,
    })
    if (existentes.totalItems > 0) {
      erros.username = 'Este nome de usuário já está em uso por outro login.'
    }
  }

  const e = (email || '').trim().toLowerCase()
  if (e) {
    const existentesEmail = await pb.collection('users').getList(1, 1, {
      filter: `email ~ '${e}' && id != '${idIgnore || ''}'`,
    })
    if (existentesEmail.totalItems > 0) {
      erros.email = 'Este e-mail já está em uso por outro login.'
    }
  }
  return erros
}

/**
 * Valida a identificação (e-mail e/ou username) e lança erro com mensagem
 * amigável quando algo estiver ausente, inválido ou duplicado.
 */
const garantirIdentificacaoValida = async (
  email?: string,
  username?: string,
  idIgnore?: string,
): Promise<void> => {
  const errosEstaticos = validarIdentificacao(email, username)
  if (Object.keys(errosEstaticos).length > 0) {
    throw new Error(Object.values(errosEstaticos)[0])
  }
  const errosDuplicidade = await erroIdentificacaoDuplicada(email, username, idIgnore)
  if (Object.keys(errosDuplicidade).length > 0) {
    throw new Error(Object.values(errosDuplicidade)[0])
  }
}

const montarPayload = (
  dados: { name: string; email?: string; username?: string },
  incluirSenha?: string,
): Record<string, unknown> => {
  const payload: Record<string, unknown> = {
    name: dados.name.trim(),
    emailVisibility: true,
  }
  const email = (dados.email || '').trim()
  if (email) payload.email = email
  const u = normalizarUsername(dados.username)
  if (u) payload.username = u

  if (incluirSenha) {
    payload.password = incluirSenha
    payload.passwordConfirm = incluirSenha
  }
  return payload
}

/** Cadastra um membro da equipe contábil (role contador). */
export const cadastrarUsuarioEquipe = async (
  input: CriarUsuarioEquipeInput,
  usuarioAtual?: DominusUser | null,
): Promise<UsuarioComEmpresa> => {
  await garantirIdentificacaoValida(input.email, input.username)

  const payload = montarPayload(input, input.password)
  payload.role = 'contador'
  payload.ativo = true
  payload.must_change_password = true
  if (input.cargo !== undefined) payload.cargo = input.cargo
  if (input.telefone !== undefined) payload.telefone = input.telefone
  if (input.observacoes !== undefined) payload.observacoes = input.observacoes

  const rec = await pb.collection('users').create(payload)
  const criado = mapearUsuario(rec as unknown as Record<string, unknown>)

  await registrarLogAuditoria({
    usuarioId: usuarioAtual?.id,
    usuarioNome: usuarioAtual?.name,
    usuarioRole: usuarioAtual?.role,
    acao: 'USUARIO_CRIADO',
    entidade: 'users',
    entidadeId: criado.id,
    detalhes: `Membro da equipe cadastrado: ${criado.name} (${criado.email || criado.username}).`,
  })
  return criado
}

/** Cadastra um login de cliente vinculado a uma empresa. */
export const cadastrarUsuarioCliente = async (
  input: CriarUsuarioClienteInput,
  usuarioAtual?: DominusUser | null,
): Promise<UsuarioComEmpresa> => {
  await garantirIdentificacaoValida(input.email, input.username)

  const payload = montarPayload(input, input.password)
  payload.role = 'cliente'
  payload.ativo = true
  payload.must_change_password = true
  payload.empresa_id = input.empresa_id
  if (input.observacoes !== undefined) payload.observacoes = input.observacoes

  const rec = await pb.collection('users').create(payload)
  const criado = mapearUsuario(rec as unknown as Record<string, unknown>)

  await registrarLogAuditoria({
    usuarioId: usuarioAtual?.id,
    usuarioNome: usuarioAtual?.name,
    usuarioRole: usuarioAtual?.role,
    empresaId: input.empresa_id,
    acao: 'USUARIO_CRIADO',
    entidade: 'users',
    entidadeId: criado.id,
    detalhes: `Login de cliente cadastrado: ${criado.name} (${criado.email || criado.username}).`,
  })
  return criado
}

export interface EditarUsuarioInput {
  name: string
  email?: string
  username?: string
  cargo?: string
  telefone?: string
  observacoes?: string
  empresa_id?: string
  role?: UserRole
}

/** Salva a edição de um usuário (nome, identificação, cargo, contato). */
export const editarUsuario = async (
  id: string,
  input: EditarUsuarioInput,
  usuarioAtual?: DominusUser | null,
  _usuarioAntigo?: UsuarioComEmpresa | null,
): Promise<UsuarioComEmpresa> => {
  await garantirIdentificacaoValida(input.email, input.username, id)

  const payload = montarPayload(input)
  if (input.cargo !== undefined) payload.cargo = input.cargo
  if (input.telefone !== undefined) payload.telefone = input.telefone
  if (input.observacoes !== undefined) payload.observacoes = input.observacoes
  if (input.role !== undefined) payload.role = input.role
  if (input.empresa_id !== undefined) payload.empresa_id = input.empresa_id

  const rec = await pb.collection('users').update(id, payload)
  const atualizado = mapearUsuario(rec as unknown as Record<string, unknown>)

  await registrarLogAuditoria({
    usuarioId: usuarioAtual?.id,
    usuarioNome: usuarioAtual?.name,
    usuarioRole: usuarioAtual?.role,
    empresaId: atualizado.empresa_id,
    acao: 'USUARIO_ALTERADO',
    entidade: 'users',
    entidadeId: id,
    detalhes: `Login alterado: ${atualizado.name} (${atualizado.email || atualizado.username}).`,
  })
  return atualizado
}

const mensagemErroRedefinicao = (error: unknown): string => {
  const msg = getErrorMessage(error)
  if (/old password|oldPassword/i.test(msg)) {
    return 'O PocketBase exigiu a senha antiga para esta operação. Verifique a regra "Manage" da collection users.'
  }
  if (msg && !/failed to update record/i.test(msg)) return msg
  return 'Não foi possível aplicar a nova senha temporária. Verifique a conexão e tente novamente.'
}

/** Gera nova senha temporária (primeiro acesso obrigatório) e zera bloqueios. */
export const redefinirSenhaUsuario = async (
  id: string,
  novaSenha: string,
  usuarioAtual?: DominusUser | null,
  _nomeUsuario?: string,
): Promise<void> => {
  try {
    await pb.collection('users').update(id, {
      password: novaSenha,
      passwordConfirm: novaSenha,
      must_change_password: true,
      failed_login_attempts: 0,
      locked_until: '',
    })
  } catch (error) {
    throw new Error(mensagemErroRedefinicao(error))
  }
  await registrarLogAuditoria({
    usuarioId: usuarioAtual?.id,
    usuarioNome: usuarioAtual?.name,
    usuarioRole: usuarioAtual?.role,
    acao: 'SENHA_REDEFINIDA',
    entidade: 'users',
    entidadeId: id,
    detalhes: 'Senha redefinida pelo escritório; troca obrigatória no próximo acesso.',
  })
}

/** Desativa/reativa um login (o usuário perde a sessão e não consegue mais entrar). */
export const alternarStatusUsuario = async (
  id: string,
  novoAtivo: boolean,
  usuarioAtual?: DominusUser | null,
  nomeUsuario?: string,
): Promise<boolean> => {
  await pb.collection('users').update(id, { ativo: novoAtivo })

  await registrarLogAuditoria({
    usuarioId: usuarioAtual?.id,
    usuarioNome: usuarioAtual?.name,
    usuarioRole: usuarioAtual?.role,
    acao: novoAtivo ? 'USUARIO_ATIVADO' : 'USUARIO_DESATIVADO',
    entidade: 'users',
    entidadeId: id,
    detalhes: `Login ${novoAtivo ? 'reativado' : 'desativado'}: ${nomeUsuario || id}.`,
  })
  return novoAtivo
}

/** Libera bloqueio por tentativas erradas (zera contador e locked_until). */
export const desbloquearUsuario = async (
  id: string,
  usuarioAtual?: DominusUser | null,
  nomeUsuario?: string,
  emailUsuario?: string,
): Promise<void> => {
  await pb.collection('users').update(id, {
    failed_login_attempts: 0,
    locked_until: '',
  })
  await registrarLogAuditoria({
    usuarioId: usuarioAtual?.id,
    usuarioNome: usuarioAtual?.name,
    usuarioRole: usuarioAtual?.role,
    acao: 'USUARIO_DESBLOQUEADO',
    entidade: 'users',
    entidadeId: id,
    detalhes: `Bloqueio liberado pelo escritório: ${nomeUsuario || id}.`,
  })
  // limpa também o bloqueio local do navegador para esta identificação
  const chave = `login_attempts_${textoSeguro(emailUsuario).toLowerCase().trim()}`
  if (chave.length > 'login_attempts_'.length) localStorage.removeItem(chave)
}

/** Exclusão lógica: o login sai das listagens e não autentica mais. */
export const excluirUsuario = async (
  id: string,
  usuarioAtual?: DominusUser | null,
  nomeUsuario?: string,
  emailUsuario?: string,
): Promise<void> => {
  await pb.collection('users').update(id, {
    deleted_at: new Date().toISOString(),
    ativo: false,
  })
  await registrarLogAuditoria({
    usuarioId: usuarioAtual?.id,
    usuarioNome: usuarioAtual?.name,
    usuarioRole: usuarioAtual?.role,
    acao: 'USUARIO_EXCLUIDO',
    entidade: 'users',
    entidadeId: id,
    detalhes: `Login excluído (lógico): ${nomeUsuario || id}.`,
  })
  const chave = `login_attempts_${textoSeguro(emailUsuario).toLowerCase().trim()}`
  if (chave.length > 'login_attempts_'.length) localStorage.removeItem(chave)
}
