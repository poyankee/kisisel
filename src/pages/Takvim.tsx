import { AyarlarButonu } from '../components/AyarlarButonu'
import { Bos, Sayfa } from '../components/ui'

export function Takvim() {
  return (
    <Sayfa baslik="Takvim" sag={<AyarlarButonu />}>
      <div className="kart">
        <Bos
          ikon="takvim"
          baslik="Takvim yakında"
          aciklama="Gün / 3 Gün / Hafta / Ajanda görünümleri, tekrarlayan özel dersler ve kurum programı yükleme bir sonraki adımda gelecek."
        />
      </div>
    </Sayfa>
  )
}
