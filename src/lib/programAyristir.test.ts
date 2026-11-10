import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { koddanTahmin, programAyristir, tarihAyristir } from './programAyristir'

const html = readFileSync(new URL('../../ornekler/kurum_programi_ornek.xls', import.meta.url), 'utf8')

describe('kurum programı ayrıştırıcı (plan.md 5.1)', () => {
  const s = programAyristir(html)

  it('15 gün, 77 ders saati, 44 oturum', () => {
    expect(s.gunSayisi).toBe(15)
    expect(s.dersSaatleri).toHaveLength(77)
    expect(s.oturumlar).toHaveLength(44)
  })

  it('33 ikili blok, 11 tekli oturum', () => {
    expect(s.oturumlar.filter((o) => o.saatler.length === 2)).toHaveLength(33)
    expect(s.oturumlar.filter((o) => o.saatler.length === 1)).toHaveLength(11)
  })

  it('sınıf kodu başına ders saati sayıları', () => {
    const say: Record<string, number> = {}
    for (const d of s.dersSaatleri) say[d.kod] = (say[d.kod] ?? 0) + 1
    expect(say).toEqual({
      '478-H0811': 16,
      '478-H0821': 16,
      '478-K0811': 16,
      '478-K0821': 16,
      '478-L0711': 13,
    })
  })

  it('10.11.2026 itibarıyla 40 geçmiş, 37 bugün ve sonrası', () => {
    expect(s.dersSaatleri.filter((d) => d.tarih < '2026-11-10')).toHaveLength(40)
    expect(s.dersSaatleri.filter((d) => d.tarih >= '2026-11-10')).toHaveLength(37)
  })

  it('sütun başlığı yerine hücredeki saati kullanır', () => {
    const ilk = s.dersSaatleri.find((d) => d.tarih === '2026-10-11')!
    expect(ilk).toEqual({ tarih: '2026-10-11', kod: '478-H0811', baslangic: '09:20', bitis: '10:00' })
    const haftaIci = s.dersSaatleri.find((d) => d.tarih === '2026-11-17')!
    expect(haftaIci.baslangic).toBe('08:30')
  })

  it('ilk ve son tarih, uyarı yok', () => {
    expect(s.ilkTarih).toBe('2026-10-11')
    expect(s.sonTarih).toBe('2026-11-19')
    expect(s.uyarilar).toEqual([])
  })
})

describe('yardımcılar', () => {
  it('Türkçe tarih ayrıştırır', () => {
    expect(tarihAyristir('18 Kasım 2026 Çar')).toEqual({ tarih: '2026-11-18', gun: 'çar' })
    expect(tarihAyristir('Gün')).toBeNull()
  })

  it('gün adı uyuşmazlığında uyarır', () => {
    const r = programAyristir('<table><tr><td>11 Ekim 2026 Pzt</td><td>X-1<br>09:00-09:40</td></tr></table>')
    expect(r.uyarilar[0]).toMatch(/uyuşmuyor/)
    expect(r.dersSaatleri).toHaveLength(1)
  })

  it('koddan sınıf adı tahmin eder', () => {
    expect(koddanTahmin('478-H0811')).toEqual({ ad: '8-H1', duzey: '8' })
    expect(koddanTahmin('478-L0711')).toEqual({ ad: '7-L1', duzey: '7' })
    expect(koddanTahmin('ABC')).toEqual({ ad: 'ABC' })
  })
})
