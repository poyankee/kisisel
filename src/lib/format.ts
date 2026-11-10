/** Türkçe biçimlendirme yardımcıları (plan.md bölüm 2: gg.aa.yyyy, ₺, Europe/Istanbul). */

export const SAAT_DILIMI = 'Europe/Istanbul'

const tarihFmt = new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: SAAT_DILIMI })
const uzunTarihFmt = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', weekday: 'long', timeZone: SAAT_DILIMI })
const paraFmt = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 2 })

/** 10.11.2026 */
export const tarih = (d: Date | string) => tarihFmt.format(typeof d === 'string' ? new Date(d) : d)

/** 10 Kasım Salı */
export const uzunTarih = (d: Date | string) => uzunTarihFmt.format(typeof d === 'string' ? new Date(d) : d)

/** ₺1.250,00 */
export const para = (n: number) => paraFmt.format(n)

/** İstanbul saatine göre bugünün tarihi: "2026-11-10" */
export function bugunISO(): string {
  // sv-SE biçimi yyyy-mm-dd verir
  return new Intl.DateTimeFormat('sv-SE', { timeZone: SAAT_DILIMI }).format(new Date())
}

/** Türkçe'ye uygun büyük/küçük harf duyarsız arama için normalleştirme */
export const ara = (s: string) => s.toLocaleLowerCase('tr-TR').trim()

export const tamAd = (o: { ad: string; soyad?: string }) => [o.ad, o.soyad].filter(Boolean).join(' ')

/** "2026-11-10" tarihine gün ekler (saat diliminden bağımsız, UTC üzerinden) */
export function gunEkle(tarihISO: string, gun: number): string {
  const d = new Date(`${tarihISO}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + gun)
  return d.toISOString().slice(0, 10)
}

/** Haftanın pazartesisi */
export function haftaBasi(tarihISO: string): string {
  const gun = new Date(`${tarihISO}T12:00:00Z`).getUTCDay() // 0 = pazar
  return gunEkle(tarihISO, gun === 0 ? -6 : 1 - gun)
}

const kisaGunFmt = new Intl.DateTimeFormat('tr-TR', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })
const gunAdiFmt = new Intl.DateTimeFormat('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })

/** "Sal 10 Kas" */
export const kisaGun = (tarihISO: string) => kisaGunFmt.format(new Date(`${tarihISO}T12:00:00Z`))
/** "10 Kasım Salı" */
export const gunAdi = (tarihISO: string) => gunAdiFmt.format(new Date(`${tarihISO}T12:00:00Z`))
/** "2026-11-10" → "10.11.2026" */
export const tarihTR = (tarihISO: string) => tarihISO.slice(0, 10).split('-').reverse().join('.')
