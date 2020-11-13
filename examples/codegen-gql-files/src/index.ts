import Fastify from 'fastify'
import mercurius, { IResolvers } from 'mercurius'
import mercuriusCodegen from 'mercurius-codegen'

import { loadFilesSync } from '@graphql-tools/load-files'

const schema = loadFilesSync('src/graphql/schema/**/*.gql', {}).map(String)

export const app = Fastify()

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
  operationsGlob: './src/graphql/operations/*.gql',
})

// app.listen(8000)
