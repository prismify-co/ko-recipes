import { join } from 'path'
import j from 'jscodeshift'
import { Collection } from 'jscodeshift/src/Collection'
import builder from '@prismify/ko/lib/packages/builder'
import extension from './utils/extension'
import { addImport } from './utils/add-import'

function wrapComponentWithCacheProvider(program: Collection<j.Program>) {
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

function applyGlobalStyles(program: Collection<j.Program>) {
  program.find(j.ExportDefaultDeclaration).forEach((exportPath) => {
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

function addMethodToCustomDocument(
  program: Collection<j.Program>,
  methodToAdd: j.MethodDefinition
) {
  program.find(j.ClassBody).forEach((path) => {
    path.node.body.splice(0, 0, methodToAdd)
  })

  return program
}

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
    destination: './styles',
    source: join(__dirname, 'templates', 'styles', '*.tsx'),
    context: {},
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
  .addTransformStep({
    name: 'Extract critical CSS',
    summary: `We will now call Emotion's extractCritical function in the getInitialProps method of our custom Document class to extract the critical CSS on the server.
We also inject a style tag to inline the critical styles for every server response.`,
    source: [`pages/_app${extension(true)}`],
    transform(program: Collection<j.Program>) {
      const extractCriticalImport = j.importDeclaration(
        [j.importSpecifier(j.identifier('extractCritical'))],
        j.literal('emotion-server')
      )

      const ctxParam = j.identifier('ctx')
      ctxParam.typeAnnotation = j.tsTypeAnnotation(
        j.tsTypeReference(j.identifier('DocumentContext'))
      )

      const getInitialPropsBody = j.blockStatement([
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
        j.variableDeclaration('const', [
          j.variableDeclarator(
            j.identifier('styles'),
            j.callExpression(j.identifier('extractCritical'), [
              j.memberExpression(
                j.identifier('initialProps'),
                j.identifier('html')
              ),
            ])
          ),
        ]),
        j.returnStatement(
          j.objectExpression([
            j.spreadElement(j.identifier('initialProps')),
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
                  j.literal('\n        '),
                ]
              )
            ),
          ])
        ),
      ])

      const getInitialPropsFuncExpr = j.functionExpression(
        null,
        [ctxParam],
        getInitialPropsBody
      )
      getInitialPropsFuncExpr.async = true

      const getInitialPropsMethod = j.methodDefinition(
        'method',
        j.identifier('getInitialProps'),
        getInitialPropsFuncExpr,
        true // static
      )

      addImport(program, extractCriticalImport)
      return addMethodToCustomDocument(program, getInitialPropsMethod)
    },
  })
  .build()
