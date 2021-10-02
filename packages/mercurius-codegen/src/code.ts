import type {} from 'mercurius'
import type { GraphQLSchema } from 'graphql'
import type { TypeScriptPluginConfig } from '@graphql-codegen/typescript'
import type { TypeScriptResolversPluginConfig } from '@graphql-codegen/typescript-resolvers/config'
import type { CodegenPlugin } from '@graphql-codegen/plugin-helpers'
import type { Source } from '@graphql-tools/utils'
import type { MercuriusLoadersPluginConfig } from './mercuriusLoaders'

import { dirname, resolve } from 'path'

import { formatPrettier } from './prettier'
import { writeFileIfChanged } from './write'
import { toGraphQLString } from './utils'

type MidCodegenPluginsConfig = TypeScriptPluginConfig &
  TypeScriptResolversPluginConfig &
  MercuriusLoadersPluginConfig

export interface CodegenPluginsConfig extends MidCodegenPluginsConfig {
  [k: string]: unknown
}

export async function generateCode(
  schema: GraphQLSchema,
  codegenConfig: CodegenPluginsConfig = {},
  preImportCode?: string,
  silent?: boolean,
  operationsGlob?: string[] | string
) {
  const { codegen } = await import('@graphql-codegen/core')
  const typescriptPlugin = await import('@graphql-codegen/typescript')
  const typescriptResolversPlugin = await import(
    '@graphql-codegen/typescript-resolvers'
  )
  const operationsPlugins = operationsGlob
    ? {
        typescriptOperations: await import(
          '@graphql-codegen/typescript-operations'
        ),
        typedDocumentNode: await import('@graphql-codegen/typed-document-node'),
      }
    : null
  const { parse } = await import('graphql')
  const { MercuriusLoadersPlugin } = await import('./mercuriusLoaders')
  const { loadFiles } = await import('@graphql-tools/load-files')
  const { printSchemaWithDirectives } = await import('@graphql-tools/utils')

  const documents = operationsGlob
    ? await loadFiles(operationsGlob).then((operations) =>
        operations
          .map((op) => String(toGraphQLString(op)).trim())
          .filter(Boolean)
          .map((operationString) => {
            const operationSource: Source = {
              document: parse(operationString),
              schema,
            }
            return operationSource
          })
      )
    : ([] as [])

  let code = preImportCode || ''

  if (
    codegenConfig.namingConvention != null &&
    codegenConfig.namingConvention !== 'keep'
  ) {
    if (!silent) {
      console.warn(
        `namingConvention "${codegenConfig.namingConvention}" is not supported! it has been set to "keep" automatically.`
      )
    }
  }

  code += await codegen({
    config: Object.assign(
      {
        federation: true,
        contextType: 'mercurius#MercuriusContext',
        useTypeImports: true,
        customResolverFn:
          '(parent: TParent, args: TArgs, context: TContext, info: GraphQLResolveInfo) => Promise<import("mercurius-codegen").DeepPartial<TResult>> | import("mercurius-codegen").DeepPartial<TResult>',
        internalResolversPrefix: '',
      } as CodegenPluginsConfig,
      codegenConfig,
      {
        namingConvention: 'keep',
      } as CodegenPluginsConfig
    ),
    documents,
    filename: 'mercurius.generated.ts',
    pluginMap: Object.assign(
      {
        typescript: typescriptPlugin,
        typescriptResolvers: typescriptResolversPlugin,
        mercuriusLoaders: MercuriusLoadersPlugin,
      },
      operationsPlugins
    ) as {
      [name: string]: CodegenPlugin<any>
    },
    plugins: [
      {
        typescript: {},
      },
      {
        typescriptResolvers: {},
      },
      {
        mercuriusLoaders: {},
      },
      ...(operationsPlugins
        ? [
            {
              typescriptOperations: {},
            },
            {
              typedDocumentNode: {},
            },
          ]
        : []),
    ],
    schema: parse(printSchemaWithDirectives(schema)),
  })

  code += `
    declare module "mercurius" {
        interface IResolvers extends Resolvers<import("mercurius").MercuriusContext> { }
        interface MercuriusLoaders extends Loaders { }
    }
    `

  return await formatPrettier(code, 'typescript')
}

export async function writeGeneratedCode({
  code,
  targetPath,
}: {
  code: string
  targetPath: string
}) {
  const { default: mkdirp } = await import('mkdirp')

  targetPath = resolve(targetPath)

  await mkdirp(dirname(targetPath))

  return writeFileIfChanged(targetPath, code)
}
