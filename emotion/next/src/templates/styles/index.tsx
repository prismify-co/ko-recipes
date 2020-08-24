import { css, Global } from '@emotion/core'

export const globalStyles = (
  <Global
    styles={css`
      html,
      body {
        background-color: white;
        font-family: Helvetica, Arial, sans-serif;
        font-size: 24px;
        margin: 0;
        min-height: 100vh;
      }
    `}
  />
)
