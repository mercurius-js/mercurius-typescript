import { promises, existsSync } from 'fs'

/**
 * Write the target file only if the content changed,
 * It always returns the target path
 */
export async function writeFileIfChanged(targetPath: string, content: string) {
  const fileExists = existsSync(targetPath)

  if (fileExists) {
    const existingContent = await promises.readFile(targetPath, {
      encoding: 'utf-8',
    })

    if (existingContent === content) return targetPath
  }

  await promises.writeFile(targetPath, content, {
    encoding: 'utf-8',
  })

  return targetPath
}
