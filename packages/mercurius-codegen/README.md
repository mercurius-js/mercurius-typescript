# mercurius-codegen

[![npm version](https://badge.fury.io/js/mercurius-codegen.svg)](https://badge.fury.io/js/mercurius-codegen)

Get full type-safety and autocompletion for [mercurius](http://mercurius.dev/) with [TypeScript](https://www.typescriptlang.org/) using [GraphQL Code Generator](https://graphql-code-generator.com/) seamlessly while you code.

```sh
pnpm add mercurius-codegen
# or
yarn add mercurius-codegen
# or
npm install mercurius-codegen
```

## Usage

```ts
// src/index.ts
import Fastify from 'fastify'
import mercurius from 'mercurius'
import mercuriusCodegen from 'mercurius-codegen'

const app = Fastify()

app.register(mercurius, {
  schema: `
    type Query {
        hello(greetings: String!): String!
    }
    `,
  resolvers: {
    Query: {
      hello(_root, { greetings }) {
        // greetings ~ string
        return 'Hello World'
      },
    },
  },
})

mercuriusCodegen(app, {
  targetPath: './src/generated/graphql.ts',
})

// Then it will automatically generate the file,
// and without doing anything special,
// the resolvers are going to be typed,
// or if your resolvers are in different files...

app.listen(8000)
```

```ts
import { IResolvers } from 'mercurius'

// Fully typed!
export const resolvers: IResolvers = {
  Query: {
    hello(_root, { greetings }) {
      // greetings ~ string
      return 'Hello World'
    },
  },
}
```

> By default it disables itself if NODE_ENV is 'production'

> It automatically uses [prettier](https://prettier.io/) resolving the most nearby config for you

### Options

There are a couple extra options to be specified

````ts
interface CodegenMercuriusOptions {
  /**
   * Specify the target path of the code generation.
   *
   * Relative to the directory of the executed script if targetPath isn't absolute
   * @example './src/generated/graphql.ts'
   */
  targetPath: string
  /**
   * Disable the code generation manully, by default it's `process.env.NODE_ENV === 'production'`
   */
  disable?: boolean
  /**
   * Don't notify to the console
   */
  silent?: boolean
  /**
   * Specify GraphQL Code Generator configuration
   * @example
   * ```js
   * codegenConfig: {
   *    scalars: {
   *        DateTime: "Date",
   *    }
   * }
   * ```
   */
  codegenConfig?: CodegenPluginsConfig
  /**
   * Add code in the beginning of the generated code
   */
  preImportCode?: string
}

mercuriusCodegen(app, {
  targetPath: './src/generated/graphql.ts',
  disable: false,
  silent: true,
  codegenConfig: {
    scalars: {
      DateTime: 'Date',
    },
  },
  preImportCode: `
  // Here you can put any code and it will be added at very beginning of the file
  `,
})
````

## License

MIT
