/** Копира текст в клипборда. Връща false, ако браузърът не позволи. */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}
