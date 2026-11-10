import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { db, kaliciDepolamaIste, yedekAl, yedekYukle } from '../db'
import { Ikon } from '../components/Ikon'
import { Nokta, Sayfa } from '../components/ui'
import { bugunISO } from '../lib/format'
import { dosyaPaylas, yerelUygulama } from '../lib/native'

export function Ayarlar() {
  const kurumlar = useLiveQuery(() => db.kurumlar.orderBy('ad').toArray())
  const [kalici, setKalici] = useState<boolean | null>(null)
  const [mesaj, setMesaj] = useState('')
  const dosyaRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    navigator.storage?.persisted?.().then(setKalici).catch(() => setKalici(null))
  }, [])

  async function disaAktar() {
    try {
      await dosyaPaylas(`ders-takip-yedek-${bugunISO()}.json`, await yedekAl())
      setMesaj(yerelUygulama() ? '' : 'Yedek indirildi.')
    } catch (e) {
      // Paylaşım penceresi kapatılınca da hata gelir; sessiz geç
      if (!/cancel/i.test(String(e))) setMesaj(`Yedek alınamadı: ${(e as Error).message}`)
    }
  }

  async function iceAktar(dosya: File) {
    if (!confirm('Yedek yüklenirse bu cihazdaki TÜM mevcut veriler yedektekiyle değiştirilir. Devam edilsin mi?')) return
    try {
      await yedekYukle(await dosya.text())
      setMesaj('Yedek geri yüklendi.')
    } catch (e) {
      setMesaj(`Yüklenemedi: ${(e as Error).message}`)
    }
  }

  return (
    <Sayfa baslik="Ayarlar" geri>
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-500 uppercase dark:text-slate-400">Kurumlar</h2>
          <Link to="/ayarlar/kurum/yeni" className="text-sm font-medium text-indigo-600 dark:text-indigo-400">+ Kurum ekle</Link>
        </div>
        <ul className="kart divide-y divide-slate-100 overflow-hidden dark:divide-slate-800">
          {kurumlar?.length === 0 && <li className="px-4 py-3 text-sm text-slate-500">Henüz kurum yok.</li>}
          {kurumlar?.map((k) => (
            <li key={k.id}>
              <Link to={`/ayarlar/kurum/${k.id}`} className="flex min-h-14 items-center gap-3 px-4 active:bg-slate-100 dark:active:bg-slate-800">
                <Nokta renk={k.renk} />
                <span className="flex-1 font-medium">{k.ad}</span>
                <Ikon ad="ileri" className="size-5 text-slate-400" />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-slate-500 uppercase dark:text-slate-400">Veriler ve yedek</h2>
        <div className="kart space-y-3 p-4 text-sm">
          <p className="text-slate-600 dark:text-slate-300">
            Veriler şimdilik <b>bu cihazda</b> saklanıyor. Uygulama silinirse veriler de silinir; düzenli yedek alıp Drive'a ya da kendine göndermeni öneririm.
          </p>
          <p>
            Kalıcı depolama:{' '}
            {kalici ? (
              <span className="font-medium text-emerald-600">açık</span>
            ) : (
              <button className="font-medium text-indigo-600 underline dark:text-indigo-400" onClick={async () => setKalici(await kaliciDepolamaIste())}>
                kapalı — açmayı dene
              </button>
            )}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button className="btn-ikincil" onClick={disaAktar}><Ikon ad="indir" className="size-5" /> Yedek al</button>
            <button className="btn-ikincil" onClick={() => dosyaRef.current?.click()}><Ikon ad="yukle" className="size-5" /> Yedek yükle</button>
          </div>
          <input
            ref={dosyaRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) iceAktar(f)
              e.target.value = ''
            }}
          />
          {mesaj && <p className="text-slate-600 dark:text-slate-300">{mesaj}</p>}
        </div>
      </section>

      {!yerelUygulama() && <section>
        <h2 className="mb-2 text-sm font-semibold text-slate-500 uppercase dark:text-slate-400">Uygulamayı kur</h2>
        <div className="kart space-y-2 p-4 text-sm text-slate-600 dark:text-slate-300">
          <p><b>iPhone / iPad (Safari):</b> Paylaş <span aria-hidden>⎋</span> → <b>Ana Ekrana Ekle</b></p>
          <p><b>Android (Chrome):</b> ⋮ menü → <b>Uygulamayı yükle</b> ya da <b>Ana ekrana ekle</b></p>
          <p>Kurulduktan sonra internet olmadan da açılır.</p>
        </div>
      </section>}

      <p className="pb-4 text-center text-xs text-slate-400">Ders Takip · sürüm {__APP_VERSION__}</p>
    </Sayfa>
  )
}
