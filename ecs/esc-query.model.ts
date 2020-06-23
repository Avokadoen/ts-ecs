import {Entity} from './entity.model';

export interface EntityQueryResult {
  sharedEntities?: Entity[];
  entities: Entity[];
}

export interface ComponentQueryResult {
  sharedEntities?: EntityEntry[];
  entities: EntityEntry[];
}

export interface EntityEntry {
  id: number;
  components: Map<string, number>;
}

// TODO: EscQuery should be a tree, not an array
export type EscQuery = QueryNode[];

export enum QueryToken {
  FIRST,
  AND,
  OR,
  AND_NOT,
  SHARED,
}

export interface QueryNode {
  componentIdentifier: string;
  token: QueryToken;
}
