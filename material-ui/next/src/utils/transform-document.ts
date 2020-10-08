import { Transformer } from '@prismify/ko/lib/packages/transformer/types'
import j from 'jscodeshift'
import { addImport } from './add-import'
export const transformDocument: Transformer = (program) => {
  // import ServerStyleSheets
  const serverStyleSheetsImport = j.importDeclaration(
    [j.importSpecifier(j.identifier('ServerStyleSheets'))],
    j.literal('@material-ui/core/styles')
  )

  addImport(program, serverStyleSheetsImport)

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
    .find(j.ImportDeclaration)
    .forEach((importPath) => {
      if (
        !importPath.value.specifiers
          .filter((spec) => j.ImportSpecifier.check(spec))
          .some(
            (node) =>
              (node as j.ImportSpecifier)?.imported?.name === 'DocumentContext'
          )
      ) {
        importPath.value.specifiers.splice(
          0,
          0,
          j.importSpecifier(j.identifier('DocumentContext'))
        )
      }
    })
    .find(j.MethodDefinition)
    .forEach((path) => {
      if ((path.value.key as any).name !== 'getInitialProps') return
      const body = j(path).find(j.BlockStatement).get('body')
      const [variableDeclaration] = body.value
      const sheets = j.variableDeclaration('const', [
        j.variableDeclarator(
          j.identifier('sheets'),
          j.newExpression(j.identifier('ServerStyleSheets'), [])
        ),
      ])

      const originalRenderPage = j.variableDeclaration('const', [
        j.variableDeclarator(
          j.identifier('originalRenderPage'),
          j.memberExpression(j.identifier('ctx'), j.identifier('renderPage'))
        ),
      ])

      const ctxRenderPage = j.expressionStatement(
        j.assignmentExpression(
          '=',
          j.memberExpression(j.identifier('ctx'), j.identifier('renderPage')),
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
      )

      const returnStatement = j.returnStatement(
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
      )

      const classMethod = j.classMethod(
        'method',
        j.identifier('getIntialProps'),
        [j.identifier('ctx')],
        j.blockStatement([
          sheets,
          originalRenderPage,
          variableDeclaration,
          ctxRenderPage,
          returnStatement,
        ]),
        false,
        true
      )

      classMethod.async = true

      j(path).replaceWith(classMethod)
    })

  // import React if it wasn't already imported
  if (!isReactImported) {
    const reactImport = j.importDeclaration(
      [j.importDefaultSpecifier(j.identifier('React'))],
      j.literal('react')
    )
    addImport(program, reactImport)
  }
  return program
}
