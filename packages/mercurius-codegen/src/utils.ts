import { ASTNode, print } from 'graphql'

export const toGraphQLString = (v: string | ASTNode) =>
  typeof v === 'string' ? v : print(v)
export class PLazy<ValueType> extends Promise<ValueType> {
  private _executor
  private _promise?: Promise<ValueType>

  constructor(
    executor: (
      resolve: (value: ValueType) => void,
      reject: (err: unknown) => void
    ) => void
  ) {
    super((resolve: (v?: any) => void) => resolve())

    this._executor = executor
  }

  then: Promise<ValueType>['then'] = (onFulfilled, onRejected) => {
    this._promise = this._promise || new Promise(this._executor)
    return this._promise.then(onFulfilled, onRejected)
  }

  catch: Promise<ValueType>['catch'] = (onRejected) => {
    this._promise = this._promise || new Promise(this._executor)
    return this._promise.catch(onRejected)
  }

  finally: Promise<ValueType>['finally'] = (onFinally) => {
    this._promise = this._promise || new Promise(this._executor)
    return this._promise.finally(onFinally)
  }
}

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
