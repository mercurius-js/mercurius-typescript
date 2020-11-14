import Fastify, { FastifyReply, FastifyRequest } from 'fastify'
import mercurius, {
  IFieldResolver,
  IResolvers,
  MercuriusContext,
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
type Query {
  helloTyped: String!
  helloInline: String!
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
  // string | undefined
  ctx.authorization

  // string
  info.parentType.name

  // {}
  args

  // {}
  root

  return 'world'
}

const NOTIFICATION = 'notification'

const resolvers: IResolvers = {
  Query: {
    helloTyped,
    helloInline: (root: {}, args: {}, ctx, info) => {
      // {}
      root

      // {}
      args

      // string | undefined
      ctx.authorization

      // string <=> Query
      info.parentType.name

      return 'world'
    },
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

app.register(mercurius, {
  schema,
  resolvers,
  context: buildContext,
  subscription: true,
})

// app.listen(8000)
