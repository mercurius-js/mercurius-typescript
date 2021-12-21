import { CodegenPlugin } from '@graphql-codegen/plugin-helpers'
import { GraphQLField, GraphQLType } from 'graphql'

export interface MercuriusLoadersPluginConfig {
  namespacedImportName?: string
  loadersCustomParentTypes?: Record<string, string>
}

export const MercuriusLoadersPlugin: CodegenPlugin<MercuriusLoadersPluginConfig> =
  {
    async plugin(schema, _documents, config) {
      const {
        GraphQLList,
        GraphQLObjectType,
        GraphQLScalarType,
        isNonNullType,
        isListType,
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
        field: GraphQLField<unknown, unknown> | GraphQLType,
        typeAcumStart: string = '',
        typeAcumEnd: string = ''
      ): string {
        let isNullable = true
        let isArray = false
        let nullableItems = true

        let fieldType: GraphQLType

        if ('args' in field) {
          fieldType = field.type
        } else {
          fieldType = field
        }

        if (isNonNullType(fieldType)) {
          isNullable = false
          fieldType = fieldType.ofType
        }

        if (isListType(fieldType)) {
          fieldType = fieldType.ofType
          isArray = true
          if (isNonNullType(fieldType)) {
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

        if (isListType(fieldType)) {
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

            typeCode[
              key
            ] = `LoaderResolver<${tsType},${namespacedImportPrefix}${
              config.loadersCustomParentTypes?.[type.name] || type.name
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
