import type {} from 'mercurius'
import type { FastifyInstance } from 'fastify'
import type { FSWatcher, WatchOptions as ChokidarOptions } from 'chokidar'
import type { CodegenPluginsConfig } from './code'

import { MercuriusLoadersPlugin } from './mercuriusLoaders'
import { deferredPromise } from './utils'

export { MercuriusLoadersPlugin as plugin }

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
    chokidarOptions?: ChokidarOptions
    /**
     * Unique watch instance
     *
     * `Specially useful for hot module replacement environments, preventing memory leaks`
     *
     * @default true
     */
    uniqueWatch?: boolean
  }
}

declare global {
  namespace NodeJS {
    interface Global {
      mercuriusOperationsWatchCleanup?: () => void
    }
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
  closeWatcher: () => Promise<boolean>
  watcher: Promise<FSWatcher | undefined>
}> {
  const noopCloseWatcher = async () => false
  if (disable)
    return {
      closeWatcher: noopCloseWatcher,
      watcher: Promise.resolve(undefined),
    }

  await app.ready()

  if (typeof app.graphql !== 'function') {
    throw Error('Mercurius is not registered in Fastify Instance!')
  }

  const { generateCode, writeGeneratedCode } = await import('./code')

  return new Promise((resolve, reject) => {
    const log = (...message: Parameters<typeof console['log']>) =>
      silent ? undefined : console.log(...message)

    setImmediate(() => {
      const schema = app.graphql.schema

      async function watchExecute() {
        const {
          enabled: watchEnabled = false,
          chokidarOptions,
          uniqueWatch = true,
        } = watchOptions || {}

        if (watchEnabled && operationsGlob) {
          const { watch } = await import('chokidar')

          let watcherPromise = deferredPromise<FSWatcher | undefined>()

          const watcher = watch(
            operationsGlob,
            Object.assign(
              {
                useFsEvents: false,
              } as ChokidarOptions,
              chokidarOptions
            )
          )

          let isReady = false

          watcher.on('ready', () => {
            isReady = true
            log(`[mercurius-codegen] Watching for changes in ${operationsGlob}`)
            watcherPromise.resolve(watcher)
          })

          watcher.on('error', watcherPromise.reject)

          let closed = false

          const closeWatcher = async () => {
            if (closed) return false

            closed = true
            await watcher.close()
            return true
          }

          if (uniqueWatch) {
            if (typeof global.mercuriusOperationsWatchCleanup === 'function') {
              global.mercuriusOperationsWatchCleanup()
            }

            global.mercuriusOperationsWatchCleanup = closeWatcher
          }

          const listener = (
            eventName: 'add' | 'addDir' | 'change' | 'unlink' | 'unlinkDir',
            changedPath: string
          ) => {
            if (!isReady) return

            log(
              `[mercurius-codegen] ${changedPath} ${eventName}, re-generating...`
            )

            generateCode(
              schema,
              codegenConfig,
              preImportCode,
              silent,
              operationsGlob
            ).then((code) => {
              writeGeneratedCode({
                code,
                targetPath,
              }).then((absoluteTargetPath) => {
                log(
                  `[mercurius-codegen] Code re-generated at ${absoluteTargetPath}`
                )
              }, console.error)
            }, console.error)
          }
          watcher.on('all', listener)

          return {
            closeWatcher,
            watcher: watcherPromise.promise,
          }
        }

        return {
          closeWatcher: noopCloseWatcher,
          watcher: Promise.resolve(undefined),
        }
      }

      generateCode(
        schema,
        codegenConfig,
        preImportCode,
        silent,
        operationsGlob
      ).then((code) => {
        writeGeneratedCode({
          code,
          targetPath,
        }).then((absoluteTargetPath) => {
          log(`[mercurius-codegen] Code generated at ${absoluteTargetPath}`)

          watchExecute().then((watchResult) => {
            resolve(watchResult)
          }, reject)
        }, reject)
      }, reject)
    })
  })
}

export default codegenMercurius

export { gql } from './utils'
export { CodegenPluginsConfig, generateCode, writeGeneratedCode } from './code'

export const loadSchemaFiles: typeof import('./schema').loadSchemaFiles = (
  ...args
) => require('./schema').loadSchemaFiles(...args)

export { LoadSchemaOptions } from './schema'
