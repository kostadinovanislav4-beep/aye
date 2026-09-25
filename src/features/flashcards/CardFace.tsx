import { Volume2 } from 'lucide-react'
import { useState } from 'react'
import { canSpeak, speak } from '../../app/speech'
import { iconButton, quietButton } from '../../components/styles'
import { splitCloze, stripMarkup } from '../../domain/content/markers'
import type { ContentItem, ItemOfType } from '../../domain/content/schema'
import { splitTargetId } from '../../domain/progress/ids'

type FaceProps = { revealed: boolean; voice: string | null }

function SpeakButton({ text, voice }: { text: string; voice: string | null }) {
  if (!canSpeak()) return null
  return (
    <button
      type="button"
      onClick={() => speak(text, voice)}
      aria-label="Прочети на глас"
      className={iconButton}
    >
      <Volume2 aria-hidden className="size-5" />
    </button>
  )
}

function Explanation({ item }: { item: ContentItem }) {
  return (
    <div className="mt-6 border-t border-border pt-4 text-sm leading-relaxed text-muted">
      <p className="whitespace-pre-line">{item.explanation}</p>
      {item.source && <p className="mt-2">Източник: {item.source}</p>}
    </div>
  )
}

function BasicFace({ item, revealed, voice }: FaceProps & { item: ItemOfType<'basic'> }) {
  const [hint, setHint] = useState(false)
  const english = item.exam === 'cae'
  return (
    <div>
      <div className="flex items-start justify-between gap-2">
        <p lang={english ? 'en' : 'bg'} className="text-2xl leading-snug font-semibold">
          {item.front}
        </p>
        {english && <SpeakButton text={item.front} voice={voice} />}
      </div>
      {item.hint && !revealed && !hint && (
        <button type="button" onClick={() => setHint(true)} className={`${quietButton} mt-3 -ml-4`}>
          Подсказка
        </button>
      )}
      {item.hint && (revealed || hint) && <p className="mt-3 text-muted">{item.hint}</p>}
      {revealed && (
        <div className="mt-6 border-t border-border pt-5">
          <p lang={english ? 'en' : 'bg'} className="text-xl leading-relaxed whitespace-pre-line">
            {item.back}
          </p>
          {item.example && (
            <div className="mt-3 flex items-start justify-between gap-2">
              <p lang={english ? 'en' : 'bg'} className="leading-relaxed text-muted italic">
                {item.example}
              </p>
              {english && <SpeakButton text={item.example} voice={voice} />}
            </div>
          )}
          <Explanation item={item} />
        </div>
      )}
    </div>
  )
}

function ClozeFace({
  item,
  deletion,
  revealed,
  voice,
}: FaceProps & { item: ItemOfType<'cloze'>; deletion: number }) {
  const english = item.exam === 'cae'
  return (
    <div>
      <div className="flex items-start justify-between gap-2">
        <p lang={english ? 'en' : 'bg'} className="text-xl leading-relaxed whitespace-pre-line">
          {splitCloze(item.text).map((piece, i) => {
            if ('text' in piece) return <span key={i}>{piece.text}</span>
            if (piece.index !== deletion) return <span key={i}>{piece.answer}</span>
            return revealed ? (
              <mark
                key={i}
                className="rounded-md bg-accent-soft px-1 font-semibold text-accent-strong"
              >
                {piece.answer}
              </mark>
            ) : (
              <span
                key={i}
                className="rounded-md border border-dashed border-accent-strong px-2 text-accent-strong"
              >
                {piece.hint ? `[${piece.hint}]` : '[…]'}
              </span>
            )
          })}
        </p>
        {english && revealed && <SpeakButton text={stripMarkup(item.text)} voice={voice} />}
      </div>
      {item.context && <p className="mt-3 text-sm text-muted">{item.context}</p>}
      {revealed && <Explanation item={item} />}
    </div>
  )
}

/** Лицето и гърбът на карта за преговор (basic или изтриване в cloze). */
export function CardFace({
  item,
  cardId,
  revealed,
  voice,
}: FaceProps & { item: ContentItem; cardId: string }) {
  if (item.type === 'basic') return <BasicFace item={item} revealed={revealed} voice={voice} />
  if (item.type === 'cloze') {
    const deletion = Number(splitTargetId(cardId).part.slice(1)) || 1
    return <ClozeFace item={item} deletion={deletion} revealed={revealed} voice={voice} />
  }
  return <p className="text-muted">Елементът „{item.id}“ не е карта за преговор.</p>
}
