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
  targetPath: './src/graphql/generated.ts',
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

### Operations

**mercurius-codegen** also supports giving it GraphQL Operation files, basically client `queries`, `mutations` or `subscriptions`, and it creates [Typed Document Nodes](https://github.com/dotansimha/graphql-typed-document-node), that later can be used by other libraries, like for example [mercurius-integration-testing](https://github.com/mercurius-js/mercurius-integration-testing) (_that has native support for typed document nodes_), and then be able to have end-to-end type-safety and auto-completion.

> You might need to install `@graphql-typed-document-node/core` manually in your project.

```ts
import mercuriusCodegen from 'mercurius-codegen'

mercuriusCodegen(app, {
  targetPath: './src/graphql/generated.ts',
  // You can also specify an array of globs
  operationsGlob: './src/graphql/operations/*.gql',
}).catch(console.error)
```

> /your-project/src/graphql/operations/example.gql

```graphql
query hello {
  HelloWorld
}
```

Then, for example, in your tests:

```ts
import { createMercuriusTestClient } from 'mercurius-integration-testing'

import { helloDocument } from '../src/graphql/generated'
import { app } from '../src/server'

// ...

const client = createMercuriusTestClient(app)

const response = await client.query(helloDocument)

// response is completely typed!
```

> Keep in mind that you can always call `mercuriusCodegen` multiple times for different environments and different paths if you prefer to keep the production code as light as possible (which is generally a good practice).

## LazyPromise

This library also exports a very lightweight helper that is very useful for lazy resolution of promises, for example, to prevent un-requested data to be fetched from a database.

Basically, it create a lazy promise that defers execution until it's awaited or when .then() / .catch() is called, perfect for GraphQL Resolvers.

> Internally it uses [p-lazy](https://github.com/sindresorhus/p-lazy), which is also re-exported from this library

```ts
import { LazyPromise } from 'mercurius-codegen'

// ...

// users == Promise<User[]>
const users = LazyPromise(() => {
  return db.users.findMany({
    // ...
  })
})
```

### Options

There are some extra options that can be specified:

```ts
interface CodegenMercuriusOptions {
  /**
   * Specify the target path of the code generation.
   *
   * Relative to the directory of the executed script if targetPath isn't absolute
   * @example './src/graphql/generated.ts'
   */
  targetPath: string
  /**
   * Disable the code generation manually
   *
   * @default process.env.NODE_ENV === 'production'
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
   * }
   */
  codegenConfig?: CodegenPluginsConfig
  /**
   * Add code in the beginning of the generated code
   */
  preImportCode?: string
  /**
   * Operations glob patterns
   */
  operationsGlob?: string[] | string
  /**
   * Watch Options for operations GraphQL files
   */
  watchOptions?: {
    /**
     * Enable file watching
     *
     * @default false
     */
    enabled?: boolean
    /**
     * Extra Chokidar options to be passed
     */
    chokidarOptions?: ChokidarOptions
    /**
     * Unique watch instance
     *
     * `Specially useful for hot module replacement environments, preventing memory leaks`
     *
     * @default true
     */
    uniqueWatch?: boolean
  }
  /**
   * Write the resulting schema as a `.gql` or `.graphql` schema file.
   *
   * If `true`, it outputs to `./schema.gql`
   * If a string it specified, it writes to that location
   *
   * @default false
   */
  outputSchema?: boolean | string
}

mercuriusCodegen(app, {
  targetPath: './src/graphql/generated.ts',
  operationsGlob: ['./src/graphql/operations/*.gql'],
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
  watchOptions: {
    enabled: true,
  },
  outputSchema: true,
}).catch(console.error)
```

### GraphQL Schema from files

As shown in the [**examples/codegen-gql-files**](/examples/codegen-gql-files/src/index.ts), you can load all your schema type definitions directly from GraphQL _.gql_ files, and this library gives you a function that eases that process, allowing you to get the schema from files, watch for changes and preloading the schema for production environments.

- Usage options

```ts
export interface LoadSchemaOptions {
  /**
   * Watch options
   */
  watchOptions?: {
    /**
     * Enable file watching
     * @default false
     */
    enabled?: boolean
    /**
     * Custom function to be executed after schema change
     */
    onChange?: (schema: string[]) => void
    /**
     * Extra Chokidar options to be passed
     */
    chokidarOptions?: ChokidarOptions
    /**
     * Unique watch instance
     *
     * `Specially useful for hot module replacement environments, preventing memory leaks`
     *
     * @default true
     */
    uniqueWatch?: boolean
  }
  /**
   * Pre-build options
   */
  prebuild?: {
    /**
     * Enable use pre-built schema if found.
     *
     * @default process.env.NODE_ENV === "production"
     */
    enabled?: boolean
  }
  /**
   * Don't notify to the console
   */
  silent?: boolean
}
```

```ts
import Fastify from 'fastify'
import mercurius from 'mercurius'
import { buildSchema } from 'graphql'
import mercuriusCodegen, { loadSchemaFiles } from 'mercurius-codegen'

const app = Fastify()

const { schema } = loadSchemaFiles('src/graphql/schema/**/*.gql', {
  watchOptions: {
    enabled: process.env.NODE_ENV === 'development',
    onChange(schema) {
      app.graphql.replaceSchema(buildSchema(schema.join('\n')))
      app.graphql.defineResolvers(resolvers)

      mercuriusCodegen(app, {
        targetPath: './src/graphql/generated.ts',
        operationsGlob: './src/graphql/operations/*.gql',
      }).catch(console.error)
    },
  },
})

app.register(mercurius, {
  schema,
  // ....
})
```

## License

MIT

---
