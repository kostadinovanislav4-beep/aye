import { useId, useState } from 'react'
import { input } from '../../components/styles'

/**
 * Поле за цяло число. Докато се пише, може да е празно; валидната стойност се запазва
 * веднага, а при излизане от полето се показва последната запазена.
 */
export function NumberField({
  label,
  value,
  min,
  max,
  onChange,
  suffix,
}: {
  label: string
  value: number
  min: number
  max: number
  onChange: (value: number) => void
  suffix?: string
}) {
  const id = useId()
  const [draft, setDraft] = useState<string | null>(null)
  return (
    <div className="flex items-center justify-between gap-3">
      <label htmlFor={id} className="min-w-0">
        {label}
      </label>
      <span className="flex items-center gap-2">
        <input
          id={id}
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          value={draft ?? String(value)}
          onChange={(event) => {
            setDraft(event.target.value)
            const next = Number(event.target.value)
            if (event.target.value !== '' && Number.isInteger(next) && next >= min && next <= max) {
              onChange(next)
            }
          }}
          onBlur={() => setDraft(null)}
          className={`${input} w-24 text-right`}
        />
        {suffix && <span className="w-8 text-sm text-muted">{suffix}</span>}
      </span>
    </div>
  )
}
