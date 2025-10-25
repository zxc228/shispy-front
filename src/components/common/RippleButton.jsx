import { useState } from 'react'

/**
 * Button wrapper that adds ripple effect on click
 * Usage: <RippleButton className="...your classes..." onClick={handler}>Content</RippleButton>
 */
export default function RippleButton({ children, className = '', onClick, disabled, ...props }) {
  const [ripples, setRipples] = useState([])

  const handleClick = (e) => {
    if (disabled) return
    
    const button = e.currentTarget
    const rect = button.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    const newRipple = {
      x,
      y,
      id: Date.now(),
    }
    
    setRipples((prev) => [...prev, newRipple])
    
    // Remove ripple after animation
    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== newRipple.id))
    }, 600)
    
    onClick?.(e)
  }

  return (
    <button
      {...props}
      className={`relative overflow-hidden ${className}`}
      onClick={handleClick}
      disabled={disabled}
    >
      {children}
      {/* Ripple effects */}
      {ripples.map((ripple) => (
        <span
          key={ripple.id}
          className="absolute rounded-full bg-white/30 pointer-events-none animate-[ripple_0.6s_ease-out]"
          style={{
            left: ripple.x,
            top: ripple.y,
            width: 10,
            height: 10,
            transform: 'translate(-50%, -50%)',
          }}
        />
      ))}
    </button>
  )
}
