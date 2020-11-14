import gql from 'graphql-tag'
import { createMercuriusTestClient } from 'mercurius-integration-testing'
import tap from 'tap'

import { app } from '../src'

const client = createMercuriusTestClient(app)

tap.tearDown(async () => {
  await app.close()
})

tap.test('query', async (t) => {
  t.plan(1)

  await client
    .query<{
      hello: string
      helloTyped: string
      helloInline: string
    }>(
      gql`
        query {
          helloTyped
          helloInline
        }
      `
    )
    .then((response) => {
      t.equivalent(response, {
        data: {
          helloTyped: 'world',
          helloInline: 'world',
        },
      })
    })
})

tap.test('subscription', async (t) => {
  t.plan(2)
  const notificationMessage = 'Hello World'

  const client = createMercuriusTestClient(app)

  await new Promise<void>(async (resolve) => {
    await client.subscribe<{
      newNotification: string
    }>({
      query: gql`
        subscription {
          newNotification
        }
      `,
      onData(response) {
        t.equivalent(response, {
          data: {
            newNotification: notificationMessage,
          },
        })

        resolve()
      },
    })
    await client
      .mutate<
        {
          createNotification: boolean
        },
        {
          message: string
        }
      >(
        gql`
          mutation($message: String!) {
            createNotification(message: $message)
          }
        `,
        {
          variables: {
            message: notificationMessage,
          },
        }
      )
      .then((response) => {
        t.equivalent(response, {
          data: {
            createNotification: true,
          },
        })
      })
  })
})

tap.test('loaders', async (t) => {
  const response = await client.query(gql`
    query {
      dogs {
        name
        owner {
          name
        }
      }
    }
  `)

  t.equivalent(response, {
    data: {
      dogs: [
        { name: 'Max', owner: { name: 'Jennifer' } },
        { name: 'Charlie', owner: { name: 'Sarah' } },
        { name: 'Buddy', owner: { name: 'Tracy' } },
        { name: 'Max', owner: { name: 'Jennifer' } },
      ],
    },
  })

  t.done()
})
