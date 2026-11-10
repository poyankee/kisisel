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
