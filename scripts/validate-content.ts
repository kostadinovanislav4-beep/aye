/**
 * npm run validate:content — проверява всичко в content/ (раздел 3.4 от SPEC).
 * Колоди са JSON файловете в content/<изпит>/<област>/…; файловете в content/ и
 * content/<изпит>/ са служебни (tags.json, rubrics.json, program.json…).
 * Грешка → код 1. Предупрежденията не спират проверката.
 */
import path from 'node:path'
import {
  validateContent,
  type ContentFile,
  type ValidationIssue,
} from '../src/domain/content/validate'
import { CONTENT_DIR, deckPaths, readJson, toPosix } from './content-files'

function printIssues(issues: readonly ValidationIssue[]): void {
  const byFile = new Map<string, ValidationIssue[]>()
  for (const issue of issues) byFile.set(issue.file, [...(byFile.get(issue.file) ?? []), issue])
  for (const [file, list] of byFile) {
    console.log(`\n${file}`)
    for (const issue of list) {
      const mark = issue.level === 'error' ? '✖' : '⚠'
      console.log(`  ${mark} ${issue.where ? `${issue.where}: ` : ''}${issue.message}`)
    }
  }
}

async function main(): Promise<number> {
  const readErrors: ValidationIssue[] = []
  const decks: ContentFile[] = []
  for (const file of await deckPaths()) {
    try {
      decks.push(await readJson(file))
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'непозната грешка'
      readErrors.push({ level: 'error', file: toPosix(file), message: `Невалиден JSON: ${reason}` })
    }
  }

  const report = validateContent({
    decks,
    tags: await readJson(path.join(CONTENT_DIR, 'tags.json')),
    rubrics: await readJson(path.join(CONTENT_DIR, 'rubrics.json')),
  })
  const issues = [...readErrors, ...report.issues]
  printIssues(issues)

  const errorCount = issues.filter((issue) => issue.level === 'error').length
  const warningCount = issues.length - errorCount
  const types = Object.entries(report.byType)
    .map(([type, count]) => `${type} ${count}`)
    .join(', ')

  console.log(
    `\nКолоди: ${report.decks} · Елементи: ${report.items} (БЕЛ ${report.byExam.bel}, CAE ${report.byExam.cae}) · За проверка: ${report.unverified.length}`,
  )
  if (types) console.log(`По тип: ${types}`)
  if (errorCount > 0) {
    console.log(`✖ Грешки: ${errorCount}, предупреждения: ${warningCount}.`)
    return 1
  }
  console.log(
    `✔ Съдържанието е валидно${warningCount > 0 ? ` (предупреждения: ${warningCount})` : ''}.`,
  )
  return 0
}

process.exitCode = await main()
