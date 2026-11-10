import { useEffect } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { kaliciDepolamaIste } from './db'
import { geriTusunuBagla } from './lib/native'
import { Duzen } from './components/Duzen'
import { Ayarlar } from './pages/Ayarlar'
import { Bugun } from './pages/Bugun'
import { Detay } from './pages/Detay'
import { KurumForm } from './pages/KurumForm'
import { OgrenciForm } from './pages/OgrenciForm'
import { Ogrenciler } from './pages/Ogrenciler'
import { Para } from './pages/Para'
import { ProgramYukle } from './pages/ProgramYukle'
import { SinifForm } from './pages/SinifForm'
import { Takvim } from './pages/Takvim'

export default function App() {
  useEffect(() => {
    // Verilerin tarayıcı tarafından temizlenmemesi için kalıcı depolama iste
    kaliciDepolamaIste()
    geriTusunuBagla()
  }, [])

  return (
    // HashRouter: statik barındırmada (GitHub Pages vb.) sayfa yenilemede 404 olmaz
    <HashRouter>
      <Routes>
        <Route element={<Duzen />}>
          <Route index element={<Bugun />} />
          <Route path="takvim" element={<Takvim />} />
          <Route path="takvim/program-yukle" element={<ProgramYukle />} />
          <Route path="ogrenciler" element={<Ogrenciler />} />
          <Route path="ogrenciler/yeni" element={<OgrenciForm />} />
          <Route path="ogrenciler/:id" element={<Detay tip="OGRENCI" />} />
          <Route path="ogrenciler/:id/duzenle" element={<OgrenciForm />} />
          <Route path="siniflar/yeni" element={<SinifForm />} />
          <Route path="siniflar/:id" element={<Detay tip="SINIF" />} />
          <Route path="siniflar/:id/duzenle" element={<SinifForm />} />
          <Route path="para" element={<Para />} />
          <Route path="ayarlar" element={<Ayarlar />} />
          <Route path="ayarlar/kurum/yeni" element={<KurumForm />} />
          <Route path="ayarlar/kurum/:id" element={<KurumForm />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
