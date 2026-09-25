import { describe, expect, it } from 'vitest'
import { isIosDevice } from './platform'

const IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1'
const MAC =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15'
const ANDROID =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36'

describe('isIosDevice', () => {
  it('разпознава iPhone', () => {
    expect(isIosDevice({ userAgent: IPHONE, platform: 'iPhone', maxTouchPoints: 5 })).toBe(true)
  })

  it('разпознава iPad, който се представя като Mac', () => {
    expect(isIosDevice({ userAgent: MAC, platform: 'MacIntel', maxTouchPoints: 5 })).toBe(true)
  })

  it('не бърка истински Mac и Android', () => {
    expect(isIosDevice({ userAgent: MAC, platform: 'MacIntel', maxTouchPoints: 0 })).toBe(false)
    expect(isIosDevice({ userAgent: ANDROID, platform: 'Linux armv8l', maxTouchPoints: 5 })).toBe(
      false,
    )
  })
})
