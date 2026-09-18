import { defineConfig } from 'vite'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
export default defineConfig({
  base: './',
  build: { target: 'es2022' },
  plugins: [
    {
      name: 'tamati-offline-release',
      generateBundle(_, bundle) {
        const files = Object.keys(bundle).filter(
          (name) => !name.endsWith('.map'),
        )
        const hash = createHash('sha256')
        for (const name of files.sort()) {
          const item = bundle[name]
          hash.update(name)
          hash.update(item.type === 'chunk' ? item.code : item.source)
        }
        for (const name of [
          'icon.svg',
          'icon-192.png',
          'icon-512.png',
          'manifest.webmanifest',
        ])
          hash.update(readFileSync(`public/${name}`))
        const template = readFileSync('public/sw.js', 'utf8')
        hash.update(template)
        const release = hash.digest('hex').slice(0, 12)
        const assets = [
          './',
          ...files
            .filter((name) => name !== 'index.html')
            .map((name) => `./${name}`),
          './icon.svg',
          './icon-192.png',
          './icon-512.png',
          './manifest.webmanifest',
        ]
        this.emitFile({
          type: 'asset',
          fileName: 'sw.js',
          source: template
            .replace('__RELEASE__', release)
            .replace('__ASSETS__', JSON.stringify(assets)),
        })
      },
    },
  ],
})
