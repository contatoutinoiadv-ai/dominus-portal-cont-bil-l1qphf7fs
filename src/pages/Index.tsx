import React, { useState } from 'react'
import { useAuth } from '@/lib/pocketbase/authContext'
import { ApresentacaoLoginWrapper } from '@/components/ApresentacaoLoginWrapper'
import { DominusLayout } from '@/components/DominusLayout'
import { PortalCliente } from '@/components/PortalCliente'
import { HistoricoCliente } from '@/components/HistoricoCliente'
import { DocumentosCliente } from '@/components/DocumentosCliente'
import { DashboardCliente } from '@/components/DashboardCliente'
import { DashboardContador } from '@/components/DashboardContador'
import { FilaTrabalhoContador } from '@/components/FilaTrabalhoContador'
import { CadastroEmpresasEnquadramento } from '@/components/CadastroEmpresasEnquadramento'
import { RadarRiscosFiscais } from '@/components/RadarRiscosFiscais'
import { CalendarioFiscal } from '@/components/CalendarioFiscal'
import { TrilhaAuditoria } from '@/components/TrilhaAuditoria'
import { ParametrosFiscaisTela } from '@/components/ParametrosFiscaisTela'
import { DiagnosticoFiscalTela } from '@/components/DiagnosticoFiscalTela'
import { TelaDocumentacaoPendencias } from '@/components/TelaDocumentacaoPendencias'
import { VozDaDominusTela } from '@/components/VozDaDominusTela'
import { GestaoUsuariosTela } from '@/components/GestaoUsuariosTela'
import { Skeleton } from '@/components/ui/skeleton'

export const Index: React.FC = () => {
  const { user, isLoading, isContador } = useAuth()
  const [telaAtiva, setTelaAtiva] = useState<string>('')
  const [termoBuscaGlobal, setTermoBuscaGlobal] = useState<string>('')
  const [empresaFiltroUsuarios, setEmpresaFiltroUsuarios] = useState<string>('')

  // Definir tela inicial padrão conforme perfil
  const telaEfetiva = telaAtiva || (isContador ? 'dashboard_contador' : 'portal_cliente')

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#070a0f] flex flex-col items-center justify-center p-6 space-y-4">
        <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center text-xl font-black animate-pulse">
          D
        </div>
        <p className="text-sm font-mono text-slate-400 tracking-wider">
          CARREGANDO DOMINUS PORTAL...
        </p>
        <div className="w-48 space-y-2">
          <Skeleton className="h-2 w-full bg-slate-800" />
          <Skeleton className="h-2 w-3/4 mx-auto bg-slate-800" />
        </div>
      </div>
    )
  }

  // Se não estiver autenticado, exibe a apresentação cinematográfica como wrapper antes do login
  if (!user) {
    return <ApresentacaoLoginWrapper />
  }

  return (
    <DominusLayout
      telaAtiva={telaEfetiva}
      setTelaAtiva={setTelaAtiva}
      termoBuscaGlobal={termoBuscaGlobal}
      setTermoBuscaGlobal={setTermoBuscaGlobal}
    >
      {/* Telas do Perfil Contador */}
      {telaEfetiva === 'dashboard_contador' && (
        <DashboardContador onNavegarParaFila={() => setTelaAtiva('fila_trabalho')} />
      )}
      {telaEfetiva === 'gestao_usuarios' && (
        <GestaoUsuariosTela
          empresaFiltroInicialId={empresaFiltroUsuarios}
          onVoltarParaCadastroEmpresas={() => {
            setEmpresaFiltroUsuarios('')
            setTelaAtiva('cadastro_empresas')
          }}
        />
      )}
      {(telaEfetiva === 'diagnostico_fiscal' || telaEfetiva === 'comparador_regimes') && (
        <DiagnosticoFiscalTela />
      )}
      {telaEfetiva === 'fila_trabalho' && <FilaTrabalhoContador />}
      {telaEfetiva === 'cadastro_empresas' && (
        <CadastroEmpresasEnquadramento
          onNavegarParaUsuariosEmpresa={(empresaId) => {
            setEmpresaFiltroUsuarios(empresaId)
            setTelaAtiva('gestao_usuarios')
          }}
        />
      )}
      {telaEfetiva === 'radar_riscos' && <RadarRiscosFiscais />}
      {telaEfetiva === 'parametros_fiscais' && <ParametrosFiscaisTela />}
      {telaEfetiva === 'calendario_fiscal' && <CalendarioFiscal />}
      {telaEfetiva === 'auditoria' && <TrilhaAuditoria />}
      {telaEfetiva === 'voz_dominus' && <VozDaDominusTela />}

      {/* Telas do Perfil Cliente */}
      {telaEfetiva === 'portal_cliente' && (
        <PortalCliente
          onVerHistorico={() => setTelaAtiva('historico_lancamentos')}
          onNavegarParaDiagnostico={() => setTelaAtiva('diagnostico_cliente')}
        />
      )}
      {(telaEfetiva === 'diagnostico_cliente' || telaEfetiva === 'comparador_cliente') && (
        <DiagnosticoFiscalTela />
      )}
      {telaEfetiva === 'dashboard_cliente' && <DashboardCliente />}
      {telaEfetiva === 'historico_lancamentos' && <HistoricoCliente />}
      {telaEfetiva === 'documentos_cliente' && <DocumentosCliente />}

      {/* Tela de Documentação e Pendências (Comum a ambos) */}
      {telaEfetiva === 'documentacao' && <TelaDocumentacaoPendencias />}
    </DominusLayout>
  )
}

export default Index
