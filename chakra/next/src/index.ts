import builder from '@prismify/ko/lib/packages/installer/builder'
import { builders } from 'ast-types/gen/builders'
import { ASTNode } from 'ast-types/lib/types'
import { NamedTypes } from 'ast-types/gen/namedTypes'
import { visit } from 'ast-types'
import { addImport } from './utils/add-import'
import extension from './utils/extension'

function wrapComponentWithThemeProvider(
  ast: ASTNode,
  b: builders,
  t: NamedTypes
) {
  if (!t.File.check(ast)) return

  visit(ast, {
    visitExportDefaultDeclaration(path) {
      return this.traverse(path)
    },
    visitJSXElement(path) {
      const { node } = path
      if (
        t.JSXIdentifier.check(node.openingElement.name) &&
        // TODO: need a better way to detect the Component
        node.openingElement.name.name === 'Component'
      ) {
        path.replace(
          b.jsxElement(
            b.jsxOpeningElement(b.jsxIdentifier('ThemeProvider')),
            b.jsxClosingElement(b.jsxIdentifier('ThemeProvider')),
            [
              b.literal('\n  \t  '),
              b.jsxElement(
                b.jsxOpeningElement(b.jsxIdentifier('CSSReset'), [], true)
              ),
              b.literal('\n  \t  '),
              node,
              b.literal('\n    '),
            ]
          )
        )
        return false
      }
      return this.traverse(path)
    },
  })

  return ast
}

export default builder()
  .setName('Chakra UI')
  .setDescription(
    `Configure your app styling with Chakra UI. This recipe will install all necessary dependencies and configure Chakra UI for immediate use.`
  )
  .setOwner('iwatakeshi@gmail.com')
  .addDependencyStep({
    name: 'Add npm dependencies',
    explanation: `Chakra requires some other dependencies like emotion to work`,
    packages: [
      '@chakra-ui/core',
      '@emotion/core',
      '@emotion/styled',
      'emotion-theming',
    ],
  })
  .addTransformStep({
    name: 'Import ThemeProvider and CSSReset component',
    explanation: `We can import the chakra provider into _app, so it is accessible to the whole app`,
    files: [`pages/_app${extension(true)}`],
    transform(ast: ASTNode, b: builders, t: NamedTypes) {
      const stylesImport = b.importDeclaration(
        [
          b.importSpecifier(b.identifier('CSSReset')),
          b.importSpecifier(b.identifier('ThemeProvider')),
        ],
        b.literal('@chakra-ui/core')
      )

      if (t.File.check(ast)) {
        addImport(ast, b, t, stylesImport)
        return wrapComponentWithThemeProvider(ast, b, t)!
      }

      throw new Error('A valid source file was not given')
    },
  })
  .build()
