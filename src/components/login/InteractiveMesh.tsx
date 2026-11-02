import React, { useEffect, useRef } from 'react'

interface InteractiveMeshProps {
  className?: string
}

export const InteractiveMesh: React.FC<InteractiveMeshProps> = ({ className = '' }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationFrameId: number
    let width = (canvas.width = canvas.parentElement?.clientWidth || window.innerWidth)
    let height = (canvas.height = canvas.parentElement?.clientHeight || window.innerHeight)

    const handleResize = () => {
      if (!canvas) return
      width = canvas.width = canvas.parentElement?.clientWidth || window.innerWidth
      height = canvas.height = canvas.parentElement?.clientHeight || window.innerHeight
      initNodes()
    }

    window.addEventListener('resize', handleResize)

    // Mouse coordinates (normalized parallax)
    const mouse = {
      x: width / 2,
      y: height / 2,
      targetX: width / 2,
      targetY: height / 2,
      radius: 140,
    }

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      mouse.targetX = e.clientX - rect.left
      mouse.targetY = e.clientY - rect.top
    }

    const parent = canvas.parentElement
    if (parent) {
      parent.addEventListener('mousemove', handleMouseMove)
    }

    // Node network configuration
    interface Node {
      x: number
      y: number
      originX: number
      originY: number
      vx: number
      vy: number
      size: number
      color: 'gold' | 'cyan' | 'slate'
    }

    let nodes: Node[] = []

    const initNodes = () => {
      nodes = []
      // Node count scaled by viewport width
      const count = Math.min(42, Math.floor((width * height) / 18000))
      for (let i = 0; i < count; i++) {
        const x = Math.random() * width
        const y = Math.random() * height
        const colorPicker = Math.random()
        const color = colorPicker > 0.65 ? 'gold' : colorPicker > 0.35 ? 'cyan' : 'slate'

        nodes.push({
          x,
          y,
          originX: x,
          originY: y,
          vx: (Math.random() - 0.5) * 0.35,
          vy: (Math.random() - 0.5) * 0.35,
          size: Math.random() * 1.8 + 1.2,
          color,
        })
      }
    }

    initNodes()

    const render = () => {
      ctx.clearRect(0, 0, width, height)

      // Smooth mouse easing
      mouse.x += (mouse.targetX - mouse.x) * 0.05
      mouse.y += (mouse.targetY - mouse.y) * 0.05

      // Update positions
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i]
        n.x += n.vx
        n.y += n.vy

        // Gentle bounds bounce
        if (n.x < 0 || n.x > width) n.vx *= -1
        if (n.y < 0 || n.y > height) n.vy *= -1

        // Parallax push from mouse
        const dx = n.x - mouse.x
        const dy = n.y - mouse.y
        const dist = Math.hypot(dx, dy)
        if (dist < mouse.radius && dist > 0) {
          const force = (1 - dist / mouse.radius) * 1.5
          n.x += (dx / dist) * force
          n.y += (dy / dist) * force
        }

        // Draw connections between nearby nodes
        for (let j = i + 1; j < nodes.length; j++) {
          const n2 = nodes[j]
          const distBetween = Math.hypot(n.x - n2.x, n.y - n2.y)
          const maxDist = 120

          if (distBetween < maxDist) {
            const alpha = (1 - distBetween / maxDist) * 0.16
            ctx.beginPath()
            ctx.moveTo(n.x, n.y)
            ctx.lineTo(n2.x, n2.y)

            if (n.color === 'gold' || n2.color === 'gold') {
              ctx.strokeStyle = `rgba(234, 179, 8, ${alpha * 1.2})`
            } else if (n.color === 'cyan' || n2.color === 'cyan') {
              ctx.strokeStyle = `rgba(6, 182, 212, ${alpha * 1.2})`
            } else {
              ctx.strokeStyle = `rgba(148, 163, 184, ${alpha * 0.7})`
            }

            ctx.lineWidth = 0.8
            ctx.stroke()
          }
        }

        // Draw node point
        ctx.beginPath()
        ctx.arc(n.x, n.y, n.size, 0, Math.PI * 2)

        if (n.color === 'gold') {
          ctx.fillStyle = 'rgba(234, 179, 8, 0.75)'
          ctx.shadowColor = 'rgba(234, 179, 8, 0.5)'
          ctx.shadowBlur = 6
        } else if (n.color === 'cyan') {
          ctx.fillStyle = 'rgba(6, 182, 212, 0.75)'
          ctx.shadowColor = 'rgba(6, 182, 212, 0.5)'
          ctx.shadowBlur = 6
        } else {
          ctx.fillStyle = 'rgba(148, 163, 184, 0.45)'
          ctx.shadowBlur = 0
        }

        ctx.fill()
        ctx.shadowBlur = 0
      }

      animationFrameId = requestAnimationFrame(render)
    }

    render()

    return () => {
      cancelAnimationFrame(animationFrameId)
      window.removeEventListener('resize', handleResize)
      if (parent) {
        parent.removeEventListener('mousemove', handleMouseMove)
      }
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className={`pointer-events-none absolute inset-0 z-0 h-full w-full opacity-70 ${className}`}
    />
  )
}
