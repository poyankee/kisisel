import { NavLink, Outlet } from 'react-router-dom'
import { Ikon } from './Ikon'

const MENU = [
  { yol: '/', ad: 'Bugün', ikon: 'bugun' },
  { yol: '/takvim', ad: 'Takvim', ikon: 'takvim' },
  { yol: '/ogrenciler', ad: 'Öğrenciler', ikon: 'ogrenciler' },
  { yol: '/para', ad: 'Para', ikon: 'para' },
]

/**
 * Uygulama düzeni.
 * Telefon: alt menü (tek elle kullanım). Tablet / geniş ekran (md+): soldaki dar menü.
 */
export function Duzen() {
  return (
    <div className="flex h-full">
      {/* Tablet: sol menü */}
      <nav className="pl-safe hidden w-24 shrink-0 flex-col items-center gap-2 border-r border-slate-200 bg-white pt-6 md:flex dark:border-slate-800 dark:bg-slate-900">
        {MENU.map((m) => (
          <MenuOgesi key={m.yol} {...m} dikey />
        ))}
        <div className="flex-1" />
        <MenuOgesi yol="/ayarlar" ad="Ayarlar" ikon="ayarlar" dikey />
        <div className="h-4" />
      </nav>

      <div className="flex-1 overflow-y-auto pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-6">
        <Outlet />
      </div>

      {/* Telefon: alt menü */}
      <nav className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur md:hidden dark:border-slate-800 dark:bg-slate-900/95">
        <div className="mx-auto flex h-16 max-w-lg">
          {MENU.map((m) => (
            <MenuOgesi key={m.yol} {...m} />
          ))}
        </div>
      </nav>
    </div>
  )
}

function MenuOgesi({ yol, ad, ikon, dikey }: { yol: string; ad: string; ikon: string; dikey?: boolean }) {
  return (
    <NavLink
      to={yol}
      end={yol === '/'}
      className={({ isActive }) =>
        `flex flex-col items-center justify-center gap-0.5 text-xs font-medium ${dikey ? 'h-16 w-20 rounded-2xl' : 'flex-1'} ${
          isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <span className={`flex h-8 w-14 items-center justify-center rounded-full ${isActive ? 'bg-indigo-100 dark:bg-indigo-950' : ''}`}>
            <Ikon ad={ikon} />
          </span>
          {ad}
        </>
      )}
    </NavLink>
  )
}
