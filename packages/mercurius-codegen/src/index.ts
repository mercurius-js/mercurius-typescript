import type {} from 'mercurius'
import { FastifyInstance } from 'fastify'
import fs from 'fs'
import { GraphQLSchema, parse, printSchema } from 'graphql'
import mkdirp from 'mkdirp'
import { dirname, resolve } from 'path'
import { format, resolveConfig } from 'prettier'

import { codegen } from '@graphql-codegen/core'
import * as typescriptPlugin from '@graphql-codegen/typescript'
import { TypeScriptPluginConfig } from '@graphql-codegen/typescript'
import * as typescriptResolversPlugin from '@graphql-codegen/typescript-resolvers'
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
   * Disable the code generation, by default is `process.env.NODE_ENV === 'production'`
   */
  disable?: boolean
  /**
   * Don't notify to the console
   */
  silent?: boolean
  /**
   * Specify GraphQL Code Generator configuration
   * @example
   * ```js
   * codegenConfig: {
   *    scalars: {
   *        DateTime: "Date",
   *    }
   * }
   * ```
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
  codegenConfig: CodegenPluginsConfig = { defaultMapper: 'Partial<{T}>' },
  preImportCode?: string
) {
  const prettierConfig = resolveConfig(process.cwd()).then((config) => config)

  let code = preImportCode || ''

  code += await codegen({
    config: codegenConfig,
    documents: [],
    filename: 'mercurius.generated.ts',
    pluginMap: {
      typescript: typescriptPlugin,
      typescriptResolvers: typescriptResolversPlugin,
    },
    plugins: [
      {
        typescript: {},
      },
      {
        typescriptResolvers: {},
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
      interface IResolvers extends Resolvers<import("mercurius").MercuriusContext> { }
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

      generateCode(schema, codegenConfig, preImportCode)
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
