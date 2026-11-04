import type { ReactNode } from 'react'

export function StateMessage({ title, text, action, onAction, children }: { title: string; text: string; action?: string; onAction?: () => void; children?: ReactNode }) {
  return <div className="state-message"><span className="state-icon">{action ? '!' : '...'}</span><h2>{title}</h2><p>{text}</p>{children}{action && onAction && <button className="button button-primary" onClick={onAction}>{action}</button>}</div>
}
