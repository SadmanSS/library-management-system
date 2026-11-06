import { useState } from 'react'

export function CoverImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)

  if (failed) return null

  return <>{loading && <span className="cover-loading-spinner loading-spinner" aria-label="Loading cover" />}<img className={className} src={src} alt={alt} onLoad={() => setLoading(false)} onError={() => { setLoading(false); setFailed(true) }} /></>
}
