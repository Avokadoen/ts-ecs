import {ComponentQueryResult, EscQuery} from './esc-query.model';
import {Component} from './component.model';


/**
 * A function that called by {@link System} under dispatch or on event
 */
export type SystemFn<T> = (required: T, args: Component<Object>[], sharedArgs?: Component<Object>[]) => void;

/**
 * A system stored in the manager and contains all data required to dispatch a {@link SystemFn}
 */
export interface System<T> {
  query: EscQuery;
  qResult: ComponentQueryResult;
  system: SystemFn<T>;
}

