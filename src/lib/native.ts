/**
 * Android (Capacitor) entegrasyonu. Web'de bu fonksiyonlar tarayıcı karşılıklarına düşer.
 */
import { App } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'

export const yerelUygulama = () => Capacitor.isNativePlatform()

/** Android geri tuşu: geçmiş varsa geri git, ana ekrandaysan uygulamayı küçült. */
let bagli = false
export function geriTusunuBagla() {
  if (!yerelUygulama() || bagli) return
  bagli = true
  App.addListener('backButton', () => {
    // Alttan açılan pencere varsa önce onu kapat
    const pencere = document.querySelector<HTMLElement>('[data-kapat]')
    if (pencere) {
      pencere.click()
      return
    }
    const anaEkranlar = ['', '#/', '#/takvim', '#/ogrenciler', '#/para']
    if (anaEkranlar.includes(window.location.hash.split('?')[0])) App.minimizeApp()
    else window.history.back()
  })
}

/** Metin dosyasını kaydet/paylaş: Android'de paylaşım menüsü (Drive, WhatsApp, Dosyalar…), web'de indirme. */
export async function dosyaPaylas(dosyaAdi: string, icerik: string, tur = 'application/json') {
  if (yerelUygulama()) {
    const { uri } = await Filesystem.writeFile({
      path: dosyaAdi,
      data: icerik,
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
    })
    await Share.share({ title: dosyaAdi, files: [uri], dialogTitle: 'Yedeği kaydet ya da gönder' })
    return
  }
  const url = URL.createObjectURL(new Blob([icerik], { type: tur }))
  const a = document.createElement('a')
  a.href = url
  a.download = dosyaAdi
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
