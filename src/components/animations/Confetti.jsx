import { useEffect, useState } from 'react'

/**
 * Confetti animation component
 * Creates falling confetti particles with random colors and physics
 */
export default function Confetti({ duration = 3000, particleCount = 50 }) {
  const [particles, setParticles] = useState([])
  const [isActive, setIsActive] = useState(true)

  useEffect(() => {
    // Generate particles with random properties
    const newParticles = Array.from({ length: particleCount }, (_, i) => ({
      id: i,
      left: Math.random() * 100, // 0-100%
      animationDuration: 2 + Math.random() * 2, // 2-4s
      delay: Math.random() * 0.5, // 0-0.5s stagger
      color: ['#FF6B35', '#F7931E', '#FDC830', '#4ECDC4', '#45B7D1', '#96CEB4'][Math.floor(Math.random() * 6)],
      rotation: Math.random() * 360,
      size: 8 + Math.random() * 8, // 8-16px
    }))
    setParticles(newParticles)

    // Auto-hide after duration
    const timer = setTimeout(() => setIsActive(false), duration)
    return () => clearTimeout(timer)
  }, [duration, particleCount])

  if (!isActive) return null

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute -top-4 animate-[confettiFall_var(--duration)_ease-in_forwards]"
          style={{
            left: `${p.left}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: p.color,
            transform: `rotate(${p.rotation}deg)`,
            animationDelay: `${p.delay}s`,
            '--duration': `${p.animationDuration}s`,
            borderRadius: '2px',
            opacity: 0.9,
          }}
        />
      ))}
    </div>
  )
}
