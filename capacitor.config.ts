import type { CapacitorConfig } from '@capacitor/cli'
const config: CapacitorConfig = {
  appId: 'com.example.blueprint', // change to your reverse-DNS id (must match your Apple team)
  appName: 'Blueprint',
  webDir: 'dist',
  backgroundColor: '#0e1726',
  ios: { contentInset: 'never', backgroundColor: '#0e1726' },
}
export default config
