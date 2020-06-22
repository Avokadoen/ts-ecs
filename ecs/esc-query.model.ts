
export interface ComponentQueryResult {
  entities: EntityEntry[];
}

export interface EntityEntry {
  id: number;
  components: Map<string, number>;
}

export type EscQuery = QueryNode[];

export enum QueryToken {
  FIRST,
  AND,
  OR,
  AND_NOT,
}

export interface QueryNode {
  // not: boolean;
  componentIdentifier: string;
  token: QueryToken;
}
