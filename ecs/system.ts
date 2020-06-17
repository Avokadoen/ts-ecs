import {ComponentQueryResult} from './esc-query';
import {Component} from './component';

// required i.e delta time, event ...
export type SystemFn<T> = (required: T, args: Component<any>[]) => void;

export interface System<T> {
  qResult: ComponentQueryResult;
  system: SystemFn<T>;
}

