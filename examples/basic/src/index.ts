import Fastify, { FastifyReply, FastifyRequest } from 'fastify'
import { isEqual } from 'lodash'
import mercurius, {
  IFieldResolver,
  IResolvers,
  MercuriusContext,
} from 'mercurius'

export const app = Fastify()

const buildContext = (req: FastifyRequest, _reply: FastifyReply) => {
  return {
    authorization: req.headers.authorization,
  }
}

declare module 'mercurius' {
  interface MercuriusContext extends ReturnType<typeof buildContext> {}
}

/**
 * The order of the generics might be changed to Root, Args, Context
 */
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

const resolvers: IResolvers = {
  Query: {
    hello: () => 'world',
    helloTyped,
    helloInline: ((root) => {
      // {}
      root
      return 'world'
    }) as IFieldResolver<{}>,
    isContextAsDefined,
  },
}

app.register(mercurius, {
  schema: `
    type Query {
      hello: String!
      helloTyped: String!
      helloInline: String!
      isContextAsDefined: Boolean!
    }
    `,
  resolvers,
  context: buildContext,
  subscription: true,
})

// app.listen(8000)
