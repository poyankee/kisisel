import { describe, expect, it } from 'vitest'
import { ara, tamAd, tarih } from './format'

describe('format', () => {
  it('tarihi gg.aa.yyyy biçiminde verir', () => {
    expect(tarih('2026-11-10T12:00:00Z')).toBe('10.11.2026')
  })
  it('Türkçe harflerle büyük/küçük harf duyarsız arar', () => {
    expect(ara('İSMAİL Işık')).toBe('ismail ışık')
  })
  it('ad ve soyadı birleştirir', () => {
    expect(tamAd({ ad: 'Elif', soyad: 'Yılmaz' })).toBe('Elif Yılmaz')
    expect(tamAd({ ad: 'Elif' })).toBe('Elif')
  })
})

import { gunEkle, haftaBasi, tarihTR } from './format'
describe('tarih yardımcıları', () => {
  it('haftayı pazartesiden başlatır', () => {
    expect(haftaBasi('2026-11-10')).toBe('2026-11-09') // salı → pazartesi
    expect(haftaBasi('2026-11-15')).toBe('2026-11-09') // pazar → önceki pazartesi
    expect(gunEkle('2026-12-31', 1)).toBe('2027-01-01')
    expect(tarihTR('2026-11-10')).toBe('10.11.2026')
  })
})
