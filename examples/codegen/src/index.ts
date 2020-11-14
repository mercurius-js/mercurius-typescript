import Fastify from 'fastify'
import mercurius, { IResolvers } from 'mercurius'
import mercuriusCodegen, { gql } from 'mercurius-codegen'

export const app = Fastify()

const schema = gql`
  type Query {
    Hello: String!
  }
  type Mutation {
    add(x: Int!, y: Int!): Int!
  }
`

const resolvers: IResolvers = {
  Query: {
    Hello(root, args, ctx, info) {
      // {}
      root

      // {}
      args

      // MercuriusContext
      ctx

      // GraphQLResolveInfo
      info

      return 'world'
    },
  },
  Mutation: {
    add(root, { x, y }, ctx, info) {
      // {}
      root

      // number
      x

      // number
      y

      // MercuriusContext
      ctx

      // GraphQLResolveInfo
      info

      return x + y
    },
  },
}

app.register(mercurius, {
  schema,
  resolvers,
})

mercuriusCodegen(app, {
  targetPath: './src/graphql/generated.ts',
  operationsGlob: './src/graphql/operations/*.gql',
})

// app.listen(8000)
