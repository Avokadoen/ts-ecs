import { Subject } from "./subject.model";
import { Observer } from "./observer.model";

export class DispatchSubject<T> implements Subject<T> {
    private observers: Observer<T>[] = [];

    public subscribe(observer: Observer<T>): void {
        if (this.observers.indexOf(observer) >= 0) {
            // TODO: error handling
            return; 
        }

        this.observers.push(observer);
    }

    public unsubscribe(observer: Observer<T>): void {
        const index = this.observers.indexOf(observer);
        if (index < 0) {
            // TODO: error handling
            return; 
        }

        this.observers.splice(index, 1);
    }

    public trigger(observed?: T): void {
        this.observers.forEach(o => o(observed));

        if (this.observers.length > 0) {
            this.observers = [];
        }
    }
}