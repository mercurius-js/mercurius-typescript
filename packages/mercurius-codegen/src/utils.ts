export function gql(chunks: TemplateStringsArray, ...variables: any[]): string {
  return chunks.reduce(
    (accumulator, chunk, index) =>
      `${accumulator}${chunk}${index in variables ? variables[index] : ''}`,
    ''
  )
}

export function deferredPromise<T = unknown>() {
  let resolve: (value: T | PromiseLike<T>) => void
  let reject: (reason?: any) => void
  const promise = new Promise<T>((resolveFn, rejectFn) => {
    resolve = resolveFn
    reject = rejectFn
  })

  return {
    promise,
    resolve: resolve!,
    reject: reject!,
  }
}
