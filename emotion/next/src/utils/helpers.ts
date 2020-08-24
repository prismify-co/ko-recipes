import j from 'jscodeshift'
import { Collection } from 'jscodeshift/src/Collection'
import { addImport } from './add-import'

export function applyGlobalStyles(program: Collection<j.Program>) {
  program.find(j.FunctionDeclaration).forEach((exportPath) => {
    j(exportPath)
      .find(j.JSXElement, {
        openingElement: { name: { name: 'CacheProvider' } },
      })
      .forEach((elementPath) => {
        if (Array.isArray(elementPath.node.children)) {
          elementPath.node.children.splice(0, 0, j.literal('\n'))
          elementPath.node.children.splice(
            1,
            0,
            j.jsxExpressionContainer(j.identifier('globalStyles'))
          )
        }
      })
  })

  return program
}

export function wrapComponentWithCacheProvider(program: Collection<j.Program>) {
  program.find(j.JSXIdentifier, { name: 'Component' }).forEach((path) => {
    j(path.parent).replaceWith(
      j.jsxElement(
        j.jsxOpeningElement(j.jsxIdentifier('CacheProvider'), [
          j.jsxAttribute(
            j.jsxIdentifier('value'),
            j.jsxExpressionContainer(j.identifier('cache'))
          ),
        ]),
        j.jsxClosingElement(j.jsxIdentifier('CacheProvider')),
        [j.jsxText('\n'), path.parent.parent.node, j.jsxText('\n')]
      )
    )
  })
  return program
}

export function updateDocument(program: Collection<j.Program>) {
  const extractCriticalImport = j.importDeclaration(
    [j.importSpecifier(j.identifier('extractCritical'))],
    j.literal('emotion-server')
  )

  // addImport(program, extractCriticalImport)
  addImport(program, extractCriticalImport)
    .find(j.ClassDeclaration)
    .find(j.ClassBody)
    .find(j.ClassMethod)
    .filter(
      (path) => (path.value.key as j.Identifier).name === 'getInitialProps'
    )
    .find(j.BlockStatement)
    .forEach((path) => {
      let body = [...path.value.body]
      body = body.reverse()
      let [returnStatement, ...rest] = body

      // Create the extractCritical
      const extractCrititcal = j.variableDeclaration('const', [
        j.variableDeclarator(
          j.identifier('styles'),
          j.callExpression(j.identifier('extractCritical'), [
            j.memberExpression(
              j.identifier('initialProps'),
              j.identifier('html')
            ),
          ])
        ),
      ])

      const properties = ((returnStatement as j.ReturnStatement)
        ?.argument as any)?.properties
      properties.push(
        j.property(
          'init',
          j.identifier('styles'),
          // TODO: this should be b.jsxFragment(b.jsxOpeningFragment(), b.jsxClosingFragment(), [
          // but it errors: Cannot read property 'selfClosing' of undefined
          // @see https://github.com/facebook/jscodeshift/issues/368
          j.jsxElement(
            j.jsxOpeningElement(j.jsxIdentifier('')),
            j.jsxClosingElement(j.jsxIdentifier('')),
            [
              j.literal('\n          '),
              j.jsxExpressionContainer(
                j.memberExpression(
                  j.identifier('initialProps'),
                  j.identifier('styles')
                )
              ),
              j.literal('\n          '),
              j.jsxElement(
                j.jsxOpeningElement(
                  j.jsxIdentifier('style'),
                  [
                    j.jsxAttribute(
                      j.jsxIdentifier('data-emotion-css'),
                      j.jsxExpressionContainer(
                        j.callExpression(
                          j.memberExpression(
                            j.memberExpression(
                              j.identifier('styles'),
                              j.identifier('ids')
                            ),
                            j.identifier('join')
                          ),
                          [j.literal(' ')]
                        )
                      )
                    ),
                    j.jsxAttribute(
                      j.jsxIdentifier('dangerouslySetInnerHTML'),
                      j.jsxExpressionContainer(
                        j.objectExpression([
                          j.property(
                            'init',
                            j.identifier('__html'),
                            j.memberExpression(
                              j.identifier('styles'),
                              j.identifier('css')
                            )
                          ),
                        ])
                      )
                    ),
                  ],
                  true
                )
              ),
              j.literal('\n\n        '),
            ]
          )
        )
      )

      body = [returnStatement, extractCrititcal, ...rest].reverse()
      path.replace(j.blockStatement(body))
    })
  return program
}
