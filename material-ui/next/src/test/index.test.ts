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

const expected = `import Document, { Html, Head, Main, NextScript } from 'next/document'

import { ServerStyleSheets } from "@material-ui/core/styles";
import React from "react";

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

describe('material-ui', () => {
  describe('document.tsx', () => {
    test('transform the document.tsx for material ui', () => {
      const transformed = transformer(source, transformDocument)
      expect(transformed).toBe(expected)
    })
  })
})
