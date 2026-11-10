import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.derstakip.app',
  appName: 'Ders Takip',
  webDir: 'dist',
  android: {
    // Kullanıcı verisi WebView içinde (IndexedDB) tutulduğu için yedeklemeye izin ver
    allowMixedContent: false,
  },
}

export default config
