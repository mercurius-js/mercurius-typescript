import type {} from 'mercurius'
import { FastifyInstance } from 'fastify'
import { GraphQLSchema } from 'graphql'

import { TypeScriptPluginConfig } from '@graphql-codegen/typescript'
import { TypeScriptResolversPluginConfig } from '@graphql-codegen/typescript-resolvers/config'
import { MercuriusLoadersPlugin } from './mercuriusLoaders'

import type { CodegenPlugin } from '@graphql-codegen/plugin-helpers'
import type { Source } from '@graphql-tools/utils'
import type { WatchOptions as ChokidarOptions } from 'chokidar'

export { MercuriusLoadersPlugin as plugin }

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
   * @example './src/graphql/generated.ts'
   */
  targetPath: string
  /**
   * Disable the code generation manually
   *
   * @default process.env.NODE_ENV === 'production'
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
   * }
   */
  codegenConfig?: CodegenPluginsConfig
  /**
   * Add code in the beginning of the generated code
   */
  preImportCode?: string
  /**
   * Operations glob patterns
   */
  operationsGlob?: string[] | string
  /**
   * Watch Options for operations GraphQL files
   */
  watchOptions?: {
    /**
     * Enable file watching
     *
     * @default false
     */
    enabled?: boolean
    /**
     * Extra Chokidar options to be passed
     */
    chokidarOptions?: Omit<ChokidarOptions, 'ignoreInitial'>
  }
}

export async function generateCode(
  schema: GraphQLSchema,
  codegenConfig: CodegenPluginsConfig = {},
  preImportCode?: string,
  silent?: boolean,
  operationsGlob?: string[] | string
) {
  // It's not actually worth it to use Promise.all() because it's being transpiled to sync requires anyways

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
  const { parse, printSchema } = await import('graphql')
  const { format, resolveConfig } = await import('prettier')
  const { loadFiles } = await import('@graphql-tools/load-files')

  const prettierConfig = resolveConfig(process.cwd()).then((config) => config)

  const documents = operationsGlob
    ? loadFiles(operationsGlob).then((operations) =>
        operations
          .map((op) => String(op).trim())
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

  code += `
    import { MercuriusContext } from "mercurius";
    import { FastifyReply } from "fastify";
    `

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
        customResolverFn:
          '(parent: TParent, args: TArgs, context: TContext, info: GraphQLResolveInfo) => Promise<DeepPartial<TResult>> | DeepPartial<TResult>',
      },
      codegenConfig,
      {
        namingConvention: 'keep',
      } as CodegenPluginsConfig
    ),
    documents: await documents,
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

  const fileExists = fs.existsSync(targetPath)

  if (fileExists) {
    const existingCode = await fs.promises.readFile(targetPath, {
      encoding: 'utf-8',
    })

    if (existingCode === code) return targetPath
  }

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
    operationsGlob,
    watchOptions,
  }: CodegenMercuriusOptions
): Promise<{
  closeWatcher: () => void
}> {
  const noopCloseWatcher = () => undefined
  if (disable)
    return {
      closeWatcher: noopCloseWatcher,
    }

  await app.ready()

  if (typeof app.graphql !== 'function') {
    throw Error('Mercurius is not registered in Fastify Instance!')
  }

  return new Promise<{ closeWatcher: () => void }>((resolve, reject) => {
    const log = (...message: Parameters<typeof console['log']>) =>
      silent ? undefined : console.log(...message)

    setImmediate(() => {
      const schema = app.graphql.schema

      async function watchExecute() {
        const { enabled = false, chokidarOptions = {} } = watchOptions || {}

        if (operationsGlob && enabled) {
          log(`[mercurius-codegen] Watching for changes in ${operationsGlob}`)

          const { watch } = await import('chokidar')

          const watcher = watch(operationsGlob, {
            ...chokidarOptions,
            ignoreInitial: true,
          })

          const closeWatcher = () => {
            watcher.close()
          }
          process.on('beforeExit', closeWatcher)

          const listener = (
            eventName: 'add' | 'addDir' | 'change' | 'unlink' | 'unlinkDir',
            changedPath: string
          ) => {
            log(
              `[mercurius-codegen] ${changedPath} ${eventName}, re-generating...`
            )

            generateCode(
              schema,
              codegenConfig,
              preImportCode,
              silent,
              operationsGlob
            )
              .then((code) => {
                writeGeneratedCode({
                  code,
                  targetPath,
                })
                  .then((absoluteTargetPath) => {
                    log(
                      `[mercurius-codegen] Code re-generated at ${absoluteTargetPath}`
                    )
                  })
                  .catch(console.error)
              })
              .catch(console.error)
          }
          watcher.on('all', listener)

          return closeWatcher
        }

        return noopCloseWatcher
      }

      generateCode(schema, codegenConfig, preImportCode, silent, operationsGlob)
        .then((code) => {
          writeGeneratedCode({
            code,
            targetPath,
          })
            .then((absoluteTargetPath) => {
              log(`[mercurius-codegen] Code generated at ${absoluteTargetPath}`)

              watchExecute()
                .then((closeWatcher) => {
                  resolve({
                    closeWatcher,
                  })
                })
                .catch(reject)
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
