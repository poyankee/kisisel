import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { db, ekle, guncelle, type Alan as AlanTip, type HedefSinav, type Ogrenci, type UcretModeli } from '../db'
import { Alan, RenkSec, Sayfa } from '../components/ui'
import { ALANLAR, DUZEYLER, duzeyAdi, HEDEF_SINAVLAR, RENKLER, UCRET_MODELLERI } from '../lib/sabitler'

type Form = {
  ad: string
  soyad: string
  duzey: string
  hedefSinav: HedefSinav | ''
  alan: AlanTip | ''
  veliAd: string
  veliTel: string
  ogrenciTel: string
  ucretModeli: UcretModeli | ''
  ucret: string
  renk: string
  notlar: string
}

const BOS: Form = {
  ad: '', soyad: '', duzey: '', hedefSinav: '', alan: '', veliAd: '', veliTel: '', ogrenciTel: '',
  ucretModeli: '', ucret: '', renk: RENKLER[0], notlar: '',
}

export function OgrenciForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const mevcut = useLiveQuery(() => (id ? db.ogrenciler.get(id) : undefined), [id])
  const [f, setF] = useState<Form>(BOS)
  const [ekstra, setEkstra] = useState(false)

  useEffect(() => {
    if (mevcut) {
      setF({
        ad: mevcut.ad, soyad: mevcut.soyad ?? '', duzey: mevcut.duzey ?? '', hedefSinav: mevcut.hedefSinav ?? '',
        alan: mevcut.alan ?? '', veliAd: mevcut.veliAd ?? '', veliTel: mevcut.veliTel ?? '',
        ogrenciTel: mevcut.ogrenciTel ?? '', ucretModeli: mevcut.ucretModeli ?? '',
        ucret: mevcut.ucret != null ? String(mevcut.ucret) : '', renk: mevcut.renk, notlar: mevcut.notlar ?? '',
      })
    }
  }, [mevcut])

  // Yeni öğrencide akıllı varsayılan: son eklenen öğrencinin ücret modeli ve ücreti
  useEffect(() => {
    if (id) return
    db.ogrenciler.orderBy('ad').toArray().then((liste) => {
      const son = liste.sort((a, b) => b.olusturma.localeCompare(a.olusturma))[0]
      if (son) setF((x) => ({ ...x, ucretModeli: son.ucretModeli ?? '', ucret: son.ucret != null ? String(son.ucret) : '' }))
    })
  }, [id])

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((x) => ({ ...x, [k]: v }))

  async function kaydet(e: FormEvent) {
    e.preventDefault()
    if (!f.ad.trim()) return
    const ucret = f.ucret ? Number(f.ucret.replace(',', '.')) : undefined
    const veri: Omit<Ogrenci, 'id' | 'olusturma' | 'guncelleme'> = {
      ad: f.ad.trim(),
      soyad: f.soyad.trim() || undefined,
      duzey: f.duzey || undefined,
      hedefSinav: f.hedefSinav || undefined,
      alan: f.alan || undefined,
      veliAd: f.veliAd.trim() || undefined,
      veliTel: f.veliTel.trim() || undefined,
      ogrenciTel: f.ogrenciTel.trim() || undefined,
      ucretModeli: f.ucretModeli || undefined,
      ucret: ucret != null && !Number.isNaN(ucret) ? ucret : undefined,
      renk: f.renk,
      notlar: f.notlar.trim() || undefined,
      aktif: mevcut?.aktif ?? true,
    }
    if (id) {
      await guncelle(db.ogrenciler, id, veri)
      navigate(-1)
    } else {
      const yeniId = await ekle(db.ogrenciler, veri)
      navigate(`/ogrenciler/${yeniId}`, { replace: true })
    }
  }

  return (
    <Sayfa baslik={id ? 'Öğrenciyi düzenle' : 'Yeni öğrenci'} geri>
      <form onSubmit={kaydet} className="space-y-4">
        <div className="kart space-y-4 p-4">
          <div className="grid grid-cols-2 gap-3">
            <Alan etiket="Ad *">
              <input className="girdi" value={f.ad} onChange={(e) => set('ad', e.target.value)} required autoFocus={!id} />
            </Alan>
            <Alan etiket="Soyad">
              <input className="girdi" value={f.soyad} onChange={(e) => set('soyad', e.target.value)} />
            </Alan>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Alan etiket="Düzey">
              <select className="girdi" value={f.duzey} onChange={(e) => set('duzey', e.target.value)}>
                <option value="">—</option>
                {DUZEYLER.map((d) => <option key={d} value={d}>{duzeyAdi(d)}</option>)}
              </select>
            </Alan>
            <Alan etiket="Hedef sınav">
              <select className="girdi" value={f.hedefSinav} onChange={(e) => set('hedefSinav', e.target.value as HedefSinav | '')}>
                <option value="">—</option>
                {HEDEF_SINAVLAR.map((h) => <option key={h.deger} value={h.deger}>{h.ad}</option>)}
              </select>
            </Alan>
          </div>
          {(f.hedefSinav === 'AYT' || f.hedefSinav === 'TYT') && (
            <Alan etiket="Alan">
              <select className="girdi" value={f.alan} onChange={(e) => set('alan', e.target.value as AlanTip | '')}>
                <option value="">—</option>
                {ALANLAR.map((a) => <option key={a.deger} value={a.deger}>{a.ad}</option>)}
              </select>
            </Alan>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Alan etiket="Ücret modeli">
              <select className="girdi" value={f.ucretModeli} onChange={(e) => set('ucretModeli', e.target.value as UcretModeli | '')}>
                <option value="">—</option>
                {UCRET_MODELLERI.map((u) => <option key={u.deger} value={u.deger}>{u.ad}</option>)}
              </select>
            </Alan>
            <Alan etiket="Ücret (₺)">
              <input className="girdi" inputMode="decimal" value={f.ucret} onChange={(e) => set('ucret', e.target.value)} />
            </Alan>
          </div>
        </div>

        {!ekstra && !id ? (
          <button type="button" className="btn w-full text-indigo-600 dark:text-indigo-400" onClick={() => setEkstra(true)}>
            + Veli, telefon, renk ve not
          </button>
        ) : (
          <div className="kart space-y-4 p-4">
            <div className="grid grid-cols-2 gap-3">
              <Alan etiket="Veli adı">
                <input className="girdi" value={f.veliAd} onChange={(e) => set('veliAd', e.target.value)} />
              </Alan>
              <Alan etiket="Veli telefonu">
                <input className="girdi" type="tel" value={f.veliTel} onChange={(e) => set('veliTel', e.target.value)} />
              </Alan>
            </div>
            <Alan etiket="Öğrenci telefonu">
              <input className="girdi" type="tel" value={f.ogrenciTel} onChange={(e) => set('ogrenciTel', e.target.value)} />
            </Alan>
            <div>
              <span className="etiket">Renk</span>
              <RenkSec deger={f.renk} onChange={(r) => set('renk', r)} />
            </div>
            <Alan etiket="Notlar">
              <textarea className="girdi min-h-24" value={f.notlar} onChange={(e) => set('notlar', e.target.value)} />
            </Alan>
          </div>
        )}

        <button className="btn-ana w-full" type="submit">Kaydet</button>
      </form>
    </Sayfa>
  )
}
