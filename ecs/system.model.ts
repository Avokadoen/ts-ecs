import {ComponentQueryResult} from './esc-query.model';
import {Component} from './component.model';

// required i.e delta time, event ...
export type SystemFn<T> = (required: T, args: Component<Object>[]) => void;

export interface System<T> {
  qResult: ComponentQueryResult;
  system: SystemFn<T>;
}

