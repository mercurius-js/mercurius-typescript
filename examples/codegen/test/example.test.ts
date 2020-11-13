import { createMercuriusTestClient } from 'mercurius-integration-testing'
import tap from 'tap'

import { helloDocument, addDocument } from '../src/graphql/generated'

import { app } from '../src'

tap.test('works', async (t) => {
  t.plan(4)

  const client = createMercuriusTestClient(app)

  await client.query(helloDocument).then((response) => {
    t.equal(response.data.Hello, 'world')
    t.equal(response.errors, undefined)
  })

  await client
    .mutate(addDocument, {
      variables: {
        x: 1,
        y: 2,
      },
    })
    .then((response) => {
      t.equal(response.data.add, 3)
      t.equal(response.errors, undefined)
    })
})
