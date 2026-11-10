import 'fake-indexeddb/auto'
import { readFileSync } from 'node:fs'
import { beforeEach, describe, expect, it } from 'vitest'
import { db, ekle } from '../db'
import { geriAl, planla, uygula, varsayilanSecim } from './iceAktarma'
import { programAyristir } from './programAyristir'

const html = readFileSync(new URL('../../ornekler/kurum_programi_ornek.xls', import.meta.url), 'utf8')
const BUGUN = '2026-11-10'
// 18 Kasım satırındaki K0811 bloğunu boşaltmak için
const K0811_18_KASIM = /(18 Kasım[\s\S]*?)478-K0811<br>11:50-12:30<\/td><td>478-K0811<br>12:40-13:20/

async function kur() {
  await db.delete()
  await db.open()
  const kurumId = await ekle(db.kurumlar, { ad: 'Kurum', renk: '#000', aktif: true })
  const eslesme = new Map<string, string>()
  for (const kod of ['478-H0811', '478-H0821', '478-K0811', '478-K0821', '478-L0711']) {
    const sinifId = await ekle(db.siniflar, { kurumId, ad: kod, aktif: true })
    await ekle(db.kurumKodlari, { kurumId, kod, sinifId })
    eslesme.set(kod, sinifId)
  }
  return { kurumId, eslesme }
}

async function yukle(kurumId: string, eslesme: Map<string, string>, icerik: string, gecmisiEkle = false) {
  const plan = await planla(kurumId, programAyristir(icerik), eslesme, BUGUN, gecmisiEkle)
  const kayit = await uygula(plan, varsayilanSecim(plan), 'test.xls')
  return { plan, kayit }
}

describe('kurum programı içe aktarma', () => {
  let k: Awaited<ReturnType<typeof kur>>
  beforeEach(async () => {
    k = await kur()
  })

  it('varsayılan olarak bugünden itibaren ekler (37 ders saati), geçmişi atlar', async () => {
    const { plan, kayit } = await yukle(k.kurumId, k.eslesme, html)
    expect(kayit.eklenenDersSaati).toBe(37)
    expect(plan.atlananGecmis.reduce((t, o) => t + o.saatler.length, 0)).toBe(40)
    expect(await db.dersSaatleri.count()).toBe(37)
  })

  it('"geçmişi de ekle" ile 77 ders saati ve 44 oturum', async () => {
    const { kayit } = await yukle(k.kurumId, k.eslesme, html, true)
    expect(kayit.eklenenDersSaati).toBe(77)
    expect(kayit.eklenenOturum).toBe(44)
  })

  it('aynı dosya tekrar yüklenince mükerrer oluşmaz', async () => {
    await yukle(k.kurumId, k.eslesme, html, true)
    const { plan, kayit } = await yukle(k.kurumId, k.eslesme, html, true)
    expect(kayit.eklenenDersSaati).toBe(0)
    expect(plan.degismeyen).toBe(44)
    expect(await db.dersSaatleri.count()).toBe(77)
  })

  it('saati değişen dersi ve programdan çıkan dersi önerir, onaylananı iptal eder', async () => {
    await yukle(k.kurumId, k.eslesme, html)
    // 19 Kasım H0811 bloğu 10:10 → 15:00'e kaydı, 18 Kasım K0811 bloğu kaldırıldı
    const yeni = html
      .replace('478-H0811<br>10:10-10:50</td><td>478-H0811<br>11:00-11:40', '478-H0811<br>15:00-15:40</td><td>478-H0811<br>15:50-16:30')
      .replace(K0811_18_KASIM, '$1</td><td>')
    expect(yeni).not.toBe(html)
    const { plan, kayit } = await yukle(k.kurumId, k.eslesme, yeni)
    expect(plan.degisenler).toHaveLength(1)
    expect(plan.degisenler[0].yeniler[0].baslangic).toBe('15:00')
    expect(plan.cikanlar).toHaveLength(1)
    expect(plan.cikanlar[0].etkinlik.baslangic).toBe('2026-11-18T11:50')
    expect(kayit.iptalEdilen).toBe(2)
    expect(await db.etkinlikler.filter((e) => e.durum === 'IPTAL').count()).toBe(2)
    // Geri al: her şey eski haline döner
    await geriAl(kayit.id)
    expect(await db.etkinlikler.filter((e) => e.durum === 'IPTAL').count()).toBe(0)
    expect(await db.dersSaatleri.count()).toBe(37)
  })

  it('üzerinde ders kaydı olan dersin iptali varsayılan olarak seçilmez', async () => {
    await yukle(k.kurumId, k.eslesme, html)
    const etk = (await db.etkinlikler.where('baslangic').equals('2026-11-18T11:50').first())!
    await ekle(db.dersler, { etkinlikId: etk.id, hedefTip: 'SINIF', hedefId: etk.hedefId!, tarih: '2026-11-18', durum: 'YAPILDI' })
    const yeni = html.replace(K0811_18_KASIM, '$1</td><td>')
    const plan = await planla(k.kurumId, programAyristir(yeni), k.eslesme, BUGUN, false)
    expect(plan.cikanlar[0].notVar).toBe(true)
    expect(varsayilanSecim(plan).size).toBe(0)
  })

  it('eşleşmemiş kodları bildirir', async () => {
    const plan = await planla(k.kurumId, programAyristir(html), new Map(), BUGUN, false)
    expect(plan.eksikKodlar).toHaveLength(5)
  })
})
