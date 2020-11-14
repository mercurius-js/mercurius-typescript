import Fastify, { FastifyReply, FastifyRequest } from 'fastify'
import mercurius, {
  IFieldResolver,
  IResolvers,
  MercuriusContext,
  MercuriusLoaders,
} from 'mercurius'

export const app = Fastify()

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

const schema = `
type Human {
  name: String!
}

type Dog {
  name: String!
  owner: Human
}

type Query {
  helloTyped: String!
  helloInline: String!
  dogs: [Dog!]!
}

type Subscription {
  newNotification: String!
}

type Mutation {
  createNotification(message: String!): Boolean!
}
`

const helloTyped: IFieldResolver<
  {} /** Root */,
  MercuriusContext /** Context */,
  {} /** Args */
> = (root, args, ctx, info) => {
  // root ~ {}
  root
  // args ~ {}
  args
  // ctx.authorization ~ string | undefined
  ctx.authorization
  // info ~ GraphQLResolveInfo
  info

  return 'world'
}

const NOTIFICATION = 'notification'

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

const resolvers: IResolvers = {
  Query: {
    helloTyped,
    helloInline: (root: {}, args: {}, ctx, info) => {
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
    dogs: (_root, _args, _ctx_, _info) => dogs,
  },
  Mutation: {
    createNotification(_root, { message }: { message: string }, { pubsub }) {
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
      return queries.map(
        ({ obj }: { obj: { name: string } }) => owners[obj.name]
      )
    },
  },
}

app.register(mercurius, {
  schema,
  resolvers,
  context: buildContext,
  subscription: true,
  loaders,
})

// app.listen(8000)
