import { useState } from 'react'

export function CoverImage({ src, alt }: { src: string; alt: string }) {
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)

  if (failed) return null

  return <>{loading && <span className="cover-loading-spinner loading-spinner" aria-label="Loading cover" />}<img src={src} alt={alt} onLoad={() => setLoading(false)} onError={() => { setLoading(false); setFailed(true) }} /></>
}
