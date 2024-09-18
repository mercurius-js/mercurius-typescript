import type { FastifyInstance } from 'fastify'
import { resolve } from 'path'

import { formatPrettier } from './prettier'
import { writeFileIfChanged } from './write'

export async function writeOutputSchema(
  app: FastifyInstance,
  config: string | boolean,
) {
  if (!config) return

  let targetPath: string
  if (typeof config === 'boolean') {
    targetPath = resolve('./schema.gql')
  } else {
    targetPath = resolve(config)
  }

  const { printSchemaWithDirectives } = await import('@graphql-tools/utils')

  const schema = await formatPrettier(
    printSchemaWithDirectives(app.graphql.schema),
    'graphql',
  )

  await writeFileIfChanged(targetPath, schema)
}
