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
    Hello(_root, _args, _ctx, _info) {
      return 'world'
    },
  },
  Mutation: {
    add(_root, { x, y }, _ctx, _info) {
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
})

// app.listen(8000)
