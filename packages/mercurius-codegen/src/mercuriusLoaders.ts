import { CodegenPlugin } from '@graphql-codegen/plugin-helpers'

export const MercuriusLoadersPlugin: CodegenPlugin = {
  async plugin(schema) {
    const {
      GraphQLList,
      GraphQLNonNull,
      GraphQLObjectType,
      GraphQLScalarType,
    } = await import('graphql')

    const schemaConfig = schema.toConfig()

    const queryType = schema.getQueryType()
    const mutationType = schema.getMutationType()
    const subscriptionType = schema.getSubscriptionType()

    let code = `
    type Loader<TReturn, TObj, TParams, TContext> = (
        queries: Array<{
          obj: DeepPartial<TObj>;
          params: TParams;
        }>,
        context: TContext & {
          reply: FastifyReply;
        }
      ) => Array<DeepPartial<TReturn>> | Promise<Array<DeepPartial<TReturn>>>;
    type LoaderResolver<TReturn, TObj, TParams, TContext> = 
    Loader<TReturn, TObj, TParams, TContext> | {
        loader: Loader<TReturn, TObj, TParams, TContext>;
        opts?:{
            cache?:boolean
        };
    }
    `
    const loaders: Record<string, Record<string, string>> = {}

    schemaConfig.types.forEach((type) => {
      switch (type) {
        case queryType:
        case mutationType:
        case subscriptionType:
          return
      }

      if (type.name.startsWith('__')) return

      if (type instanceof GraphQLObjectType) {
        const fields = type.getFields()

        const typeCode: Record<string, string> = {}
        Object.entries(fields).forEach(([key, value]) => {
          let isNullable = true

          let isArray = false
          let nullableItems = true
          let fieldType = value.type
          if (fieldType instanceof GraphQLNonNull) {
            isNullable = false
            fieldType = fieldType.ofType
          }
          if (fieldType instanceof GraphQLList) {
            fieldType = fieldType.ofType

            isArray = true
            if (fieldType instanceof GraphQLNonNull) {
              nullableItems = false
              fieldType = fieldType.ofType
            }
          }
          const hasArgs = value.args.length > 0
          if (fieldType instanceof GraphQLScalarType) {
            let fieldTypeToReturn = isArray
              ? nullableItems
                ? `Array<Maybe<Scalars["${fieldType.name}"]>>`
                : `Array<Scalars["${fieldType.name}"]>`
              : `Scalars["${fieldType.name}"]`

            if (isNullable) {
              fieldTypeToReturn = `Maybe<${fieldTypeToReturn}>`
            }
            typeCode[key] = `LoaderResolver<${fieldTypeToReturn},${type.name},${
              hasArgs ? `${type.name}${value.name}Args` : '{}'
            }, TContext>`
          } else {
            let fieldTypeToReturn = isArray
              ? `Array<${fieldType.toString()}>`
              : `${fieldType.toString()}`

            if (isNullable) {
              fieldTypeToReturn = `Maybe<${fieldTypeToReturn}>`
            }

            typeCode[key] = `LoaderResolver<${fieldTypeToReturn},${type.name},${
              hasArgs ? `${type.name}${value.name}Args` : '{}'
            }, TContext>`
          }
        })

        loaders[type.name] = typeCode
      }
    })

    code += `export interface Loaders<TContext = MercuriusContext & { reply: FastifyReply }> {`
    Object.entries(loaders).map(([key, value]) => {
      code += `
      ${key}?: {
        ${Object.entries(value).reduce((acum, [key, value]) => {
          acum += `${key}?: ${value};`
          return acum
        }, '')}
      };
        `
    })

    code += `}`

    return code
  },
}
