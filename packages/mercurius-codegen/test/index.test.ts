import './generated'

import assert from 'assert'
import test from 'ava'
import Fastify from 'fastify'
import fs from 'fs'
import { parse, print } from 'graphql'
import mercurius, { IResolvers, MercuriusLoaders } from 'mercurius'
import mkdirp from 'mkdirp'
import path from 'path'
import proxyquire from 'proxyquire'
import rimraf from 'rimraf'
import tmp from 'tmp-promise'
import waitForExpect from 'wait-for-expect'

import {
  codegenMercurius,
  generateCode,
  gql,
  loadSchemaFiles,
  writeGeneratedCode,
  plugin,
} from '../src/index'
import { formatPrettier } from '../src/prettier'
import { buildJSONPath } from '../src/schema'

const { readFile, writeFile, rm } = fs.promises

test.after.always(async () => {
  await rm(buildJSONPath, {
    force: true,
  })

  await new Promise<void>((resolve, reject) => {
    rimraf('./tmp', (err) => {
      if (err) {
        return reject(err)
      }
      resolve()
    })
  })
})

const appWithoutMercurius = Fastify()
const app = Fastify()

const schema = gql`
  scalar DateTime
  type Query {
    hello(greetings: String): String!
    aHuman: Human!
  }
  type Human {
    name: String!
    father: Human
    hasSon(name: String): Boolean
    sons(name: String!): [Human]!
    confirmedSonsNullable(name: String!): [Human!]
    confirmedSonsNonNullItems(name: String!): [Human!]!
    sonNames: [String]
    nonNullssonNames: [String!]!
  }
`

const resolvers: IResolvers = {
  Query: {
    hello(_root, { greetings }, _ctx) {
      return greetings || 'Hello world!'
    },
  },
}

const loaders: MercuriusLoaders = {
  Human: {
    async name(queries, _ctx) {
      return queries.map(({ obj, params }) => {
        return 'name'
      })
    },
    async father(queries, _ctx) {
      queries.map(({ obj, params }) => {})
      return [
        {
          name: 'asd',
        },
      ]
    },
    hasSon: {
      async loader(queries, _ctx) {
        return queries.map((value, key) => {
          return true
        })
      },
    },
  },
}

app.register(mercurius, {
  schema,
  resolvers,
  loaders,
})

let generatedCode: string

test('generates code via plugin', async (t) => {
  t.plan(1)
  await app.ready()
  const pluginOutput = await plugin.plugin(app.graphql.schema, [], {
    namespacedImportName: 'TP_Types',
  })

  t.snapshot(pluginOutput.toString(), 'pluginOutput')
})

test.serial('generates code', async (t) => {
  await app.ready()
  generatedCode = await generateCode(app.graphql.schema)

  t.snapshot(generatedCode, 'code')
})
test.serial('integrates with mercurius', async (t) => {
  t.plan(2)
  const tempTargetPath = await tmp.file()

  const prevConsoleLog = console.log

  const mockConsoleLog = (message: string) => {
    t.assert(message.includes('Code generated at'))
  }

  console.log = mockConsoleLog

  t.teardown(() => {
    console.log = prevConsoleLog
  })

  t.teardown(async () => {
    await tempTargetPath.cleanup()
  })

  await codegenMercurius(app, {
    targetPath: tempTargetPath.path,
    disable: false,
    silent: false,
  })

  t.is(
    generatedCode,
    await readFile(tempTargetPath.path, {
      encoding: 'utf-8',
    })
  )
})

test.serial('integrates with mercurius and respects silent', async (t) => {
  t.plan(1)
  const tempTargetPath = await tmp.file()

  const prevConsoleLog = console.log

  const mockConsoleLog = () => {
    t.fail("shouldn't reach it")
  }

  console.log = mockConsoleLog

  t.teardown(() => {
    console.log = prevConsoleLog
  })

  t.teardown(async () => {
    await tempTargetPath.cleanup()
  })

  await codegenMercurius(app, {
    targetPath: tempTargetPath.path,
    disable: false,
    silent: true,
  })

  t.is(
    generatedCode,
    await readFile(tempTargetPath.path, {
      encoding: 'utf-8',
    })
  )
})

test('writes generated code', async (t) => {
  t.plan(1)
  const code = 'console.log("hello world")'
  const tempTargetPath = await tmp.file()

  t.teardown(async () => {
    await tempTargetPath.cleanup()
  })

  await writeGeneratedCode({
    code,
    targetPath: tempTargetPath.path,
  })

  t.is(
    code,
    await readFile(tempTargetPath.path, {
      encoding: 'utf-8',
    })
  )
})

test('detects fastify instance without mercurius', async (t) => {
  t.plan(1)
  const tempTargetPath = await tmp.file()

  t.teardown(async () => {
    await tempTargetPath.cleanup()
  })

  await codegenMercurius(appWithoutMercurius, {
    targetPath: tempTargetPath.path,
  }).catch((err) => {
    t.is(err.message, 'Mercurius is not registered in Fastify Instance!')
  })
})

test('respects "disable" flag', async (t) => {
  t.plan(1)
  const tempTargetPath = await tmp.file()

  t.teardown(async () => {
    await tempTargetPath.cleanup()
  })

  const { closeWatcher } = await codegenMercurius(app, {
    targetPath: tempTargetPath.path,
    disable: true,
  })

  closeWatcher()

  t.is(
    await readFile(tempTargetPath.path, {
      encoding: 'utf-8',
    }),
    ''
  )
})

test('warns about unsupported namingConvention, respecting silent', async (t) => {
  t.plan(2)

  const namingConvention = 'pascal-case'

  const tempTargetPath = await tmp.file()

  const prevConsoleLog = console.log

  const mockConsoleLog = (message: string) => {
    t.truthy(message)
  }

  console.log = mockConsoleLog

  t.teardown(() => {
    console.log = prevConsoleLog
  })

  const prevConsoleWarn = console.warn

  const mockConsoleWarn = (message: string) => {
    t.is(
      message,
      `namingConvention "${namingConvention}" is not supported! it has been set to "keep" automatically.`
    )
  }

  console.warn = mockConsoleWarn

  t.teardown(() => {
    console.warn = prevConsoleWarn
  })

  t.teardown(async () => {
    await tempTargetPath.cleanup()
  })

  await codegenMercurius(app, {
    targetPath: tempTargetPath.path,
    disable: false,
    silent: false,
    codegenConfig: {
      namingConvention,
    },
  })

  await codegenMercurius(app, {
    targetPath: tempTargetPath.path,
    disable: false,
    silent: true,
    codegenConfig: {
      namingConvention,
    },
  })
})

test('gql helper', (t) => {
  t.plan(2)

  const a = gql`
    query A {
      hello
    }
  `

  const b = gql`
    query B {
      hello
    }
    ${a}
  `

  t.snapshot(print(parse(a)))
  t.snapshot(print(parse(b)))
})

test('non existing file', async (t) => {
  t.plan(1)

  const tempTargetDir = await tmp.dir({
    unsafeCleanup: true,
  })

  t.teardown(async () => {
    await tempTargetDir.cleanup()
  })

  const targetPath = path.join(tempTargetDir.path, './genCode.ts')

  const code = `
  console.log("hello world");
  `

  await writeGeneratedCode({
    code,
    targetPath,
  })

  const writtenCode = await readFile(targetPath, {
    encoding: 'utf-8',
  })

  t.is(writtenCode, code)
})

test('operations with watching', async (t) => {
  t.plan(7)

  const tempTargetPath = await tmp.file()

  t.teardown(async () => {
    await tempTargetPath.cleanup()
  })
  const { closeWatcher } = await codegenMercurius(app, {
    targetPath: tempTargetPath.path,
    operationsGlob: ['./test/operations/*.gql'],
    silent: true,
    watchOptions: {
      enabled: true,
    },
  })

  t.teardown(async () => {
    await closeWatcher()
  })

  const generatedCode = await readFile(tempTargetPath.path, {
    encoding: 'utf-8',
  })

  t.snapshot(generatedCode)

  t.assert(generatedCode.includes('BDocument') === false)

  await fs.promises.writeFile(
    './test/operations/temp.gql',
    gql`
      query B {
        hello
      }
    `
  )

  t.teardown(() => {
    fs.rmSync('./test/operations/temp.gql')
  })

  await waitForExpect(async () => {
    const generatedCode = await readFile(tempTargetPath.path, {
      encoding: 'utf-8',
    })

    assert(generatedCode.includes('BDocument'))
  })

  const generatedCode2 = await readFile(tempTargetPath.path, {
    encoding: 'utf-8',
  })

  t.assert(generatedCode2.includes('BDocument'))

  t.snapshot(generatedCode2)

  // Closing previous watcher
  const { closeWatcher: closeWatcher2 } = await codegenMercurius(app, {
    targetPath: tempTargetPath.path,
    operationsGlob: ['./test/operations/*.gql'],
    silent: true,
    watchOptions: {
      enabled: true,
    },
  })

  t.is(await closeWatcher(), false)
  t.is(await closeWatcher2(), true)

  t.teardown(async () => {
    await closeWatcher2()
  })

  const { closeWatcher: closeWatcher3 } = await codegenMercurius(app, {
    targetPath: tempTargetPath.path,
    operationsGlob: ['./test/operations/*.gql'],
    silent: true,
    watchOptions: {
      enabled: true,
      uniqueWatch: false,
    },
  })
  t.teardown(async () => {
    await closeWatcher3()
  })

  t.is(await closeWatcher3(), true)
})

test.serial('load schema files with watching', async (t) => {
  t.plan(3)

  await mkdirp(path.join(process.cwd(), 'tmp', 'load-schema'))

  const tempTargetDir = await tmp.dir({
    unsafeCleanup: true,
    dir: 'load-schema',
    tmpdir: path.join(process.cwd(), 'tmp'),
  })

  t.teardown(async () => {
    await tempTargetDir.cleanup()
  })

  await writeFile(
    path.join(tempTargetDir.path, 'a.gql'),
    gql`
      type Query {
        hello: String!
      }
    `
  )

  let resolveChangePromise: (value: string[]) => void

  const changePromise = new Promise<string[]>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(Error('Change promise timed out'))
    }, 20000)
    resolveChangePromise = (value) => {
      clearTimeout(timeout)
      resolve(value)
    }
  })
  const { schema, closeWatcher, watcher } = loadSchemaFiles(
    path.join(tempTargetDir.path, '*.gql'),
    {
      silent: true,
      watchOptions: {
        enabled: true,
        onChange(schema) {
          resolveChangePromise(schema)
        },
        chokidarOptions: {
          // usePolling: true,
        },
      },
    }
  )

  t.teardown(async () => {
    await closeWatcher()
  })

  const { closeWatcher: closeIsolatedWatcher } = loadSchemaFiles(
    path.join(tempTargetDir.path, '*.gql'),
    {
      silent: false,
      watchOptions: {
        enabled: true,
        uniqueWatch: false,
      },
    }
  )

  t.teardown(async () => {
    await closeIsolatedWatcher()
  })

  const { closeWatcher: closeNoWatcher } = loadSchemaFiles(
    path.join(tempTargetDir.path, '*.gql'),
    {
      silent: true,
      watchOptions: {
        enabled: false,
        uniqueWatch: false,
      },
    }
  )

  t.teardown(async () => {
    await closeNoWatcher()
  })

  t.snapshot(schema.join('\n'))

  await watcher

  await writeFile(
    path.join(tempTargetDir.path, 'b.gql'),
    gql`
      extend type Query {
        hello2: String!
      }
    `
  )

  const schema2 = await changePromise

  t.snapshot(schema2)

  const { closeWatcher: closeWatcher2 } = loadSchemaFiles(
    path.join(tempTargetDir.path, '*.gql'),
    {
      silent: true,
      watchOptions: {
        enabled: true,
        onChange(schema) {
          resolveChangePromise(schema)
        },
        chokidarOptions: {
          // usePolling: true,
        },
      },
    }
  )

  t.teardown(async () => {
    await closeWatcher2()
  })

  const noWatcher = loadSchemaFiles(path.join(tempTargetDir.path, '*.gql'))

  t.snapshot(noWatcher.schema.join('\n'))
})

test.serial('load schema watching error handling', async (t) => {
  t.plan(4)

  await mkdirp(path.join(process.cwd(), 'tmp', 'load-schema-errors'))

  const tempTargetDir = await tmp.dir({
    unsafeCleanup: true,
    dir: 'load-schema-errors',
    tmpdir: path.join(process.cwd(), 'tmp'),
  })

  t.teardown(async () => {
    await tempTargetDir.cleanup()
  })

  await writeFile(
    path.join(tempTargetDir.path, 'a.gql'),
    gql`
      type Query {
        hello: String!
      }
    `
  )

  let resolveChangePromise: (value: string[]) => void

  const changePromise = new Promise<string[]>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(Error('Change promise timed out'))
    }, 2000)
    resolveChangePromise = (value) => {
      clearTimeout(timeout)
      resolve(value)
    }
  })
  const { schema, closeWatcher, watcher } = loadSchemaFiles(
    path.join(tempTargetDir.path, '*.gql'),
    {
      silent: true,
      watchOptions: {
        enabled: true,
        onChange(schema) {
          resolveChangePromise(schema)

          throw Error('expected error')
        },
      },
    }
  )

  t.teardown(() => void closeWatcher())
  await watcher

  t.snapshot(schema.join('\n'))

  const prevConsoleError = console.error

  let called = false
  console.error = (err: any) => {
    t.deepEqual(err, Error('expected error'))
    called = true
  }

  t.teardown(() => {
    console.error = prevConsoleError
  })

  await writeFile(
    path.join(tempTargetDir.path, 'b.gql'),
    gql`
      extend type Query {
        hello2: String!
      }
    `
  )

  const schema2 = await changePromise

  console.error = prevConsoleError

  t.snapshot(schema2.join('\n'))

  t.is(called, true)
})

test.serial('load schema with no files', async (t) => {
  t.plan(1)
  await mkdirp(path.join(process.cwd(), 'tmp', 'load-schema-throw'))

  const tempTargetDir = await tmp.dir({
    unsafeCleanup: true,
    dir: 'load-schema-throw',
    tmpdir: path.join(process.cwd(), 'tmp'),
  })

  t.teardown(async () => {
    await tempTargetDir.cleanup()
  })

  t.throws(
    () => {
      loadSchemaFiles(path.join(tempTargetDir.path, '*.gql'))
    },
    {
      message: 'No GraphQL Schema files found!',
    }
  )
})

test.serial('pre-built schema', async (t) => {
  rimraf.sync(buildJSONPath)

  await fs.promises.writeFile(
    buildJSONPath,
    JSON.stringify([
      await formatPrettier(
        gql`
          type Query {
            hello: String!
          }
        `,
        'graphql'
      ),
    ]).replace(/\r\n/g, '\n'),
    {
      encoding: 'utf-8',
    }
  )

  const {
    loadSchemaFiles,
  }: typeof import('../src/schema') = proxyquire.noPreserveCache()(
    '../src/schema',
    {}
  )

  const { schema } = loadSchemaFiles('./test/operations/*.gql', {
    prebuild: {
      enabled: true,
    },
  })

  t.snapshot(schema)

  const {
    loadSchemaFiles: loadSchemaFilesManipulated,
  }: typeof import('../src/schema') = proxyquire.noPreserveCache()(
    '../src/schema',
    {
      [buildJSONPath]: [123],
    }
  )

  const { schema: schemaPreloadManipulated } = loadSchemaFilesManipulated(
    './test/operations/*.gql',
    {
      prebuild: {
        enabled: true,
      },
    }
  )

  t.snapshot(schemaPreloadManipulated)
})

codegenMercurius(app, {
  targetPath: './test/generated.ts',
  operationsGlob: ['./test/operations/*.gql'],
  disable: false,
  silent: true,
  codegenConfig: {
    scalars: {
      DateTime: 'Date',
    },
    defaultMapper: 'DeepPartial<{T}>',
  },
}).catch(console.error)
