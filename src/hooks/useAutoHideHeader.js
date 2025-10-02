import { useEffect, useRef, useState } from 'react'

export default function useAutoHideHeader() {
  const lastY = useRef(0)
  const [hidden, setHidden] = useState(false)

  const onScroll = (e) => {
    const y = e.currentTarget.scrollTop
    if (Math.abs(y - lastY.current) > 4) {
      setHidden(y > lastY.current && y > 24) // вниз и прошли 24px — прячем
    }
    lastY.current = y
  }

  useEffect(() => { setHidden(false) }, [])
  return { hidden, onScroll }
}
