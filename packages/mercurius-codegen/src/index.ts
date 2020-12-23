import type {} from 'mercurius'
import type { FastifyInstance } from 'fastify'
import type { WatchOptions as ChokidarOptions } from 'chokidar'
import type { CodegenPluginsConfig } from './code'

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

  const { generateCode, writeGeneratedCode } = await import('./code')

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
                    if (absoluteTargetPath) {
                      log(
                        `[mercurius-codegen] Code re-generated at ${absoluteTargetPath}`
                      )
                    }
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
              if (absoluteTargetPath) {
                log(
                  `[mercurius-codegen] Code generated at ${absoluteTargetPath}`
                )
              }

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

export { gql } from './utils'
export { CodegenPluginsConfig, generateCode, writeGeneratedCode } from './code'
export { LoadSchemaOptions, loadSchemaFiles } from './schema'
