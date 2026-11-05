import type { ReactNode } from 'react'

export function StateMessage({ title, text, action, onAction, children, loading = false }: { title: string; text: string; action?: string; onAction?: () => void; children?: ReactNode; loading?: boolean }) {
  return <div className={loading ? 'state-message state-message-loading' : 'state-message'}>{loading ? <span className="loading-spinner" aria-hidden="true" /> : <span className="state-icon">{action ? '!' : '...'}</span>}<h2>{title}</h2><p>{text}</p>{children}{action && onAction && <button className="button button-primary" onClick={onAction}>{action}</button>}</div>
}
