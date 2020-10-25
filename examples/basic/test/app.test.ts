import { createMercuriusTestClient } from 'mercurius-integration-testing'
import { app } from '../src'
import tap from 'tap'

tap.test('basic', async (t) => {
  t.plan(2)
  const client = createMercuriusTestClient(app)

  await client
    .query<{
      hello: string
      helloTyped: string
      helloInline: string
    }>(
      `
    query {
        hello
        helloTyped
        helloInline
    }
    `
    )
    .then((response) => {
      t.equivalent(response, {
        data: {
          hello: 'world',
          helloTyped: 'world',
          helloInline: 'world',
        },
      })
    })

  await client
    .query<{
      isContextAsDefined: boolean
    }>(
      `
    query {
      isContextAsDefined
    }
  `
    )
    .then(({ data: { isContextAsDefined } }) => {
      t.equal(isContextAsDefined, true)
    })
})
