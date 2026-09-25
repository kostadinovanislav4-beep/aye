import { useEffect, useState } from 'react'

/*
 * Четене на глас със speechSynthesis (раздел 5.6 от SPEC). Всичко е с проверка дали
 * браузърът го поддържа — без него приложението работи, само бутонът не се показва.
 */

export function canSpeak(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

/** Английските гласове в браузъра (британските първо). */
export function englishVoices(): SpeechSynthesisVoice[] {
  if (!canSpeak()) return []
  return window.speechSynthesis
    .getVoices()
    .filter((voice) => voice.lang.toLowerCase().startsWith('en'))
    .sort((a, b) => Number(b.lang === 'en-GB') - Number(a.lang === 'en-GB'))
}

/** Гласовете се зареждат асинхронно — куката се обновява, когато станат готови. */
export function useEnglishVoices(): SpeechSynthesisVoice[] {
  const [voices, setVoices] = useState(englishVoices)
  useEffect(() => {
    if (!canSpeak()) return
    const update = () => setVoices(englishVoices())
    window.speechSynthesis.addEventListener('voiceschanged', update)
    return () => window.speechSynthesis.removeEventListener('voiceschanged', update)
  }, [])
  return voices
}

export function speak(text: string, voiceName: string | null, lang = 'en-GB'): void {
  if (!canSpeak()) return
  const synth = window.speechSynthesis
  synth.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = lang
  const voice = voiceName ? synth.getVoices().find((v) => v.name === voiceName) : undefined
  if (voice) {
    utterance.voice = voice
    utterance.lang = voice.lang
  }
  synth.speak(utterance)
}
