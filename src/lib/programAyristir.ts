/**
 * Kurum programı ayrıştırıcı (plan.md bölüm 5).
 *
 * Kurumun verdiği `.xls` aslında Excel "web sayfası" biçiminde bir HTML tablosudur.
 * Her satır bir tarih ("11 Ekim 2026 Paz"), her dolu hücre bir ders saatidir:
 * "478-H0811<br>09:20-10:00". Sütun başlığına ("1. Saat") güvenilmez, hücredeki saat kullanılır.
 *
 * Ayrıştırma düz metin üzerinde yapılır (DOMParser gerektirmez), böylece hem tarayıcıda
 * hem de testlerde (Node) aynı kod çalışır.
 */

export interface HamDersSaati {
  tarih: string // "2026-10-11"
  kod: string // "478-H0811"
  baslangic: string // "09:20"
  bitis: string // "10:00"
}

export interface Oturum {
  tarih: string
  kod: string
  baslangic: string
  bitis: string
  saatler: HamDersSaati[] // ders saatleri (sıralı)
}

export interface AyristirmaSonucu {
  dersSaatleri: HamDersSaati[]
  oturumlar: Oturum[]
  gunSayisi: number
  ilkTarih?: string
  sonTarih?: string
  uyarilar: string[]
}

const AYLAR: Record<string, number> = {
  ocak: 1, şubat: 2, subat: 2, mart: 3, nisan: 4, mayıs: 5, mayis: 5, haziran: 6,
  temmuz: 7, ağustos: 8, agustos: 8, eylül: 9, eylul: 9, ekim: 10, kasım: 11, kasim: 11, aralık: 12, aralik: 12,
}

// getUTCDay() sırasıyla (0 = pazar)
const GUN_KISALTMALARI = ['paz', 'pzt', 'sal', 'çar', 'per', 'cum', 'cmt']
const GUN_ESANLAMLI: Record<string, string> = { pts: 'pzt', car: 'çar', cts: 'cmt', cmt: 'cmt' }

/** Oturum birleştirmede ders saatleri arasında izin verilen en büyük ara (dakika) */
export const OTURUM_ARASI_DK = 10

const varlikCoz = (s: string) =>
  s
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))

/** HTML tablosunu satır/hücre metinlerine çevirir. <br> yeni satır olur. */
export function tabloSatirlari(html: string): string[][] {
  const satirlar: string[][] = []
  const trRe = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi
  const tdRe = /<t([dh])\b[^>]*>([\s\S]*?)<\/t\1>/gi
  for (const tr of html.matchAll(trRe)) {
    const hucreler: string[] = []
    for (const td of tr[1].matchAll(tdRe)) {
      const metin = varlikCoz(td[2].replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, ''))
      hucreler.push(metin.trim())
    }
    satirlar.push(hucreler)
  }
  return satirlar
}

const iki = (n: number) => String(n).padStart(2, '0')
export const dk = (saat: string) => {
  const [s, d] = saat.split(':').map(Number)
  return s * 60 + d
}

/** "11 Ekim 2026 Paz" → { tarih: "2026-10-11", gun: "paz" } */
export function tarihAyristir(metin: string): { tarih: string; gun?: string } | null {
  const m = metin.trim().toLocaleLowerCase('tr-TR').match(/^(\d{1,2})\s+(\p{L}+)\s+(\d{4})(?:\s+(\p{L}+))?/u)
  if (!m) return null
  const ay = AYLAR[m[2]]
  const gun = Number(m[1])
  const yil = Number(m[3])
  if (!ay || gun < 1 || gun > 31) return null
  const d = new Date(Date.UTC(yil, ay - 1, gun))
  if (d.getUTCMonth() !== ay - 1) return null // 31 Şubat gibi
  return { tarih: `${yil}-${iki(ay)}-${iki(gun)}`, gun: m[4] }
}

/** Hücre: "478-H0811\n09:20-10:00" */
function hucreAyristir(metin: string): { kod: string; baslangic: string; bitis: string } | null {
  const saat = metin.match(/(\d{1,2})[:.](\d{2})\s*[-–]\s*(\d{1,2})[:.](\d{2})/)
  if (!saat) return null
  const kod = metin
    .slice(0, saat.index)
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
    .join(' ')
    .toUpperCase()
  if (!kod) return null
  return {
    kod,
    baslangic: `${iki(Number(saat[1]))}:${saat[2]}`,
    bitis: `${iki(Number(saat[3]))}:${saat[4]}`,
  }
}

/** Aynı gün, aynı kod ve en fazla 10 dk ara ile ardışık ders saatlerini oturumlarda birleştirir. */
export function oturumlaraAyir(saatler: HamDersSaati[]): Oturum[] {
  const sirali = [...saatler].sort(
    (a, b) => a.tarih.localeCompare(b.tarih) || a.kod.localeCompare(b.kod) || dk(a.baslangic) - dk(b.baslangic),
  )
  const oturumlar: Oturum[] = []
  for (const s of sirali) {
    const son = oturumlar[oturumlar.length - 1]
    if (son && son.tarih === s.tarih && son.kod === s.kod) {
      const ara = dk(s.baslangic) - dk(son.bitis)
      if (ara >= 0 && ara <= OTURUM_ARASI_DK) {
        son.saatler.push(s)
        son.bitis = s.bitis
        continue
      }
    }
    oturumlar.push({ tarih: s.tarih, kod: s.kod, baslangic: s.baslangic, bitis: s.bitis, saatler: [s] })
  }
  return oturumlar.sort((a, b) => a.tarih.localeCompare(b.tarih) || dk(a.baslangic) - dk(b.baslangic))
}

export function programAyristir(html: string): AyristirmaSonucu {
  const uyarilar: string[] = []
  const dersSaatleri: HamDersSaati[] = []
  const gorulen = new Set<string>()
  const gunler = new Set<string>()

  for (const satir of tabloSatirlari(html)) {
    if (satir.length === 0) continue
    const t = tarihAyristir(satir[0])
    if (!t) {
      // Başlık satırı ("Gün", "1. Saat"…) ya da tanınmayan satır
      if (satir[0] && !/^g[üu]n$/i.test(satir[0]) && satir.slice(1).some(Boolean)) {
        uyarilar.push(`Tarih okunamadı, satır atlandı: "${satir[0]}"`)
      }
      continue
    }
    gunler.add(t.tarih)
    if (t.gun) {
      const beklenen = GUN_KISALTMALARI[new Date(`${t.tarih}T12:00:00Z`).getUTCDay()]
      const yazilan = GUN_ESANLAMLI[t.gun] ?? t.gun
      if (yazilan !== beklenen) uyarilar.push(`${satir[0]}: gün adı tarihle uyuşmuyor (beklenen ${beklenen}).`)
    }
    for (const hucre of satir.slice(1)) {
      if (!hucre) continue
      const h = hucreAyristir(hucre)
      if (!h) {
        uyarilar.push(`${satir[0]}: okunamayan hücre atlandı: "${hucre.replace(/\n/g, ' ')}"`)
        continue
      }
      if (dk(h.bitis) <= dk(h.baslangic)) {
        uyarilar.push(`${satir[0]}: ${h.kod} için saat aralığı hatalı (${h.baslangic}-${h.bitis}).`)
        continue
      }
      const anahtar = `${h.kod}|${t.tarih}|${h.baslangic}`
      if (gorulen.has(anahtar)) continue
      gorulen.add(anahtar)
      dersSaatleri.push({ tarih: t.tarih, ...h })
    }
  }

  const tarihler = [...gunler].sort()
  return {
    dersSaatleri,
    oturumlar: oturumlaraAyir(dersSaatleri),
    gunSayisi: tarihler.length,
    ilkTarih: tarihler[0],
    sonTarih: tarihler[tarihler.length - 1],
    uyarilar,
  }
}

/** Kurum kodundan sınıf adı ve düzey tahmini: "478-H0811" → { ad: "8-H1", duzey: "8" } */
export function koddanTahmin(kod: string): { ad: string; duzey?: string } {
  const m = kod.match(/-([A-ZÇĞİÖŞÜ])(\d{2})(\d)(\d)$/u)
  if (!m) return { ad: kod }
  const duzey = String(Number(m[2]))
  const gecerli = Number(duzey) >= 1 && Number(duzey) <= 12
  return { ad: `${gecerli ? duzey : m[2]}-${m[1]}${m[3]}`, duzey: gecerli ? duzey : undefined }
}
