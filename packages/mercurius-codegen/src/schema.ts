import type { WatchOptions as ChokidarOptions } from 'chokidar'
import { existsSync, promises } from 'fs'
import { resolve } from 'path'

let prebuiltSchema: string[] | undefined

export const buildJSONPath = resolve('./mercurius-schema.json')

if (existsSync(buildJSONPath)) {
  prebuiltSchema = require(buildJSONPath)
}

export interface PrebuildOptions {
  /**
   * Enable use pre-built schema if found.
   *
   * @default process.env.NODE_ENV === "production"
   */
  enabled?: boolean
}

export interface WatchOptions {
  /**
   * Enable file watching
   * @default false
   */
  enabled?: boolean
  /**
   * Custom function to be executed after schema change
   */
  onChange?: (schema: string[]) => void
  /**
   * Extra Chokidar options to be passed
   */
  chokidarOptions?: Omit<ChokidarOptions, 'ignoreInitial'>
  /**
   * Unique watch instance
   *
   * `Specially useful for hot module replacement environments, preventing memory leaks`
   *
   * @default true
   */
  uniqueWatch?: boolean
}

export interface LoadSchemaOptions {
  /**
   * Watch options
   */
  watchOptions?: WatchOptions
  /**
   * Pre-build options
   */
  prebuild?: PrebuildOptions
  /**
   * Don't notify to the console
   */
  silent?: boolean
}

declare global {
  namespace NodeJS {
    interface Global {
      mercuriusLoadSchemaWatchCleanup?: () => void
    }
  }
}

export function loadSchemaFiles(
  schemaPath: string | string[],
  { watchOptions = {}, prebuild = {}, silent }: LoadSchemaOptions = {}
) {
  const {
    enabled: prebuildEnabled = process.env.NODE_ENV === 'production',
  } = prebuild

  function loadSchemaFiles() {
    const {
      loadFilesSync,
    }: typeof import('@graphql-tools/load-files') = require('@graphql-tools/load-files')

    const schema = loadFilesSync(schemaPath, {})
      .map((v) => String(v).trim())
      .filter(Boolean)

    if (!schema.length) {
      const err = Error('No GraphQL Schema files found!')

      Error.captureStackTrace(err, loadSchemaFiles)

      throw err
    }

    const schemaString = JSON.stringify(schema, null, 2)

    if (existsSync(buildJSONPath)) {
      promises
        .readFile(buildJSONPath, {
          encoding: 'utf-8',
        })
        .then((existingSchema) => {
          if (existingSchema === schemaString) return

          promises
            .writeFile(buildJSONPath, schemaString, {
              encoding: 'utf-8',
            })
            .catch(console.error)
        })
        .catch(console.error)
    } else {
      promises
        .writeFile(buildJSONPath, schemaString, {
          encoding: 'utf-8',
        })
        .catch(console.error)
    }

    return schema
  }

  let schema: string[] | undefined

  if (prebuildEnabled && prebuiltSchema) {
    if (
      Array.isArray(prebuiltSchema) &&
      prebuiltSchema.length &&
      prebuiltSchema.every((v) => typeof v === 'string')
    ) {
      schema = prebuiltSchema
    }
  }

  if (!schema) schema = loadSchemaFiles()

  let closeWatcher = async () => false

  const {
    enabled: watchEnabled = false,
    chokidarOptions = {},
    uniqueWatch = true,
  } = watchOptions

  if (watchEnabled) {
    const { watch }: typeof import('chokidar') = require('chokidar')

    const watcher = watch(schemaPath, {
      ...chokidarOptions,
      ignoreInitial: true,
    })

    let closed = false
    closeWatcher = async () => {
      if (closed) return false

      closed = true
      await watcher.close()
      return true
    }

    if (uniqueWatch) {
      if (typeof global.mercuriusLoadSchemaWatchCleanup === 'function') {
        global.mercuriusLoadSchemaWatchCleanup()
      }

      global.mercuriusLoadSchemaWatchCleanup = closeWatcher
    }

    const listener = (
      eventName: 'add' | 'addDir' | 'change' | 'unlink' | 'unlinkDir',
      changedPath: string
    ) => {
      if (!silent) {
        console.log(
          `[mercurius-codegen] ${changedPath} ${eventName}, loading new schema...`
        )
      }

      try {
        const schema = loadSchemaFiles()

        watchOptions.onChange?.(schema)
      } catch (err) {
        console.error(err)
      }
    }

    watcher.on('all', listener)
  }

  return {
    schema,
    closeWatcher,
  }
}
