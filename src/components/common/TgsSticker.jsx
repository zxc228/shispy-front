import { useEffect, useRef, useState } from 'react'
import Lottie from 'lottie-react'
import pako from 'pako'
import { logger } from '../../shared/logger'

/**
 * TgsSticker component for displaying Telegram TGS stickers
 * 
 * TGS format is gzipped Lottie JSON. This component handles:
 * 1. Loading TGS file
 * 2. Decompressing gzip
 * 3. Parsing JSON
 * 4. Rendering with lottie-react
 * 
 * @param {Object} props
 * @param {string} props.src - URL to .tgs file or Lottie JSON URL
 * @param {number} props.width - Width in pixels (default: 100)
 * @param {number} props.height - Height in pixels (default: 100)
 * @param {boolean} props.loop - Whether to loop animation (default: true)
 * @param {boolean} props.autoplay - Whether to autoplay (default: true)
 * @param {string} props.className - Additional CSS classes
 */
export default function TgsSticker({ 
  src, 
  width = 100, 
  height = 100, 
  loop = true, 
  autoplay = true,
  className = ''
}) {
  const [animationData, setAnimationData] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function loadSticker() {
      try {
        setLoading(true)
        setError(null)
        
        logger.debug('TgsSticker: loading', { src })

        // Fetch the file
        const response = await fetch(src)
        logger.debug('TgsSticker: response', { status: response.status, statusText: response.statusText })
        
        if (!response.ok) {
          throw new Error(`Failed to load sticker: ${response.status} ${response.statusText}`)
        }

        const contentType = response.headers.get('content-type')
        logger.debug('TgsSticker: content-type', { contentType })
        
        // Check if it's already JSON
        if (contentType?.includes('application/json')) {
          const json = await response.json()
          logger.debug('TgsSticker: loaded as JSON')
          if (!cancelled) {
            setAnimationData(json)
          }
          return
        }

        // Otherwise, treat as TGS (gzipped)
        const arrayBuffer = await response.arrayBuffer()
        const compressed = new Uint8Array(arrayBuffer)
        logger.debug('TgsSticker: loaded as binary', { size: compressed.length })
        
        // Decompress using pako
        const decompressed = pako.ungzip(compressed, { to: 'string' })
        logger.debug('TgsSticker: decompressed', { size: decompressed.length })
        const json = JSON.parse(decompressed)
        logger.debug('TgsSticker: parsed JSON ok')
        
        if (!cancelled) {
          setAnimationData(json)
        }
      } catch (err) {
        // Подсказки: CORS/403/404 часто указывают на неверный путь/права
        logger.error('TgsSticker: failed to load', { src, error: err?.message, stack: err?.stack })
        if (!cancelled) {
          setError(err.message)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    if (src) {
      loadSticker()
    }

    return () => {
      cancelled = true
    }
  }, [src])

  if (loading) {
    return (
      <div 
        className={`flex items-center justify-center ${className}`}
        style={{ width: `${width}px`, height: `${height}px` }}
      >
        <div className="animate-pulse text-2xl">⏳</div>
      </div>
    )
  }

  if (error) {
    return (
      <div 
        className={`flex items-center justify-center ${className}`}
        style={{ width: `${width}px`, height: `${height}px` }}
        title={`Error loading TGS: ${error}`}
      >
        <div className="text-2xl opacity-50">❌</div>
      </div>
    )
  }

  if (!animationData) {
    return null
  }

  return (
    <div className={className} style={{ width: `${width}px`, height: `${height}px` }}>
      <Lottie
        animationData={animationData}
        loop={loop}
        autoplay={autoplay}
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  )
}
