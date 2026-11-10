import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { db } from '../db'
import { AyarlarButonu } from '../components/AyarlarButonu'
import { Bos, Sayfa } from '../components/ui'
import { bugunISO, uzunTarih } from '../lib/format'
import { useEtkinlikler } from '../lib/etkinlik'
import { EtkinlikKarti } from '../components/EtkinlikKarti'

export function Bugun() {
  const bugun = bugunISO()
  const sayilar = useLiveQuery(async () => ({
    ogrenci: await db.ogrenciler.filter((o) => o.aktif).count(),
    sinif: await db.siniflar.filter((s) => s.aktif).count(),
    kurum: await db.kurumlar.count(),
  }))
  const dersler = useEtkinlikler(bugun, bugun)

  const ilkKurulum = sayilar && sayilar.ogrenci === 0 && sayilar.sinif === 0

  return (
    <Sayfa baslik="Bugün" sag={<AyarlarButonu />}>
      <p className="text-sm text-slate-500 capitalize dark:text-slate-400">{uzunTarih(new Date())}</p>

      {ilkKurulum && (
        <div className="kart space-y-3 p-4">
          <p className="font-semibold">Hoş geldin 👋</p>
          <p className="text-sm text-slate-600 dark:text-slate-300">Başlamak için:</p>
          <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-600 dark:text-slate-300">
            <li>
              <Link className="text-indigo-600 underline dark:text-indigo-400" to="/ayarlar/kurum/yeni">Kurumunu ekle</Link>{' '}
              (dershane, okul…)
            </li>
            <li>
              <Link className="text-indigo-600 underline dark:text-indigo-400" to="/ogrenciler/yeni">Özel ders öğrencilerini</Link> ekle
            </li>
            <li><Link className="text-indigo-600 underline dark:text-indigo-400" to="/takvim/program-yukle">Kurum programını yükle</Link> (sınıflar koddan otomatik oluşturulabilir)</li>
          </ol>
        </div>
      )}

      <section>
        <h2 className="mb-2 text-sm font-semibold text-slate-500 uppercase dark:text-slate-400">Günün dersleri</h2>
        {dersler && dersler.length > 0 ? (
          <div className="space-y-2">
            {dersler.map((d) => <EtkinlikKarti key={d.id} e={d} />)}
          </div>
        ) : (
          <div className="kart">
            <Bos ikon="takvim" baslik="Bugün planlı ders yok">
              <Link to="/takvim/program-yukle" className="btn-ikincil">Kurum programı yükle</Link>
            </Bos>
          </div>
        )}
      </section>
    </Sayfa>
  )
}
