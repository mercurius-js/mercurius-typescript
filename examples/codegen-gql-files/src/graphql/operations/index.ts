import type { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core'
export type Maybe<T> = T | null
export type Exact<T extends { [key: string]: unknown }> = {
  [K in keyof T]: T[K]
}
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: string
  String: string
  Boolean: boolean
  Int: number
  Float: number
}

export type Mutation = {
  __typename?: 'Mutation'
  add: Scalars['Int']
}

export type MutationAddArgs = {
  x: Scalars['Int']
  y: Scalars['Int']
}

export type Query = {
  __typename?: 'Query'
  Hello: Scalars['String']
}

export type HelloQueryVariables = Exact<{ [key: string]: never }>

export type HelloQuery = { __typename?: 'Query'; Hello: string }

export type AddMutationVariables = Exact<{
  x: Scalars['Int']
  y: Scalars['Int']
}>

export type AddMutation = { __typename?: 'Mutation'; add: number }

export const HelloDocument: DocumentNode<HelloQuery, HelloQueryVariables> = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'hello' },
      variableDefinitions: [],
      directives: [],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'Hello' },
            arguments: [],
            directives: [],
          },
        ],
      },
    },
  ],
}
export const AddDocument: DocumentNode<AddMutation, AddMutationVariables> = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'add' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'x' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'Int' } },
          },
          directives: [],
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'y' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'Int' } },
          },
          directives: [],
        },
      ],
      directives: [],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'add' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'x' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'x' } },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'y' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'y' } },
              },
            ],
            directives: [],
          },
        ],
      },
    },
  ],
}
