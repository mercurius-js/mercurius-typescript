import type { WatchOptions as ChokidarOptions } from 'chokidar'
import type { FastifyInstance } from 'fastify'
import type { GraphQLSchema } from 'graphql'

export interface LoadSchemaOptions {
  /**
   * Fastify instance that will be registered with Mercurius
   */
  app: FastifyInstance
  /**
   * Schema files glob patterns
   */
  schemaPath: string | string[]
  /**
   * Federation schema
   */
  federation?: boolean
  /**
   * Watch options
   */
  watchOptions?: {
    /**
     * Enable file watching
     * @default false
     */
    enabled?: boolean
    /**
     * Custom function to be executed after schema change
     */
    onChange?: (schema: GraphQLSchema) => void
    /**
     * Extra Chokidar options to be passed
     */
    chokidarOptions?: Omit<ChokidarOptions, 'ignoreInitial'>
  }
  /**
   * Don't notify to the console
   */
  silent?: boolean
}

export function loadSchemaFiles({
  app,
  watchOptions = {},
  schemaPath,
  silent,
  federation,
}: LoadSchemaOptions) {
  const buildFederatedSchema: (
    schema: string
  ) => GraphQLSchema = require('mercurius/lib/federation')
  const { buildSchema }: typeof import('graphql') = require('graphql')
  const {
    loadFilesSync,
  }: typeof import('@graphql-tools/load-files') = require('@graphql-tools/load-files')
  const { watch }: typeof import('chokidar') = require('chokidar')

  function loadSchemaFiles() {
    const schema = loadFilesSync(schemaPath, {})
      .map((v) => String(v).trim())
      .filter(Boolean)

    if (!schema.length) {
      const err = Error('No GraphQL Schema files found!')

      Error.captureStackTrace(err, loadSchemaFiles)

      throw err
    }

    return schema
  }

  const schema = loadSchemaFiles()

  let closeWatcher: () => void = () => undefined

  if (watchOptions.enabled) {
    const watcher = watch(schemaPath, {
      ...(watchOptions.chokidarOptions || {}),
      ignoreInitial: true,
    })

    closeWatcher = () => {
      watcher.close()
    }

    process.on('beforeExit', closeWatcher)

    const listener = (
      eventName: 'add' | 'addDir' | 'change' | 'unlink' | 'unlinkDir',
      changedPath: string
    ) => {
      if (!silent) {
        console.log(
          `[mercurius-codegen] ${changedPath} ${eventName}, loading new schema...`
        )
      }

      const schemaString = loadSchemaFiles().join('\n')

      const schema = federation
        ? buildFederatedSchema(schemaString)
        : buildSchema(schemaString)

      app.graphql.replaceSchema(schema)

      watchOptions.onChange?.(schema)
    }

    watcher.on('all', listener)
  }

  return {
    schema,
    closeWatcher,
  }
}
