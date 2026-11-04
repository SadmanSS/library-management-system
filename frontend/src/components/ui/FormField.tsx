export function FormField({ label, name, value, type = 'text', min, hint, error, onChange }: { label: string; name: string; value: string; type?: string; min?: string; hint?: string; error?: string; onChange: (value: string) => void }) {
  return <label className="form-field"><span>{label} *</span><input name={name} type={type} min={min} value={value} onChange={(event) => onChange(event.target.value)} aria-invalid={Boolean(error)} />{hint && !error && <small>{hint}</small>}{error && <small className="form-error">{error}</small>}</label>
}
