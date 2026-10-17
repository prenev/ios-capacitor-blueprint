import type { CapacitorConfig } from '@capacitor/cli'
const config: CapacitorConfig = {
  appId: 'app.plate.gym', // change to your reverse-DNS id (must match your Apple team)
  appName: 'Plate',
  webDir: 'dist',
  backgroundColor: '#0b0b0c',
  ios: { contentInset: 'never', backgroundColor: '#0b0b0c' },
}
export default config
