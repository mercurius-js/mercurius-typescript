import { CodegenPlugin } from '@graphql-codegen/plugin-helpers'

import type {
  GraphQLField,
  GraphQLNullableType,
  GraphQLOutputType,
} from 'graphql'

export type {} from '@graphql-codegen/plugin-helpers'

export const MercuriusLoadersPlugin: CodegenPlugin<{
  namespacedImportName?: string
}> = {
  async plugin(schema, _documents, config) {
    const {
      GraphQLList,
      GraphQLNonNull,
      GraphQLObjectType,
      GraphQLScalarType,
    } = await import('graphql')

    const namespacedImportPrefix = config.namespacedImportName
      ? `${config.namespacedImportName}.`
      : ''

    const schemaConfig = schema.toConfig()

    const queryType = schema.getQueryType()
    const mutationType = schema.getMutationType()
    const subscriptionType = schema.getSubscriptionType()

    let code = `
    type Loader<TReturn, TObj, TParams, TContext> = (
        queries: Array<{
          obj: TObj;
          params: TParams;
        }>,
        context: TContext & {
          reply: import("fastify").FastifyReply;
        }
      ) => Promise<Array<import("mercurius-codegen").DeepPartial<TReturn>>>;
    type LoaderResolver<TReturn, TObj, TParams, TContext> = 
    Loader<TReturn, TObj, TParams, TContext> | {
        loader: Loader<TReturn, TObj, TParams, TContext>;
        opts?:{
            cache?:boolean
        };
    }
    `
    const loaders: Record<string, Record<string, string>> = {}

    function fieldToType(
      field: GraphQLField<unknown, unknown> | GraphQLOutputType,
      typeAcumStart: string = '',
      typeAcumEnd: string = ''
    ): string {
      let isNullable = true
      let isArray = false
      let nullableItems = true

      let fieldType: GraphQLNullableType

      if ('args' in field) {
        fieldType = field.type
      } else {
        fieldType = field
      }

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

      if (isNullable) {
        typeAcumStart += 'Maybe<'
        typeAcumEnd += '>'
      }

      if (isArray) {
        typeAcumStart += 'Array<'
        typeAcumEnd += '>'
        if (nullableItems && !(fieldType instanceof GraphQLList)) {
          typeAcumStart += 'Maybe<'
          typeAcumEnd += '>'
        }
      }

      if (fieldType instanceof GraphQLList) {
        return fieldToType(fieldType.ofType, typeAcumStart, typeAcumEnd)
      } else if (fieldType instanceof GraphQLScalarType) {
        return typeAcumStart + `Scalars["${fieldType.name}"]` + typeAcumEnd
      } else {
        return typeAcumStart + fieldType.name + typeAcumEnd
      }
    }

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
          const tsType = fieldToType(value)

          const hasArgs = value.args.length > 0

          typeCode[key] = `LoaderResolver<${tsType},${namespacedImportPrefix}${
            type.name
          },${
            hasArgs
              ? `${namespacedImportPrefix}${type.name}${value.name}Args`
              : '{}'
          }, TContext>`
        })

        loaders[type.name] = typeCode
      }
    })

    let hasLoaders = false

    code += `export interface Loaders<TContext = import("mercurius").MercuriusContext & { reply: import("fastify").FastifyReply }> {`
    Object.entries(loaders).map(([key, value]) => {
      hasLoaders = true
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

    return hasLoaders ? code : 'export interface Loaders {};\n'
  },
}
