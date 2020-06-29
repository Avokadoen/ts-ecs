import { Observer } from "./observer.model";

export interface Subject<T> {
    subscribe(observer: Observer<T>): void;
    unsubscribe(observer: Observer<T>): void;
    trigger(observed: T): void;
}