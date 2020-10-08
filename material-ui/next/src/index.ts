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
    transform(program) {
      // import ServerStyleSheets
      const serverStyleSheetsImport = j.importDeclaration(
        [j.importSpecifier(j.identifier('ServerStyleSheets'))],
        j.literal('@material-ui/core/styles')
      )

      let isReactImported = false

      program
        .find(j.ImportDeclaration, { source: 'react' })
        .forEach((reactImportPath) => {
          isReactImported = true
          if (
            reactImportPath.value.specifiers.some((spec) =>
              j.ImportDefaultSpecifier.check(spec)
            )
          ) {
            reactImportPath.value.specifiers.splice(
              0,
              0,
              j.importDefaultSpecifier(j.identifier('React'))
            )
          }
        })
      program
        .find(j.ImportDeclaration, { source: { value: 'blitz' } })
        .forEach((blitzImportPath) => {
          if (
            !blitzImportPath.value.specifiers
              .filter((spec) => j.ImportSpecifier.check(spec))
              .some(
                (node) =>
                  (node as j.ImportSpecifier)?.imported?.name ===
                  'DocumentContext'
              )
          ) {
            blitzImportPath.value.specifiers.splice(
              0,
              0,
              j.importSpecifier(j.identifier('DocumentContext'))
            )
          }
        })
      program.find(j.ClassBody).forEach((path) => {
        const { node } = path

        const ctxParam = j.identifier('ctx')
        ctxParam.typeAnnotation = j.tsTypeAnnotation(
          j.tsTypeReference(j.identifier('DocumentContext'))
        )

        const getInitialPropsBody = j.blockStatement([
          j.variableDeclaration('const', [
            j.variableDeclarator(
              j.identifier('sheets'),
              j.newExpression(j.identifier('ServerStyleSheets'), [])
            ),
          ]),
          j.variableDeclaration('const', [
            j.variableDeclarator(
              j.identifier('originalRenderPage'),
              j.memberExpression(
                j.identifier('ctx'),
                j.identifier('renderPage')
              )
            ),
          ]),
          j.expressionStatement(
            j.assignmentExpression(
              '=',
              j.memberExpression(
                j.identifier('ctx'),
                j.identifier('renderPage')
              ),
              j.arrowFunctionExpression(
                [],
                j.callExpression(j.identifier('originalRenderPage'), [
                  j.objectExpression([
                    j.objectProperty(
                      j.identifier('enhanceApp'),
                      j.arrowFunctionExpression(
                        [j.identifier('App')],
                        j.arrowFunctionExpression(
                          [j.identifier('props')],
                          j.callExpression(
                            j.memberExpression(
                              j.identifier('sheets'),
                              j.identifier('collect')
                            ),
                            [
                              j.jsxElement(
                                j.jsxOpeningElement(
                                  j.jsxIdentifier('App'),
                                  [j.jsxSpreadAttribute(j.identifier('props'))],
                                  true
                                )
                              ),
                            ]
                          )
                        )
                      )
                    ),
                  ]),
                ])
              )
            )
          ),
          j.variableDeclaration('const', [
            j.variableDeclarator(
              j.identifier('initialProps'),
              j.awaitExpression(
                j.callExpression(
                  j.memberExpression(
                    j.identifier('Document'),
                    j.identifier('getInitialProps')
                  ),
                  [j.identifier('ctx')]
                )
              )
            ),
          ]),
          j.returnStatement(
            j.objectExpression([
              j.spreadElement(j.identifier('initialProps')),
              j.objectProperty(
                j.identifier('styles'),
                j.arrayExpression([
                  j.spreadElement(
                    j.callExpression(
                      j.memberExpression(
                        j.memberExpression(
                          j.identifier('React'),
                          j.identifier('Children')
                        ),
                        j.identifier('toArray')
                      ),
                      [
                        j.memberExpression(
                          j.identifier('initialProps'),
                          j.identifier('styles')
                        ),
                      ]
                    )
                  ),
                  j.callExpression(
                    j.memberExpression(
                      j.identifier('sheets'),
                      j.identifier('getStyleElement')
                    ),
                    []
                  ),
                ])
              ),
            ])
          ),
        ])

        const getInitialPropsMethod = j.classMethod(
          'method',
          j.identifier('getInitialProps'),
          [ctxParam],
          getInitialPropsBody,
          false,
          true
        )
        getInitialPropsMethod.async = true

        // TODO: better way will be to check if the method already exists and modify it or else add it
        // currently it gets added assuming it did not exist before
        node.body.splice(0, 0, getInitialPropsMethod)
      })

      // import React if it wasn't already imported
      if (!isReactImported) {
        const reactImport = j.importDeclaration(
          [j.importDefaultSpecifier(j.identifier('React'))],
          j.literal('react')
        )
        addImport(program, reactImport)
      }

      addImport(program, serverStyleSheetsImport)

      return program
    },
  })
  .build()
