import './generated'

import Fastify from 'fastify'
import fs from 'fs'
import mercurius from 'mercurius'
import tap from 'tap'
import tmp from 'tmp-promise'

import {
  codegenMercurius,
  generateCode,
  writeGeneratedCode,
} from '../src/index'

const { readFile } = fs.promises

const appWithoutMercurius = Fastify()
const app = Fastify()

app.register(mercurius, {
  schema: `
    scalar DateTime
    type Query {
        hello(greetings: String): String!
    }
    `,
  resolvers: {
    Query: {
      hello(_root, { greetings }, _ctx) {
        return greetings || 'Hello world!'
      },
    },
  },
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

codegenMercurius(app, {
  targetPath: './test/generated.ts',
  disable: false,
  silent: true,
  codegenConfig: {
    scalars: {
      DateTime: 'Date',
    },
    defaultMapper: 'DeepPartial<{T}>',
  },
}).catch(console.error)
