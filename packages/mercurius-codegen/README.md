# mercurius-codegen

[![npm version](https://badge.fury.io/js/mercurius-codegen.svg)](https://badge.fury.io/js/mercurius-codegen)

Get full type-safety and autocompletion for [Mercurius](http://mercurius.dev/) using [TypeScript](https://www.typescriptlang.org/) and [GraphQL Code Generator](https://graphql-code-generator.com/) seamlessly while you code.

```sh
pnpm add mercurius-codegen
# or
yarn add mercurius-codegen
# or
npm install mercurius-codegen
```

## Usage

> **For convenience**, this package also exports a _fake_ `gql` tag that gives tooling support for _"prettier formatting"_ and _"IDE syntax highlighting"_. **It's completely optional**.

```ts
import Fastify from 'fastify'
import mercurius from 'mercurius'
import mercuriusCodegen, { gql } from 'mercurius-codegen'

const app = Fastify()

app.register(mercurius, {
  schema: gql`
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
}).catch(console.error)

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

It also gives type-safety for [Mercurius Loaders](https://mercurius.dev/#/docs/loaders):

```ts
import { MercuriusLoaders } from 'mercurius'

// Fully typed!
export const loaders: MercuriusLoaders = {
  Dog: {
    async owner(queries, ctx) {
      // queries & ctx are typed accordingly
      return queries.map(({ obj, params }) => {
        // obj & params are typed accordingly
        return owners[obj.name]
      })
    },
  },
}
```

> By default it disables itself if `NODE_ENV` is **'production'**

> It automatically uses [prettier](https://prettier.io/) resolving the most nearby config for you.

### Options

There are a couple extra options that can be specified:

```ts
interface CodegenMercuriusOptions {
  /**
   * Specify the target path of the code generation.
   *
   * Relative to the directory of the executed script if targetPath isn't absolute
   * @example './src/generated/graphql.ts'
   */
  targetPath: string
  /**
   * Disable the code generation manually, by default it's `process.env.NODE_ENV === 'production'`
   */
  disable?: boolean
  /**
   * Don't notify to the console
   */
  silent?: boolean
  /**
   * Specify GraphQL Code Generator configuration
   * @example
   * codegenConfig: {
   *    scalars: {
   *        DateTime: "Date",
   *    },
   *    defaultMapper: "DeepPartial<{T}>"
   * }
   * @default
   * codegenConfig: {
   *    defaultMapper: "DeepPartial<{T}>"
   * }
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
    defaultMapper: 'DeepPartial<{T}>',
  },
  preImportCode: `
  // Here you can put any code and it will be added at very beginning of the file
  `,
}).catch(console.error)
```

## License

MIT
