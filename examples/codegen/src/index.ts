import Fastify, { FastifyReply, FastifyRequest } from 'fastify'
import mercurius, { IResolvers, MercuriusLoaders } from 'mercurius'
import mercuriusCodegen, { gql } from 'mercurius-codegen'

export const app = Fastify({
  logger: true,
})

const buildContext = async (req: FastifyRequest, _reply: FastifyReply) => {
  return {
    authorization: req.headers.authorization,
  }
}

type PromiseType<T> = T extends PromiseLike<infer U> ? U : T

declare module 'mercurius' {
  interface MercuriusContext
    extends PromiseType<ReturnType<typeof buildContext>> {}
}

const schema = gql`
  type Human {
    name: String!
  }

  type Foo {
    bars: [[[Int]]]
  }

  type Dog {
    name: String!
    owner: Human
  }

  type Query {
    Hello: String!
    dogs: [Dog!]!
    getFoo: Foo
  }

  type Mutation {
    add(x: Int!, y: Int!): Int!
    createNotification(message: String!): Boolean!
  }

  type Subscription {
    newNotification: String!
  }
`

const dogs = [
  { name: 'Max' },
  { name: 'Charlie' },
  { name: 'Buddy' },
  { name: 'Max' },
]

const owners: Record<string, { name: string }> = {
  Max: {
    name: 'Jennifer',
  },
  Charlie: {
    name: 'Sarah',
  },
  Buddy: {
    name: 'Tracy',
  },
}

const NOTIFICATION = 'notification'

const resolvers: IResolvers = {
  Query: {
    Hello(root, args, ctx, info) {
      // root ~ {}
      root
      // args ~ {}
      args
      // ctx.authorization ~ string | undefined
      ctx.authorization
      // info ~ GraphQLResolveInfo
      info

      return 'world'
    },
    dogs() {
      return dogs
    },
  },
  Mutation: {
    add(root, { x, y }, ctx, info) {
      // root ~ {}
      root
      // x ~ number
      x
      // x ~ number
      y
      // ctx.authorization ~ string | undefined
      ctx.authorization
      // info ~ GraphQLResolveInfo
      info

      return x + y
    },
    createNotification(_root, { message }, { pubsub }) {
      pubsub.publish({
        topic: NOTIFICATION,
        payload: {
          newNotification: message,
        },
      })
      return true
    },
  },
  Subscription: {
    newNotification: {
      subscribe: (_root, _args, { pubsub }) => {
        return pubsub.subscribe(NOTIFICATION)
      },
    },
  },
}

const loaders: MercuriusLoaders = {
  Dog: {
    async owner(queries, _ctx) {
      return queries.map(({ obj }) => owners[obj.name])
    },
  },
}

app.register(mercurius, {
  schema,
  resolvers,
  loaders,
  context: buildContext,
  subscription: true,
})

mercuriusCodegen(app, {
  targetPath: './src/graphql/generated.ts',
  operationsGlob: './src/graphql/operations/*.gql',
  codegenConfig: {
    loadersCustomParentTypes: {
      Human: 'never',
    },
  },
}).catch(console.error)
