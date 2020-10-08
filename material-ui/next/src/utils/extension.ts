import { resolve } from 'path'
import { existsSync } from 'fs'

export default function extension(jsx = false) {
  return existsSync(resolve('tsconfig.json')) ? (jsx ? '.tsx' : '.ts') : '.js'
}
