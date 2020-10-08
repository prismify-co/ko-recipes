import builder from '@prismify/ko/lib/packages/builder'
import extension from './utils/extension'
import j from 'jscodeshift'
import { Collection } from 'jscodeshift/src/Collection'
import { NodePath } from 'ast-types/lib/node-path'
import { addImport } from './utils/add-import'
import { transformDocument } from './utils/transform-document'

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
              j.jsxOpeningElement(j.jsxIdentifier('CssBaseline'), [], true)
            ),
            path.parent.parent.node,
            j.jsxText('\n'),
          ]
        )
      )
    })
  return program
}

export default builder()
  .setName('Material UI')
  .setDescription(
    `Configure your app styling with Material UI. This recipe will install all necessary dependencies and configure Material UI for immediate use.`
  )
  .setOwner('iwatakeshi@gmail.com')
  .addDependencyStep({
    name: 'Add npm dependencies',
    packages: ['@material-ui/core'],
  })
  .addTransformStep({
    name: 'Import ThemeProvider and CSSReset component',
    summary: `We can import the chakra provider into _app, so it is accessible to the whole app`,
    source: [`pages/_app${extension(true)}`],
    transform(program) {
      const stylesImport = j.importDeclaration(
        [j.importSpecifier(j.identifier('ThemeProvider'))],
        j.literal('@material-ui/core/styles')
      )

      const cssBaselineImport = j.importDeclaration(
        [j.importDefaultSpecifier(j.identifier('CssBaseline'))],
        j.literal('@material-ui/core/CssBaseline')
      )

      addImport(program, cssBaselineImport)

      addImport(program, stylesImport)
      return wrapComponentWithThemeProvider(program)
    },
  })
  .addTransformStep({
    name: 'Configure Document for SSR',
    source: [`pages/_document${extension(true)}`],
    transform: transformDocument,
  })
  .build()
