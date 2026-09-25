/**
 * Моли браузъра да не изтрива данните, когато мястото свърши (раздел 2 от SPEC). Връща
 * дали данните са защитени или null, ако браузърът не поддържа тази възможност.
 */
export async function requestPersistentStorage(): Promise<boolean | null> {
  if (typeof navigator === 'undefined' || !('storage' in navigator)) return null
  const storage = navigator.storage
  if (typeof storage.persist !== 'function') return null
  try {
    if (await storage.persisted()) return true
    return await storage.persist()
  } catch {
    return null
  }
}

export async function isStoragePersisted(): Promise<boolean | null> {
  if (typeof navigator === 'undefined' || !('storage' in navigator)) return null
  const storage = navigator.storage
  if (typeof storage.persisted !== 'function') return null
  try {
    return await storage.persisted()
  } catch {
    return null
  }
}
