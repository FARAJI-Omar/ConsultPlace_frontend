import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { toast } from 'sonner'

export function useVersionCheck() {
  const location = useLocation()
  const hashRef = useRef<string | null>(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/version.json?t=' + Date.now())
        if (!res.ok) return
        const { hash } = await res.json()
        if (hashRef.current && hashRef.current !== hash) {
          toast('Nouvelle version disponible', {
            duration: Infinity,
            action: { label: 'Actualiser la page', onClick: () => window.location.reload() },
            cancel: { label: '\u2715', onClick: () => {} },
          })
          return
        }
        hashRef.current = hash
      } catch {}
    })()
  }, [location.pathname, tick])

  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === 'visible') setTick(t => t + 1) }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])
}
