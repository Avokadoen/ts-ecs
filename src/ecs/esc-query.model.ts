import { EntityEntry} from './entity.model';
import {Component} from './component.model';

/**
 * The result of {@link ECSManager.queryEntities}
 */
export interface EntityQueryResult {
  sharedArgs?: Component<object>[][];
  entities: EntityEntry[];
}

/**
 * A complete query that can be used by {@link ECSManager}
 */
export type EscQuery = QueryNode;

/**
 * Defines the end user intent with a given {@link QueryNode}
 */
export enum QueryToken {
  AND,
  OR,
  NOT,
  SHARED,
}

export function queryTokenFromString(value: string): QueryToken | null {
  switch (value?.toLowerCase()) {
    case 'and':
      return QueryToken.AND;
    case 'or':
      return QueryToken.OR;
    case 'not':
      return QueryToken.NOT;
    case 'shared':
      return QueryToken.SHARED;
    default:
      return null;
  }
}

/**
 * One node in a query used to retrieve entities and components
 */
export interface QueryNode {
  token: QueryToken;
  leftChild?: QueryNode | QueryLeafNode;
  rightChild?: QueryNode | QueryLeafNode;
}

export interface QueryLeafNode {
  identifier: string;
}

export function isQueryNode(node: QueryNode | QueryLeafNode): node is QueryNode {
  return (node as QueryNode).token !== undefined;
}

export function isQueryLeafNode(node: QueryNode | QueryLeafNode): node is QueryLeafNode {
  return (node as QueryLeafNode).identifier !== undefined;
}