import {EscQuery, EntityQueryResult} from './esc-query.model';
import {Component} from './component.model';


/**
 * A function that called by {@link System} under dispatch or on event
 * @return return true if the system has changed the internal storage somehow
 */
export type SystemFn<T> = (required: T, args: Component<Object>[], sharedArgs?: Component<Object>[]) => void;

/**
 * A system stored in the manager and contains all data required to dispatch a {@link SystemFn}
 */
export interface System<T> {
  query: EscQuery;
  qResult: EntityQueryResult;
  system: SystemFn<T>;
}
