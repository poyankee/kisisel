import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { db, ekle, guncelle } from '../db'
import { Alan, RenkSec, Sayfa } from '../components/ui'
import { RENKLER } from '../lib/sabitler'

export function KurumForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const mevcut = useLiveQuery(() => (id ? db.kurumlar.get(id) : undefined), [id])
  const siniflar = useLiveQuery(() => (id ? db.siniflar.where('kurumId').equals(id).sortBy('ad') : []), [id])
  const kodlar = useLiveQuery(() => (id ? db.kurumKodlari.where('kurumId').equals(id).sortBy('kod') : []), [id])

  const [ad, setAd] = useState('')
  const [renk, setRenk] = useState(RENKLER[6])
  const [notlar, setNotlar] = useState('')
  const [yeniKod, setYeniKod] = useState('')
  const [yeniKodSinif, setYeniKodSinif] = useState('')
  const [hata, setHata] = useState('')

  useEffect(() => {
    if (mevcut) {
      setAd(mevcut.ad)
      setRenk(mevcut.renk)
      setNotlar(mevcut.notlar ?? '')
    }
  }, [mevcut])

  async function kaydet(e: FormEvent) {
    e.preventDefault()
    if (!ad.trim()) return
    const veri = { ad: ad.trim(), renk, notlar: notlar.trim() || undefined, aktif: mevcut?.aktif ?? true }
    if (id) {
      await guncelle(db.kurumlar, id, veri)
      navigate(-1)
    } else {
      const yeniId = await ekle(db.kurumlar, veri)
      navigate(`/ayarlar/kurum/${yeniId}`, { replace: true })
    }
  }

  async function kodEkle() {
    setHata('')
    const kod = yeniKod.trim().toUpperCase()
    if (!id || !kod || !yeniKodSinif) return
    if (await db.kurumKodlari.where('[kurumId+kod]').equals([id, kod]).first()) {
      setHata('Bu kod zaten eşleştirilmiş.')
      return
    }
    await ekle(db.kurumKodlari, { kurumId: id, kod, sinifId: yeniKodSinif })
    setYeniKod('')
  }

  async function kodSil(kodId: string, kod: string) {
    if (confirm(`"${kod}" eşleşmesi kaldırılsın mı? Program yüklerken tekrar sorulur.`)) await db.kurumKodlari.delete(kodId)
  }

  const sinifAdi = (sid: string) => siniflar?.find((s) => s.id === sid)?.ad ?? '?'

  return (
    <Sayfa baslik={id ? 'Kurum' : 'Yeni kurum'} geri>
      <form onSubmit={kaydet} className="space-y-4">
        <div className="kart space-y-4 p-4">
          <Alan etiket="Kurum adı *">
            <input className="girdi" value={ad} onChange={(e) => setAd(e.target.value)} required autoFocus={!id} />
          </Alan>
          <div>
            <span className="etiket">Takvim rengi</span>
            <RenkSec deger={renk} onChange={setRenk} />
          </div>
          <Alan etiket="Notlar">
            <textarea className="girdi min-h-20" value={notlar} onChange={(e) => setNotlar(e.target.value)} />
          </Alan>
        </div>
        <button className="btn-ana w-full" type="submit">Kaydet</button>
      </form>

      {id && (
        <>
          <section>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-500 uppercase dark:text-slate-400">Sınıflar</h2>
              <Link to={`/siniflar/yeni?kurum=${id}`} className="text-sm font-medium text-indigo-600 dark:text-indigo-400">+ Sınıf ekle</Link>
            </div>
            <ul className="kart divide-y divide-slate-100 dark:divide-slate-800">
              {siniflar?.length === 0 && <li className="px-4 py-3 text-sm text-slate-500">Henüz sınıf yok.</li>}
              {siniflar?.map((s) => (
                <li key={s.id}>
                  <Link to={`/siniflar/${s.id}`} className="block px-4 py-3 font-medium">{s.ad}{!s.aktif && ' (arşiv)'}</Link>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-sm font-semibold text-slate-500 uppercase dark:text-slate-400">Kurum kodu eşleşmeleri</h2>
            <div className="kart divide-y divide-slate-100 dark:divide-slate-800">
              {kodlar?.map((k) => (
                <div key={k.id} className="flex items-center gap-3 px-4 py-2 text-sm">
                  <code className="flex-1">{k.kod}</code>
                  <span>→ {sinifAdi(k.sinifId)}</span>
                  <button className="min-h-11 px-2 text-red-600" onClick={() => kodSil(k.id, k.kod)}>Kaldır</button>
                </div>
              ))}
              {siniflar && siniflar.length > 0 ? (
                <div className="space-y-2 p-4">
                  <p className="text-xs text-slate-500">Program yüklerken yeni kodlar ayrıca sorulur; istersen şimdiden ekleyebilirsin.</p>
                  <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
                    <input className="girdi" placeholder="478-H0811" value={yeniKod} onChange={(e) => setYeniKod(e.target.value)} />
                    <select className="girdi" value={yeniKodSinif} onChange={(e) => setYeniKodSinif(e.target.value)}>
                      <option value="">Sınıf</option>
                      {siniflar.map((s) => <option key={s.id} value={s.id}>{s.ad}</option>)}
                    </select>
                    <button type="button" className="btn-ikincil" onClick={kodEkle}>Ekle</button>
                  </div>
                  {hata && <p className="text-sm text-red-600">{hata}</p>}
                </div>
              ) : (
                <p className="px-4 py-3 text-sm text-slate-500">Kod eşleştirmek için önce sınıf ekle.</p>
              )}
            </div>
          </section>
        </>
      )}
    </Sayfa>
  )
}
