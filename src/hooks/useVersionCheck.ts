import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { toast } from 'sonner'

export function useVersionCheck() {
  const location = useLocation()
  const hashRef = useRef<string | null>(null)

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch('/version.json?t=' + Date.now())
        if (!res.ok) return
        const { hash } = await res.json()
        if (hashRef.current && hashRef.current !== hash) {
          toast('A new version is available', {
            duration: Infinity,
            action: {
              label: 'Refresh',
              onClick: () => window.location.reload(),
            },
            cancel: {
              label: '\u2715',
              onClick: () => {},
            },
          })
        }
        hashRef.current = hash
      } catch {}
    }
    check()
  }, [location.pathname])

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        const check = async () => {
          try {
            const res = await fetch('/version.json?t=' + Date.now())
            if (!res.ok) return
            const { hash } = await res.json()
            if (hashRef.current && hashRef.current !== hash) {
              toast('A new version is available', {
                duration: Infinity,
                action: {
                  label: 'Refresh',
                  onClick: () => window.location.reload(),
                },
                cancel: {
                  label: '\u2715',
                  onClick: () => {},
                },
              })
            }
            hashRef.current = hash
          } catch {}
        }
        check()
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])
}
