/**
 * Kurum programını takvime aktarma (plan.md 5.2 ve 5.3).
 *
 * İki adım: `planla` hiçbir şeyi değiştirmeden önizleme üretir; `uygula` kullanıcının
 * onayladığı değişiklikleri yazar. Hiçbir ders sormadan silinmez: programdan çıkan ya da
 * saati değişen dersler "iptal" önerisi olarak gelir, üzerinde not/kayıt olanlar işaretlenir
 * ve varsayılan olarak seçili gelmez. Silinmek yerine IPTAL durumuna alınır.
 */
import { db, ekle, yeniId, type DersSaati, type Etkinlik, type IceAktarma } from '../db'
import { dk, type AyristirmaSonucu, type Oturum } from './programAyristir'

export interface EskiOturum {
  etkinlik: Etkinlik
  saatler: DersSaati[]
  notVar: boolean
}

export interface YeniOturum extends Oturum {
  sinifId: string
  cakismalar: Etkinlik[]
}

/** Aynı gün ve aynı sınıf kodunda değişiklik: eski oturumlar iptal, yeniler eklenir */
export interface Degisiklik {
  anahtar: string // tarih|kod
  tarih: string
  kod: string
  eskiler: EskiOturum[]
  yeniler: YeniOturum[]
}

export interface IceAktarmaPlani {
  kurumId: string
  yeniler: YeniOturum[]
  degisenler: Degisiklik[]
  cikanlar: (EskiOturum & { anahtar: string })[]
  atlananGecmis: Oturum[]
  degismeyen: number
  eksikKodlar: string[]
}

export const anahtarYap = (kurumId: string, kod: string, tarih: string, baslangic: string) =>
  `${kurumId}|${kod}|${tarih}|${baslangic}`

const cakisiyor = (a1: string, a2: string, b1: string, b2: string) => dk(a1) < dk(b2) && dk(b1) < dk(a2)

export async function planla(
  kurumId: string,
  sonuc: AyristirmaSonucu,
  kodEslesme: Map<string, string>, // kod → sinifId
  bugun: string,
  gecmisiEkle: boolean,
): Promise<IceAktarmaPlani> {
  const eksikKodlar = [...new Set(sonuc.oturumlar.map((o) => o.kod))].filter((k) => !kodEslesme.has(k))
  const plan: IceAktarmaPlani = {
    kurumId, yeniler: [], degisenler: [], cikanlar: [], atlananGecmis: [], degismeyen: 0, eksikKodlar,
  }
  if (!sonuc.ilkTarih || !sonuc.sonTarih) return plan

  // Dosyanın kapsadığı tarih aralığındaki mevcut ders saatleri
  const mevcutSaatler = await db.dersSaatleri
    .where('[kurumId+tarih]')
    .between([kurumId, sonuc.ilkTarih], [kurumId, sonuc.sonTarih], true, true)
    .toArray()
  const anahtarla = new Map(mevcutSaatler.map((d) => [d.anahtar, d]))
  const etkinlikSaatleri = new Map<string, DersSaati[]>()
  for (const d of mevcutSaatler) {
    const l = etkinlikSaatleri.get(d.etkinlikId) ?? []
    l.push(d)
    etkinlikSaatleri.set(d.etkinlikId, l)
  }

  const eslesenEtkinlikler = new Set<string>()
  const adayYeni = new Map<string, Oturum[]>() // tarih|kod → oturumlar

  for (const o of sonuc.oturumlar) {
    const bulunan = o.saatler.map((s) => anahtarla.get(anahtarYap(kurumId, s.kod, s.tarih, s.baslangic)))
    const etkIds = new Set(bulunan.filter(Boolean).map((d) => d!.etkinlikId))
    const tamEslesme =
      bulunan.every(Boolean) && etkIds.size === 1 && etkinlikSaatleri.get([...etkIds][0])!.length === o.saatler.length

    if (tamEslesme) {
      plan.degismeyen++
      eslesenEtkinlikler.add([...etkIds][0])
      continue
    }
    const gecmis = o.tarih < bugun
    if (gecmis) {
      // Geçmişte zaten olan kayıtlara dokunulmaz; tamamen eksikse isteğe bağlı eklenir
      if (etkIds.size > 0) {
        plan.degismeyen++
        etkIds.forEach((id) => eslesenEtkinlikler.add(id))
      } else if (gecmisiEkle) {
        const k = `${o.tarih}|${o.kod}`
        adayYeni.set(k, [...(adayYeni.get(k) ?? []), o])
      } else {
        plan.atlananGecmis.push(o)
      }
      continue
    }
    const k = `${o.tarih}|${o.kod}`
    adayYeni.set(k, [...(adayYeni.get(k) ?? []), o])
  }

  // Gelecekte olup dosyayla birebir eşleşmeyen mevcut oturumlar
  const adayEski = new Map<string, EskiOturum[]>()
  for (const [etkId, saatler] of etkinlikSaatleri) {
    if (eslesenEtkinlikler.has(etkId)) continue
    const tarih = saatler[0].tarih
    if (tarih < bugun) continue
    const etkinlik = await db.etkinlikler.get(etkId)
    if (!etkinlik) continue
    const dersSayisi = await db.dersler.where('etkinlikId').equals(etkId).count()
    const k = `${tarih}|${saatler[0].kod}`
    adayEski.set(k, [
      ...(adayEski.get(k) ?? []),
      { etkinlik, saatler: saatler.sort((a, b) => dk(a.baslangic) - dk(b.baslangic)), notVar: !!etkinlik.notlar || dersSayisi > 0 },
    ])
  }

  // Çakışma kontrolü için özel ders ve kişisel etkinlikler
  const tarihAraligi = await db.etkinlikler
    .where('baslangic')
    .between(`${sonuc.ilkTarih}T00:00`, `${sonuc.sonTarih}T23:59`, true, true)
    .filter((e) => e.durum === 'PLANLI' && (e.tur === 'OZEL_DERS' || e.tur === 'KISISEL'))
    .toArray()
  const yeniOturum = (o: Oturum): YeniOturum => ({
    ...o,
    sinifId: kodEslesme.get(o.kod) ?? '',
    cakismalar: tarihAraligi.filter(
      (e) => e.baslangic.slice(0, 10) === o.tarih && cakisiyor(o.baslangic, o.bitis, e.baslangic.slice(11, 16), e.bitis.slice(11, 16)),
    ),
  })

  for (const k of new Set([...adayYeni.keys(), ...adayEski.keys()])) {
    const yeniler = (adayYeni.get(k) ?? []).map(yeniOturum)
    const eskiler = adayEski.get(k) ?? []
    const [tarih, kod] = k.split('|')
    if (eskiler.length === 0) plan.yeniler.push(...yeniler)
    else if (yeniler.length === 0) plan.cikanlar.push(...eskiler.map((e) => ({ ...e, anahtar: e.etkinlik.id })))
    else plan.degisenler.push({ anahtar: k, tarih, kod, eskiler, yeniler })
  }

  const sirala = <T extends { tarih: string; baslangic: string }>(l: T[]) =>
    l.sort((a, b) => a.tarih.localeCompare(b.tarih) || dk(a.baslangic) - dk(b.baslangic))
  sirala(plan.yeniler)
  plan.degisenler.sort((a, b) => a.anahtar.localeCompare(b.anahtar))
  plan.cikanlar.sort((a, b) => a.etkinlik.baslangic.localeCompare(b.etkinlik.baslangic))
  return plan
}

/** Önizlemede varsayılan seçim: üzerinde not/kayıt olanlar seçili gelmez */
export function varsayilanSecim(plan: IceAktarmaPlani): Set<string> {
  const s = new Set<string>()
  for (const d of plan.degisenler) if (!d.eskiler.some((e) => e.notVar)) s.add(d.anahtar)
  for (const c of plan.cikanlar) if (!c.notVar) s.add(c.anahtar)
  return s
}

export async function uygula(
  plan: IceAktarmaPlani,
  secili: Set<string>, // onaylanan değişiklik/çıkan anahtarları
  dosyaAdi: string,
  hamDosya?: string,
): Promise<IceAktarma> {
  const siniflar = new Map((await db.siniflar.where('kurumId').equals(plan.kurumId).toArray()).map((s) => [s.id, s]))
  const simdi = new Date().toISOString()
  const iceAktarmaId = yeniId()
  const kayit: IceAktarma = {
    id: iceAktarmaId, olusturma: simdi, guncelleme: simdi,
    kurumId: plan.kurumId, dosyaAdi, zaman: simdi,
    eklenenOturum: 0, eklenenDersSaati: 0, iptalEdilen: 0, atlanan: plan.atlananGecmis.length,
    geriAlindi: false, olusturulanEtkinlikler: [], iptalEdilenEtkinlikler: [], silinenDersSaatleri: [], hamDosya,
  }

  const ekleOturum = async (o: YeniOturum) => {
    const etkId = await ekle(db.etkinlikler, {
      tur: 'KURUM_DERSI',
      baslik: siniflar.get(o.sinifId)?.ad ?? o.kod,
      baslangic: `${o.tarih}T${o.baslangic}`,
      bitis: `${o.tarih}T${o.bitis}`,
      tumGun: false,
      hedefTip: 'SINIF',
      hedefId: o.sinifId,
      kaynak: 'ICE_AKTARMA',
      iceAktarmaId,
      dersSaatiSayisi: o.saatler.length,
      durum: 'PLANLI',
    })
    for (const s of o.saatler) {
      await ekle(db.dersSaatleri, {
        etkinlikId: etkId, kurumId: plan.kurumId, kod: s.kod, tarih: s.tarih,
        baslangic: s.baslangic, bitis: s.bitis, anahtar: anahtarYap(plan.kurumId, s.kod, s.tarih, s.baslangic), iceAktarmaId,
      })
    }
    kayit.olusturulanEtkinlikler.push(etkId)
    kayit.eklenenOturum++
    kayit.eklenenDersSaati += o.saatler.length
  }

  const iptalEt = async (e: EskiOturum) => {
    await db.etkinlikler.update(e.etkinlik.id, { durum: 'IPTAL', guncelleme: simdi })
    await db.dersSaatleri.bulkDelete(e.saatler.map((s) => s.id))
    kayit.silinenDersSaatleri.push(...e.saatler)
    kayit.iptalEdilenEtkinlikler.push(e.etkinlik.id)
    kayit.iptalEdilen++
  }

  await db.transaction('rw', [db.etkinlikler, db.dersSaatleri, db.iceAktarmalar, db.siniflar], async () => {
    for (const o of plan.yeniler) await ekleOturum(o)
    for (const d of plan.degisenler) {
      if (!secili.has(d.anahtar)) continue // eski hali korunur
      for (const e of d.eskiler) await iptalEt(e)
      for (const o of d.yeniler) await ekleOturum(o)
    }
    for (const c of plan.cikanlar) if (secili.has(c.anahtar)) await iptalEt(c)
    await db.iceAktarmalar.add(kayit)
  })
  return kayit
}

/** Bir yüklemeyi geri alır: eklenenler kaldırılır, iptal edilenler geri gelir. Ders kayıtları silinmez. */
export async function geriAl(iceAktarmaId: string): Promise<void> {
  await db.transaction('rw', [db.etkinlikler, db.dersSaatleri, db.iceAktarmalar], async () => {
    const k = await db.iceAktarmalar.get(iceAktarmaId)
    if (!k || k.geriAlindi) return
    await db.dersSaatleri.where('iceAktarmaId').equals(iceAktarmaId).delete()
    await db.etkinlikler.bulkDelete(k.olusturulanEtkinlikler)
    const simdi = new Date().toISOString()
    for (const id of k.iptalEdilenEtkinlikler) await db.etkinlikler.update(id, { durum: 'PLANLI', guncelleme: simdi })
    await db.dersSaatleri.bulkPut(k.silinenDersSaatleri)
    await db.iceAktarmalar.update(iceAktarmaId, { geriAlindi: true, guncelleme: simdi })
  })
}

/** Geri alma öncesi uyarı için: yüklemeyle eklenen derslerden kaçında ders kaydı var */
export async function geriAlmaKayitSayisi(iceAktarmaId: string): Promise<number> {
  const k = await db.iceAktarmalar.get(iceAktarmaId)
  if (!k) return 0
  return db.dersler.where('etkinlikId').anyOf(k.olusturulanEtkinlikler).count()
}
