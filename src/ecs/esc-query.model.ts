import { EntityEntry} from './entity.model';
import {Component} from './component.model';

/**
 * The result of {@link ECSManager.queryEntities}
 */
export interface EntityQueryResult {
  sharedArgs?: Component<object>[];
  entities: EntityEntry[];
}

// TODO: EscQuery should be a tree, not an array
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

/**
 * One node in a query used to retrieve entities and components
 */
export interface QueryNode {
  token: QueryToken;
  left_sibling?: QueryNode | QueryLeafNode;
  right_sibling?: QueryNode | QueryLeafNode;
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