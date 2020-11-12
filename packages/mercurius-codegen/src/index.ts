import type {} from 'mercurius'
import { FastifyInstance } from 'fastify'
import { GraphQLSchema } from 'graphql'

import { TypeScriptPluginConfig } from '@graphql-codegen/typescript'
import { TypeScriptResolversPluginConfig } from '@graphql-codegen/typescript-resolvers/config'

type MidCodegenPluginsConfig = TypeScriptPluginConfig &
  TypeScriptResolversPluginConfig

export interface CodegenPluginsConfig extends MidCodegenPluginsConfig {
  [k: string]: unknown
}

interface CodegenMercuriusOptions {
  /**
   * Specify the target path of the code generation.
   *
   * Relative to the directory of the executed script if targetPath isn't absolute
   * @example './src/generated/graphql.ts'
   */
  targetPath: string
  /**
   * Disable the code generation manually, by default is `process.env.NODE_ENV === 'production'`
   */
  disable?: boolean
  /**
   * Don't notify to the console
   */
  silent?: boolean
  /**
   * Specify GraphQL Code Generator configuration
   * @example
   * codegenConfig: {
   *    scalars: {
   *        DateTime: "Date",
   *    },
   *    defaultMapper: "DeepPartial<{T}>"
   * }
   * @default
   * codegenConfig: {
   *    defaultMapper: "DeepPartial<{T}>"
   * }
   */
  codegenConfig?: CodegenPluginsConfig
  /**
   * Add code in the beginning of the generated code
   */
  preImportCode?: string
}

export async function generateCode(
  schema: GraphQLSchema,
  codegenConfig: CodegenPluginsConfig = { defaultMapper: 'DeepPartial<{T}>' },
  preImportCode?: string,
  silent?: boolean
) {
  // It's not actually worth it to use Promise.all() because it's being transpiled to sync requires anyways

  const { codegen } = await import('@graphql-codegen/core')
  const typescriptPlugin = await import('@graphql-codegen/typescript')
  const typescriptResolversPlugin = await import(
    '@graphql-codegen/typescript-resolvers'
  )
  const { parse, printSchema } = await import('graphql')
  const { format, resolveConfig } = await import('prettier')
  const { MercuriusLoadersPlugin } = await import('./mercuriusLoaders')

  const prettierConfig = resolveConfig(process.cwd()).then((config) => config)

  let code = preImportCode || ''

  code += `
  import { MercuriusContext } from "mercurius";
  import { FastifyReply } from "fastify";
  `

  if (
    codegenConfig.namingConvention != null &&
    codegenConfig.namingConvention !== 'keep'
  ) {
    if (!silent)
      console.warn(
        `namingConvention "${codegenConfig.namingConvention}" is not supported! it has been set to "keep" automatically.`
      )
  }

  code += await codegen({
    config: Object.assign({}, codegenConfig, {
      namingConvention: 'keep',
    } as CodegenPluginsConfig),
    documents: [],
    filename: 'mercurius.generated.ts',
    pluginMap: {
      typescript: typescriptPlugin,
      typescriptResolvers: typescriptResolversPlugin,
      mercuriusLoaders: MercuriusLoadersPlugin,
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
    ],
    schema: parse(printSchema(schema)),
  })

  code += `
  export type DeepPartial<T> = T extends Function
  ? T
  : T extends Array<infer U>
  ? _DeepPartialArray<U>
  : T extends object
  ? _DeepPartialObject<T>
  : T | undefined;

  interface _DeepPartialArray<T> extends Array<DeepPartial<T>> {}
  type _DeepPartialObject<T> = { [P in keyof T]?: DeepPartial<T[P]> };

  declare module "mercurius" {
      interface IResolvers extends Resolvers<MercuriusContext> { }
      interface MercuriusLoaders extends Loaders { }
  }
  `

  return format(
    code,
    Object.assign({ parser: 'typescript' }, await prettierConfig)
  )
}

export async function writeGeneratedCode({
  code,
  targetPath,
}: {
  code: string
  targetPath: string
}) {
  const { default: mkdirp } = await import('mkdirp')
  const fs = await import('fs')
  const { resolve, dirname } = await import('path')

  targetPath = resolve(targetPath)

  await mkdirp(dirname(targetPath))

  await fs.promises.writeFile(targetPath, code, {
    encoding: 'utf-8',
  })

  return targetPath
}

export async function codegenMercurius(
  app: FastifyInstance,
  {
    disable = process.env.NODE_ENV === 'production',
    targetPath,
    silent,
    codegenConfig,
    preImportCode,
  }: CodegenMercuriusOptions
): Promise<void> {
  if (disable) return

  await app.ready()

  if (typeof app.graphql !== 'function') {
    throw Error('Mercurius is not registered in Fastify Instance!')
  }

  return new Promise((resolve, reject) => {
    setImmediate(() => {
      const schema = app.graphql.schema

      generateCode(schema, codegenConfig, preImportCode, silent)
        .then((code) => {
          writeGeneratedCode({
            code,
            targetPath,
          })
            .then((absoluteTargetPath) => {
              resolve()
              if (!silent) {
                console.log(`Code generated at ${absoluteTargetPath}`)
              }
            })
            .catch(reject)
        })
        .catch(reject)
    })
  })
}

export default codegenMercurius

export function gql(chunks: TemplateStringsArray, ...variables: any[]): string {
  return chunks.reduce(
    (accumulator, chunk, index) =>
      `${accumulator}${chunk}${index in variables ? variables[index] : ''}`,
    ''
  )
}
