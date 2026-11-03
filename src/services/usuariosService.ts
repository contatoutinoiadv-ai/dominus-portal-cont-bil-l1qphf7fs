import pb from '@/lib/pocketbase/client'
import { DominusUser } from '@/types/dominus'
import { registrarLogAuditoria } from '@/lib/pocketbase/auditService'

export interface CriarUsuarioEquipeInput {
  name: string
  email: string
  password: string
  cargo?: string
  telefone?: string
  observacoes?: string
  must_change_password?: boolean
}

export interface CriarUsuarioClienteInput {
  name: string
  email: string
  password: string
  empresa_id: string
  telefone?: string
  cargo?: string
  observacoes?: string
  must_change_password?: boolean
}

export interface EditarUsuarioInput {
  name?: string
  email?: string
  telefone?: string
  cargo?: string
  observacoes?: string
  empresa_id?: string
  role?: 'contador' | 'cliente'
}

export interface UsuarioComEmpresa extends DominusUser {
  empresa_nome?: string
  empresa_cnpj?: string
}

/**
 * Listar todos os usuários não excluídos (ou todos com filtro)
 */
export async function listarUsuarios(incluirExcluidos = false): Promise<UsuarioComEmpresa[]> {
  const filter = incluirExcluidos ? '' : "deleted_at = '' || deleted_at = null"
  const records = await pb.collection('users').getFullList({
    sort: '-created',
    filter,
  })

  // Buscar empresas para mapeamento
  let empresasMap: Record<string, { razao_social: string; cnpj: string }> = {}
  try {
    const empresas = await pb.collection('empresas').getFullList({
      filter: "deleted_at = '' || deleted_at = null",
      fields: 'id,razao_social,cnpj',
    })
    empresasMap = empresas.reduce(
      (acc, emp) => {
        acc[emp.id] = { razao_social: emp.razao_social, cnpj: emp.cnpj }
        return acc
      },
      {} as Record<string, { razao_social: string; cnpj: string }>,
    )
  } catch (err) {
    console.warn('Erro ao mapear empresas para usuários:', err)
  }

  return records.map((rec) => {
    const empData = rec.empresa_id ? empresasMap[rec.empresa_id] : undefined
    return {
      id: rec.id,
      email: rec.email,
      name: rec.name || rec.email.split('@')[0],
      role: (rec.role as 'contador' | 'cliente') || 'cliente',
      empresa_id: rec.empresa_id || undefined,
      avatar: rec.avatar || undefined,
      must_change_password: !!rec.must_change_password,
      lgpd_accepted: !!rec.lgpd_accepted,
      lgpd_accepted_at: rec.lgpd_accepted_at,
      failed_login_attempts: rec.failed_login_attempts || 0,
      locked_until: rec.locked_until || undefined,
      ativo: rec.ativo !== false,
      cargo: rec.cargo || undefined,
      telefone: rec.telefone || undefined,
      observacoes: rec.observacoes || undefined,
      deleted_at: rec.deleted_at || undefined,
      created: rec.created,
      updated: rec.updated,
      empresa_nome: empData?.razao_social,
      empresa_cnpj: empData?.cnpj,
    }
  })
}

/**
 * Cadastrar novo usuário da equipe (perfil contador)
 */
export async function cadastrarUsuarioEquipe(
  input: CriarUsuarioEquipeInput,
  currentUser: DominusUser,
): Promise<DominusUser> {
  const emailLimpo = input.email.trim().toLowerCase()

  // Verificar se e-mail já existe
  const existentes = await pb.collection('users').getList(1, 1, {
    filter: `email = '${emailLimpo}'`,
  })
  if (existentes.totalItems > 0) {
    throw new Error('Já existe um usuário cadastrado com este e-mail no sistema.')
  }

  const record = await pb.collection('users').create({
    name: input.name.trim(),
    email: emailLimpo,
    password: input.password,
    passwordConfirm: input.password,
    role: 'contador',
    cargo: input.cargo?.trim() || '',
    telefone: input.telefone?.trim() || '',
    observacoes: input.observacoes?.trim() || '',
    must_change_password: input.must_change_password !== false,
    ativo: true,
    failed_login_attempts: 0,
    locked_until: '',
    deleted_at: '',
  })

  await registrarLogAuditoria({
    usuarioId: currentUser.id,
    usuarioNome: currentUser.name,
    usuarioRole: currentUser.role,
    acao: 'USUARIO_CRIADO',
    entidade: 'users',
    entidadeId: record.id,
    valorNovo: {
      name: record.name,
      email: record.email,
      role: 'contador',
      cargo: record.cargo,
    },
    detalhes: `Novo membro da equipe contábil cadastrado: ${record.name} (${record.email}) - Cargo: ${record.cargo || 'Não especificado'}`,
  })

  return record as unknown as DominusUser
}

/**
 * Cadastrar novo usuário cliente vinculado a uma empresa
 */
export async function cadastrarUsuarioCliente(
  input: CriarUsuarioClienteInput,
  currentUser: DominusUser,
): Promise<DominusUser> {
  const emailLimpo = input.email.trim().toLowerCase()

  // Verificar se e-mail já existe
  const existentes = await pb.collection('users').getList(1, 1, {
    filter: `email = '${emailLimpo}'`,
  })
  if (existentes.totalItems > 0) {
    throw new Error('Já existe um usuário cadastrado com este e-mail no sistema.')
  }

  if (!input.empresa_id) {
    throw new Error('É obrigatório vincular o usuário cliente a uma empresa.')
  }

  const record = await pb.collection('users').create({
    name: input.name.trim(),
    email: emailLimpo,
    password: input.password,
    passwordConfirm: input.password,
    role: 'cliente',
    empresa_id: input.empresa_id,
    cargo: input.cargo?.trim() || '',
    telefone: input.telefone?.trim() || '',
    observacoes: input.observacoes?.trim() || '',
    must_change_password: input.must_change_password !== false,
    ativo: true,
    failed_login_attempts: 0,
    locked_until: '',
    deleted_at: '',
  })

  await registrarLogAuditoria({
    usuarioId: currentUser.id,
    usuarioNome: currentUser.name,
    usuarioRole: currentUser.role,
    empresaId: input.empresa_id,
    acao: 'USUARIO_CRIADO',
    entidade: 'users',
    entidadeId: record.id,
    valorNovo: {
      name: record.name,
      email: record.email,
      role: 'cliente',
      empresa_id: input.empresa_id,
    },
    detalhes: `Novo usuário cliente criado e vinculado à empresa: ${record.name} (${record.email})`,
  })

  return record as unknown as DominusUser
}

/**
 * Editar dados do usuário
 */
export async function editarUsuario(
  id: string,
  input: EditarUsuarioInput,
  currentUser: DominusUser,
  usuarioAnterior: DominusUser,
): Promise<void> {
  const payload: Record<string, unknown> = {}

  if (input.name !== undefined) payload.name = input.name.trim()
  if (input.telefone !== undefined) payload.telefone = input.telefone.trim()
  if (input.cargo !== undefined) payload.cargo = input.cargo.trim()
  if (input.observacoes !== undefined) payload.observacoes = input.observacoes.trim()

  if (
    input.email !== undefined &&
    input.email.trim().toLowerCase() !== usuarioAnterior.email.toLowerCase()
  ) {
    const emailLimpo = input.email.trim().toLowerCase()
    const existentes = await pb.collection('users').getList(1, 1, {
      filter: `email = '${emailLimpo}' && id != '${id}'`,
    })
    if (existentes.totalItems > 0) {
      throw new Error('Este e-mail já está sendo utilizado por outro usuário.')
    }
    payload.email = emailLimpo
  }

  // Se for cliente, pode alterar a empresa
  if (input.empresa_id !== undefined) {
    payload.empresa_id = input.empresa_id
  }

  // Segurança: se for alterar role, nunca permitir cliente promover a contador sem ser contador
  if (input.role !== undefined) {
    if (currentUser.role !== 'contador') {
      throw new Error('Apenas o contador pode alterar o perfil de um usuário.')
    }
    payload.role = input.role
  }

  await pb.collection('users').update(id, payload)

  await registrarLogAuditoria({
    usuarioId: currentUser.id,
    usuarioNome: currentUser.name,
    usuarioRole: currentUser.role,
    empresaId: (payload.empresa_id as string) || usuarioAnterior.empresa_id,
    acao: 'USUARIO_ALTERADO',
    entidade: 'users',
    entidadeId: id,
    valorAnterior: usuarioAnterior,
    valorNovo: payload,
    detalhes: `Dados do usuário ${usuarioAnterior.name} alterados.`,
  })
}

/**
 * Redefinir senha do usuário com senha temporária
 */
export async function redefinirSenhaUsuario(
  id: string,
  novaSenhaTemp: string,
  currentUser: DominusUser,
  usuarioNome: string,
): Promise<void> {
  if (id === currentUser.id) {
    throw new Error(
      'Você não pode redefinir a senha do seu próprio usuário nesta tela — use a opção de alteração de senha do seu perfil.',
    )
  }

  if (novaSenhaTemp.length < 8) {
    throw new Error('A nova senha deve possuir no mínimo 8 caracteres.')
  }

  await pb.collection('users').update(id, {
    password: novaSenhaTemp,
    passwordConfirm: novaSenhaTemp,
    must_change_password: true,
    failed_login_attempts: 0,
    locked_until: '',
  })

  // Limpar qualquer bloqueio local caso seja a mesma máquina
  try {
    const userRec = await pb.collection('users').getOne(id)
    if (userRec.email) {
      localStorage.removeItem(`login_attempts_${userRec.email.toLowerCase().trim()}`)
    }
  } catch {
    /* intentionally ignored */
  }

  await registrarLogAuditoria({
    usuarioId: currentUser.id,
    usuarioNome: currentUser.name,
    usuarioRole: currentUser.role,
    acao: 'SENHA_REDEFINIDA',
    entidade: 'users',
    entidadeId: id,
    detalhes: `Senha temporária gerada para ${usuarioNome} com exigência de troca no primeiro acesso.`,
  })
}

/**
 * Ativar ou desativar usuário
 */
export async function alternarStatusUsuario(
  id: string,
  novoStatus: boolean,
  currentUser: DominusUser,
  usuarioNome: string,
): Promise<void> {
  if (id === currentUser.id && !novoStatus) {
    throw new Error('Você não pode desativar seu próprio acesso — peça a outro contador-chefe.')
  }

  await pb.collection('users').update(id, {
    ativo: novoStatus,
  })

  await registrarLogAuditoria({
    usuarioId: currentUser.id,
    usuarioNome: currentUser.name,
    usuarioRole: currentUser.role,
    acao: novoStatus ? 'USUARIO_ATIVADO' : 'USUARIO_DESATIVADO',
    entidade: 'users',
    entidadeId: id,
    detalhes: `Acesso do usuário ${usuarioNome} foi ${novoStatus ? 'ATIVADO' : 'DESATIVADO'}.`,
  })
}

/**
 * Desbloquear usuário bloqueado por tentativas incorretas
 */
export async function desbloquearUsuario(
  id: string,
  currentUser: DominusUser,
  usuarioNome: string,
  userEmail: string,
): Promise<void> {
  await pb.collection('users').update(id, {
    failed_login_attempts: 0,
    locked_until: '',
  })

  // Limpar localStorage de tentativas para esse email
  if (userEmail) {
    localStorage.removeItem(`login_attempts_${userEmail.toLowerCase().trim()}`)
  }

  await registrarLogAuditoria({
    usuarioId: currentUser.id,
    usuarioNome: currentUser.name,
    usuarioRole: currentUser.role,
    acao: 'USUARIO_DESBLOQUEADO',
    entidade: 'users',
    entidadeId: id,
    detalhes: `Bloqueio por tentativas incorretas do usuário ${usuarioNome} (${userEmail}) foi cancelado pelo contador.`,
  })
}

/**
 * Exclusão de usuário (Exclusão lógica preservando trilha de auditoria e integridade)
 */
export async function excluirUsuario(
  id: string,
  currentUser: DominusUser,
  usuarioNome: string,
): Promise<void> {
  if (id === currentUser.id) {
    throw new Error('Você não pode excluir seu próprio acesso — peça a outro contador-chefe.')
  }

  const nowIso = new Date().toISOString()

  // Realizar exclusão lógica: desativar e marcar deleted_at
  await pb.collection('users').update(id, {
    ativo: false,
    deleted_at: nowIso,
  })

  await registrarLogAuditoria({
    usuarioId: currentUser.id,
    usuarioNome: currentUser.name,
    usuarioRole: currentUser.role,
    acao: 'USUARIO_EXCLUIDO',
    entidade: 'users',
    entidadeId: id,
    detalhes: `Exclusão lógica do usuário ${usuarioNome}. Trilha de auditoria e históricos preservados.`,
  })
}
