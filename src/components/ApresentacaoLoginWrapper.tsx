import React, { useState, useEffect } from 'react'
import { TelaLogin } from '@/components/TelaLogin'
import { ApresentacaoCinematografica } from '@/components/intro/ApresentacaoCinematografica'
import { determinarModoApresentacao, ModoExibicaoIntro } from '@/config/introConfig'
import { carregarConfigIntro } from '@/services/introService'

interface ApresentacaoLoginWrapperProps {
  onSuccess?: () => void
}

export const ApresentacaoLoginWrapper: React.FC<ApresentacaoLoginWrapperProps> = ({
  onSuccess,
}) => {
  const [apresentacaoVisivel, setApresentacaoVisivel] = useState<boolean>(true)
  const [modoApresentacao, setModoApresentacao] = useState<ModoExibicaoIntro>('curta')
  const [pronto, setPronto] = useState<boolean>(false)

  useEffect(() => {
    // Avalia a frequência em cookie/localStorage imediatamente (sem chamada de rede)
    const modoCalculado = determinarModoApresentacao()
    setModoApresentacao(modoCalculado)

    // Consulta configuração do PocketBase em paralelo e de modo não-bloqueante
    carregarConfigIntro().then((cfg) => {
      if (!cfg.ativo) {
        // Se desativada pelo contador, pular direto para o login
        setApresentacaoVisivel(false)
      }
      setPronto(true)
    })
  }, [])

  const handleFinalizarApresentacao = () => {
    setApresentacaoVisivel(false)
  }

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#070a0f]">
      {/*
        A tela de login fica PRÉ-RENDERIZADA em segundo plano durante a apresentação,
        de modo que a transição seja instantânea e com desvanecimento suave.
      */}
      <div
        className={`w-full h-full transition-opacity duration-1000 ease-out ${
          apresentacaoVisivel
            ? 'opacity-30 pointer-events-none scale-[0.99] filter blur-[1px]'
            : 'opacity-100 scale-100 filter-none pointer-events-auto'
        }`}
      >
        <TelaLogin onSuccess={onSuccess} />
      </div>

      {/* Camada cinematográfica pré-login em overlay */}
      {apresentacaoVisivel && pronto && (
        <ApresentacaoCinematografica
          modo={modoApresentacao === 'completa' ? 'completa' : 'curta'}
          onFinalizar={handleFinalizarApresentacao}
        />
      )}
    </div>
  )
}
