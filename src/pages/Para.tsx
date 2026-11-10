import { useState } from 'react'
import { AyarlarButonu } from '../components/AyarlarButonu'
import { Bos, Cipler, Sayfa } from '../components/ui'

type Sekme = 'tahsilat' | 'odemelerim' | 'ozet'

export function Para() {
  const [sekme, setSekme] = useState<Sekme>('odemelerim')
  return (
    <Sayfa baslik="Para" sag={<AyarlarButonu />}>
      <Cipler
        deger={sekme}
        onChange={setSekme}
        secenekler={[
          { deger: 'tahsilat', ad: 'Tahsilat' },
          { deger: 'odemelerim', ad: 'Ödemelerim' },
          { deger: 'ozet', ad: 'Aylık özet' },
        ]}
      />
      <div className="kart">
        <Bos ikon="para" baslik="Faz 2'de" aciklama="Borçlarım, düzenli ödemeler ve öğrenci tahsilatları Faz 2'de bu ekrana gelecek." />
      </div>
    </Sayfa>
  )
}
