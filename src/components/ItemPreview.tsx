import type { ReactNode } from 'react'
import { findFragment, splitCloze } from '../domain/content/markers'
import type { Choice, ContentItem, Exam, ItemOfType } from '../domain/content/schema'
import { plural } from '../domain/text/format'
import { TYPE_LABEL } from './typeLabels'

/*
 * Елемент от съдържанието в четим вид — с верните отговори и обясненията. За екрана
 * „За проверка“ и за тетрадката на грешките.
 */

/** Буквите на вариантите: А, Б, В, Г на ДЗИ и A, B, C, D на CAE. */
const LETTERS: Record<Exam, string> = { bel: 'АБВГД', cae: 'ABCDE' }

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold tracking-wide text-muted uppercase">{label}</p>
      <div className="mt-0.5 whitespace-pre-line">{children}</div>
    </div>
  )
}

function Answers({ values }: { values: readonly string[] }) {
  return <span className="font-semibold text-accent-strong">{values.join(' / ')}</span>
}

function Options({
  options,
  answer,
  exam,
}: {
  options: readonly Choice[]
  answer: number
  exam: Exam
}) {
  return (
    <ol className="space-y-1.5">
      {options.map((option, i) => (
        <li key={i}>
          <span className={i === answer ? 'font-semibold text-accent-strong' : ''}>
            {LETTERS[exam][i] ?? i + 1}) {option.text}
            {i === answer && (
              <>
                {' '}
                ✓<span className="sr-only"> (верен)</span>
              </>
            )}
          </span>
          {option.why && <span className="block text-muted">{option.why}</span>}
        </li>
      ))}
    </ol>
  )
}

function Passage({ title, children }: { title?: string | undefined; children: ReactNode }) {
  return (
    <blockquote className="rounded-2xl bg-surface-2 p-3 whitespace-pre-line">
      {title && <p className="mb-1 font-semibold">{title}</p>}
      {children}
    </blockquote>
  )
}

function ClozeText({ item }: { item: ItemOfType<'cloze'> }) {
  return (
    <p className="whitespace-pre-line">
      {splitCloze(item.text).map((piece, i) =>
        'text' in piece ? (
          <span key={i}>{piece.text}</span>
        ) : (
          <mark key={i} className="rounded bg-accent-soft px-1 text-accent-strong">
            <sup className="mr-0.5 text-[0.65rem]">c{piece.index}</sup>
            {piece.answer}
            {piece.hint ? ` (${piece.hint})` : ''}
          </mark>
        ),
      )}
    </p>
  )
}

/** Текстът за редактиране с оцветени и номерирани грешни фрагменти. */
function EditText({ item }: { item: ItemOfType<'edit_text'> }) {
  const spans = item.errors
    .map((error, index) => {
      const start = findFragment(item.text, error.fragment, error.occurrence ?? 1)
      return { index, start, end: start + error.fragment.length }
    })
    .filter((span) => span.start >= 0)
    .sort((a, b) => a.start - b.start)
  const parts: ReactNode[] = []
  let cursor = 0
  for (const span of spans) {
    if (span.start < cursor) continue
    parts.push(item.text.slice(cursor, span.start))
    parts.push(
      <mark key={span.index} className="rounded bg-accent-soft px-0.5 text-accent-strong">
        <sup className="mr-0.5 text-[0.65rem]">{span.index + 1}</sup>
        {item.text.slice(span.start, span.end)}
      </mark>,
    )
    cursor = span.end
  }
  parts.push(item.text.slice(cursor))
  return <Passage>{parts}</Passage>
}

function Body({ item }: { item: ContentItem }) {
  switch (item.type) {
    case 'basic':
      return (
        <>
          <Field label="Лице">{item.front}</Field>
          <Field label="Гръб">{item.back}</Field>
          {item.hint && <Field label="Подсказка">{item.hint}</Field>}
          {item.example && <Field label="Пример">{item.example}</Field>}
        </>
      )
    case 'cloze':
      return (
        <>
          <ClozeText item={item} />
          {item.context && <Field label="Контекст">{item.context}</Field>}
        </>
      )
    case 'mcq':
      return (
        <>
          {item.passage && <Passage>{item.passage}</Passage>}
          <Field label="Условие">{item.prompt}</Field>
          <Options options={item.options} answer={item.answer} exam={item.exam} />
        </>
      )
    case 'short':
      return (
        <>
          {item.passage && <Passage>{item.passage}</Passage>}
          <Field label="Условие">{item.prompt}</Field>
          <Field label="Приети отговори">
            <Answers values={item.accepted} />
            {item.normalize?.pattern && (
              <span className="block text-muted">Също: /{item.normalize.pattern}/</span>
            )}
          </Field>
        </>
      )
    case 'edit_text':
      return (
        <>
          <Field label="Условие">{item.prompt}</Field>
          <EditText item={item} />
          <ol className="space-y-1.5">
            {item.errors.map((error, i) => (
              <li key={i}>
                {i + 1}. „{error.fragment}“ → <Answers values={error.accepted} />{' '}
                <span className="text-muted">({error.tag})</span>
                {error.note && <span className="block text-muted">{error.note}</span>}
              </li>
            ))}
          </ol>
        </>
      )
    case 'text_set':
      return <TextSetBody item={item} />
    case 'mc_cloze':
      return (
        <>
          {item.title && <p className="font-semibold">{item.title}</p>}
          <Passage>{item.text}</Passage>
          <ol className="space-y-3">
            {item.gaps.map((gap, i) => (
              <li key={i}>
                <p className="font-semibold">[[{i + 1}]]</p>
                <Options options={gap.options} answer={gap.answer} exam={item.exam} />
                <p className="text-muted">{gap.explanation}</p>
              </li>
            ))}
          </ol>
        </>
      )
    case 'open_cloze':
    case 'word_formation':
      return (
        <>
          {item.title && <p className="font-semibold">{item.title}</p>}
          <Passage>{item.text}</Passage>
          <ol className="space-y-1.5">
            {item.gaps.map((gap, i) => (
              <li key={i}>
                [[{i + 1}]] {'stem' in gap ? `${gap.stem} → ` : ''}
                <Answers values={gap.accepted} />
                <span className="block text-muted">{gap.explanation}</span>
              </li>
            ))}
          </ol>
        </>
      )
    case 'kwt':
      return (
        <>
          <Field label="Изречение">{item.sentence}</Field>
          <Field label="Ключова дума">{item.keyword}</Field>
          <Field label="Второ изречение">{item.gapped}</Field>
          <Field label="Пълни отговори (2 т.)">
            <Answers values={item.answers} />
          </Field>
          <Field label="Части (по 1 т.)">
            <Answers values={item.parts[0].accepted} /> ·{' '}
            <Answers values={item.parts[1].accepted} />
          </Field>
        </>
      )
    case 'listening_set':
      return <ListeningBody item={item} />
    case 'speaking_task':
      return (
        <>
          <p className="font-semibold">
            Part {item.part}: {item.title}
          </p>
          <Field label="Указания">{item.instructions}</Field>
          <Field label="Въпроси">
            <ul className="list-disc pl-5">
              {item.questions.map((question, i) => (
                <li key={i}>{question}</li>
              ))}
            </ul>
          </Field>
          {item.scene && <Field label="Сцена">{item.scene.description}</Field>}
          <Field label="Таймери">
            {item.timers.map((timer) => `${timer.label}: ${timer.seconds} с`).join(' · ')}
          </Field>
          {item.sampleAnswers.map((sample, i) => (
            <Field key={i} label={`Примерен отговор ${i + 1}`}>
              {sample.text}
              {sample.note && <span className="block text-muted">{sample.note}</span>}
            </Field>
          ))}
          <Field label="Полезни фрази">{item.usefulPhrases.join(' · ')}</Field>
        </>
      )
    case 'writing_task':
      return (
        <>
          <p className="font-semibold">{item.title}</p>
          <Passage>{item.prompt}</Passage>
          {item.targetWords && (
            <Field label="Обем">
              {item.targetWords.min}–{item.targetWords.max} думи
            </Field>
          )}
          <Field label="Чеклист">
            <ul className="list-disc pl-5">
              {item.checklist.map((point, i) => (
                <li key={i}>{point}</li>
              ))}
            </ul>
          </Field>
          {item.plan && (
            <Field label="План">
              Теза: {item.plan.thesis}
              <ul className="list-disc pl-5">
                {item.plan.points.map((point, i) => (
                  <li key={i}>{point}</li>
                ))}
              </ul>
            </Field>
          )}
          {item.samples?.map((sample, i) => (
            <Field
              key={i}
              label={`Примерен текст ${i + 1} (${sample.level === 'strong' ? 'силен' : 'среден'})`}
            >
              <Passage>{sample.text}</Passage>
            </Field>
          ))}
        </>
      )
  }
}

function TextSetBody({ item }: { item: ItemOfType<'text_set'> }) {
  return (
    <>
      {item.title && <p className="font-semibold">{item.title}</p>}
      {item.instructions && <Field label="Указания">{item.instructions}</Field>}
      {item.passages.map((passage) => (
        <Passage
          key={passage.id}
          title={passage.title ? `${passage.id}. ${passage.title}` : passage.id}
        >
          {passage.text}
        </Passage>
      ))}
      {item.format === 'gapped' ? (
        <>
          <Field label="Абзаци">
            <ul className="space-y-1">
              {item.paragraphs.map((paragraph) => (
                <li key={paragraph.key}>
                  {paragraph.key}) {paragraph.text}
                </li>
              ))}
            </ul>
          </Field>
          <ol className="space-y-1.5">
            {item.gaps.map((gap, i) => (
              <li key={i}>
                [[{i + 1}]] → <Answers values={[gap.answer]} />
                <span className="block text-muted">{gap.explanation}</span>
              </li>
            ))}
          </ol>
        </>
      ) : (
        <ol className="space-y-3">
          {item.questions.map((question, i) => (
            <li key={i}>
              <p>
                {i + 1}. {question.prompt}
              </p>
              {question.kind === 'mcq' && (
                <Options options={question.options} answer={question.answer} exam={item.exam} />
              )}
              {question.kind === 'short' && <Answers values={question.accepted} />}
              {question.kind === 'match' && <Answers values={[question.answer]} />}
              <span className="block text-muted">{question.explanation}</span>
            </li>
          ))}
        </ol>
      )}
    </>
  )
}

function ListeningBody({ item }: { item: ItemOfType<'listening_set'> }) {
  const names = new Map(item.speakers.map((speaker) => [speaker.id, speaker.name]))
  return (
    <>
      <p className="font-semibold">
        Part {item.part}: {item.title}{' '}
        <span lang="bg" className="font-normal text-muted">
          · чува се {plural(item.plays, 'път', 'пъти')}
        </span>
      </p>
      {item.scripts.map((script) => (
        <Passage key={script.id} title={script.title ?? script.intro}>
          {script.lines
            .map((line) => `${names.get(line.speaker) ?? line.speaker}: ${line.text}`)
            .join('\n')}
        </Passage>
      ))}
      <ol className="space-y-3">
        {item.questions.map((question, i) => (
          <li key={i}>
            {question.kind === 'match' ? (
              <p>
                {i + 1}. Task {question.task}, {names.get(question.script) ?? question.script} →{' '}
                <Answers values={[question.answer]} />
              </p>
            ) : (
              <>
                <p>
                  {i + 1}. {question.prompt}
                </p>
                {question.kind === 'mcq' ? (
                  <Options options={question.options} answer={question.answer} exam={item.exam} />
                ) : (
                  <Answers values={question.accepted} />
                )}
              </>
            )}
            <span lang="bg" className="block text-muted">
              {question.explanation}
            </span>
          </li>
        ))}
      </ol>
    </>
  )
}

/** Целият елемент: вид, съдържание с отговорите, обяснение, източник и тагове. */
export function ItemPreview({ item }: { item: ContentItem }) {
  return (
    <div lang={item.exam === 'cae' ? 'en' : 'bg'} className="space-y-3 text-sm leading-relaxed">
      <div lang="bg" className="flex flex-wrap items-center gap-2 text-xs text-muted">
        <span className="rounded-full bg-surface-2 px-2 py-0.5 font-medium">
          {TYPE_LABEL[item.type]}
        </span>
        <span>трудност {item.difficulty}</span>
        <code className="font-mono">{item.id}</code>
      </div>
      <Body item={item} />
      <div lang="bg" className="space-y-3">
        <Field label="Обяснение">{item.explanation}</Field>
        {item.source && <Field label="Източник">{item.source}</Field>}
        <p className="text-xs text-muted">Тагове: {item.tags.join(', ')}</p>
      </div>
    </div>
  )
}
