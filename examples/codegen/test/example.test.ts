import { gql } from 'mercurius-codegen'
import { createMercuriusTestClient } from 'mercurius-integration-testing'
import tap from 'tap'

import { TypedDocumentNode } from '@graphql-typed-document-node/core'

import { app } from '../src'

const AddDocument: TypedDocumentNode<
  {
    add: number
  },
  {
    x: number
    y: number
  }
> = gql`
  mutation add($x: Int!, $y: Int!) {
    add(x: $x, y: $y)
  }
` as any

const HelloDocument: TypedDocumentNode<{
  Hello: string
}> = gql`
  query hello {
    Hello
  }
` as any

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
