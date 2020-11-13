import Fastify from 'fastify'
import mercurius from 'mercurius'

import { loadFilesSync } from '@graphql-tools/load-files'

import { Resolvers } from './graphql/schema'

const schema = loadFilesSync('src/graphql/schema/**/*.gql', {}).map(String)

export const app = Fastify()

const resolvers: Resolvers = {
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

// app.listen(8000)
