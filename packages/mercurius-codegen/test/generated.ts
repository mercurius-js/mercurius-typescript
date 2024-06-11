import type {
  GraphQLResolveInfo,
  GraphQLScalarType,
  GraphQLScalarTypeConfig,
} from 'graphql'
import type { MercuriusContext } from 'mercurius'
import type { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core'
export type Maybe<T> = T | null
export type InputMaybe<T> = Maybe<T>
export type Exact<T extends { [key: string]: unknown }> = {
  [K in keyof T]: T[K]
}
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & {
  [SubKey in K]?: Maybe<T[SubKey]>
}
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & {
  [SubKey in K]: Maybe<T[SubKey]>
}
export type ResolverFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) =>
  | Promise<import('mercurius-codegen').DeepPartial<TResult>>
  | import('mercurius-codegen').DeepPartial<TResult>
export type RequireFields<T, K extends keyof T> = Omit<T, K> & {
  [P in K]-?: NonNullable<T[P]>
}
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: string
  String: string
  Boolean: boolean
  Int: number
  Float: number
  DateTime: Date
  _FieldSet: any
}

export type Query = {
  __typename?: 'Query'
  hello: Scalars['String']
  aHuman: Human
  getNArray?: Maybe<NArray>
}

export type QueryhelloArgs = {
  greetings?: InputMaybe<Scalars['String']>
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
  name?: InputMaybe<Scalars['String']>
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

export type NArray = {
  __typename?: 'NArray'
  nArray?: Maybe<Array<Maybe<Array<Maybe<Array<Maybe<Scalars['Int']>>>>>>>
}

export type ResolverTypeWrapper<T> = Promise<T> | T

export type ResolverWithResolve<TResult, TParent, TContext, TArgs> = {
  resolve: ResolverFn<TResult, TParent, TContext, TArgs>
}
export type Resolver<TResult, TParent = {}, TContext = {}, TArgs = {}> =
  | ResolverFn<TResult, TParent, TContext, TArgs>
  | ResolverWithResolve<TResult, TParent, TContext, TArgs>

export type SubscriptionSubscribeFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => AsyncIterable<TResult> | Promise<AsyncIterable<TResult>>

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
  DateTime: ResolverTypeWrapper<Scalars['DateTime']>
  Query: ResolverTypeWrapper<{}>
  String: ResolverTypeWrapper<Scalars['String']>
  Human: ResolverTypeWrapper<Human>
  Boolean: ResolverTypeWrapper<Scalars['Boolean']>
  NArray: ResolverTypeWrapper<NArray>
  Int: ResolverTypeWrapper<Scalars['Int']>
}

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = {
  DateTime: Scalars['DateTime']
  Query: {}
  String: Scalars['String']
  Human: Human
  Boolean: Scalars['Boolean']
  NArray: NArray
  Int: Scalars['Int']
}

export interface DateTimeScalarConfig
  extends GraphQLScalarTypeConfig<ResolversTypes['DateTime'], any> {
  name: 'DateTime'
}

export type QueryResolvers<
  ContextType = MercuriusContext,
  ParentType extends ResolversParentTypes['Query'] = ResolversParentTypes['Query']
> = {
  hello?: Resolver<
    ResolversTypes['String'],
    ParentType,
    ContextType,
    Partial<QueryhelloArgs>
  >
  aHuman?: Resolver<ResolversTypes['Human'], ParentType, ContextType>
  getNArray?: Resolver<Maybe<ResolversTypes['NArray']>, ParentType, ContextType>
}

export type HumanResolvers<
  ContextType = MercuriusContext,
  ParentType extends ResolversParentTypes['Human'] = ResolversParentTypes['Human']
> = {
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>
  father?: Resolver<Maybe<ResolversTypes['Human']>, ParentType, ContextType>
  hasSon?: Resolver<
    Maybe<ResolversTypes['Boolean']>,
    ParentType,
    ContextType,
    Partial<HumanhasSonArgs>
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

export type NArrayResolvers<
  ContextType = MercuriusContext,
  ParentType extends ResolversParentTypes['NArray'] = ResolversParentTypes['NArray']
> = {
  nArray?: Resolver<
    Maybe<Array<Maybe<Array<Maybe<Array<Maybe<ResolversTypes['Int']>>>>>>>,
    ParentType,
    ContextType
  >
  isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}

export type Resolvers<ContextType = MercuriusContext> = {
  DateTime?: GraphQLScalarType
  Query?: QueryResolvers<ContextType>
  Human?: HumanResolvers<ContextType>
  NArray?: NArrayResolvers<ContextType>
}

export type Loader<TReturn, TObj, TParams, TContext> = (
  queries: Array<{
    obj: TObj
    params: TParams
  }>,
  context: TContext & {
    reply: import('fastify').FastifyReply
  }
) => Promise<Array<import('mercurius-codegen').DeepPartial<TReturn>>>
export type LoaderResolver<TReturn, TObj, TParams, TContext> =
  | Loader<TReturn, TObj, TParams, TContext>
  | {
      loader: Loader<TReturn, TObj, TParams, TContext>
      opts?: {
        cache?: boolean
      }
    }
export interface Loaders<
  TContext = import('mercurius').MercuriusContext & {
    reply: import('fastify').FastifyReply
  }
> {
  Human?: {
    __resolveReference?: LoaderResolver<Human, Human, {}, TContext>
    name?: LoaderResolver<Scalars['String'], Human, {}, TContext>
    father?: LoaderResolver<Maybe<Human>, Human, {}, TContext>
    hasSon?: LoaderResolver<
      Maybe<Scalars['Boolean']>,
      Human,
      HumanhasSonArgs,
      TContext
    >
    sons?: LoaderResolver<Array<Maybe<Human>>, Human, HumansonsArgs, TContext>
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

  NArray?: {
    __resolveReference?: LoaderResolver<NArray, NArray, {}, TContext>
    nArray?: LoaderResolver<
      Maybe<Array<Maybe<Array<Maybe<Scalars['Int']>>>>>,
      NArray,
      {},
      TContext
    >
  }
}
export type AQueryVariables = Exact<{ [key: string]: never }>

export type AQuery = { __typename?: 'Query'; hello: string }

export const ADocument = {
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
} as unknown as DocumentNode<AQuery, AQueryVariables>
declare module 'mercurius' {
  interface IResolvers
    extends Resolvers<import('mercurius').MercuriusContext> {}
  interface MercuriusLoaders extends Loaders {}
}
