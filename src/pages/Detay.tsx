import { useLiveQuery } from 'dexie-react-hooks'
import { Link, useParams } from 'react-router-dom'
import { db, guncelle } from '../db'
import { Ikon } from '../components/Ikon'
import { Bos, Nokta, Sayfa } from '../components/ui'
import { para, tamAd, tarih } from '../lib/format'
import { duzeyAdi, HEDEF_SINAVLAR, UCRET_MODELLERI } from '../lib/sabitler'

/** Öğrenci ya da sınıf detay sayfası (plan.md bölüm 9.4) */
export function Detay({ tip }: { tip: 'OGRENCI' | 'SINIF' }) {
  const { id = '' } = useParams()

  const veri = useLiveQuery(async () => {
    const hedef = tip === 'OGRENCI' ? await db.ogrenciler.get(id) : await db.siniflar.get(id)
    if (!hedef) return null
    const dersler = await db.dersler.where('[hedefTip+hedefId]').equals([tip, id]).toArray()
    dersler.sort((a, b) => b.tarih.localeCompare(a.tarih) || b.olusturma.localeCompare(a.olusturma))
    const odevler = await db.odevler.where('[hedefTip+hedefId]').equals([tip, id]).toArray()
    const kurum = 'kurumId' in hedef ? await db.kurumlar.get(hedef.kurumId) : undefined
    const kodlar = tip === 'SINIF' ? await db.kurumKodlari.where('sinifId').equals(id).toArray() : []
    return { hedef, dersler, odevler, kurum, kodlar }
  }, [tip, id])

  if (veri === undefined) return null
  if (veri === null) {
    return (
      <Sayfa baslik="Bulunamadı" geri>
        <Bos ikon="ara" baslik="Kayıt bulunamadı" />
      </Sayfa>
    )
  }

  const { hedef, dersler, odevler, kurum, kodlar } = veri
  const ogrenci = tip === 'OGRENCI' && 'renk' in hedef ? hedef : undefined
  const baslik = ogrenci ? tamAd(ogrenci) : hedef.ad
  const renk = ogrenci?.renk ?? kurum?.renk ?? '#94a3b8'
  const sonDers = dersler.find((d) => d.durum === 'YAPILDI' || d.durum === 'TELAFI')
  const bekleyenOdev = odevler.filter((o) => o.durum === 'VERILDI')
  const duzenleYolu = tip === 'OGRENCI' ? `/ogrenciler/${id}/duzenle` : `/siniflar/${id}/duzenle`

  const arsivle = () => {
    const tablo = tip === 'OGRENCI' ? db.ogrenciler : db.siniflar
    return guncelle(tablo as typeof db.siniflar, id, { aktif: !hedef.aktif })
  }

  const bilgiler: [string, string | undefined][] = ogrenci
    ? [
        ['Düzey', duzeyAdi(ogrenci.duzey)],
        ['Hedef', HEDEF_SINAVLAR.find((h) => h.deger === ogrenci.hedefSinav)?.ad],
        ['Ücret', ogrenci.ucret != null
          ? [para(ogrenci.ucret), UCRET_MODELLERI.find((u) => u.deger === ogrenci.ucretModeli)?.ad].filter(Boolean).join(' · ')
          : undefined],
        ['Veli', ogrenci.veliAd],
      ]
    : [
        ['Kurum', kurum?.ad],
        ['Düzey', duzeyAdi(hedef.duzey)],
        ['Kurum kodları', kodlar.map((k) => k.kod).join(', ') || undefined],
      ]

  return (
    <Sayfa
      baslik={baslik}
      geri
      sag={
        <Link to={duzenleYolu} aria-label="Düzenle" className="flex size-11 items-center justify-center rounded-full hover:bg-slate-200/60 dark:hover:bg-slate-800">
          <Ikon ad="duzenle" />
        </Link>
      }
    >
      {!hedef.aktif && (
        <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200">Bu kayıt arşivde.</div>
      )}

      {/* Üst kutu: kaydırmadan görünmeli */}
      <section className="kart overflow-hidden">
        <div className="h-1.5" style={{ background: renk }} />
        <div className="grid gap-4 p-4 md:grid-cols-3">
          <UstKutu baslik="Geçen ders" alt={sonDers ? tarih(sonDers.tarih) : undefined}>
            {sonDers?.islenenNot || <span className="text-slate-400">Henüz ders kaydı yok</span>}
          </UstKutu>
          <UstKutu baslik="Bugün yapılacak">
            {sonDers?.sonrakiDersNotu || <span className="text-slate-400">—</span>}
          </UstKutu>
          <UstKutu baslik={`Bekleyen ödevler (${bekleyenOdev.length})`}>
            {bekleyenOdev.length ? (
              <ul className="list-disc space-y-0.5 pl-4">
                {bekleyenOdev.slice(0, 4).map((o) => <li key={o.id}>{o.aciklama}</li>)}
              </ul>
            ) : (
              <span className="text-slate-400">Yok</span>
            )}
          </UstKutu>
        </div>
      </section>

      <section className="kart divide-y divide-slate-100 dark:divide-slate-800">
        {bilgiler.filter(([, v]) => v).map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4 px-4 py-3 text-sm">
            <span className="text-slate-500 dark:text-slate-400">{k}</span>
            <span className="text-right font-medium">{v}</span>
          </div>
        ))}
        {ogrenci?.veliTel && <TelSatiri etiket="Veli telefonu" tel={ogrenci.veliTel} />}
        {ogrenci?.ogrenciTel && <TelSatiri etiket="Öğrenci telefonu" tel={ogrenci.ogrenciTel} />}
        {hedef.notlar && <p className="px-4 py-3 text-sm whitespace-pre-wrap">{hedef.notlar}</p>}
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-slate-500 uppercase dark:text-slate-400">Ders geçmişi</h2>
        {dersler.length ? (
          <ul className="kart divide-y divide-slate-100 dark:divide-slate-800">
            {dersler.map((d) => (
              <li key={d.id} className="px-4 py-3 text-sm">
                <div className="flex items-center gap-2">
                  <Nokta renk={renk} />
                  <span className="font-medium">{tarih(d.tarih)}</span>
                </div>
                {d.islenenNot && <p className="mt-1 text-slate-600 dark:text-slate-300">{d.islenenNot}</p>}
              </li>
            ))}
          </ul>
        ) : (
          <div className="kart">
            <Bos ikon="kitap" baslik="Henüz ders kaydı yok" aciklama="Hızlı ders kaydı Faz 1'in sonraki adımlarında eklenecek." />
          </div>
        )}
      </section>

      <button className={hedef.aktif ? 'btn-tehlike w-full' : 'btn-ikincil w-full'} onClick={arsivle}>
        <Ikon ad="arsiv" className="size-5" />
        {hedef.aktif ? 'Arşive kaldır' : 'Arşivden çıkar'}
      </button>
    </Sayfa>
  )
}

function UstKutu({ baslik, alt, children }: { baslik: string; alt?: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold text-slate-500 uppercase dark:text-slate-400">
        {baslik} {alt && <span className="font-normal normal-case">· {alt}</span>}
      </p>
      <div className="mt-1 text-sm">{children}</div>
    </div>
  )
}

function TelSatiri({ etiket, tel }: { etiket: string; tel: string }) {
  return (
    <a href={`tel:${tel.replace(/\s/g, '')}`} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
      <span className="text-slate-500 dark:text-slate-400">{etiket}</span>
      <span className="flex items-center gap-2 font-medium text-indigo-600 dark:text-indigo-400">
        <Ikon ad="telefon" className="size-4" /> {tel}
      </span>
    </a>
  )
}
