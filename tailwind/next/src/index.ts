import { join } from 'path'
import j from 'jscodeshift'
import { Collection } from 'jscodeshift/src/Collection'
import builder from '@prismify/ko/lib/packages/builder'
import extension from './utils/extension'
import { addImport } from './utils/add-import'
export default builder()
  .setName('Tailwind CSS')
  .setDescription(
    `Configure your Blitz app's styling with Tailwind CSS. This recipe will install all necessary dependencies and configure Tailwind for immediate use.`
  )
  .setOwner('adam@markon.codes')
  .addDependencyStep({
    name: 'Add npm dependencies',
    summary: `Tailwind CSS requires a couple of dependencies to get up and running.
We'll install the Tailwind library itself, as well as PostCSS for removing unused styles from our production bundles.`,
    packages: [
      { name: 'tailwindcss', version: '1' },
      { name: 'postcss-preset-env', version: 'latest', isDevDep: true },
    ],
  })
  .addFileStep({
    name: 'Add Tailwind CSS and PostCSS config files',
    summary: `In order to set up Tailwind CSS properly, we need to include a few configuration files. We'll configure Tailwind CSS to know where your app's pages live, and PostCSS for elimination of unused styles.
These config files can be extended for additional customization, but for now we'll just give the minimum required to get started.`,
    destination: '.',
    source: join(__dirname, 'templates', 'config', '*.js'),
  })
  .addFileStep({
    name: 'Add base Tailwind CSS styles',
    summary: `Next, we need to actually create some stylesheets! These stylesheets can either be modified to include global styles for your app, or you can stick to just using classnames in your components.`,
    destination: './app',
    source: join(__dirname, 'templates', 'styles'),
    context: {},
  })
  .addTransformStep({
    name: 'Import stylesheets',
    summary: `Finaly, we can import the stylesheets we just created into our application. For now we'll put them in document.tsx, but if you'd like to only style a part of your app with tailwind you could import the styles lower down in your component tree.`,
    source: [`pages/_app${extension(true)}`],
    transform(program: Collection<j.Program>) {
      const stylesImport = j.importDeclaration(
        [],
        j.literal('app/styles/main.css')
      )
      return addImport(program, stylesImport)
    },
  })
  .build()
