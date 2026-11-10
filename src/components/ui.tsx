import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { RENKLER } from '../lib/sabitler'
import { Ikon } from './Ikon'

/** Sayfa iskeleti: üst başlık (geri, başlık, sağ eylemler) ve içerik. */
export function Sayfa({
  baslik,
  geri,
  sag,
  children,
}: {
  baslik: string
  geri?: boolean
  sag?: ReactNode
  children: ReactNode
}) {
  const navigate = useNavigate()
  return (
    <div className="mx-auto w-full max-w-3xl">
      <header className="pt-safe sticky top-0 z-10 border-b border-slate-200/70 bg-slate-50/90 backdrop-blur dark:border-slate-800/70 dark:bg-slate-950/90">
        <div className="flex h-14 items-center gap-1 px-2">
          {geri && (
            <button
              className="flex size-11 items-center justify-center rounded-full hover:bg-slate-200/60 dark:hover:bg-slate-800"
              onClick={() => navigate(-1)}
              aria-label="Geri"
            >
              <Ikon ad="geri" />
            </button>
          )}
          <h1 className={`flex-1 truncate text-lg font-semibold ${geri ? '' : 'pl-2'}`}>{baslik}</h1>
          {sag}
        </div>
      </header>
      <main className="space-y-4 px-4 py-4">{children}</main>
    </div>
  )
}

export function Bos({ ikon, baslik, aciklama, children }: { ikon: string; baslik: string; aciklama?: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <div className="mb-3 flex size-14 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300">
        <Ikon ad={ikon} />
      </div>
      <p className="font-medium">{baslik}</p>
      {aciklama && <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">{aciklama}</p>}
      {children && <div className="mt-4">{children}</div>}
    </div>
  )
}

export function Alan({ etiket, children, ipucu }: { etiket: string; children: ReactNode; ipucu?: string }) {
  return (
    <label className="block">
      <span className="etiket">{etiket}</span>
      {children}
      {ipucu && <span className="mt-1 block text-xs text-slate-500">{ipucu}</span>}
    </label>
  )
}

export function RenkSec({ deger, onChange }: { deger: string; onChange: (r: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {RENKLER.map((r) => (
        <button
          key={r}
          type="button"
          onClick={() => onChange(r)}
          className={`size-9 rounded-full ring-offset-2 ring-offset-white dark:ring-offset-slate-900 ${deger === r ? 'ring-2 ring-slate-900 dark:ring-white' : ''}`}
          style={{ background: r }}
          aria-label={`Renk ${r}`}
        />
      ))}
    </div>
  )
}

/** Yatay kaydırılabilir seçim çipleri */
export function Cipler<T extends string>({
  secenekler,
  deger,
  onChange,
}: {
  secenekler: { deger: T; ad: string }[]
  deger: T
  onChange: (d: T) => void
}) {
  return (
    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
      {secenekler.map((s) => (
        <button
          key={s.deger}
          type="button"
          onClick={() => onChange(s.deger)}
          className={`min-h-9 shrink-0 rounded-full border px-4 text-sm font-medium ${
            deger === s.deger
              ? 'border-indigo-600 bg-indigo-600 text-white'
              : 'border-slate-300 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'
          }`}
        >
          {s.ad}
        </button>
      ))}
    </div>
  )
}

export function Nokta({ renk }: { renk: string }) {
  return <span className="inline-block size-3 shrink-0 rounded-full" style={{ background: renk }} />
}

/** Sağ altta, alt menünün üstünde duran yuvarlak ekle butonu */
export function EkleButonu({ onClick, etiket = 'Ekle' }: { onClick: () => void; etiket?: string }) {
  return (
    <button
      onClick={onClick}
      aria-label={etiket}
      className="fixed right-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-20 flex size-14 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg active:scale-95 md:bottom-6"
    >
      <Ikon ad="arti" />
    </button>
  )
}
