import transformer from '@prismify/ko/lib/packages/transformer'
import { transformDocument } from '../utils/transform-document'

const source = `import Document, { Html, Head, Main, NextScript } from 'next/document'

class MyDocument extends Document {
  static async getInitialProps(ctx) {
    const initialProps = await Document.getInitialProps(ctx)
    return { ...initialProps }
  }

  render() {
    return (
      <Html>
        <Head />
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    )
  }
}

export default MyDocument`

const expected = `import Document, { DocumentContext, Html, Head, Main, NextScript } from 'next/document';

import { ServerStyleSheets } from "@material-ui/core/styles";
import React from "react";

class MyDocument extends Document {
  static async getInitialProps(ctx) {
    const sheets = new ServerStyleSheets();
    const originalRenderPage = ctx.renderPage;
    const initialProps = await Document.getInitialProps(ctx)

    ctx.renderPage = () => originalRenderPage({
      enhanceApp: App => props => sheets.collect(<App {...props} />)
    });

    return {
      ...initialProps,
      styles: [...React.Children.toArray(initialProps.styles), sheets.getStyleElement()]
    };
  }

  render() {
    return (
      <Html>
        <Head />
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    )
  }
}

export default MyDocument`

describe('material-ui', () => {
  describe('document.tsx', () => {
    test('transform the document.tsx for material ui', () => {
      const transformed = transformer(source, transformDocument)
      expect(transformed).toStrictEqual(expected)
    })
  })
})
