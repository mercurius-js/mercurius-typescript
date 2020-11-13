import Fastify, { FastifyReply, FastifyRequest } from 'fastify'
import { isEqual } from 'lodash'
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

const isContextAsDefined: IFieldResolver<{}, MercuriusContext, {}> = (
  root,
  args,
  ctx,
  info
) => {
  return (
    isEqual(root, {}) &&
    isEqual(args, {}) &&
    ctx.pubsub === app.graphql.pubsub &&
    ctx.app === app &&
    info.parentType.name === 'Query'
  )
}

const NOTIFICATION = 'notification'

const resolvers: IResolvers = {
  Query: {
    helloTyped,
    helloInline: ((root) => {
      // {}
      root
      return 'world'
    }) as IFieldResolver<{}>,
    isContextAsDefined,
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
  schema: `
    type Query {
      helloTyped: String!
      helloInline: String!
      isContextAsDefined: Boolean!
    }
    type Subscription {
      newNotification: String!
    }
    type Mutation {
      createNotification(message: String!): Boolean!
    }
    `,
  resolvers,
  context: buildContext,
  subscription: true,
})

// app.listen(8000)
