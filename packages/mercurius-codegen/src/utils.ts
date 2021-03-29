import PLazy from 'p-lazy'

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

export function LazyPromise<Value>(
  fn: () => Value | Promise<Value>
): Promise<Value> {
  return new PLazy((resolve, reject) => {
    try {
      const value = fn()
      if (value instanceof Promise) {
        value.then(resolve, (err) => {
          if (err instanceof Error) Error.captureStackTrace(err, LazyPromise)

          reject(err)
        })
      } else resolve(value)
    } catch (err) {
      if (err instanceof Error) Error.captureStackTrace(err, LazyPromise)

      reject(err)
    }
  })
}

type PossiblePromise<T> = T | Promise<T>

export type DeepPartial<T> = T extends Function
  ? T
  : T extends Array<infer U>
  ? DeepPartialArray<U>
  : T extends object
  ? DeepPartialObject<T>
  : T | undefined

interface DeepPartialArray<T>
  extends Array<PossiblePromise<DeepPartial<PossiblePromise<T>>>> {}
type DeepPartialObject<T> = {
  [P in keyof T]?: PossiblePromise<DeepPartial<PossiblePromise<T[P]>>>
}

export { PLazy }
