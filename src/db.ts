import Dexie, { type EntityTable } from 'dexie'

/*
 * Yerel veritabanı (IndexedDB / Dexie).
 * Veri modeli plan.md bölüm 10'u izler. Şimdilik veriler cihazda tutulur;
 * Supabase senkronu sonraki adımda bu katmanın arkasına eklenecek.
 * Kimlikler (id) metin UUID'dir, böylece ileride sunucuyla çakışmadan senkronlanır.
 */

export type HedefSinav = 'LGS' | 'TYT' | 'AYT' | 'ARA'
export type Alan = 'SAY' | 'EA' | 'SOZ' | 'DIL' | '-'
export type UcretModeli = 'DERS_BASI' | 'PAKET' | 'AYLIK'

interface Kayit {
  id: string
  olusturma: string // ISO zaman
  guncelleme: string
}

export interface Kurum extends Kayit {
  ad: string
  renk: string
  notlar?: string
  aktif: boolean
}

export interface KurumKodu extends Kayit {
  kurumId: string
  kod: string // ör. "478-H0811"
  sinifId: string
}

export interface Ogrenci extends Kayit {
  ad: string
  soyad?: string
  duzey?: string // "5"…"12" | "mezun"
  hedefSinav?: HedefSinav
  alan?: Alan
  veliAd?: string
  veliTel?: string
  ogrenciTel?: string
  ucretModeli?: UcretModeli
  ucret?: number
  renk: string
  aktif: boolean
  notlar?: string
}

export interface Sinif extends Kayit {
  kurumId: string
  ad: string // kendi verdiğim kısa ad
  duzey?: string
  hedefSinav?: HedefSinav
  aktif: boolean
  notlar?: string
}

export type EtkinlikTur = 'OZEL_DERS' | 'KURUM_DERSI' | 'KISISEL' | 'ODEME'

export interface Etkinlik extends Kayit {
  tur: EtkinlikTur
  baslik: string
  baslangic: string // ISO yerel "2026-11-10T09:20"
  bitis: string
  tumGun: boolean
  renk?: string
  tekrarKurali?: string // RRULE
  tekrarBitis?: string
  hedefTip?: 'OGRENCI' | 'SINIF'
  hedefId?: string
  kaynak: 'MANUEL' | 'ICE_AKTARMA'
  iceAktarmaId?: string
  dersSaatiSayisi: number
  durum: 'PLANLI' | 'IPTAL'
  notlar?: string
}

export interface DersKaydi extends Kayit {
  etkinlikId?: string
  hedefTip: 'OGRENCI' | 'SINIF'
  hedefId: string
  tarih: string // "2026-11-10"
  durum: 'YAPILDI' | 'IPTAL_UCRETLI' | 'IPTAL_UCRETSIZ' | 'ERTELENDI' | 'TELAFI'
  islenenNot?: string
  sonrakiDersNotu?: string
}

export interface Odev extends Kayit {
  dersId?: string
  hedefTip: 'OGRENCI' | 'SINIF'
  hedefId: string
  aciklama: string
  teslimTarihi?: string
  durum: 'VERILDI' | 'YAPILDI' | 'EKSIK' | 'YAPILMADI'
  kontrolNotu?: string
}

class DersTakipDB extends Dexie {
  kurumlar!: EntityTable<Kurum, 'id'>
  kurumKodlari!: EntityTable<KurumKodu, 'id'>
  ogrenciler!: EntityTable<Ogrenci, 'id'>
  siniflar!: EntityTable<Sinif, 'id'>
  etkinlikler!: EntityTable<Etkinlik, 'id'>
  dersler!: EntityTable<DersKaydi, 'id'>
  odevler!: EntityTable<Odev, 'id'>

  constructor() {
    super('ders-takip')
    this.version(1).stores({
      kurumlar: 'id, ad',
      kurumKodlari: 'id, kurumId, sinifId, &[kurumId+kod]',
      ogrenciler: 'id, ad, aktif',
      siniflar: 'id, kurumId, ad',
      etkinlikler: 'id, tur, baslangic, [hedefTip+hedefId], iceAktarmaId',
      dersler: 'id, etkinlikId, tarih, [hedefTip+hedefId]',
      odevler: 'id, dersId, durum, [hedefTip+hedefId]',
    })
  }
}

export const db = new DersTakipDB()

export const TABLOLAR = [
  'kurumlar',
  'kurumKodlari',
  'ogrenciler',
  'siniflar',
  'etkinlikler',
  'dersler',
  'odevler',
] as const

function yeniId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  // Eski tarayıcılar ve http (güvensiz bağlam) için yedek
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}

type YeniKayit<T extends Kayit> = Omit<T, 'id' | 'olusturma' | 'guncelleme'>

/** Yeni kayıt ekler, id ve zaman damgalarını doldurur. */
export async function ekle<T extends Kayit>(
  tablo: EntityTable<T, 'id'>,
  veri: YeniKayit<T>,
): Promise<string> {
  const simdi = new Date().toISOString()
  const id = yeniId()
  await tablo.add({ ...veri, id, olusturma: simdi, guncelleme: simdi } as T)
  return id
}

/** Var olan kaydı günceller. */
export async function guncelle<T extends Kayit>(
  tablo: EntityTable<T, 'id'>,
  id: string,
  degisiklik: Partial<YeniKayit<T>>,
): Promise<void> {
  // Dexie'nin UpdateSpec tipi genel tiplerle iyi çalışmadığı için daraltıyoruz.
  await (tablo as unknown as EntityTable<Kayit, 'id'>).update(id, {
    ...degisiklik,
    guncelleme: new Date().toISOString(),
  })
}

/** Tarayıcıdan verilerin kalıcı saklanmasını ister (iOS/Android temizlemesin diye). */
export async function kaliciDepolamaIste(): Promise<boolean> {
  try {
    if (navigator.storage?.persist) {
      if (await navigator.storage.persisted()) return true
      return await navigator.storage.persist()
    }
  } catch {
    /* desteklenmiyor */
  }
  return false
}

/** Tüm veriyi JSON yedeği olarak döndürür. */
export async function yedekAl(): Promise<string> {
  const veri: Record<string, unknown[]> = {}
  for (const t of TABLOLAR) veri[t] = await db.table(t).toArray()
  return JSON.stringify({ uygulama: 'ders-takip', surum: 1, zaman: new Date().toISOString(), veri }, null, 2)
}

/** JSON yedeğini geri yükler. Mevcut veriler yedekteki ile DEĞİŞTİRİLİR. */
export async function yedekYukle(json: string): Promise<void> {
  const yedek = JSON.parse(json) as { uygulama?: string; veri?: Record<string, unknown[]> }
  if (yedek.uygulama !== 'ders-takip' || !yedek.veri) throw new Error('Bu dosya bir Ders Takip yedeği değil.')
  await db.transaction('rw', TABLOLAR.map((t) => db.table(t)), async () => {
    for (const t of TABLOLAR) {
      await db.table(t).clear()
      const satirlar = yedek.veri![t]
      if (Array.isArray(satirlar)) await db.table(t).bulkAdd(satirlar)
    }
  })
}
