import pb from '@/lib/pocketbase/client'
import { ClientResponseError } from 'pocketbase'
import { Empresa, RegimeTributario } from '@/types/dominus'
import { registrarLogAuditoria } from '@/lib/pocketbase/auditService'
import { formatarCnpj, mascararCnpjParcial, removerMascaraCnpj, validarCnpj } from '@/lib/cnpj'

/** Filtro padrão para ocultar empresas excluídas (exclusão lógica) das listagens. */
export const FILTRO_EMPRESAS_NAO_EXCLUIDAS = "deleted_at = '' || deleted_at = null"

/** Campos do cadastro que o contador pode editar pela ficha da empresa. */
export interface DadosEdicaoEmpresa {
  razao_social: string
  nome_fantasia: string
  cnpj: string
  municipio: string
  uf: string
  email_responsavel: string
  telefone_responsavel: string
  data_abertura: string
  regime_vigente: RegimeTributario
  data_inicio_regime: string
}

export interface AlteracaoCampo {
  campo: string
  rotulo: string
  anterior: unknown
  novo: unknown
}

interface UsuarioResponsavel {
  id?: string
  name?: string
}

const ROTULOS_CAMPOS: Record<keyof DadosEdicaoEmpresa, string> = {
  razao_social: 'razão social',
  nome_fantasia: 'nome fantasia',
  cnpj: 'CNPJ',
  municipio: 'município',
  uf: 'UF',
  email_responsavel: 'e-mail do responsável',
  telefone_responsavel: 'telefone do responsável',
  data_abertura: 'data de abertura',
  regime_vigente: 'regime tributário vigente',
  data_inicio_regime: 'data de início no regime',
}

const REGIMES_TRIBUTARIOS: RegimeTributario[] = [
  'MEI',
  'Simples Nacional',
  'Lucro Presumido',
  'Lucro Real',
]

/** Extrai os dados editáveis a partir do registro atual da empresa. */
export function extrairDadosEdicao(emp: Empresa): DadosEdicaoEmpresa {
  return {
    razao_social: emp.razao_social ?? '',
    nome_fantasia: emp.nome_fantasia ?? '',
    cnpj: formatarCnpj(emp.cnpj ?? '') || emp.cnpj || '',
    municipio: emp.municipio ?? '',
    uf: emp.uf ?? '',
    email_responsavel: emp.email_responsavel ?? '',
    telefone_responsavel: emp.telefone_responsavel ?? '',
    data_abertura: emp.data_abertura ?? '',
    regime_vigente: (REGIMES_TRIBUTARIOS as string[]).includes(emp.regime_vigente)
      ? emp.regime_vigente
      : 'Simples Nacional',
    data_inicio_regime: emp.data_inicio_regime ?? '',
  }
}

/** Valida os dados do formulário de edição. Retorna mapa campo -> mensagem de erro. */
export function validarDadosEdicao(dados: DadosEdicaoEmpresa): Record<string, string> {
  const erros: Record<string, string> = {}

  if (!dados.razao_social.trim()) {
    erros.razao_social = 'Informe a razão social da empresa.'
  }

  const digitosCnpj = removerMascaraCnpj(dados.cnpj)
  if (!digitosCnpj) {
    erros.cnpj = 'Informe o CNPJ da empresa.'
  } else if (digitosCnpj.length !== 14) {
    erros.cnpj = 'O CNPJ deve possuir 14 dígitos.'
  } else if (!validarCnpj(digitosCnpj)) {
    erros.cnpj = 'CNPJ inválido: verifique os dígitos informados.'
  }

  if (!dados.data_abertura) {
    erros.data_abertura = 'Informe a data de abertura da empresa.'
  }
  if (!dados.data_inicio_regime) {
    erros.data_inicio_regime = 'Informe a data de início no regime.'
  }
  if (
    dados.data_abertura &&
    dados.data_inicio_regime &&
    dados.data_inicio_regime < dados.data_abertura
  ) {
    erros.data_inicio_regime =
      'A data de início no regime não pode ser anterior à data de abertura da empresa.'
  }

  if (dados.uf && !/^[A-Za-z]{2}$/.test(dados.uf.trim())) {
    erros.uf = 'A UF deve conter exatamente 2 letras (ex.: SP).'
  }

  if (dados.email_responsavel && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dados.email_responsavel)) {
    erros.email_responsavel = 'Informe um e-mail válido.'
  }

  return erros
}

export function temErros(erros: Record<string, string>): boolean {
  return Object.keys(erros).length > 0
}

function normalizarDados(dados: DadosEdicaoEmpresa): DadosEdicaoEmpresa {
  return {
    razao_social: dados.razao_social.trim(),
    nome_fantasia: dados.nome_fantasia.trim(),
    cnpj: formatarCnpj(dados.cnpj),
    municipio: dados.municipio.trim(),
    uf: dados.uf.trim().toUpperCase(),
    email_responsavel: dados.email_responsavel.trim(),
    telefone_responsavel: dados.telefone_responsavel.trim(),
    data_abertura: dados.data_abertura,
    regime_vigente: dados.regime_vigente,
    data_inicio_regime: dados.data_inicio_regime,
  }
}

function valorComparacao(chave: keyof DadosEdicaoEmpresa, valor: unknown): string {
  if (chave === 'cnpj') return removerMascaraCnpj(String(valor ?? ''))
  return String(valor ?? '')
}

/** Detecta campo a campo o que mudou entre o cadastro atual e o formulário. */
export function detectarAlteracoesCadastro(
  empresaAtual: Empresa,
  dados: DadosEdicaoEmpresa,
): AlteracaoCampo[] {
  const normalizados = normalizarDados(dados)
  const alteracoes: AlteracaoCampo[] = []

  for (const chave of Object.keys(ROTULOS_CAMPOS) as (keyof DadosEdicaoEmpresa)[]) {
    const antes = valorComparacao(chave, empresaAtual[chave])
    const depois = valorComparacao(chave, normalizados[chave])
    if (antes !== depois) {
      alteracoes.push({
        campo: chave,
        rotulo: ROTULOS_CAMPOS[chave],
        anterior: empresaAtual[chave] ?? '',
        novo: normalizados[chave],
      })
    }
  }

  return alteracoes
}

/** Carrega a carteira de empresas ativas (excluídas logicamente ficam de fora). */
export async function carregarEmpresasAtivas(): Promise<Empresa[]> {
  const res = await pb.collection('empresas').getList(1, 100, {
    sort: 'razao_social',
    filter: FILTRO_EMPRESAS_NAO_EXCLUIDAS,
  })
  return res.items as unknown as Empresa[]
}

/** Detecta erro de CNPJ duplicado (índice único da collection empresas). */
export function erroCnpjDuplicado(error: unknown): boolean {
  if (!(error instanceof ClientResponseError) || error.status !== 400) return false
  const data = (error.response?.data ?? {}) as Record<string, unknown>
  if ('cnpj' in data) return true
  const mensagem = String(error.response?.message || error.message || '').toLowerCase()
  return mensagem.includes('unique') || mensagem.includes('cnpj')
}

/**
 * Salva a edição do cadastro da empresa e grava o registro na Trilha de Auditoria
 * com o valor anterior e o novo valor de cada campo alterado.
 */
export async function salvarEdicaoEmpresa(
  empresaAtual: Empresa,
  dados: DadosEdicaoEmpresa,
  usuario: UsuarioResponsavel,
): Promise<{ atualizada: Empresa; semAlteracoes: boolean }> {
  const normalizados = normalizarDados(dados)
  const alteracoes = detectarAlteracoesCadastro(empresaAtual, normalizados)

  if (alteracoes.length === 0) {
    return { atualizada: empresaAtual, semAlteracoes: true }
  }

  const atualizada = (await pb.collection('empresas').update(empresaAtual.id, {
    razao_social: normalizados.razao_social,
    nome_fantasia: normalizados.nome_fantasia,
    cnpj: normalizados.cnpj,
    municipio: normalizados.municipio,
    uf: normalizados.uf,
    email_responsavel: normalizados.email_responsavel,
    telefone_responsavel: normalizados.telefone_responsavel,
    data_abertura: normalizados.data_abertura,
    regime_vigente: normalizados.regime_vigente,
    data_inicio_regime: normalizados.data_inicio_regime,
  })) as unknown as Empresa

  await registrarLogAuditoria({
    usuarioId: usuario.id || '',
    usuarioNome: usuario.name || 'Contador',
    usuarioRole: 'contador',
    empresaId: empresaAtual.id,
    acao: 'EMPRESA_ALTERADA',
    entidade: 'empresas',
    entidadeId: empresaAtual.id,
    valorAnterior: Object.fromEntries(alteracoes.map((a) => [a.campo, a.anterior])),
    valorNovo: Object.fromEntries(alteracoes.map((a) => [a.campo, a.novo])),
    detalhes: `Cadastro da empresa ${atualizada.razao_social} (CNPJ ${atualizada.cnpj}) atualizado. Campos alterados: ${alteracoes
      .map((a) => a.rotulo)
      .join(', ')}.`,
  })

  return { atualizada, semAlteracoes: false }
}

/**
 * Exclui logicamente a empresa (status_ativa = false + deleted_at), sem remover
 * lançamentos, apurações ou documentos vinculados, e grava a ação na Trilha de Auditoria.
 */
export async function excluirEmpresa(
  empresa: Empresa,
  motivo: string,
  usuario: UsuarioResponsavel,
): Promise<void> {
  const agora = new Date().toISOString()

  await pb.collection('empresas').update(empresa.id, {
    status_ativa: false,
    deleted_at: agora,
  })

  await registrarLogAuditoria({
    usuarioId: usuario.id || '',
    usuarioNome: usuario.name || 'Contador',
    usuarioRole: 'contador',
    empresaId: empresa.id,
    acao: 'EMPRESA_EXCLUIDA',
    entidade: 'empresas',
    entidadeId: empresa.id,
    valorAnterior: {
      razao_social: empresa.razao_social,
      cnpj: empresa.cnpj,
      regime_vigente: empresa.regime_vigente,
      municipio: empresa.municipio ?? '',
      uf: empresa.uf ?? '',
      email_responsavel: empresa.email_responsavel ?? '',
      telefone_responsavel: empresa.telefone_responsavel ?? '',
      data_abertura: empresa.data_abertura ?? '',
      data_inicio_regime: empresa.data_inicio_regime ?? '',
      status_ativa: empresa.status_ativa ?? true,
      deleted_at: empresa.deleted_at ?? '',
    },
    valorNovo: {
      status_ativa: false,
      deleted_at: agora,
    },
    detalhes: `Empresa ${empresa.razao_social} (CNPJ ${empresa.cnpj}) excluída do sistema por exclusão lógica: status_ativa = false e deleted_at registrado. Lançamentos, apurações e documentos permanecem preservados.${
      motivo ? ` Motivo informado: ${motivo}` : ''
    }`,
  })
}

/** Máscara progressiva para o campo CNPJ do formulário. */
export function mascararCnpjInput(valor: string): string {
  return mascararCnpjParcial(valor)
}
