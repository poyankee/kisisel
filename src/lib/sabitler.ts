import type { Alan, HedefSinav, UcretModeli } from '../db'

export const RENKLER = [
  '#4f46e5', '#2563eb', '#0891b2', '#059669', '#65a30d',
  '#ca8a04', '#ea580c', '#dc2626', '#db2777', '#9333ea', '#475569',
]

export const HEDEF_SINAVLAR: { deger: HedefSinav; ad: string }[] = [
  { deger: 'LGS', ad: 'LGS' },
  { deger: 'TYT', ad: 'TYT' },
  { deger: 'AYT', ad: 'AYT' },
  { deger: 'ARA', ad: 'Ara sınıf' },
]

export const ALANLAR: { deger: Alan; ad: string }[] = [
  { deger: 'SAY', ad: 'Sayısal' },
  { deger: 'EA', ad: 'Eşit ağırlık' },
  { deger: 'SOZ', ad: 'Sözel' },
  { deger: 'DIL', ad: 'Dil' },
  { deger: '-', ad: 'Yok' },
]

export const DUZEYLER = ['5', '6', '7', '8', '9', '10', '11', '12', 'mezun']

export const UCRET_MODELLERI: { deger: UcretModeli; ad: string }[] = [
  { deger: 'DERS_BASI', ad: 'Ders başı' },
  { deger: 'PAKET', ad: 'Paket' },
  { deger: 'AYLIK', ad: 'Aylık sabit' },
]

export const duzeyAdi = (d?: string) => (!d ? '' : d === 'mezun' ? 'Mezun' : `${d}. sınıf`)
