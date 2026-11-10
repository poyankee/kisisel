import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AyarlarButonu } from '../components/AyarlarButonu'
import { EtkinlikKarti } from '../components/EtkinlikKarti'
import { Ikon } from '../components/Ikon'
import { Sayfa } from '../components/ui'
import { useEtkinlikler } from '../lib/etkinlik'
import { bugunISO, gunAdi, gunEkle, haftaBasi, kisaGun, tarihTR } from '../lib/format'

/**
 * Haftalık takvim (ajanda düzeni). Telefonda gün gün liste, tablette 7 sütun.
 * Tam Gün / 3 Gün / Hafta saat ızgarası FullCalendar ile sonraki adımda gelecek.
 */
export function Takvim() {
  const bugun = bugunISO()
  const [params, setParams] = useSearchParams()
  const [pazartesi, setPazartesiState] = useState(() => haftaBasi(params.get('hafta') ?? bugun))
  const setPazartesi = (t: string) => {
    setPazartesiState(t)
    setParams({ hafta: t }, { replace: true })
  }
  const pazar = gunEkle(pazartesi, 6)
  const etkinlikler = useEtkinlikler(pazartesi, pazar)
  const gunler = Array.from({ length: 7 }, (_, i) => gunEkle(pazartesi, i))
  const gunun = (g: string) => (etkinlikler ?? []).filter((e) => e.baslangic.startsWith(g))
  const toplamSaat = (etkinlikler ?? [])
    .filter((e) => e.tur === 'KURUM_DERSI' && e.durum === 'PLANLI')
    .reduce((t, e) => t + e.dersSaatiSayisi, 0)

  return (
    <Sayfa
      baslik="Takvim"
      sag={
        <>
          <Link to="/takvim/program-yukle" className="btn-ikincil min-h-10 px-3 text-sm">
            <Ikon ad="yukle" className="size-4" /> Program yükle
          </Link>
          <AyarlarButonu />
        </>
      }
    >
      <div className="flex items-center gap-2">
        <button className="btn-ikincil size-11 px-0" aria-label="Önceki hafta" onClick={() => setPazartesi(gunEkle(pazartesi, -7))}>
          <Ikon ad="geri" />
        </button>
        <div className="flex-1 text-center">
          <p className="font-semibold tabular-nums">{tarihTR(pazartesi)} – {tarihTR(pazar)}</p>
          {toplamSaat > 0 && <p className="text-xs text-slate-500">{toplamSaat} kurum ders saati</p>}
        </div>
        <button className="btn-ikincil size-11 px-0" aria-label="Sonraki hafta" onClick={() => setPazartesi(gunEkle(pazartesi, 7))}>
          <Ikon ad="ileri" />
        </button>
      </div>
      {haftaBasi(bugun) !== pazartesi && (
        <button className="btn w-full text-indigo-600 dark:text-indigo-400" onClick={() => setPazartesi(haftaBasi(bugun))}>
          Bu haftaya dön
        </button>
      )}

      {/* Telefon: gün gün liste */}
      <div className="space-y-4 md:hidden">
        {gunler.map((g) => (
          <section key={g}>
            <h2 className={`mb-2 text-sm font-semibold capitalize ${g === bugun ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'}`}>
              {gunAdi(g)} {g === bugun && '· Bugün'}
            </h2>
            {gunun(g).length ? (
              <div className="space-y-2">{gunun(g).map((e) => <EtkinlikKarti key={e.id} e={e} />)}</div>
            ) : (
              <p className="text-sm text-slate-400">Ders yok</p>
            )}
          </section>
        ))}
      </div>

      {/* Tablet: 7 sütun */}
      <div className="hidden gap-2 md:grid md:grid-cols-7">
        {gunler.map((g) => (
          <section key={g} className={`min-h-40 rounded-2xl p-2 ${g === bugun ? 'bg-indigo-50 dark:bg-indigo-950/40' : ''}`}>
            <h2 className={`mb-2 text-center text-sm font-semibold capitalize ${g === bugun ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'}`}>
              {kisaGun(g)}
            </h2>
            <div className="space-y-2">{gunun(g).map((e) => <EtkinlikKarti key={e.id} e={e} kompakt />)}</div>
          </section>
        ))}
      </div>
    </Sayfa>
  )
}
