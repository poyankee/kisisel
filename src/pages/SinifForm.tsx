import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { db, ekle, guncelle, type HedefSinav } from '../db'
import { Alan, Sayfa } from '../components/ui'
import { DUZEYLER, duzeyAdi, HEDEF_SINAVLAR } from '../lib/sabitler'

export function SinifForm() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const kurumlar = useLiveQuery(() => db.kurumlar.orderBy('ad').toArray())
  const mevcut = useLiveQuery(() => (id ? db.siniflar.get(id) : undefined), [id])

  const [ad, setAd] = useState('')
  const [kurumId, setKurumId] = useState(params.get('kurum') ?? '')
  const [duzey, setDuzey] = useState('')
  const [hedef, setHedef] = useState<HedefSinav | ''>('')
  const [notlar, setNotlar] = useState('')

  useEffect(() => {
    if (mevcut) {
      setAd(mevcut.ad)
      setKurumId(mevcut.kurumId)
      setDuzey(mevcut.duzey ?? '')
      setHedef(mevcut.hedefSinav ?? '')
      setNotlar(mevcut.notlar ?? '')
    }
  }, [mevcut])

  // Tek kurum varsa onu seç
  useEffect(() => {
    if (!kurumId && kurumlar?.length === 1) setKurumId(kurumlar[0].id)
  }, [kurumlar, kurumId])

  async function kaydet(e: FormEvent) {
    e.preventDefault()
    if (!ad.trim() || !kurumId) return
    const veri = {
      ad: ad.trim(),
      kurumId,
      duzey: duzey || undefined,
      hedefSinav: hedef || undefined,
      notlar: notlar.trim() || undefined,
      aktif: mevcut?.aktif ?? true,
    }
    if (id) {
      await guncelle(db.siniflar, id, veri)
      navigate(-1)
    } else {
      const yeniId = await ekle(db.siniflar, veri)
      navigate(`/siniflar/${yeniId}`, { replace: true })
    }
  }

  if (kurumlar && kurumlar.length === 0) {
    return (
      <Sayfa baslik="Yeni sınıf" geri>
        <div className="kart space-y-3 p-4">
          <p>Sınıf eklemeden önce bir kurum eklemelisin.</p>
          <Link to="/ayarlar/kurum/yeni" className="btn-ana">Kurum ekle</Link>
        </div>
      </Sayfa>
    )
  }

  return (
    <Sayfa baslik={id ? 'Sınıfı düzenle' : 'Yeni sınıf'} geri>
      <form onSubmit={kaydet} className="space-y-4">
        <div className="kart space-y-4 p-4">
          <Alan etiket="Kısa ad *" ipucu='Kurum kodu yerine görünecek ad, ör. "8-H"'>
            <input className="girdi" value={ad} onChange={(e) => setAd(e.target.value)} required autoFocus={!id} />
          </Alan>
          <Alan etiket="Kurum *">
            <select className="girdi" value={kurumId} onChange={(e) => setKurumId(e.target.value)} required>
              <option value="">Seç</option>
              {kurumlar?.map((k) => <option key={k.id} value={k.id}>{k.ad}</option>)}
            </select>
          </Alan>
          <div className="grid grid-cols-2 gap-3">
            <Alan etiket="Düzey">
              <select className="girdi" value={duzey} onChange={(e) => setDuzey(e.target.value)}>
                <option value="">—</option>
                {DUZEYLER.map((d) => <option key={d} value={d}>{duzeyAdi(d)}</option>)}
              </select>
            </Alan>
            <Alan etiket="Hedef sınav">
              <select className="girdi" value={hedef} onChange={(e) => setHedef(e.target.value as HedefSinav | '')}>
                <option value="">—</option>
                {HEDEF_SINAVLAR.map((h) => <option key={h.deger} value={h.deger}>{h.ad}</option>)}
              </select>
            </Alan>
          </div>
          <Alan etiket="Notlar">
            <textarea className="girdi min-h-20" value={notlar} onChange={(e) => setNotlar(e.target.value)} />
          </Alan>
        </div>
        <button className="btn-ana w-full" type="submit">Kaydet</button>
      </form>
    </Sayfa>
  )
}
