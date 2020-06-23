import {ComponentQueryResult, EscQuery} from './esc-query.model';
import {Component} from './component.model';

// required i.e delta time, event ...
export type SystemFn<T> = (required: T, args: Component<Object>[], sharedArgs?: Component<Object>[]) => void;

export interface System<T> {
  query: EscQuery;
  qResult: ComponentQueryResult;
  system: SystemFn<T>;
}

