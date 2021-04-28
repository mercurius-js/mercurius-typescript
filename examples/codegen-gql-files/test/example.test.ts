import { createMercuriusTestClient } from 'mercurius-integration-testing'
import tap from 'tap'

import { app } from '../src'
import {
  addDocument,
  createNotificationDocument,
  dogsDocument,
  helloDocument,
  newNotificationDocument,
} from '../src/graphql/generated'

const client = createMercuriusTestClient(app)

tap.teardown(async () => {
  await app.close()
})

tap.test('works', async (t) => {
  t.plan(4)

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

tap.test('query with loaders', async (t) => {
  const response = await client.query(dogsDocument)

  t.same(response, {
    data: {
      dogs: [
        { name: 'Max', owner: { name: 'Jennifer' } },
        { name: 'Charlie', owner: { name: 'Sarah' } },
        { name: 'Buddy', owner: { name: 'Tracy' } },
        { name: 'Max', owner: { name: 'Jennifer' } },
      ],
    },
  })

  t.end()
})

tap.test('subscription', async (t) => {
  t.plan(2)
  const notificationMessage = 'Hello World'

  const client = createMercuriusTestClient(app)

  await new Promise<void>(async (resolve) => {
    await client.subscribe({
      query: newNotificationDocument,
      onData(response) {
        t.same(response, {
          data: {
            newNotification: notificationMessage,
          },
        })

        resolve()
      },
    })
    await client
      .mutate(createNotificationDocument, {
        variables: {
          message: notificationMessage,
        },
      })
      .then((response) => {
        t.same(response, {
          data: {
            createNotification: true,
          },
        })
      })
  })
})
