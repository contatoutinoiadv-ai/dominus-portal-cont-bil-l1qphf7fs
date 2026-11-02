import React from 'react'

interface MonogramaAnimadoProps {
  className?: string
  tamanho?: number
  strokeColor?: string
  animar?: boolean
  duracaoSegundos?: number
  svgPersonalizado?: string
}

export const MonogramaAnimado: React.FC<MonogramaAnimadoProps> = ({
  className = '',
  tamanho = 140,
  strokeColor = '#f59e0b',
  animar = true,
  duracaoSegundos = 1.8,
  svgPersonalizado,
}) => {
  // Se houver SVG personalizado injetado pelo administrador na tela Voz da Dominus
  if (svgPersonalizado && svgPersonalizado.trim().startsWith('<svg')) {
    return (
      <div
        className={`inline-flex items-center justify-center ${className}`}
        style={{ width: tamanho, height: tamanho }}
        dangerouslySetInnerHTML={{ __html: svgPersonalizado }}
      />
    )
  }

  // Traço geométrico de alta nobreza: Monograma "D" da Dominus
  // Composto por um arco clássico estilizado e o pilar principal, com detalhes de serifas modernas.
  const pathDataPilar = 'M 35,25 L 35,95'
  const pathDataSerifaTopo = 'M 22,25 L 50,25'
  const pathDataSerifaBase = 'M 22,95 L 50,95'
  const pathDataArco = 'M 35,25 C 80,25 90,42 90,60 C 90,78 80,95 35,95'
  const pathDataEmblemaDiamante = 'M 60,60 L 64,55 L 68,60 L 64,65 Z'

  return (
    <svg
      width={tamanho}
      height={tamanho}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`select-none overflow-visible ${className}`}
    >
      <defs>
        {/* Gradiente Ouro Champanhe Dominus */}
        <linearGradient id="dominusGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="45%" stopColor={strokeColor} />
          <stop offset="100%" stopColor="#b45309" />
        </linearGradient>

        <filter id="goldGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="glow" />
          <feComposite in="SourceGraphic" in2="glow" operator="over" />
        </filter>
      </defs>

      {/* Estilo local para animação stroke-dashoffset pura em CSS (leve, < 2KB) */}
      {animar && (
        <style>{`
          .draw-stroke-1 {
            stroke-dasharray: 100;
            stroke-dashoffset: 100;
            animation: drawPath ${duracaoSegundos * 0.55}s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          }
          .draw-stroke-2 {
            stroke-dasharray: 200;
            stroke-dashoffset: 200;
            animation: drawPath ${duracaoSegundos * 0.85}s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            animation-delay: ${duracaoSegundos * 0.18}s;
          }
          .draw-stroke-3 {
            stroke-dasharray: 50;
            stroke-dashoffset: 50;
            animation: drawPath ${duracaoSegundos * 0.4}s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            animation-delay: ${duracaoSegundos * 0.45}s;
          }
          @keyframes drawPath {
            to {
              stroke-dashoffset: 0;
            }
          }
        `}</style>
      )}

      {/* Círculo externo fino e discreto */}
      <circle
        cx="60"
        cy="60"
        r="54"
        stroke="url(#dominusGoldGrad)"
        strokeWidth="1"
        strokeOpacity="0.25"
        strokeDasharray="4 4"
      />

      {/* Pilar Vertical do Monograma D */}
      <path
        d={pathDataPilar}
        stroke="url(#dominusGoldGrad)"
        strokeWidth="3.5"
        strokeLinecap="round"
        filter="url(#goldGlow)"
        className={animar ? 'draw-stroke-1' : ''}
      />

      {/* Serifa Superior */}
      <path
        d={pathDataSerifaTopo}
        stroke="url(#dominusGoldGrad)"
        strokeWidth="2.5"
        strokeLinecap="round"
        className={animar ? 'draw-stroke-3' : ''}
      />

      {/* Serifa Inferior */}
      <path
        d={pathDataSerifaBase}
        stroke="url(#dominusGoldGrad)"
        strokeWidth="2.5"
        strokeLinecap="round"
        className={animar ? 'draw-stroke-3' : ''}
      />

      {/* Arco nobre do D */}
      <path
        d={pathDataArco}
        stroke="url(#dominusGoldGrad)"
        strokeWidth="3"
        strokeLinecap="round"
        filter="url(#goldGlow)"
        className={animar ? 'draw-stroke-2' : ''}
      />

      {/* Diamante interno do monograma */}
      <path
        d={pathDataEmblemaDiamante}
        fill="url(#dominusGoldGrad)"
        fillOpacity="0.8"
        className={animar ? 'draw-stroke-3' : ''}
      />
    </svg>
  )
}
