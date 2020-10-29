import { createMercuriusTestClient } from 'mercurius-integration-testing'
import tap from 'tap'

import { app } from '../src'
import { AddDocument, HelloDocument } from '../src/graphql/operations'

tap.test('works', async (t) => {
  t.plan(4)

  const client = createMercuriusTestClient(app)

  await client.query(HelloDocument).then((response) => {
    t.equal(response.data.Hello, 'world')
    t.equal(response.errors, undefined)
  })

  await client
    .mutate(AddDocument, {
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
