import './generated'

import Fastify from 'fastify'
import fs from 'fs'
import { parse, print } from 'graphql'
import mercurius, { IResolvers, MercuriusLoaders } from 'mercurius'
import path from 'path'
import tap from 'tap'
import tmp from 'tmp-promise'

import {
  codegenMercurius,
  generateCode,
  gql,
  writeGeneratedCode,
} from '../src/index'

const { readFile } = fs.promises

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
tap
  .test('generates code', async (t) => {
    await app.ready()
    generatedCode = await generateCode(app.graphql.schema)

    t.matchSnapshot(generatedCode, 'code')

    t.done()
  })
  .then(() => {
    tap.test('integrates with mercurius', async (t) => {
      t.plan(2)
      const tempTargetPath = await tmp.file()

      const prevConsoleLog = console.log

      const mockConsoleLog = (message: string) => {
        t.assert(message.includes('Code generated at'))
      }

      console.log = mockConsoleLog

      t.tearDown(() => {
        console.log = prevConsoleLog
      })

      t.tearDown(async () => {
        await tempTargetPath.cleanup()
      })

      await codegenMercurius(app, {
        targetPath: tempTargetPath.path,
        disable: false,
        silent: false,
      })

      t.equals(
        generatedCode,
        await readFile(tempTargetPath.path, {
          encoding: 'utf-8',
        })
      )
    })

    tap.test('integrates with mercurius and respects silent', async (t) => {
      t.plan(1)
      const tempTargetPath = await tmp.file()

      const prevConsoleLog = console.log

      const mockConsoleLog = () => {
        t.bailout("shouldn't reach it")
      }

      console.log = mockConsoleLog

      t.tearDown(() => {
        console.log = prevConsoleLog
      })

      t.tearDown(async () => {
        await tempTargetPath.cleanup()
      })

      await codegenMercurius(app, {
        targetPath: tempTargetPath.path,
        disable: false,
        silent: true,
      })

      t.equals(
        generatedCode,
        await readFile(tempTargetPath.path, {
          encoding: 'utf-8',
        })
      )
    })
  })

tap.test('writes generated code', async (t) => {
  t.plan(1)
  const code = 'console.log("hello world")'
  const tempTargetPath = await tmp.file()

  t.tearDown(async () => {
    await tempTargetPath.cleanup()
  })

  await writeGeneratedCode({
    code,
    targetPath: tempTargetPath.path,
  })

  t.equals(
    code,
    await readFile(tempTargetPath.path, {
      encoding: 'utf-8',
    })
  )
})

tap.test('detects fastify instance without mercurius', async (t) => {
  t.plan(1)
  const tempTargetPath = await tmp.file()

  t.tearDown(async () => {
    await tempTargetPath.cleanup()
  })

  await codegenMercurius(appWithoutMercurius, {
    targetPath: tempTargetPath.path,
  }).catch((err) => {
    t.equal(err.message, 'Mercurius is not registered in Fastify Instance!')
  })
})

tap.test('respects "disable" flag', async (t) => {
  t.plan(1)
  const tempTargetPath = await tmp.file()

  t.tearDown(async () => {
    await tempTargetPath.cleanup()
  })

  await codegenMercurius(app, {
    targetPath: tempTargetPath.path,
    disable: true,
  })

  t.equal(
    await readFile(tempTargetPath.path, {
      encoding: 'utf-8',
    }),
    ''
  )
})

tap.test(
  'warns about unsupported namingConvention, respecting silent',
  async (t) => {
    t.plan(2)

    const namingConvention = 'pascal-case'

    const tempTargetPath = await tmp.file()

    const prevConsoleLog = console.log

    const mockConsoleLog = (message: string) => {
      t.ok(message)
    }

    console.log = mockConsoleLog

    t.tearDown(() => {
      console.log = prevConsoleLog
    })

    const prevConsoleWarn = console.warn

    const mockConsoleWarn = (message: string) => {
      t.equal(
        message,
        `namingConvention "${namingConvention}" is not supported! it has been set to "keep" automatically.`
      )
    }

    console.warn = mockConsoleWarn

    t.tearDown(() => {
      console.warn = prevConsoleWarn
    })

    t.tearDown(async () => {
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
  }
)

tap.test('gql helper', (t) => {
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

  t.matchSnapshot(print(parse(a)))
  t.matchSnapshot(print(parse(b)))
})

tap.test('non existing file', async (t) => {
  t.plan(1)

  const tempTargetDir = await tmp.dir({
    unsafeCleanup: true,
  })

  t.tearDown(async () => {
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

  t.equal(writtenCode, code)
})

tap.test('operations', async (t) => {
  t.plan(1)

  const tempTargetPath = await tmp.file()

  t.tearDown(async () => {
    await tempTargetPath.cleanup()
  })
  await codegenMercurius(app, {
    targetPath: tempTargetPath.path,
    operationsGlob: ['./test/operations/*.gql'],
    silent: true,
  })

  const generatedCode = await readFile(tempTargetPath.path, {
    encoding: 'utf-8',
  })

  t.matchSnapshot(generatedCode)
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
