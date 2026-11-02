import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import pb from './client'
import { DominusUser, Empresa } from '@/types/dominus'
import { registrarLogAuditoria } from './auditService'

interface AuthContextType {
  user: DominusUser | null
  empresa: Empresa | null
  isLoading: boolean
  isContador: boolean
  isCliente: boolean
  login: (
    email: string,
    pass: string,
  ) => Promise<{ success: boolean; error?: string; locked?: boolean }>
  logout: () => void
  refreshAuth: () => Promise<void>
  acceptLgpd: () => Promise<void>
  changePassword: (novaSenha: string) => Promise<{ success: boolean; error?: string }>
}

const AuthContext = createContext<AuthContextType | null>(null)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<DominusUser | null>(null)
  const [empresa, setEmpresa] = useState<Empresa | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)

  const carregarEmpresaUsuario = useCallback(async (empresaId?: string) => {
    if (!empresaId) {
      setEmpresa(null)
      return
    }
    try {
      const emp = await pb.collection('empresas').getOne(empresaId)
      setEmpresa(emp as unknown as Empresa)
    } catch (e) {
      console.warn('Não foi possível carregar a empresa do usuário:', e)
      setEmpresa(null)
    }
  }, [])

  const syncUserFromPb = useCallback(async () => {
    if (pb.authStore.isValid && pb.authStore.record) {
      const rec = pb.authStore.record
      const dominusUser: DominusUser = {
        id: rec.id,
        email: rec.email,
        name: rec.name || rec.email.split('@')[0],
        role: (rec.role as 'contador' | 'cliente') || 'cliente',
        empresa_id: rec.empresa_id || undefined,
        avatar: rec.avatar || undefined,
        must_change_password: !!rec.must_change_password,
        lgpd_accepted: !!rec.lgpd_accepted,
        lgpd_accepted_at: rec.lgpd_accepted_at,
        failed_login_attempts: rec.failed_login_attempts,
        locked_until: rec.locked_until,
        ativo: rec.ativo !== false,
        cargo: rec.cargo,
        telefone: rec.telefone,
        observacoes: rec.observacoes,
        deleted_at: rec.deleted_at,
        created: rec.created,
        updated: rec.updated,
      }
      setUser(dominusUser)
      if (dominusUser.empresa_id) {
        await carregarEmpresaUsuario(dominusUser.empresa_id)
      } else {
        setEmpresa(null)
      }
    } else {
      setUser(null)
      setEmpresa(null)
    }
    setIsLoading(false)
  }, [carregarEmpresaUsuario])

  useEffect(() => {
    syncUserFromPb()
    const unsubscribe = pb.authStore.onChange(() => {
      syncUserFromPb()
    })
    return () => {
      unsubscribe()
    }
  }, [syncUserFromPb])

  const login = async (
    email: string,
    pass: string,
  ): Promise<{ success: boolean; error?: string; locked?: boolean }> => {
    try {
      // 1. Verificar tentativas erradas no localStorage para proteção contra força bruta
      const storageKey = `login_attempts_${email.toLowerCase().trim()}`
      const rawAttempts = localStorage.getItem(storageKey)
      let attemptData = { count: 0, lockedUntil: 0 }
      if (rawAttempts) {
        try {
          attemptData = JSON.parse(rawAttempts)
        } catch {
          /* intentionally ignored */
        }
      }

      if (attemptData.lockedUntil > Date.now()) {
        const segundos = Math.ceil((attemptData.lockedUntil - Date.now()) / 1000)
        return {
          success: false,
          locked: true,
          error: `Conta temporariamente bloqueada por segurança após 5 tentativas incorretas. Tente novamente em ${segundos} segundos.`,
        }
      }

      // Autenticar com PocketBase
      const authData = await pb.collection('users').authWithPassword(email.trim(), pass)
      localStorage.removeItem(storageKey)

      const rec = authData.record

      // Verificar se o usuário está excluído logicamente ou desativado
      if (rec.deleted_at) {
        pb.authStore.clear()
        return {
          success: false,
          error:
            'Esta conta de usuário foi excluída. Entre em contato com a administração contábil.',
        }
      }

      if (rec.ativo === false) {
        pb.authStore.clear()
        return {
          success: false,
          error: 'Seu acesso foi desativado pelo escritório contábil. Contate seu contador.',
        }
      }

      // Verificar bloqueio no banco de dados (locked_until)
      if (rec.locked_until) {
        const lockedTime = new Date(rec.locked_until).getTime()
        if (lockedTime > Date.now()) {
          pb.authStore.clear()
          const minRestantes = Math.max(1, Math.ceil((lockedTime - Date.now()) / 60000))
          return {
            success: false,
            locked: true,
            error: `Conta bloqueada após tentativas incorretas. Aguarde ${minRestantes} minuto(s) ou solicite o desbloqueio ao seu contador.`,
          }
        }
      }

      const dominusUser: DominusUser = {
        id: rec.id,
        email: rec.email,
        name: rec.name || rec.email.split('@')[0],
        role: (rec.role as 'contador' | 'cliente') || 'cliente',
        empresa_id: rec.empresa_id || undefined,
        avatar: rec.avatar || undefined,
        must_change_password: !!rec.must_change_password,
        lgpd_accepted: !!rec.lgpd_accepted,
        lgpd_accepted_at: rec.lgpd_accepted_at,
        failed_login_attempts: rec.failed_login_attempts,
        locked_until: rec.locked_until,
        ativo: rec.ativo !== false,
        cargo: rec.cargo,
        telefone: rec.telefone,
        observacoes: rec.observacoes,
        deleted_at: rec.deleted_at,
        created: rec.created,
        updated: rec.updated,
      }

      setUser(dominusUser)
      if (dominusUser.empresa_id) {
        await carregarEmpresaUsuario(dominusUser.empresa_id)
      }

      await registrarLogAuditoria({
        usuarioId: dominusUser.id,
        usuarioNome: dominusUser.name,
        usuarioRole: dominusUser.role,
        empresaId: dominusUser.empresa_id,
        acao: 'LOGIN_SUCESSO',
        entidade: 'users',
        entidadeId: dominusUser.id,
        detalhes: 'Login efetuado com sucesso via credenciais.',
      })

      return { success: true }
    } catch (err: unknown) {
      const errorObj = err as { message?: string }
      // Incrementar contador de falhas
      const storageKey = `login_attempts_${email.toLowerCase().trim()}`
      const rawAttempts = localStorage.getItem(storageKey)
      let attemptData = { count: 0, lockedUntil: 0 }
      if (rawAttempts) {
        try {
          attemptData = JSON.parse(rawAttempts)
        } catch {
          /* intentionally ignored */
        }
      }
      attemptData.count += 1
      if (attemptData.count >= 5) {
        attemptData.lockedUntil = Date.now() + 5 * 60 * 1000 // 5 minutos de bloqueio
        localStorage.setItem(storageKey, JSON.stringify(attemptData))
        return {
          success: false,
          locked: true,
          error:
            'Limite de 5 tentativas excedido. Conta bloqueada temporariamente por 5 minutos por segurança.',
        }
      }
      localStorage.setItem(storageKey, JSON.stringify(attemptData))

      const tentativasRestantes = 5 - attemptData.count
      return {
        success: false,
        error: `E-mail ou senha incorretos. Tentativas restantes antes do bloqueio: ${tentativasRestantes}. ${errorObj.message || ''}`,
      }
    }
  }

  const logout = () => {
    if (user) {
      registrarLogAuditoria({
        usuarioId: user.id,
        usuarioNome: user.name,
        usuarioRole: user.role,
        empresaId: user.empresa_id,
        acao: 'LOGIN_SUCESSO',
        entidade: 'users',
        detalhes: 'Sessão encerrada (logout).',
      })
    }
    pb.authStore.clear()
    setUser(null)
    setEmpresa(null)
  }

  const refreshAuth = async () => {
    await syncUserFromPb()
  }

  const acceptLgpd = async () => {
    if (!user) return
    const nowIso = new Date().toISOString()
    await pb.collection('users').update(user.id, {
      lgpd_accepted: true,
      lgpd_accepted_at: nowIso,
    })
    setUser((prev) => (prev ? { ...prev, lgpd_accepted: true, lgpd_accepted_at: nowIso } : null))
    await registrarLogAuditoria({
      usuarioId: user.id,
      usuarioNome: user.name,
      usuarioRole: user.role,
      empresaId: user.empresa_id,
      acao: 'CONSENTIMENTO_LGPD',
      entidade: 'users',
      entidadeId: user.id,
      detalhes: 'Termo de Consentimento LGPD aceito no primeiro acesso.',
    })
  }

  const changePassword = async (
    novaSenha: string,
  ): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'Usuário não autenticado' }
    if (novaSenha.length < 8) {
      return { success: false, error: 'A senha deve possuir no mínimo 8 caracteres' }
    }
    try {
      await pb.collection('users').update(user.id, {
        password: novaSenha,
        passwordConfirm: novaSenha,
        must_change_password: false,
      })
      setUser((prev) => (prev ? { ...prev, must_change_password: false } : null))
      await registrarLogAuditoria({
        usuarioId: user.id,
        usuarioNome: user.name,
        usuarioRole: user.role,
        empresaId: user.empresa_id,
        acao: 'SENHA_ALTERADA',
        entidade: 'users',
        entidadeId: user.id,
        detalhes: 'Senha de acesso alterada com sucesso.',
      })
      return { success: true }
    } catch (err: unknown) {
      const e = err as { message?: string }
      return { success: false, error: e.message || 'Falha ao redefinir senha' }
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        empresa,
        isLoading,
        isContador: user?.role === 'contador',
        isCliente: user?.role === 'cliente',
        login,
        logout,
        refreshAuth,
        acceptLgpd,
        changePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth deve ser utilizado dentro de AuthProvider')
  }
  return ctx
}
