import { useState } from 'react'
import { Link } from 'react-router-dom'
import { db, guncelle } from '../db'
import type { GorunenEtkinlik } from '../lib/etkinlik'
import { gunAdi } from '../lib/format'

/** Takvimde ve Bugün ekranında tek bir etkinlik satırı; dokununca alttan detay açılır. */
export function EtkinlikKarti({ e, kompakt }: { e: GorunenEtkinlik; kompakt?: boolean }) {
  const [acik, setAcik] = useState(false)
  const iptal = e.durum === 'IPTAL'
  return (
    <>
      <button
        onClick={() => setAcik(true)}
        className={`flex w-full items-stretch gap-3 rounded-xl bg-white text-left shadow-sm ring-1 ring-slate-200 active:scale-[0.99] dark:bg-slate-900 dark:ring-slate-800 ${
          kompakt ? 'p-2' : 'p-3'
        } ${iptal ? 'opacity-50' : ''}`}
      >
        <span className="w-1 shrink-0 rounded-full" style={{ background: e.gorunenRenk }} />
        <span className="min-w-0 flex-1">
          <span className={`block truncate font-medium ${iptal ? 'line-through' : ''}`}>{e.baslik}</span>
          <span className="block truncate text-sm text-slate-500 tabular-nums dark:text-slate-400">
            {e.baslangic.slice(11, 16)}–{e.bitis.slice(11, 16)}
            {!kompakt && e.altBaslik && ` · ${e.altBaslik}`}
            {e.dersSaatiSayisi > 1 && ` · ${e.dersSaatiSayisi} saat`}
          </span>
        </span>
      </button>
      {acik && <EtkinlikDetay e={e} kapat={() => setAcik(false)} />}
    </>
  )
}

function EtkinlikDetay({ e, kapat }: { e: GorunenEtkinlik; kapat: () => void }) {
  const iptal = e.durum === 'IPTAL'
  const durumDegistir = async () => {
    if (!iptal && !confirm('Bu ders iptal edilsin mi? (Silinmez, takvimde üstü çizili görünür.)')) return
    await guncelle(db.etkinlikler, e.id, { durum: iptal ? 'PLANLI' : 'IPTAL' })
    kapat()
  }
  return (
    <div data-kapat className="fixed inset-0 z-40 flex items-end justify-center bg-black/30 md:items-center" onClick={kapat}>
      <div className="pb-safe w-full max-w-md rounded-t-3xl bg-white p-5 md:rounded-3xl dark:bg-slate-900" onClick={(x) => x.stopPropagation()}>
        <div className="mb-4 flex items-start gap-3">
          <span className="mt-1.5 size-3 shrink-0 rounded-full" style={{ background: e.gorunenRenk }} />
          <div>
            <p className={`text-lg font-semibold ${iptal ? 'line-through' : ''}`}>{e.baslik}</p>
            <p className="text-sm text-slate-500 capitalize dark:text-slate-400">{gunAdi(e.baslangic.slice(0, 10))}</p>
            <p className="text-sm text-slate-500 tabular-nums dark:text-slate-400">
              {e.baslangic.slice(11, 16)}–{e.bitis.slice(11, 16)}
              {e.dersSaatiSayisi > 0 && e.tur === 'KURUM_DERSI' && ` · ${e.dersSaatiSayisi} ders saati`}
            </p>
            {e.altBaslik && <p className="text-sm text-slate-500 dark:text-slate-400">{e.altBaslik}</p>}
            {iptal && <p className="mt-1 text-sm font-medium text-red-600">İptal</p>}
          </div>
        </div>
        <div className="grid gap-2">
          {e.hedefYolu && (
            <Link to={e.hedefYolu} className="btn-ana">
              {e.hedefTip === 'SINIF' ? 'Sınıfı aç' : 'Öğrenciyi aç'}
            </Link>
          )}
          <button className={iptal ? 'btn-ikincil' : 'btn-tehlike'} onClick={durumDegistir}>
            {iptal ? 'İptali geri al' : 'Bu dersi iptal et'}
          </button>
          <button className="btn text-slate-500" onClick={kapat}>Kapat</button>
        </div>
      </div>
    </div>
  )
}
