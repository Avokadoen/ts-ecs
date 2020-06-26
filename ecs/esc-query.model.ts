import {Entity, EntityEntry} from './entity.model';
import {Component} from './component.model';

/**
 * The result of {@link ECSManager.queryEntities}
 */
export interface EntityQueryResult {
  sharedEntities?: Entity[];
  entities: Entity[];
}

/**
 * The result of {@link ECSManager.queryComponents}
 */
export interface ComponentQueryResult {
  sharedArgs?: Component<object>[];
  entities: EntityEntry[];
}

// TODO: EscQuery should be a tree, not an array
/**
 * A complete query that can be used by {@link ECSManager}
 */
export type EscQuery = QueryNode[];

/**
 * Defines the end user intent with a given {@link QueryNode}
 */
export enum QueryToken {
  FIRST,
  AND,
  OR,
  AND_NOT,
  SHARED,
}

/**
 * One node in a query used to retrieve entities and components
 */
export interface QueryNode {
  componentIdentifier: string;
  token: QueryToken;
}
