import builder from '@prismify/ko/lib/packages/builder'
import extension from './utils/extension'
import j from 'jscodeshift'
import { Collection } from 'jscodeshift/src/Collection'
import { NodePath } from 'ast-types/lib/node-path'
import { addImport } from './utils/add-import'

function wrapComponentWithThemeProvider(program: Collection<j.Program>) {
  program
    .find(j.JSXIdentifier, { name: 'Component' })
    .forEach((path: NodePath) => {
      j(path.parent).replaceWith(
        j.jsxElement(
          j.jsxOpeningElement(j.jsxIdentifier('ThemeProvider')),
          j.jsxClosingElement(j.jsxIdentifier('ThemeProvider')),
          [
            j.jsxText('\n'),
            j.jsxElement(
              j.jsxOpeningElement(j.jsxIdentifier('CSSReset'), [], true)
            ),
            j.jsxText('\n'),
            path.parent.parent.node,
            j.jsxText('\n'),
          ]
        )
      )
    })
  return program
}

export default builder()
  .setName('Chakra UI')
  .setDescription(
    `Configure your app styling with Chakra UI. This recipe will install all necessary dependencies and configure Chakra UI for immediate use.`
  )
  .setOwner('iwatakeshi@gmail.com')
  .addDependencyStep({
    name: 'Add npm dependencies',
    summary: `Chakra requires some other dependencies like emotion to work`,
    packages: [
      '@chakra-ui/core',
      '@emotion/core',
      '@emotion/styled',
      'emotion-theming',
    ],
  })
  .addTransformStep({
    name: 'Import ThemeProvider and CSSReset component',
    summary: `We can import the chakra provider into _app, so it is accessible to the whole app`,
    source: [`pages/_app${extension(true)}`],
    transform(program) {
      const stylesImport = j.importDeclaration(
        [
          j.importSpecifier(j.identifier('CSSReset')),
          j.importSpecifier(j.identifier('ThemeProvider')),
        ],
        j.literal('@chakra-ui/core')
      )

      addImport(program, stylesImport)
      return wrapComponentWithThemeProvider(program)
    },
  })
  .build()
