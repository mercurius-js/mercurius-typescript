import type { FSWatcher, WatchOptions as ChokidarOptions } from 'chokidar'
import { existsSync } from 'fs'
import { resolve } from 'path'

import { formatPrettier } from './prettier'
import { deferredPromise, toGraphQLString } from './utils'
import { writeFileIfChanged } from './write'

export interface PrebuildOptions {
  /**
   * Enable use pre-built schema if found.
   *
   * @default process.env.NODE_ENV === "production"
   */
  enabled?: boolean

  /**
   * @default
   * "./mercurius-schema.json"
   */
  targetPath?: string
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

declare const global: typeof globalThis & {
  mercuriusLoadSchemaWatchCleanup?: () => void
}

function isValidSchemaList(v: unknown): v is Array<string> {
  return Array.isArray(v) && !!v.length && v.every((v) => typeof v === 'string')
}

export function loadSchemaFiles(
  schemaPath: string | string[],
  { watchOptions = {}, prebuild = {}, silent }: LoadSchemaOptions = {}
) {
  const log = (...message: Parameters<typeof console['log']>) =>
    silent ? undefined : console.log(...message)

  const {
    enabled: prebuildEnabled = process.env.NODE_ENV === 'production',
    targetPath: prebuiltSchemaPathOption = './mercurius-schema.json',
  } = prebuild

  const prebuiltSchemaPath = resolve(prebuiltSchemaPathOption)

  function loadSchemaFiles() {
    const {
      loadFilesSync,
    }: typeof import('@graphql-tools/load-files') = require('@graphql-tools/load-files')

    const schema = loadFilesSync(schemaPath, {})
      .map((v) => {
        return String(toGraphQLString(v)).trim().replace(/\r\n/g, '\n')
      })
      .filter(Boolean)

    if (!schema.length) {
      const err = Error('No GraphQL Schema files found!')

      Error.captureStackTrace(err, loadSchemaFiles)

      throw err
    }

    const schemaStringPromise = formatPrettier(JSON.stringify(schema), 'json')

    schemaStringPromise.then((schemaString) => {
      writeFileIfChanged(prebuiltSchemaPath, schemaString).catch(console.error)
    }, console.error)

    return schema
  }

  let schema: string[] | undefined

  if (prebuildEnabled) {
    if (existsSync(prebuiltSchemaPath)) {
      const prebuiltSchema = require(prebuiltSchemaPath)
      if (isValidSchemaList(prebuiltSchema)) {
        schema = prebuiltSchema
      }
    }
  }

  if (!schema) schema = loadSchemaFiles()

  let closeWatcher = async () => false

  const {
    enabled: watchEnabled = false,
    chokidarOptions,
    uniqueWatch = true,
  } = watchOptions

  let watcherPromise: Promise<FSWatcher | undefined>

  if (watchEnabled) {
    const { watch }: typeof import('chokidar') = require('chokidar')

    const watcher = watch(
      schemaPath,
      Object.assign({ useFsEvents: false } as ChokidarOptions, chokidarOptions)
    )

    const watcherToResolve = deferredPromise<FSWatcher | undefined>()
    watcherPromise = watcherToResolve.promise

    let isReady = false

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

    watcher.on('ready', () => {
      isReady = true
      log(`[mercurius-codegen] Watching for changes in ${schemaPath}`)
      watcherToResolve.resolve(watcher)
    })

    watcher.on('error', watcherToResolve.reject)

    const listener = (
      eventName: 'add' | 'addDir' | 'change' | 'unlink' | 'unlinkDir',
      changedPath: string
    ) => {
      if (!isReady) return

      log(
        `[mercurius-codegen] ${changedPath} ${eventName}, loading new schema...`
      )

      try {
        const schema = loadSchemaFiles()

        if (watchOptions.onChange) watchOptions.onChange(schema)
      } catch (err) {
        console.error(err)
      }
    }

    watcher.on('all', listener)
  } else {
    watcherPromise = Promise.resolve(undefined)
  }

  return {
    schema,
    closeWatcher,
    watcher: watcherPromise,
  }
}
