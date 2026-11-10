# Ders Takip Uygulaması — Plan

> **Sürüm:** Taslak v0.4 · **Tarih:** 10.11.2026 · **Durum:** Tartışma aşamasında
> Bu dosya Claude Code ile geliştirme yapılırken ana referanstır. Kararlar değiştikçe güncellenir.

**Değişiklik geçmişi**
- v0.4: Faiz takibi tamamen çıkarıldı. Ödemelerim, sade bir borç ve ödeme defteri oldu: borç gir, ödedikçe düş, istersen bakiyeyi düzelt. Her ay ekstre girme zorunluluğu yok.
- v0.3.1: Kredi kartında faiz, bakiye farkından değil ekstreden alınıyor (fark harcamayı da içerdiği için). Faizi bilinmeyen aylar raporlara katılmıyor.
- v0.3: Ödemelerim, muhasebe mantığıyla yeniden tasarlandı: borç hesapları, hareketler, bakiye güncelleme ile faizin otomatik bulunması, kredi ödeme planı, borç özeti.
- v0.2: Google Takvim benzeri takvim, kurum programını içe aktarma, kişisel ödeme takibi ("Ödemelerim"), tasarım ilkeleri eklendi. Bildirimler Faz 2'ye çekildi.
- v0.1: İlk taslak

---

## 1. Amaç

Bu uygulama **kendim için**: özel derslerimi, kurumdaki sınıflarımı ve kişisel ödemelerimi tek yerden, **kendi düzenime uygun** şekilde takip etmek.

Temel sorular:
1. **"Bu öğrenciyle / sınıfla geçen ders ne yaptım, bugün ne yapacağım?"** Cevabı, öğrenci ya da sınıf açıldığında kaydırmadan ekranın en üstünde görünmeli.
2. **"Bu hafta nerede, ne zaman dersim var?"** Özel dersler ve kurum dersleri tek takvimde görünmeli.
3. **"Kimden ne kadar alacağım var, benim neyi ne zamana kadar ödemem lazım?"**
4. **"Toplam ne kadar borcum var, kime ne kadar ödedim, ne kadar kaldı?"**

## 2. Kullanım bağlamı

| Konu | Karar |
|---|---|
| Kullanıcı | Sadece ben (tek kullanıcı) |
| Cihaz | Telefon öncelikli. Tablet de kullanılacak, veriler cihazlar arasında senkron olmalı |
| Dil / bölge | Türkçe arayüz, ₺, tarih `gg.aa.yyyy`, hafta pazartesi başlar, saat dilimi Europe/Istanbul |
| Öğrenci profili | Ağırlıkla LGS ve YKS (TYT/AYT) hazırlık, bir kısmı ara sınıf |
| Kurum programı | Kurum, tarihli ders programını `.xls` dosyası olarak yayınlıyor. Geçmiş haftalar da dosyada yer alıyor (bkz. bölüm 5) |
| Geliştirme | Claude Code ile |

## 3. Tasarım ilkeleri: "Uygulama benim düzenime uyar"

- **Her şey düzenlenebilir:** Konu listeleri, ödeme kategorileri, renkler, ders durumları, etiketler.
- **Kendi adlarım:** Kurum kodları (`478-H0811`) yerine kendi verdiğim kısa adlar görünür. Kodlar arka planda eşleşme için saklanır.
- **Minimum zorunlu alan:** Sadece gerçekten gereken bilgiler sorulur, gerisi isteğe bağlıdır.
- **Akıllı varsayılanlar:** Süre, ücret ve konu son girilen kayda göre önerilir ("son konudan devam").
- **Sormadan silme ya da değiştirme yok:** Özellikle içe aktarmada. Üzerinde not olan bir ders asla otomatik silinmez.
- **Hızlı giriş:** Bir ders kaydı ya da ödeme işareti 30 saniyeden kısa sürmeli.

## 4. Temel kavramlar

- **Öğrenci (özel ders):** Bireysel ders verdiğim kişi. Velisi, ücreti ve hedef sınavı var.
- **Kurum:** Çalıştığım dershane, okul ya da etüt merkezi. Kendine ait bir rengi var.
- **Sınıf (kurum):** Bir kuruma bağlı grup. Bir ya da daha fazla **kurum kodu** ile eşleşir (ör. `478-H0811` → "8-H").
- **Etkinlik:** Takvimdeki her şey. Türleri: özel ders, kurum dersi, kişisel etkinlik, ödeme.
- **Ders saati:** Kurum programındaki tek bir hücre (ör. 09:20–10:00). Ek ders hesabı bu birimle yapılır.
- **Oturum:** Aynı sınıfla arka arkaya yapılan ders saatlerinin birleşimi (ör. 09:20–10:50, 2 ders saati). Ders notu oturum başına bir kez girilir.
- **Ders kaydı:** Gerçekleşen ya da iptal olan bir ders ve o derste yapılanlar.
- **Ödev, Konu, Deneme:** Önceki taslaktaki gibi.
- **Tahsilat:** Öğrencilerden aldığım ücretler (gelir).
- **Ödemelerim:** Benim yapmam gereken ödemeler (gider). İki türü var:
  - **Borç hesabı:** Bakiyesi olan borç: kredi kartı, kredi, taksitli alışveriş, bir kişiye borç. Örnek: "Ziraat kredi kartı, toplam borç 50.000 ₺, her ayın 10'u ile 21'i arasında ödenir."
  - **Düzenli ödeme:** Bakiyesi olmayan, her ay tekrar eden ödeme: kira, fatura, aidat, abonelik.
- **Hareket:** Bir borç hesabındaki her değişiklik: ödeme (borcu azaltır), borç ekleme (artırır), düzeltme.
- **Bakiyeyi düzelt:** İstediğim zaman bankadaki güncel tutarı yazıp bakiyeyi ona eşitlemek. Fark analiz edilmez, deftere sadece "düzeltme" olarak not düşülür.

## 5. Kurum programını içe aktarma

### 5.1 Örnek dosyanın analizi (`Ders_Programi_2.xls`)

- **Format:** Gerçek bir Excel dosyası değil. Uzantısı `.xls` olan bir **HTML tablosu** (Excel'in "web sayfası" biçimi). Tablette açılmamasının sebebi büyük ihtimalle bu.
- **Yapı:** Her satır **belirli bir tarih** (ör. "11 Ekim 2026 Paz"). Sütunlar "1. Saat" ile "13. Saat" arası.
- **Hücre içeriği:** `478-H0811` + alt satırda `09:20-10:00`, yani sınıf kodu ve saat aralığı. Boş hücre ders yok demek.
- **Önemli 1: Program haftalık tekrarlamıyor.** Her hafta farklı. Bu yüzden kurum dersleri tekrar kuralı olarak değil, **tarihli tek tek etkinlikler** olarak eklenmeli.
- **Önemli 2: "N. Saat" başlığına güvenilmez.** Aynı sütun farklı günlerde farklı saate denk geliyor. Örneğin "1. Saat" hafta içi 08:30, hafta sonu 09:20. **Her zaman hücredeki saat kullanılmalı.**
- **Önemli 3: Geçmiş haftalar da dosyada var.** Dosya 11.10.2026'dan başlıyor. Her yeni dosya eskileri tekrar içerebilir, bu yüzden **mükerrer kayıt oluşmamalı**.
- **Blok dersler:** Aynı sınıfla arka arkaya 2 ders saati çok yaygın (aralarında 10 dk teneffüs var).
- **Sayılar** (test için beklenen değerler):
  - 15 gün, **77 ders saati**, **44 oturum** (33 ikili blok, 11 tekli)
  - 5 sınıf kodu: `478-H0811`, `478-H0821`, `478-K0811`, `478-K0821` (16'şar ders saati), `478-L0711` (13 ders saati)
  - 10.11.2026 itibarıyla 40 ders saati geçmişte, 37'si bugün ve sonrasında

### 5.2 Akış

1. Kurumun sisteminden dosyayı indir, uygulamada **Takvim → Program yükle → kurum seç → dosya seç**.
   - Android'de ileride "Paylaş → Uygulama" ile de gönderilebilir.
2. Uygulama dosyayı okur ve her hücreyi bir **ders saati** olarak çıkarır.
3. **Yeni kod varsa** bir kerelik eşleştirme sorulur: "`478-H0811` hangi sınıf?" Mevcut bir sınıf seçilir ya da yenisi oluşturulur. Eşleşme saklanır, bir daha sorulmaz.
4. **Önizleme ekranı**, onaydan önce şunları gösterir:
   - Eklenecek yeni dersler (oturum ve ders saati sayısıyla)
   - Saati değişmiş dersler (eski → yeni)
   - Gelecekte olup yeni dosyada artık olmayan dersler ("Programdan çıkmış görünüyor, iptal edilsin mi?")
   - Atlanan geçmiş dersler
   - Mevcut özel derslerle **çakışmalar**
5. Onaylanınca takvime eklenir. Yükleme geçmişi kaydedilir ve **son yükleme geri alınabilir**.

### 5.3 Kurallar

- **Mükerrer önleme:** Her ders saatinin anahtarı `kurum + sınıf kodu + tarih + başlangıç saati`. Aynı anahtar zaten varsa tekrar eklenmez.
- **Oturum oluşturma:** Aynı gün, aynı kod ve en fazla 10 dk ara ile ardışık ders saatleri tek oturum olur. `ders_saati_sayisi` saklanır.
- **Geçmiş tarihler:** Varsayılan olarak **bugünden itibaren** alınır.
  - "Geçmişi de ekle" seçeneği eksik geçmiş dersleri ekler. Ek ders saati raporu için faydalı.
  - Geçmişte zaten olan kayıtlara dokunulmaz.
- **Silme yok, öneri var:** Yeni dosyada olmayan gelecek dersler otomatik silinmez, onaya sunulur. Üzerinde ders kaydı ya da not olanlar listede ayrıca işaretlenir.
- **Okuma yöntemi:** HTML olarak okunur (tarayıcıda `DOMParser`). Kurum ileride gerçek bir Excel dosyası verirse SheetJS ile okunur.
- **Tarih ayrıştırma:** Türkçe ay adları (Ocak … Aralık). Gün kısaltması (Paz, Cmt, Pzt…) tarihle uyumlu mu diye kontrol edilir, uyumsuzsa uyarı verilir.
- **Test:** Örnek dosya `ornekler/kurum_programi_ornek.xls` olarak projeye konur. Ayrıştırıcının 5.1'deki sayıları vermesi otomatik testle doğrulanır.

## 6. Takvim (Google Takvim benzeri)

- **Görünümler:** Gün · 3 Gün · Hafta · Ay · Ajanda (liste)
  - Telefonda varsayılan 3 Gün ya da Ajanda, tablette Hafta
- **Renkler:** Her kurum kendi renginde, özel dersler, kişisel etkinlikler ve ödemeler ayrı renklerde. Hepsi değiştirilebilir.
- **Hızlı ekleme:** Boş saate dokun → Özel ders / Kişisel etkinlik
- **Tekrarlama** (özel dersler ve kişisel etkinlikler için): her hafta, 2 haftada bir, her ay, özel, bitiş tarihi
- **Tekrarlayan etkinliği düzenleme:** "Sadece bu" / "Bu ve sonrakiler" / "Tümü"
- **Tek seferlik iptal ya da erteleme:** Seri bozulmaz, istisna olarak kaydedilir.
- **Taşıma:** Gün ve hafta görünümünde uzun basıp sürükleyerek
- **Çakışma uyarısı:** Özel ders eklerken ya da kurum programı yüklerken. Kurum programı her hafta değiştiği için bu önemli.
- **Boş saatlerim:** Seçilen hafta için boş aralıkları listeler (telafi ya da yeni öğrenci için).
- **Resmi tatiller** gösterilir. Tatile denk gelen tekrarlayan özel derslerde uyarı verilir.
- **Etkinliğe dokununca:** Ders ise "Geçen ders" özeti, bekleyen ödevler ve [Not gir] butonu. Ödeme ise [Ödendi] butonu.

## 7. Para

### 7.1 Tahsilat (öğrencilerden)

- Ücret modeli: ders başı / paket / aylık sabit
- Öğrenci bazında bakiye ve "Alacaklarım" listesi
- Tahsilat kaydı: tarih, tutar, yöntem (nakit / havale), not
- Paket bitmek üzereyken uyarı
- Kurallar bölüm 11'de

### 7.2 Ödemelerim (sade borç ve ödeme defteri)

Amaç: **Kime ne kadar borcum var, bu ay neyi ne zamana kadar ödemem lazım, ne ödedim?**
Faiz hesabı yok. Her ay ekstre ya da bakiye girme zorunluluğu yok.

#### 7.2.1 Borçlarım

- Her borç bir hesap:
  - Ad (ör. "Ziraat kredi kartı")
  - Kime (banka ya da kişi)
  - Tür: kredi kartı / kredi / taksitli alışveriş / kişiye borç / diğer (düzenlenebilir)
  - **Toplam borç** (bir kez girilir)
  - Not
- Üç işlem, hepsi birkaç dokunuşla:
  - **[Ödeme yaptım]:** Tutar ve tarih girilir, borçtan düşer.
  - **[Borç ekle]:** Yeni harcama ya da yeni borç bakiyeye eklenir. İsteğe bağlı.
  - **[Bakiyeyi düzelt]:** İstediğim zaman bankadaki güncel tutarı yazarım, bakiye ona eşitlenir. Fark yorumlanmaz, deftere sadece "düzeltme" olarak geçer. Ne zaman yapacağıma ben karar veririm.
- **Taksitli borçlar** (kredi, taksitli alışveriş): İsteğe bağlı taksit tutarı ve taksit sayısı girilebilir. Her ödeme bir taksit düşer, "12 taksitten 7'si kaldı" gösterilir.
- **Hesap detayı:** Defter görünümünde tarih, açıklama, tutar ve kalan bakiye.
- Bakiye 0 olunca hesap "kapandı" olarak işaretlenir, geçmişi saklanır.

> **Örnek: Ziraat kredi kartı**
> - Açılış borcu: 50.000 ₺
> - 15.11 Ödeme −5.000 ₺ → kalan 45.000 ₺
> - 15.12 Ödeme −5.000 ₺ → kalan 40.000 ₺
> - 02.01 Bakiyeyi düzelt (bankada 41.300 ₺ görünüyor) → kalan 41.300 ₺

#### 7.2.2 Düzenli ödemeler (bakiyesiz)

- Kira, fatura, aidat, abonelik gibi
- Tutar: **sabit** ya da **değişken** (her ay girilir)
- Tekrar: aylık / yıllık / tek seferlik
- Bakiye tutulmaz, sadece "bu ay ödendi mi" ve tutar geçmişi tutulur.

#### 7.2.3 Ödeme aralığı ve hatırlatma (iki tür için de geçerli)

- **Ödeme aralığı:** Ayın X'i ile Y'si arası (ör. 10–21) ya da tek bir son gün
- Her ay o ayın ödeme kaydı otomatik oluşur. Durumlar: bekliyor / ödendi / gecikti / atlandı
- [Ödendi] → tutar ve tarih önerilir. Bağlı bir borç hesabı varsa ödeme o hesaptan **otomatik düşer**, tek giriş yeterli.
- Hatırlatmalar (ödeme bazında değiştirilebilir):
  - Aralık açılınca
  - Son günden 2 gün önce
  - Son gün
- Ayda 31 gün yoksa son gün, ayın son günü olur.
- Son gün hafta sonuna ya da tatile denk gelirse uyarı verilir.

#### 7.2.4 Özet

- **Toplam borç** ve hesap bazında liste (büyükten küçüğe)
- **Bu ay:** ödenecek, ödenen, kalan
- **Ödediklerim:** bu ay ve bu yıl toplamı, hesap bazında
- Son 12 ayın toplam borç grafiği (Faz 3)

### 7.3 Aylık nakit özeti (Faz 3)

- Gelir: tahsil edilen ve beklenen öğrenci ücretleri, isteğe bağlı kurum maaşı / ek ders ücreti
- Gider: Ödemelerim (borç ödemeleri ve düzenli ödemeler)
- "Bu ay ne kadar girecek, ne kadar çıkacak" tek ekranda

## 8. Özellikler (fazlara göre)

### Faz 1 — Çekirdek

- [x] Öğrenci, sınıf ve kurum kartları (ekle, düzenle, arşivle)
- [ ] **Takvim:** Gün / 3 Gün / Hafta / Ajanda görünümleri, tekrarlayan özel dersler, tek seferlik iptal ve erteleme
  - [x] Haftalık ajanda görünümü (telefonda liste, tablette 7 sütun), derse dokununca detay ve iptal
- [x] **Kurum programı içe aktarma:** Ayrıştırıcı, kod eşleştirme, önizleme, mükerrer önleme, test dosyası, geri alma
- [ ] **Bugün ekranı:** Günün dersleri ve her kartta son ders özeti ile "bugün yapılacak" notu
- [ ] **Hızlı ders kaydı:** İşlenen konu, not, ödev, sonraki derste yapılacak, durum
- [ ] **Öğrenci / sınıf detay sayfası:** Üst kutu ve ders geçmişi
- [ ] **Ödev takibi**

### Faz 2 — Para, hatırlatmalar, akademik takip

- [ ] **Borçlarım:** Borç hesapları, [Ödeme yaptım] / [Borç ekle] / [Bakiyeyi düzelt], defter görünümü, taksit sayacı
- [ ] **Düzenli ödemeler:** Kira, fatura vb., aylık kayıt, ödendi işaretleme
- [ ] **Ödeme aralıkları:** Aylık ödeme kayıtları, borç hesabından otomatik düşme
- [ ] **Ödemelerim özeti:** Toplam borç, bu ay ödenecek / ödenen / kalan
- [ ] **Tahsilat:** Ücret modelleri, bakiye, alacak listesi
- [ ] **Bildirimler:** Ödeme hatırlatmaları, "ders bitti, not gir", günün özeti
- [ ] **Konu takibi:** Hazır ve düzenlenebilir konu listeleri, ilerleme yüzdesi
- [ ] **Deneme takibi:** Doğru / yanlış / boş, otomatik net, gelişim grafiği
- [ ] **Ek ders saati raporu:** Kurum ve ay bazında ders saati sayısı (içe aktarılan veriden)
- [ ] **Arama:** Öğrenci, konu ve notlarda

### Faz 3 — Kolaylıklar

- [ ] Aylık nakit özeti
- [ ] Toplam borç grafiği (son 12 ay)
- [ ] Veliye ders özetini WhatsApp'ta açma (`wa.me` linki)
- [ ] Derse fotoğraf ekleme (tahta, defter)
- [ ] Takvimi iCal bağlantısıyla Google Takvim'de görüntüleme (tek yönlü, gecikmeli güncellenebilir)
- [ ] Ana ekranda hangi kutuların görüneceğini ve sırasını seçme
- [ ] Dışa ve içe aktarma (JSON / CSV yedek)
- [ ] Öğrenci dönem özeti (veli görüşmesi için)

### Kapsam dışı (şimdilik)

- Öğrenci ya da velinin uygulamaya girişi, birden fazla öğretmen
- Kurum sistemine otomatik bağlanıp programı kendiliğinden çekme (dosya elle yüklenecek)
- Bankaya bağlanıp hareketleri otomatik çekme
- Faiz hesabı, ekstre takibi, kredi ödeme planı (v0.4'te sadelik için çıkarıldı; gerekirse sonra eklenebilir)
- Google Takvim ile çift yönlü senkronizasyon
- Uygulama içinde sesli not (telefon klavyesindeki dikte yeterli)
- App Store / Play Store'da yayın

## 9. Ekranlar

Alt menü: **Bugün · Takvim · Öğrenciler · Para**. Ayarlar sağ üstte.

1. **Bugün**
   - Günün dersleri (özel ve kurum karışık, saat sırasıyla)
   - Kayıt girilmemiş geçmiş dersler
   - Bu hafta ödenecekler
2. **Takvim:** Görünüm seçici, [+] ekle, ⋯ menüde "Program yükle"
3. **Öğrenciler & Sınıflar:** Arama, filtreler (Özel / Kurum X / Arşiv)
4. **Detay (öğrenci / sınıf)**
   - Üst kutu: Geçen ders · Bugün yapılacak · Bekleyen ödevler
   - Sekmeler: Dersler · Ödevler · Konular · Denemeler* · Tahsilat*
   - (*) sadece özel ders öğrencilerinde
5. **Ders kaydı formu:** Tek ekran, varsayılanlar dolu
6. **Program yükleme:** Kurum seç → dosya → kod eşleştirme → önizleme → onay
7. **Para:** Üç sekme: Tahsilat · Ödemelerim · Aylık özet
   - **Ödemelerim**
     - Üstte toplam borç ve bu ay ödenecekler
     - Altında "Bu ay" listesi ([Ödendi] butonlarıyla), "Borç hesapları" ve "Düzenli ödemeler"
   - **Borç hesabı detayı**
     - Kalan borç, toplam ödenen, varsa kalan taksit
     - Defter görünümü (tarih, açıklama, tutar, kalan)
     - [Ödeme yaptım] [Borç ekle] [Bakiyeyi düzelt]
8. **Ayarlar:** Kurumlar ve kod eşleşmeleri, renkler, konu listeleri, ödeme kategorileri, bildirim tercihleri, yedek

## 10. Veri modeli (taslak)

```text
Kurum             id, ad, renk, notlar
KurumKodu         id, kurum_id, kod ("478-H0811"), sinif_id           -- kod → sınıf eşleşmesi

Ogrenci           id, ad, soyad, duzey (5-12 / mezun), hedef_sinav (LGS|TYT|AYT|ARA),
                  alan (SAY|EA|SOZ|DIL|-), veli_ad, veli_tel, ogrenci_tel,
                  ucret_modeli (DERS_BASI|PAKET|AYLIK), ucret, renk, aktif, notlar
Sinif             id, kurum_id, ad (kendi verdiğim ad), duzey, hedef_sinav, aktif, notlar

Etkinlik          id, tur (OZEL_DERS|KURUM_DERSI|KISISEL|ODEME), baslik,
                  baslangic, bitis, tum_gun, renk?,
                  tekrar_kurali? (RRULE), tekrar_bitis?,
                  hedef_tip? (OGRENCI|SINIF), hedef_id?,
                  kaynak (MANUEL|ICE_AKTARMA), ice_aktarma_id?,
                  ders_saati_sayisi, durum (PLANLI|IPTAL), notlar
EtkinlikIstisna   etkinlik_id, orijinal_tarih, tip (IPTAL|TASINDI), yeni_baslangic?, yeni_bitis?
DersSaati         id, etkinlik_id, kurum_id, kod, tarih, baslangic, bitis,
                  anahtar UNIQUE (kurum_id+kod+tarih+baslangic)        -- içe aktarılan her hücre

IceAktarma        id, kurum_id, dosya_adi, zaman, eklenen, guncellenen, atlanan,
                  iptal_onerilen, geri_alindi, ham_dosya_yolu

Ders              id, etkinlik_id, tarih (tekrarlayan etkinlikte hangi gün olduğu),
                  durum (YAPILDI|IPTAL_UCRETLI|IPTAL_UCRETSIZ|ERTELENDI|TELAFI),
                  islenen_not, sonraki_ders_notu, olusturma_zamani
DersKonu          ders_id, konu_id
Odev              id, ders_id, hedef_tip, hedef_id, aciklama, teslim_tarihi?,
                  durum (VERILDI|YAPILDI|EKSIK|YAPILMADI), kontrol_notu

Konu              id, sinav, ders_adi, baslik, sira, ust_konu_id?
KonuIlerleme      hedef_tip, hedef_id, konu_id, durum (ISLENMEDI|ISLENDI|TEKRAR), son_tarih
Deneme            id, ogrenci_id, ad, tarih, tur (LGS|TYT|AYT)
DenemeSonuc       deneme_id, ders_adi, dogru, yanlis, bos, net

Paket             id, ogrenci_id, ders_sayisi, tutar, baslangic_tarihi, durum
Tahsilat          id, ogrenci_id, tarih, tutar, yontem (NAKIT|HAVALE|DIGER), paket_id?, not

-- Ödemelerim: borç hesapları (defter)
BorcHesabi        id, ad, tur (KREDI_KARTI|KREDI|TAKSITLI|KISIYE|DIGER), kime (ör. "Ziraat Bankası"),
                  acilis_bakiyesi, acilis_tarihi, taksit_tutari?, taksit_sayisi?,
                  renk, aktif, kapanis_tarihi?, not
BorcHareketi      id, borc_hesabi_id, tarih, tip (ACILIS|ODEME|BORC_EKLEME|DUZELTME),
                  tutar (+ borcu artırır, − azaltır), odeme_donem_id?, aciklama

-- Ödemelerim: takvim ve hatırlatma tarafı (borç hesapları ve düzenli ödemeler için ortak)
KisiselOdeme      id, ad, tur (BORC_ODEMESI|DUZENLI), borc_hesabi_id?, kategori,
                  aralik_baslangic_gun?, son_gun, tutar_tipi (SABIT|DEGISKEN),
                  tutar?, tekrar (AYLIK|YILLIK|TEK), baslangic_ay,
                  hatirlatmalar (ör. [ARALIK_ACILINCA, SON_GUN-2, SON_GUN]), renk, aktif, not
KisiselOdemeDonem id, kisisel_odeme_id, donem ("2026-11"), aralik_baslangic, son_tarih,
                  beklenen_tutar?, durum (BEKLIYOR|ODENDI|KISMEN|GECIKTI|ATLANDI),
                  odenen_tutar?, odeme_tarihi?, not
```

## 11. İş kuralları

**Ders durumu ve tahsilat**
- `YAPILDI`, `TELAFI` ve `IPTAL_UCRETLI` ücrete sayılır. `IPTAL_UCRETSIZ` ve `ERTELENDI` sayılmaz.
- Saati geçmiş ve kaydı girilmemiş dersler "Kaydı eksik" olarak işaretlenir. Otomatik "yapıldı" sayılmaz.

**Bakiye**
- *Ders başı:* Ücrete sayılan her ders, ders ücreti kadar borç yazar.
- *Paket:* Paket alındığında paket tutarı kadar borç yazar. Yapılan dersler paketten düşer, 1 ders kalınca uyarı verilir.
- *Aylık:* Her ayın 1'inde aylık ücret kadar borç yazar.
- **Bakiye = toplam borç − toplam tahsilat**

**Ödemelerim: ödeme dönemleri**
- Ayın 1'inde (ya da tanım eklendiğinde) o ayın dönem kaydı oluşur.
- Son tarih geçmiş ve ödenmemişse durum `GECIKTI` olur. Beklenenden az ödendiyse durum `KISMEN` olur.
- Borç hesabına bağlı bir dönem ödendi işaretlenince o hesaba otomatik `ODEME` hareketi yazılır. Aynı ödeme iki kez girilmez.

**Ödemelerim: borç defteri**
- **Bakiye** = Σ hareket tutarları (açılış dahil). Her zaman hareketlerden hesaplanır.
- **[Bakiyeyi düzelt]:** `düzeltme tutarı = girilen bakiye − mevcut bakiye` kadar bir `DUZELTME` hareketi yazılır. Yorum ya da analiz yapılmaz.
- **Taksit sayacı:** Taksit sayısı girilmiş hesaplarda her `ODEME` hareketi bir taksit sayar. Kalan taksit = taksit sayısı − ödeme sayısı.
- **Kapanış:** Bakiye 0 ya da altına inince hesap "kapandı" olarak işaretlenir, geçmişi saklanır. Bağlı ödeme tanımı pasife alınır.

**Net hesabı**
- YKS (TYT / AYT): `net = doğru − yanlış / 4`
- LGS: `net = doğru − yanlış / 3`
- Soru sayıları ayarlardan düzenlenebilir. Varsayılanlar:
  - LGS: Türkçe 20 · Matematik 20 · Fen 20 · İnkılap 10 · Din 10 · İngilizce 10
  - TYT: Türkçe 40 · Sosyal 20 · Matematik 40 · Fen 20
  - AYT: alana göre
- *Varsayılanlar ilk kurulumda ÖSYM ve MEB'in güncel kılavuzlarıyla kontrol edilmeli.*

**Kurum programı:** Bölüm 5.3

## 12. Teknik kararlar

**Öneri: Telefona ve tablete kurulabilen web uygulaması (PWA) ve bulut veritabanı**

| Katman | Seçim | Neden |
|---|---|---|
| Arayüz | React + TypeScript + Vite | Claude Code'un en rahat çalıştığı alan |
| Stil | Tailwind CSS | Mobil öncelikli tasarım |
| Takvim | FullCalendar (ücretsiz sürüm) + rrule | Google Takvim benzeri görünümler, tekrar kuralları, Türkçe dil desteği |
| Kurulum | Android APK (Capacitor) | Mağaza gerekmez, GitHub'dan indirilip kurulur |
| Veri | Supabase (Postgres, giriş, dosya depolama) | Telefon ve tablet senkron, veriler güvende |
| Bildirim | Web Push + Supabase zamanlanmış fonksiyonlar | Ödeme ve ders hatırlatmaları için sunucu tarafında zamanlama gerekir |
| Yayın | Vercel veya Netlify | Otomatik yayın |
| Grafik | Recharts | Net gelişimi |

**Notlar**
- **Uygulama durumu (10.11.2026):** Hedef PWA yerine **Android APK** oldu (Capacitor). APK GitHub Actions'ta derlenip "son-surum" yayınına konuyor. Veriler cihazda (IndexedDB / Dexie); senkron gerekirse sonra aynı veri katmanının arkasına eklenir. Ayarlar'da JSON yedek al / yükle var.
- Bildirimler artık Faz 2'de (ödeme hatırlatmaları önemli). iPhone ya da iPad'de web bildirimleri için uygulamanın ana ekrana eklenmiş olması gerekir.
- Ücretsiz planların güncel limitleri (Supabase, Vercel) kurulum sırasında kontrol edilmeli.

## 13. Fonksiyonel olmayan gereksinimler

- **Hız:** Ders kaydı ve ödeme işareti 30 saniyeden kısa.
- **Tek elle kullanım:** Önemli butonlar ekranın alt yarısında, dokunma alanları en az 44 px.
- **Gizlilik (KVKK)**
  - Giriş zorunlu
  - Row Level Security açık; verilere sadece benim hesabım erişir
  - Gereksiz kişisel veri tutulmaz
  - Banka hesap şifresi ya da kart numarası **asla** saklanmaz
- **Veri kaybına karşı:** Silme yerine arşivleme, kalıcı silmede onay, içe aktarma geri alınabilir.
- **Zayıf internet:** Son yüklenen veri görüntülenebilmeli.
- **Karanlık mod:** Sistem ayarını takip eder.

## 14. Claude Code ile çalışma planı

1. Proje klasörünü oluştur. `plan.md` dosyasını köke, örnek program dosyasını `ornekler/kurum_programi_ornek.xls` yoluna koy.
2. Kısa bir `CLAUDE.md` yaz: "Plan için plan.md'ye bak. Arayüz Türkçe. Mobil öncelikli. Her adım sonunda plan.md'deki kutucukları işaretle. İçe aktarmada hiçbir şeyi sormadan silme."
3. Adım adım ilerle. Her adım ayrı bir istek olsun, her adımdan sonra telefonda dene:
   1. "plan.md'ye göre projeyi kur: Vite + React + TS + Tailwind + PWA."
   2. "Supabase tablolarını bölüm 10'a göre oluştur, RLS politikalarını ekle."
   3. "Öğrenci, sınıf ve kurum ekranlarını yap."
   4. "Takvimi FullCalendar ile kur: görünümler, tekrarlayan özel ders, istisnalar."
   5. "Kurum programı ayrıştırıcısını yaz ve örnek dosyayla testini yaz (bölüm 5.1'deki sayılar)." Sonra: "İçe aktarma ekranını yap: eşleştirme, önizleme, geri alma."
   6. "Bugün ekranı, ders kaydı, detay sayfası ve ödev takibini yap."
   7. Bir hafta gerçek derslerle kullan, eksikleri bu dosyaya yaz, sonra Faz 2'ye geç.
4. Git kullan, her çalışan adımdan sonra commit at.

## 15. Açık sorular

**Kurum programı**
- [ ] Kodlardaki `08` ve `07` sınıf düzeyi mi (8. ve 7. sınıf)? `478`, `H`, `K`, `L` neyi gösteriyor? (Doğru tahmin edilirse sınıf düzeyi otomatik doldurulur)
- [ ] Program dosyasını nereden indiriyorsun: kurumun web sitesi mi, bir uygulama mı?
- [ ] Kurum dersleri için ek ders saati raporu işine yarar mı?

**Genel**
- [ ] Telefonun ve tabletin iPhone/iPad mi, Android mi?
- [ ] Branşın ne? (Konu listelerinin ilk hâli için)
- [ ] Kurumdaki sınıflarda öğrenciler tek tek mi takip edilecek, sadece sınıf bazında mı?
- [ ] Şu an bu işleri nerede tutuyorsun (Google Takvim, defter, Excel, notlar)? Mevcut düzenin uygulamaya taşınması için önemli.

**Para**
- [ ] Hangi ücret modellerini kullanıyorsun: ders başı, paket, aylık?
- [ ] Son dakika iptallerinde ücret alıyor musun?
- [ ] Ödemelerim'de gelir tarafı (kurum maaşı ve günü) da görünsün mü?
- [ ] Hangi borç türlerin var: kredi kartı, ihtiyaç / taşıt / konut kredisi, taksitli alışveriş, kişilere borç?
- [ ] Uygulamanın adı ne olsun?
