import {Entity} from './entity.model';

export interface ComponentQueryResult {
  entities: EntityEntry[];
}

export interface EntityEntry {
  entity: Entity;
  components: Map<string, number>;
}

export type EscQuery = QueryNode[];

export enum QueryToken {
  FIRST,
  AND,
  OR,
}

export interface QueryNode {
  // not: boolean;
  componentIdentifier: string;
  token: QueryToken;
}
