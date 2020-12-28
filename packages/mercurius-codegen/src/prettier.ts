import type { BuiltInParserName } from 'prettier'

export async function formatPrettier(str: string, parser: BuiltInParserName) {
  const { format, resolveConfig } = await import('prettier')

  const prettierConfig = Object.assign({}, await resolveConfig(process.cwd()))

  return format(str, {
    parser,
    ...prettierConfig,
  })
}
