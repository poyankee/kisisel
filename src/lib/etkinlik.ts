import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Etkinlik } from '../db'
import { tamAd } from './format'

export interface GorunenEtkinlik extends Etkinlik {
  gorunenRenk: string
  altBaslik?: string // kurum adı vb.
  hedefYolu?: string // detay sayfası
}

const VARSAYILAN_RENK: Record<Etkinlik['tur'], string> = {
  OZEL_DERS: '#4f46e5',
  KURUM_DERSI: '#475569',
  KISISEL: '#0891b2',
  ODEME: '#dc2626',
}

/** [baslangic, bitis] tarih aralığındaki etkinlikleri renk ve adlarıyla getirir. */
export function useEtkinlikler(ilkTarih: string, sonTarih: string): GorunenEtkinlik[] | undefined {
  return useLiveQuery(async () => {
    const liste = await db.etkinlikler
      .where('baslangic')
      .between(`${ilkTarih}T00:00`, `${sonTarih}T23:59`, true, true)
      .toArray()
    const [siniflar, kurumlar, ogrenciler] = await Promise.all([
      db.siniflar.toArray(),
      db.kurumlar.toArray(),
      db.ogrenciler.toArray(),
    ])
    const sinifMap = new Map(siniflar.map((s) => [s.id, s]))
    const kurumMap = new Map(kurumlar.map((k) => [k.id, k]))
    const ogrMap = new Map(ogrenciler.map((o) => [o.id, o]))
    return liste
      .map((e): GorunenEtkinlik => {
        if (e.hedefTip === 'SINIF' && e.hedefId) {
          const s = sinifMap.get(e.hedefId)
          const k = s ? kurumMap.get(s.kurumId) : undefined
          return {
            ...e,
            baslik: s?.ad ?? e.baslik,
            gorunenRenk: e.renk ?? k?.renk ?? VARSAYILAN_RENK[e.tur],
            altBaslik: k?.ad,
            hedefYolu: s ? `/siniflar/${s.id}` : undefined,
          }
        }
        if (e.hedefTip === 'OGRENCI' && e.hedefId) {
          const o = ogrMap.get(e.hedefId)
          return {
            ...e,
            baslik: o ? tamAd(o) : e.baslik,
            gorunenRenk: e.renk ?? o?.renk ?? VARSAYILAN_RENK[e.tur],
            altBaslik: 'Özel ders',
            hedefYolu: o ? `/ogrenciler/${o.id}` : undefined,
          }
        }
        return { ...e, gorunenRenk: e.renk ?? VARSAYILAN_RENK[e.tur] }
      })
      .sort((a, b) => a.baslangic.localeCompare(b.baslangic))
  }, [ilkTarih, sonTarih])
}
