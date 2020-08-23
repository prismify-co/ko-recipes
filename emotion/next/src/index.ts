import { join } from 'path'
import j from 'jscodeshift'
import { Collection } from 'jscodeshift/src/Collection'
import builder from '@prismify/ko/lib/packages/builder'
import extension from './utils/extension'
import { addImport } from './utils/add-import'
import {
  updateDocument,
  wrapComponentWithCacheProvider,
  applyGlobalStyles,
} from './utils/helpers'

export default builder()
  .setName('Emotion')
  .setDescription(
    `Configure your app's styling with Emotion CSS-in-JS. This recipe will install all necessary dependencies and configure Emotion for immediate use.`
  )
  .setOwner('justin.r.hall+blitz@gmail.com')
  .addDependencyStep({
    name: 'Add npm dependencies',
    summary: `Emotion requires a few dependencies to get up and running.
We'll install @emotion/core and @emotion/styled for general usage, as well as emotion and emotion-server to extract and inline critical CSS on the server.`,
    packages: [
      { name: '@emotion/core', version: '10' },
      { name: '@emotion/styled', version: '10' },
      { name: 'emotion', version: '10' },
      { name: 'emotion-server', version: '10' },
    ],
  })
  .addFileStep({
    name: 'Create global styles',
    summary: `First, we will create some styles. We'll provide some default global styles, but feel free to customize or even remove them as you see fit.`,
    destination: 'styles',
    source: join(__dirname, 'templates', 'styles', '*.tsx'),
    context: {},
  })
  .addTransformStep({
    name: 'Add Emotion to _document',
    source: [`pages/_document${extension(true)}`],
    transform(program) {
      return updateDocument(program)
    },
  })
  .addTransformStep({
    name: "Enable Emotion's built-in cache",
    summary: `Next, we wrap our app-level Component in Emotion's CacheProvider with their built-in cache to enable server-side rendering of our styles.`,
    source: [`pages/_app${extension(true)}`],
    transform(program: Collection<j.Program>) {
      const cacheProviderImport = j.importDeclaration(
        [j.importSpecifier(j.identifier('CacheProvider'))],
        j.literal('@emotion/core')
      )

      const cacheImport = j.importDeclaration(
        [j.importSpecifier(j.identifier('cache'))],
        j.literal('emotion')
      )

      addImport(program, cacheImport)
      addImport(program, cacheProviderImport)
      return wrapComponentWithCacheProvider(program)
    },
  })
  .addTransformStep({
    name: 'Apply global styles',
    summary: `Now we'll import and render the global styles.`,
    source: [`pages/_app${extension(true)}`],
    transform(program: Collection<j.Program>) {
      const stylesImport = j.importDeclaration(
        [j.importSpecifier(j.identifier('globalStyles'))],
        j.literal('../styles')
      )

      addImport(program, stylesImport)
      return applyGlobalStyles(program)
    },
  })
  .build()
