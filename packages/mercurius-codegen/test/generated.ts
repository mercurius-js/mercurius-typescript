import { MercuriusContext } from 'mercurius'
import { FastifyReply } from 'fastify'
import {
  GraphQLResolveInfo,
  GraphQLScalarType,
  GraphQLScalarTypeConfig,
} from 'graphql'
import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core'
export type Maybe<T> = T | null
export type Exact<T extends { [key: string]: unknown }> = {
  [K in keyof T]: T[K]
}
export type MakeOptional<T, K extends keyof T> = Omit<T, K> &
  { [SubKey in K]?: Maybe<T[SubKey]> }
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> &
  { [SubKey in K]: Maybe<T[SubKey]> }
export type ResolverFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => Promise<DeepPartial<TResult>> | DeepPartial<TResult>
export type RequireFields<T, K extends keyof T> = {
  [X in Exclude<keyof T, K>]?: T[X]
} &
  { [P in K]-?: NonNullable<T[P]> }
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: string
  String: string
  Boolean: boolean
  Int: number
  Float: number
  DateTime: Date
}

export type Query = {
  __typename?: 'Query'
  hello: Scalars['String']
  aHuman: Human
}

export type QueryhelloArgs = {
  greetings?: Maybe<Scalars['String']>
}

export type Human = {
  __typename?: 'Human'
  name: Scalars['String']
  father?: Maybe<Human>
  hasSon?: Maybe<Scalars['Boolean']>
  sons: Array<Maybe<Human>>
  confirmedSonsNullable?: Maybe<Array<Human>>
  confirmedSonsNonNullItems: Array<Human>
  sonNames?: Maybe<Array<Maybe<Scalars['String']>>>
  nonNullssonNames: Array<Scalars['String']>
}

export type HumanhasSonArgs = {
  name?: Maybe<Scalars['String']>
}

export type HumansonsArgs = {
  name: Scalars['String']
}

export type HumanconfirmedSonsNullableArgs = {
  name: Scalars['String']
}

export type HumanconfirmedSonsNonNullItemsArgs = {
  name: Scalars['String']
}

export type ResolverTypeWrapper<T> = Promise<T> | T

export type LegacyStitchingResolver<TResult, TParent, TContext, TArgs> = {
  fragment: string
  resolve: ResolverFn<TResult, TParent, TContext, TArgs>
}

export type NewStitchingResolver<TResult, TParent, TContext, TArgs> = {
  selectionSet: string
  resolve: ResolverFn<TResult, TParent, TContext, TArgs>
}
export type StitchingResolver<TResult, TParent, TContext, TArgs> =
  | LegacyStitchingResolver<TResult, TParent, TContext, TArgs>
  | NewStitchingResolver<TResult, TParent, TContext, TArgs>
export type Resolver<TResult, TParent = {}, TContext = {}, TArgs = {}> =
  | ResolverFn<TResult, TParent, TContext, TArgs>
  | StitchingResolver<TResult, TParent, TContext, TArgs>

export type SubscriptionSubscribeFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => AsyncIterator<TResult> | Promise<AsyncIterator<TResult>>

export type SubscriptionResolveFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>

export interface SubscriptionSubscriberObject<
  TResult,
  TKey extends string,
  TParent,
  TContext,
  TArgs
> {
  subscribe: SubscriptionSubscribeFn<
    { [key in TKey]: TResult },
    TParent,
    TContext,
    TArgs
  >
  resolve?: SubscriptionResolveFn<
    TResult,
    { [key in TKey]: TResult },
    TContext,
    TArgs
  >
}

export interface SubscriptionResolverObject<TResult, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<any, TParent, TContext, TArgs>
  resolve: SubscriptionResolveFn<TResult, any, TContext, TArgs>
}

export type SubscriptionObject<
  TResult,
  TKey extends string,
  TParent,
  TContext,
  TArgs
> =
  | SubscriptionSubscriberObject<TResult, TKey, TParent, TContext, TArgs>
  | SubscriptionResolverObject<TResult, TParent, TContext, TArgs>

export type SubscriptionResolver<
  TResult,
  TKey extends string,
  TParent = {},
  TContext = {},
  TArgs = {}
> =
  | ((
      ...args: any[]
    ) => SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>)
  | SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>

export type TypeResolveFn<TTypes, TParent = {}, TContext = {}> = (
  parent: TParent,
  context: TContext,
  info: GraphQLResolveInfo
) => Maybe<TTypes> | Promise<Maybe<TTypes>>

export type IsTypeOfResolverFn<T = {}, TContext = {}> = (
  obj: T,
  context: TContext,
  info: GraphQLResolveInfo
) => boolean | Promise<boolean>

export type NextResolverFn<T> = () => Promise<T>

export type DirectiveResolverFn<
  TResult = {},
  TParent = {},
  TContext = {},
  TArgs = {}
> = (
  next: NextResolverFn<TResult>,
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>

/** Mapping between all available schema types and the resolvers types */
export type ResolversTypes = {
  DateTime: ResolverTypeWrapper<DeepPartial<Scalars['DateTime']>>
  Query: ResolverTypeWrapper<{}>
  String: ResolverTypeWrapper<DeepPartial<Scalars['String']>>
  Human: ResolverTypeWrapper<DeepPartial<Human>>
  Boolean: ResolverTypeWrapper<DeepPartial<Scalars['Boolean']>>
}

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = {
  DateTime: DeepPartial<Scalars['DateTime']>
  Query: {}
  String: DeepPartial<Scalars['String']>
  Human: DeepPartial<Human>
  Boolean: DeepPartial<Scalars['Boolean']>
}

export interface DateTimeScalarConfig
  extends GraphQLScalarTypeConfig<ResolversTypes['DateTime'], any> {
  name: 'DateTime'
}

export type QueryResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['Query'] = ResolversParentTypes['Query']
> = {
  hello?: Resolver<
    ResolversTypes['String'],
    ParentType,
    ContextType,
    RequireFields<QueryhelloArgs, never>
  >
  aHuman?: Resolver<ResolversTypes['Human'], ParentType, ContextType>
}

export type HumanResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['Human'] = ResolversParentTypes['Human']
> = {
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>
  father?: Resolver<Maybe<ResolversTypes['Human']>, ParentType, ContextType>
  hasSon?: Resolver<
    Maybe<ResolversTypes['Boolean']>,
    ParentType,
    ContextType,
    RequireFields<HumanhasSonArgs, never>
  >
  sons?: Resolver<
    Array<Maybe<ResolversTypes['Human']>>,
    ParentType,
    ContextType,
    RequireFields<HumansonsArgs, 'name'>
  >
  confirmedSonsNullable?: Resolver<
    Maybe<Array<ResolversTypes['Human']>>,
    ParentType,
    ContextType,
    RequireFields<HumanconfirmedSonsNullableArgs, 'name'>
  >
  confirmedSonsNonNullItems?: Resolver<
    Array<ResolversTypes['Human']>,
    ParentType,
    ContextType,
    RequireFields<HumanconfirmedSonsNonNullItemsArgs, 'name'>
  >
  sonNames?: Resolver<
    Maybe<Array<Maybe<ResolversTypes['String']>>>,
    ParentType,
    ContextType
  >
  nonNullssonNames?: Resolver<
    Array<ResolversTypes['String']>,
    ParentType,
    ContextType
  >
  isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}

export type Resolvers<ContextType = any> = {
  DateTime?: GraphQLScalarType
  Query?: QueryResolvers<ContextType>
  Human?: HumanResolvers<ContextType>
}

/**
 * @deprecated
 * Use "Resolvers" root object instead. If you wish to get "IResolvers", add "typesPrefix: I" to your config.
 */
export type IResolvers<ContextType = any> = Resolvers<ContextType>

type Loader<TReturn, TObj, TParams, TContext> = (
  queries: Array<{
    obj: TObj
    params: TParams
  }>,
  context: TContext & {
    reply: FastifyReply
  }
) => Promise<Array<DeepPartial<TReturn>>>
type LoaderResolver<TReturn, TObj, TParams, TContext> =
  | Loader<TReturn, TObj, TParams, TContext>
  | {
      loader: Loader<TReturn, TObj, TParams, TContext>
      opts?: {
        cache?: boolean
      }
    }
export interface Loaders<
  TContext = MercuriusContext & { reply: FastifyReply }
> {
  Human?: {
    name?: LoaderResolver<Scalars['String'], Human, {}, TContext>
    father?: LoaderResolver<Maybe<Human>, Human, {}, TContext>
    hasSon?: LoaderResolver<
      Maybe<Scalars['Boolean']>,
      Human,
      HumanhasSonArgs,
      TContext
    >
    sons?: LoaderResolver<Array<Human>, Human, HumansonsArgs, TContext>
    confirmedSonsNullable?: LoaderResolver<
      Maybe<Array<Human>>,
      Human,
      HumanconfirmedSonsNullableArgs,
      TContext
    >
    confirmedSonsNonNullItems?: LoaderResolver<
      Array<Human>,
      Human,
      HumanconfirmedSonsNonNullItemsArgs,
      TContext
    >
    sonNames?: LoaderResolver<
      Maybe<Array<Maybe<Scalars['String']>>>,
      Human,
      {},
      TContext
    >
    nonNullssonNames?: LoaderResolver<
      Array<Scalars['String']>,
      Human,
      {},
      TContext
    >
  }
}
export type AQueryVariables = Exact<{ [key: string]: never }>

export type AQuery = { __typename?: 'Query' } & Pick<Query, 'hello'>

export const ADocument: DocumentNode<AQuery, AQueryVariables> = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'A' },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [{ kind: 'Field', name: { kind: 'Name', value: 'hello' } }],
      },
    },
  ],
}
export type DeepPartial<T> = T extends Function
  ? T
  : T extends Array<infer U>
  ? _DeepPartialArray<U>
  : T extends object
  ? _DeepPartialObject<T>
  : T | undefined

interface _DeepPartialArray<T> extends Array<DeepPartial<T>> {}
type _DeepPartialObject<T> = { [P in keyof T]?: DeepPartial<T[P]> }

declare module 'mercurius' {
  interface IResolvers extends Resolvers<MercuriusContext> {}
  interface MercuriusLoaders extends Loaders {}
}
