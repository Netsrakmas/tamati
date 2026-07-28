import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'blog.tamati.app',
  appName: 'Tamati',
  webDir: 'dist',
  ios: {
    // The room's own colours. A white flash on launch would undercut the greeting,
    // which is the first thing the app is judged on.
    backgroundColor: '#f5ebda',
    contentInset: 'always',
  },
  backgroundColor: '#f5ebda',
}

export default config
