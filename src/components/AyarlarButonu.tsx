import { Link } from 'react-router-dom'
import { Ikon } from './Ikon'

/** Sağ üstteki ayarlar butonu (telefonda; tablette sol menüde zaten var). */
export function AyarlarButonu() {
  return (
    <Link
      to="/ayarlar"
      aria-label="Ayarlar"
      className="flex size-11 items-center justify-center rounded-full text-slate-600 hover:bg-slate-200/60 md:hidden dark:text-slate-300 dark:hover:bg-slate-800"
    >
      <Ikon ad="ayarlar" />
    </Link>
  )
}
