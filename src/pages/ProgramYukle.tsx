import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { db, ekle, type IceAktarma } from '../db'
import { Ikon } from '../components/Ikon'
import { Alan, Sayfa } from '../components/ui'
import { bugunISO, gunAdi, haftaBasi, tarihTR } from '../lib/format'
import {
  geriAl, geriAlmaKayitSayisi, planla, uygula, varsayilanSecim, type IceAktarmaPlani, type YeniOturum,
} from '../lib/iceAktarma'
import { koddanTahmin, programAyristir, type AyristirmaSonucu, type Oturum } from '../lib/programAyristir'
import { RENKLER } from '../lib/sabitler'

type Adim = 'sec' | 'eslestir' | 'onizle' | 'bitti'

/** Kod eşleştirmede her kod için seçim: mevcut sınıf id'si ya da yeni sınıf adı */
type KodSecimi = { sinifId: string; yeniAd: string; duzey?: string }

/** Kurum programı yükleme: kurum seç → dosya → kod eşleştirme → önizleme → onay (plan.md 5.2) */
export function ProgramYukle() {
  const navigate = useNavigate()
  const kurumlar = useLiveQuery(() => db.kurumlar.orderBy('ad').toArray())
  const [adim, setAdim] = useState<Adim>('sec')
  const [kurumId, setKurumId] = useState('')
  const [yeniKurumAdi, setYeniKurumAdi] = useState('')
  const [gecmisiEkle, setGecmisiEkle] = useState(false)
  const [dosya, setDosya] = useState<{ ad: string; icerik: string } | null>(null)
  const [sonuc, setSonuc] = useState<AyristirmaSonucu | null>(null)
  const [kodSecimleri, setKodSecimleri] = useState<Record<string, KodSecimi>>({})
  const [plan, setPlan] = useState<IceAktarmaPlani | null>(null)
  const [secili, setSecili] = useState<Set<string>>(new Set())
  const [kayit, setKayit] = useState<IceAktarma | null>(null)
  const [hata, setHata] = useState('')
  const [mesgul, setMesgul] = useState(false)
  const dosyaRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!kurumId && kurumlar?.length) setKurumId(kurumlar[0].id)
  }, [kurumlar, kurumId])

  const siniflar = useLiveQuery(() => (kurumId ? db.siniflar.where('kurumId').equals(kurumId).sortBy('ad') : []), [kurumId])

  async function dosyaSecildi(f: File) {
    setHata('')
    const icerik = await f.text()
    const s = programAyristir(icerik)
    if (s.dersSaatleri.length === 0) {
      setHata('Bu dosyada ders bulunamadı. Kurumun verdiği program dosyasını (.xls) seçtiğinden emin ol.')
      return
    }
    setDosya({ ad: f.name, icerik })
    setSonuc(s)
  }

  /** Kod eşleşmelerini getirir; eksik varsa eşleştirme adımına, yoksa önizlemeye geçer. */
  async function devam() {
    if (!sonuc) return
    setMesgul(true)
    setHata('')
    try {
      let kid = kurumId
      if (!kid) {
        if (!yeniKurumAdi.trim()) {
          setHata('Kurum adı gir.')
          return
        }
        kid = await ekle(db.kurumlar, { ad: yeniKurumAdi.trim(), renk: RENKLER[6], aktif: true })
        setKurumId(kid)
      }
      const eslesme = await kodEslesmesi(kid)
      const eksik = [...new Set(sonuc.dersSaatleri.map((d) => d.kod))].filter((k) => !eslesme.has(k)).sort()
      if (eksik.length) {
        const mevcut = await db.siniflar.where('kurumId').equals(kid).toArray()
        const secim: Record<string, KodSecimi> = {}
        for (const kod of eksik) {
          const t = koddanTahmin(kod)
          // Aynı adda sınıf varsa onu öner
          const ayni = mevcut.find((s) => s.ad.toLocaleLowerCase('tr') === t.ad.toLocaleLowerCase('tr'))
          secim[kod] = { sinifId: ayni?.id ?? '', yeniAd: t.ad, duzey: t.duzey }
        }
        setKodSecimleri(secim)
        setAdim('eslestir')
        return
      }
      await onizle(kid, eslesme)
    } finally {
      setMesgul(false)
    }
  }

  async function eslestirmeyiKaydet() {
    setMesgul(true)
    try {
      for (const [kod, s] of Object.entries(kodSecimleri)) {
        let sinifId = s.sinifId
        if (!sinifId) {
          sinifId = await ekle(db.siniflar, { kurumId, ad: s.yeniAd.trim() || kod, duzey: s.duzey, aktif: true })
        }
        await ekle(db.kurumKodlari, { kurumId, kod, sinifId })
      }
      await onizle(kurumId, await kodEslesmesi(kurumId))
    } finally {
      setMesgul(false)
    }
  }

  async function onizle(kid: string, eslesme: Map<string, string>) {
    const p = await planla(kid, sonuc!, eslesme, bugunISO(), gecmisiEkle)
    setPlan(p)
    setSecili(varsayilanSecim(p))
    setAdim('onizle')
  }

  async function onayla() {
    if (!plan || !dosya) return
    setMesgul(true)
    try {
      setKayit(await uygula(plan, secili, dosya.ad, dosya.icerik))
      setAdim('bitti')
    } finally {
      setMesgul(false)
    }
  }

  const sec = (anahtar: string, deger: boolean) =>
    setSecili((s) => {
      const y = new Set(s)
      if (deger) y.add(anahtar)
      else y.delete(anahtar)
      return y
    })

  // --- 1. Kurum ve dosya seçimi ---
  if (adim === 'sec') {
    return (
      <Sayfa baslik="Program yükle" geri>
        <div className="kart space-y-4 p-4">
          {kurumlar && kurumlar.length > 0 ? (
            <Alan etiket="Kurum">
              <select className="girdi" value={kurumId} onChange={(e) => setKurumId(e.target.value)}>
                {kurumlar.map((k) => <option key={k.id} value={k.id}>{k.ad}</option>)}
              </select>
            </Alan>
          ) : (
            <Alan etiket="Kurum adı" ipucu="İlk yükleme: kurumu burada oluşturuyoruz.">
              <input className="girdi" value={yeniKurumAdi} onChange={(e) => setYeniKurumAdi(e.target.value)} placeholder="ör. Final Dershanesi" />
            </Alan>
          )}

          <div>
            <span className="etiket">Program dosyası</span>
            <button type="button" className="btn-ikincil w-full" onClick={() => dosyaRef.current?.click()}>
              <Ikon ad="yukle" className="size-5" /> {dosya ? 'Başka dosya seç' : 'Dosya seç (.xls)'}
            </button>
            {/* accept verilmiyor: Android'de .xls dosyaları farklı türlerle gelebiliyor */}
            <input
              ref={dosyaRef}
              type="file"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) dosyaSecildi(f)
                e.target.value = ''
              }}
            />
          </div>

          {sonuc && dosya && (
            <div className="rounded-xl bg-slate-100 p-3 text-sm dark:bg-slate-800">
              <p className="font-medium">{dosya.ad}</p>
              <p className="text-slate-600 dark:text-slate-300">
                {tarihTR(sonuc.ilkTarih!)} – {tarihTR(sonuc.sonTarih!)} · {sonuc.gunSayisi} gün · {sonuc.dersSaatleri.length} ders saati ·{' '}
                {sonuc.oturumlar.length} oturum
              </p>
              {sonuc.uyarilar.map((u) => <p key={u} className="mt-1 text-amber-700 dark:text-amber-300">⚠ {u}</p>)}
            </div>
          )}

          <label className="flex min-h-11 items-center gap-3">
            <input type="checkbox" className="size-5 accent-indigo-600" checked={gecmisiEkle} onChange={(e) => setGecmisiEkle(e.target.checked)} />
            <span>
              Geçmişi de ekle
              <span className="block text-xs text-slate-500">Varsayılan: sadece bugünden itibaren. Ek ders saati raporu için geçmişi ekleyebilirsin.</span>
            </span>
          </label>

          {hata && <p className="text-sm text-red-600">{hata}</p>}
          <button className="btn-ana w-full" disabled={!sonuc || mesgul} onClick={devam}>Devam</button>
        </div>
        <YuklemeGecmisi />
      </Sayfa>
    )
  }

  // --- 2. Yeni kodları eşleştirme ---
  if (adim === 'eslestir') {
    return (
      <Sayfa baslik="Kodları eşleştir" geri>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Dosyada yeni sınıf kodları var. Her biri hangi sınıf? Bir kez sorulur, sonra hatırlanır.
        </p>
        <div className="space-y-3">
          {Object.entries(kodSecimleri).map(([kod, s]) => (
            <div key={kod} className="kart space-y-2 p-4">
              <div className="flex items-center justify-between">
                <code className="font-semibold">{kod}</code>
                <span className="text-xs text-slate-500">{sonuc!.dersSaatleri.filter((d) => d.kod === kod).length} ders saati</span>
              </div>
              <select
                className="girdi"
                value={s.sinifId}
                onChange={(e) => setKodSecimleri((x) => ({ ...x, [kod]: { ...s, sinifId: e.target.value } }))}
              >
                <option value="">+ Yeni sınıf oluştur</option>
                {siniflar?.map((sn) => <option key={sn.id} value={sn.id}>{sn.ad}</option>)}
              </select>
              {!s.sinifId && (
                <input
                  className="girdi"
                  value={s.yeniAd}
                  placeholder="Sınıfın kısa adı"
                  aria-label={`${kod} için sınıf adı`}
                  onChange={(e) => setKodSecimleri((x) => ({ ...x, [kod]: { ...s, yeniAd: e.target.value } }))}
                />
              )}
            </div>
          ))}
        </div>
        <button className="btn-ana w-full" disabled={mesgul} onClick={eslestirmeyiKaydet}>Kaydet ve önizle</button>
      </Sayfa>
    )
  }

  // --- 3. Önizleme ---
  if (adim === 'onizle' && plan) {
    const sinifAdi = (id: string) => siniflar?.find((s) => s.id === id)?.ad ?? '?'
    const saatSay = (l: Oturum[]) => l.reduce((t, o) => t + o.saatler.length, 0)
    const cakismalar = [...plan.yeniler, ...plan.degisenler.flatMap((d) => d.yeniler)].filter((o) => o.cakismalar.length)
    const degisiklikYok = !plan.yeniler.length && !plan.degisenler.length && !plan.cikanlar.length

    return (
      <Sayfa baslik="Önizleme" geri>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <Ozet sayi={plan.yeniler.length} etiket="yeni oturum" alt={`${saatSay(plan.yeniler)} ders saati`} renk="text-emerald-600" />
          <Ozet sayi={plan.degisenler.length} etiket="saati değişen" renk="text-amber-600" />
          <Ozet sayi={plan.cikanlar.length} etiket="programdan çıkmış" renk="text-red-600" />
          <Ozet sayi={plan.degismeyen} etiket="zaten takvimde" renk="text-slate-500" />
        </div>

        {degisiklikYok && (
          <div className="kart p-4 text-sm">Takvim bu dosyayla zaten güncel. Eklenecek ya da değişecek ders yok.</div>
        )}

        {cakismalar.length > 0 && (
          <Bolum baslik={`Çakışmalar (${cakismalar.length})`} uyari>
            {cakismalar.map((o) => (
              <li key={o.tarih + o.baslangic + o.kod} className="px-4 py-3 text-sm">
                <OturumSatiri o={o} ad={sinifAdi(o.sinifId)} />
                <p className="mt-1 text-amber-700 dark:text-amber-300">
                  ⚠ {o.cakismalar.map((e) => `${e.baslik} (${e.baslangic.slice(11, 16)}–${e.bitis.slice(11, 16)})`).join(', ')} ile çakışıyor
                </p>
              </li>
            ))}
          </Bolum>
        )}

        {plan.degisenler.length > 0 && (
          <Bolum baslik="Saati değişen dersler">
            {plan.degisenler.map((d) => {
              const notVar = d.eskiler.some((e) => e.notVar)
              return (
                <SecimSatiri key={d.anahtar} secili={secili.has(d.anahtar)} onChange={(v) => sec(d.anahtar, v)}>
                  <p className="font-medium capitalize">{gunAdi(d.tarih)} · {sinifAdi(d.yeniler[0].sinifId)}</p>
                  <p className="text-sm tabular-nums">
                    <span className="text-slate-500 line-through">{d.eskiler.map((e) => `${e.etkinlik.baslangic.slice(11, 16)}–${e.etkinlik.bitis.slice(11, 16)}`).join(', ')}</span>
                    {' → '}
                    <span className="font-medium">{d.yeniler.map((o) => `${o.baslangic}–${o.bitis}`).join(', ')}</span>
                  </p>
                  {notVar && <NotUyarisi />}
                </SecimSatiri>
              )
            })}
          </Bolum>
        )}

        {plan.cikanlar.length > 0 && (
          <Bolum baslik="Programdan çıkmış görünüyor — iptal edilsin mi?">
            {plan.cikanlar.map((c) => (
              <SecimSatiri key={c.anahtar} secili={secili.has(c.anahtar)} onChange={(v) => sec(c.anahtar, v)}>
                <p className="font-medium capitalize">{gunAdi(c.etkinlik.baslangic.slice(0, 10))} · {c.etkinlik.baslik}</p>
                <p className="text-sm tabular-nums text-slate-500">{c.etkinlik.baslangic.slice(11, 16)}–{c.etkinlik.bitis.slice(11, 16)}</p>
                {c.notVar && <NotUyarisi />}
              </SecimSatiri>
            ))}
          </Bolum>
        )}

        {plan.yeniler.length > 0 && (
          <Bolum baslik="Eklenecek dersler">
            {plan.yeniler.map((o) => (
              <li key={o.tarih + o.baslangic + o.kod} className="px-4 py-2.5 text-sm">
                <OturumSatiri o={o} ad={sinifAdi(o.sinifId)} />
              </li>
            ))}
          </Bolum>
        )}

        {plan.atlananGecmis.length > 0 && (
          <p className="text-sm text-slate-500">
            {plan.atlananGecmis.length} geçmiş oturum ({saatSay(plan.atlananGecmis)} ders saati) atlandı. Eklemek için önceki adımda "Geçmişi de ekle"yi seç.
          </p>
        )}

        <div className="pb-safe sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] -mx-4 bg-slate-50/95 px-4 py-3 backdrop-blur md:bottom-0 dark:bg-slate-950/95">
          <button className="btn-ana w-full" disabled={mesgul || degisiklikYok} onClick={onayla}>
            Onayla ve takvime ekle
          </button>
        </div>
      </Sayfa>
    )
  }

  // --- 4. Bitti ---
  if (adim === 'bitti' && kayit) {
    const ilkYeni = plan?.yeniler[0]?.tarih ?? bugunISO()
    return (
      <Sayfa baslik="Program yüklendi" geri>
        <div className="kart space-y-2 p-5">
          <div className="flex size-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
            <Ikon ad="kontrol" />
          </div>
          <p className="text-lg font-semibold">Takvim güncellendi</p>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {kayit.eklenenOturum} oturum ({kayit.eklenenDersSaati} ders saati) eklendi
            {kayit.iptalEdilen > 0 && `, ${kayit.iptalEdilen} ders iptal edildi`}.
          </p>
        </div>
        <button className="btn-ana w-full" onClick={() => navigate(`/takvim?hafta=${haftaBasi(ilkYeni)}`, { replace: true })}>
          Takvimde gör
        </button>
        <GeriAlButonu kayit={kayit} sonra={() => setAdim('sec')} />
      </Sayfa>
    )
  }

  return null
}

async function kodEslesmesi(kurumId: string) {
  const kodlar = await db.kurumKodlari.where('kurumId').equals(kurumId).toArray()
  return new Map(kodlar.map((k) => [k.kod, k.sinifId]))
}

function Ozet({ sayi, etiket, alt, renk }: { sayi: number; etiket: string; alt?: string; renk: string }) {
  return (
    <div className="kart p-3">
      <p className={`text-2xl font-bold tabular-nums ${renk}`}>{sayi}</p>
      <p className="text-sm">{etiket}</p>
      {alt && <p className="text-xs text-slate-500">{alt}</p>}
    </div>
  )
}

function Bolum({ baslik, uyari, children }: { baslik: string; uyari?: boolean; children: React.ReactNode }) {
  return (
    <section>
      <h2 className={`mb-2 text-sm font-semibold uppercase ${uyari ? 'text-amber-600' : 'text-slate-500 dark:text-slate-400'}`}>{baslik}</h2>
      <ul className="kart divide-y divide-slate-100 dark:divide-slate-800">{children}</ul>
    </section>
  )
}

function OturumSatiri({ o, ad }: { o: YeniOturum; ad: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="capitalize">{gunAdi(o.tarih)}</span>
      <span className="text-right">
        <span className="font-medium">{ad}</span>{' '}
        <span className="text-slate-500 tabular-nums">{o.baslangic}–{o.bitis}{o.saatler.length > 1 && ` (${o.saatler.length})`}</span>
      </span>
    </div>
  )
}

function SecimSatiri({ secili, onChange, children }: { secili: boolean; onChange: (v: boolean) => void; children: React.ReactNode }) {
  return (
    <li>
      <label className="flex min-h-14 items-start gap-3 px-4 py-3">
        <input type="checkbox" className="mt-1 size-5 shrink-0 accent-indigo-600" checked={secili} onChange={(e) => onChange(e.target.checked)} />
        <div className="min-w-0 flex-1">{children}</div>
      </label>
    </li>
  )
}

function NotUyarisi() {
  return <p className="mt-1 text-xs font-medium text-amber-700 dark:text-amber-300">Bu derste not ya da ders kaydı var — kontrol et</p>
}

function GeriAlButonu({ kayit, sonra }: { kayit: IceAktarma; sonra?: () => void }) {
  const [mesgul, setMesgul] = useState(false)
  async function tikla() {
    const kayitli = await geriAlmaKayitSayisi(kayit.id)
    const ek = kayitli ? `\n\nDikkat: eklenen derslerden ${kayitli} tanesinde ders kaydı var. Kayıtlar silinmez ama takvimdeki dersle bağı kopar.` : ''
    if (!confirm(`"${kayit.dosyaAdi}" yüklemesi geri alınsın mı? Eklenen dersler kaldırılır, iptal edilenler geri gelir.${ek}`)) return
    setMesgul(true)
    await geriAl(kayit.id)
    setMesgul(false)
    sonra?.()
  }
  return (
    <button className="btn-ikincil w-full" disabled={mesgul} onClick={tikla}>
      Bu yüklemeyi geri al
    </button>
  )
}

function YuklemeGecmisi() {
  const kayitlar = useLiveQuery(() => db.iceAktarmalar.orderBy('zaman').reverse().limit(10).toArray())
  const kurumlar = useLiveQuery(() => db.kurumlar.toArray())
  if (!kayitlar?.length) return null
  // Her kurumun yalnızca son (geri alınmamış) yüklemesi geri alınabilir
  const sonlar = new Set<string>()
  const gorulenKurum = new Set<string>()
  for (const k of kayitlar) {
    if (gorulenKurum.has(k.kurumId)) continue
    gorulenKurum.add(k.kurumId)
    if (!k.geriAlindi) sonlar.add(k.id)
  }
  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold text-slate-500 uppercase dark:text-slate-400">Yükleme geçmişi</h2>
      <ul className="kart divide-y divide-slate-100 dark:divide-slate-800">
        {kayitlar.map((k) => (
          <li key={k.id} className="space-y-2 px-4 py-3 text-sm">
            <div className="flex justify-between gap-2">
              <span className="truncate font-medium">{k.dosyaAdi}</span>
              <span className="shrink-0 text-slate-500">{tarihTR(k.zaman.slice(0, 10))}</span>
            </div>
            <p className="text-slate-500">
              {kurumlar?.find((x) => x.id === k.kurumId)?.ad} · {k.eklenenOturum} oturum eklendi
              {k.iptalEdilen > 0 && ` · ${k.iptalEdilen} iptal`}
              {k.geriAlindi && ' · geri alındı'}
            </p>
            {sonlar.has(k.id) && <GeriAlButonu kayit={k} />}
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-slate-500">
        Kod eşleşmelerini <Link to="/ayarlar" className="underline">Ayarlar → Kurumlar</Link> içinden değiştirebilirsin.
      </p>
    </section>
  )
}
