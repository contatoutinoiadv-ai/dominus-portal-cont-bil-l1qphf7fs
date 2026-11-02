/**
 * Tipagens e Modelos do Dominus Portal Contábil
 */

export type UserRole = 'contador' | 'cliente'

export interface DominusUser {
  id: string
  email: string
  name: string
  role: UserRole
  empresa_id?: string
  avatar?: string
  must_change_password?: boolean
  lgpd_accepted?: boolean
  lgpd_accepted_at?: string
  failed_login_attempts?: number
  locked_until?: string
  ativo?: boolean
  cargo?: string
  telefone?: string
  observacoes?: string
  deleted_at?: string
  created: string
  updated: string
}

export type RegimeTributario = 'MEI' | 'Simples Nacional' | 'Lucro Presumido' | 'Lucro Real'

export interface Empresa {
  id: string
  razao_social: string
  nome_fantasia?: string
  cnpj: string
  municipio: string
  uf: string
  email_responsavel: string
  telefone_responsavel?: string
  data_abertura: string
  regime_vigente: RegimeTributario
  data_inicio_regime: string
  sublimite_estadual?: number
  limite_anual_mei?: number
  limite_anual_simples?: number
  permitir_cliente_ver_comparador?: boolean
  permitir_cliente_ver_diagnostico?: boolean
  percentual_alerta_diagnostico?: number
  status_ativa?: boolean
  created: string
  updated: string
}

export interface EnquadramentoFiscal {
  id: string
  empresa_id: string
  regime: RegimeTributario
  tipo_atividade: 'servicos' | 'comercio' | 'industria' | 'mista'
  data_vigencia_inicio: string
  data_vigencia_fim?: string
  rotulo_enquadramento?: string
  observacoes_internas?: string
  ativo: boolean
  created: string
  updated: string
}

export interface LinhaReceita {
  id: string
  empresa_id: string
  enquadramento_id?: string
  nome_linha: string
  tipo_receita: 'servicos' | 'comercio' | 'industria'
  anexo_simples?: 'I' | 'II' | 'III' | 'IV' | 'V' | 'Nenhum'
  sujeito_fator_r?: boolean
  local_incidencia_iss?: 'mesmo_municipio' | 'outro_municipio' | 'exterior'
  municipio_outro_iss?: string
  aliquota_outro_iss?: number
  iss_retido_fonte?: boolean
  percentual_iss_retido?: number
  icms_tratamento?: 'tributado_normal' | 'st' | 'isento' | 'monofasico'
  pis_cofins_tratamento?: 'normal' | 'monofasico'
  aliquota_municipal_iss?: number
  percentual_presuncao_irpj?: number
  percentual_presuncao_csll?: number
  ordem?: number
  ativo?: boolean
  created: string
  updated: string
}

export type StatusLancamento = 'Enviado' | 'Em análise' | 'Validado' | 'Devolvido para correção'

export interface LancamentoFaturamento {
  id: string
  empresa_id: string
  competencia: string // YYYY-MM
  sem_faturamento?: boolean
  total_faturamento_bruto: number
  total_notas_canceladas?: number
  total_faturamento_liquido: number
  imposto_estimado?: number
  aliquota_efetiva?: number
  status: StatusLancamento
  observacao_cliente?: string
  motivo_devolucao?: string
  arquivo_comprovante?: string
  enviado_por_user_id?: string
  validado_por_user_id?: string
  validado_em?: string
  memoria_calculo_json?: string
  created: string
  updated: string
}

export interface LancamentoItem {
  id: string
  lancamento_id: string
  empresa_id: string
  linha_receita_id: string
  nome_linha: string
  tipo_receita?: string
  valor_bruto: number
  valor_deducoes?: number
  valor_liquido: number
  imposto_estimado_item?: number
  detalhes_item_json?: string
  created: string
}

export interface FolhaMensal {
  id: string
  empresa_id: string
  competencia: string
  valor_salarios?: number
  valor_pro_labore?: number
  valor_fgts?: number
  valor_encargos?: number
  valor_total_folha: number
  origem?: 'cliente' | 'contador' | 'historico_importado'
  created: string
}

export interface DocumentoFiscal {
  id: string
  empresa_id: string
  lancamento_id?: string
  titulo: string
  tipo:
    | 'nota_fiscal_pdf'
    | 'xml_nfe'
    | 'das_guia'
    | 'relatorio_faturamento'
    | 'folha_pgto'
    | 'outro'
  arquivo: string
  competencia?: string
  enviado_por_role: 'contador' | 'cliente'
  observacao?: string
  created: string
}

export interface ComentarioLancamento {
  id: string
  empresa_id: string
  lancamento_id?: string
  autor_user_id: string
  autor_nome: string
  autor_role: 'contador' | 'cliente'
  texto: string
  lido?: boolean
  created: string
}

export interface NotificacaoDominus {
  id: string
  empresa_id?: string
  destinatario_user_id?: string
  destinatario_role: 'contador' | 'cliente' | 'todos'
  titulo: string
  mensagem: string
  tipo:
    | 'faturamento_enviado'
    | 'faturamento_validado'
    | 'faturamento_devolvido'
    | 'lembrete_prazo'
    | 'alerta_limite'
    | 'comentario_novo'
    | 'geral'
  lida?: boolean
  link?: string
  created: string
}

export interface CalendarioEvento {
  id: string
  empresa_id?: string
  competencia: string
  obrigacao: string
  data_vencimento: string
  tipo: 'das' | 'dctfweb' | 'trimestral' | 'envio_faturamento' | 'interno'
  status: 'pendente' | 'concluido' | 'atrasado'
  descricao?: string
  created: string
}

export interface AuditoriaLog {
  id: string
  usuario_id: string
  usuario_nome: string
  usuario_role: string
  empresa_id?: string
  acao: string
  entidade: string
  entidade_id?: string
  valor_anterior_json?: string
  valor_novo_json?: string
  detalhes?: string
  created: string
}
