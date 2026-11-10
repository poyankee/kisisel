import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { db } from '../db'
import { AyarlarButonu } from '../components/AyarlarButonu'
import { Ikon } from '../components/Ikon'
import { Bos, Cipler, EkleButonu, Nokta, Sayfa } from '../components/ui'
import { ara, tamAd } from '../lib/format'
import { duzeyAdi, HEDEF_SINAVLAR } from '../lib/sabitler'

type Satir = {
  tip: 'ogrenci' | 'sinif'
  id: string
  ad: string
  alt: string
  renk: string
  aktif: boolean
  kurumId?: string
}

export function Ogrenciler() {
  const navigate = useNavigate()
  const [filtre, setFiltre] = useState<string>('hepsi')
  const [sorgu, setSorgu] = useState('')
  const [menuAcik, setMenuAcik] = useState(false)

  const veri = useLiveQuery(async () => {
    const [ogrenciler, siniflar, kurumlar] = await Promise.all([
      db.ogrenciler.toArray(),
      db.siniflar.toArray(),
      db.kurumlar.orderBy('ad').toArray(),
    ])
    const kurumMap = new Map(kurumlar.map((k) => [k.id, k]))
    const satirlar: Satir[] = [
      ...ogrenciler.map((o) => ({
        tip: 'ogrenci' as const,
        id: o.id,
        ad: tamAd(o),
        alt: ['Özel ders', duzeyAdi(o.duzey), HEDEF_SINAVLAR.find((h) => h.deger === o.hedefSinav)?.ad]
          .filter(Boolean)
          .join(' · '),
        renk: o.renk,
        aktif: o.aktif,
      })),
      ...siniflar.map((s) => {
        const k = kurumMap.get(s.kurumId)
        return {
          tip: 'sinif' as const,
          id: s.id,
          ad: s.ad,
          alt: [k?.ad ?? 'Kurum yok', duzeyAdi(s.duzey)].filter(Boolean).join(' · '),
          renk: k?.renk ?? '#94a3b8',
          aktif: s.aktif,
          kurumId: s.kurumId,
        }
      }),
    ].sort((a, b) => a.ad.localeCompare(b.ad, 'tr'))
    return { satirlar, kurumlar }
  })

  const q = ara(sorgu)
  const gorunen = (veri?.satirlar ?? []).filter((s) => {
    if (q && !ara(s.ad).includes(q)) return false
    if (filtre === 'arsiv') return !s.aktif
    if (!s.aktif) return false
    if (filtre === 'ozel') return s.tip === 'ogrenci'
    if (filtre.startsWith('k:')) return s.kurumId === filtre.slice(2)
    return true
  })

  const secenekler = [
    { deger: 'hepsi', ad: 'Hepsi' },
    { deger: 'ozel', ad: 'Özel' },
    ...(veri?.kurumlar ?? []).map((k) => ({ deger: `k:${k.id}`, ad: k.ad })),
    { deger: 'arsiv', ad: 'Arşiv' },
  ]

  return (
    <Sayfa baslik="Öğrenciler & Sınıflar" sag={<AyarlarButonu />}>
      <div className="relative">
        <Ikon ad="ara" className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-slate-400" />
        <input
          className="girdi pl-10"
          placeholder="Ara"
          value={sorgu}
          onChange={(e) => setSorgu(e.target.value)}
          type="search"
        />
      </div>
      <Cipler secenekler={secenekler} deger={filtre} onChange={setFiltre} />

      {veri && gorunen.length === 0 ? (
        <div className="kart">
          {veri.satirlar.length === 0 ? (
            <Bos ikon="ogrenciler" baslik="Henüz kimse yok" aciklama="Özel ders öğrencilerini ve kurumdaki sınıflarını ekleyerek başla.">
              <div className="flex flex-wrap justify-center gap-2">
                <Link to="/ogrenciler/yeni" className="btn-ana">Öğrenci ekle</Link>
                <Link to="/siniflar/yeni" className="btn-ikincil">Sınıf ekle</Link>
              </div>
            </Bos>
          ) : (
            <Bos ikon="ara" baslik="Sonuç yok" />
          )}
        </div>
      ) : (
        <ul className="kart divide-y divide-slate-100 overflow-hidden dark:divide-slate-800">
          {gorunen.map((s) => (
            <li key={s.tip + s.id}>
              <Link
                to={s.tip === 'ogrenci' ? `/ogrenciler/${s.id}` : `/siniflar/${s.id}`}
                className="flex min-h-14 items-center gap-3 px-4 py-3 active:bg-slate-100 dark:active:bg-slate-800"
              >
                <Nokta renk={s.renk} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{s.ad}</p>
                  <p className="truncate text-sm text-slate-500 dark:text-slate-400">{s.alt}</p>
                </div>
                <Ikon ad={s.tip === 'ogrenci' ? 'kitap' : 'okul'} className="size-5 text-slate-400" />
              </Link>
            </li>
          ))}
        </ul>
      )}

      <EkleButonu onClick={() => setMenuAcik(true)} />
      {menuAcik && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/30 md:items-center" onClick={() => setMenuAcik(false)}>
          <div className="pb-safe w-full max-w-md rounded-t-3xl bg-white p-4 md:rounded-3xl dark:bg-slate-900" onClick={(e) => e.stopPropagation()}>
            <p className="mb-3 px-1 font-semibold">Ne eklemek istersin?</p>
            <div className="grid gap-2">
              <button className="btn-ikincil justify-start" onClick={() => navigate('/ogrenciler/yeni')}>
                <Ikon ad="kitap" /> Özel ders öğrencisi
              </button>
              <button className="btn-ikincil justify-start" onClick={() => navigate('/siniflar/yeni')}>
                <Ikon ad="okul" /> Kurum sınıfı
              </button>
              <button className="btn mt-1 text-slate-500" onClick={() => setMenuAcik(false)}>Vazgeç</button>
            </div>
          </div>
        </div>
      )}
    </Sayfa>
  )
}
