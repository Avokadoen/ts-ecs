import { Component } from "../ecs/component.model";
import { isObject } from "util";

// TODO: iterator will break if you break early out of loop 
export class ComponentPool<T extends object> implements IterableIterator<Component<T>> {

    private pool: Component<T>[] = [];
    private defaultValue: T;

    private length: number = 0;
    private pos: number = 0;

    constructor(defaultValue: T, private readonly stride: number = 20) {
        this.defaultValue = defaultValue;
        this.onExpandPool(true);
    }

    // TODO: dissallow entityId that already exist 
    public add(entityId: number, override?: T) {
        if (this.length >= this.pool.length) {
            this.onExpandPool();
        }

        this.pool[this.length].entityId = entityId;

        const target = override ?? this.defaultValue;
        this.deepClone(target, this.pool[this.length].data);

        this.length += 1;
    }

    public remove(entityId: number): Component<T> | undefined {
        const indexOf = this.pool.findIndex(c => c.entityId === entityId);
        if (indexOf < 0) {
            return;
        }

        const removed = this.pool[indexOf];
        const lastIndex = this.length - 1;

        this.pool[indexOf] = this.pool[lastIndex];

        removed.entityId = -1;
        this.pool[lastIndex] = removed;

        this.length = lastIndex;
    }

    // TODO: we should not change component-pool state, we should return a wrapper
    //       closjure/object that contains pos and so on to avoid hellish bugs
    [Symbol.iterator](): IterableIterator<Component<T>> {
        return this;
    }

    public next(): IteratorResult<Component<T>> {
        if (this.pos < this.length) {
            return {
                done: false,
                value: this.pool[this.pos++]
            };
        }
         
        this.pos = 0; 
        return {
            done: true,
            value: null
        };
    }

    public unsafeGet(index: number): Component<T> | undefined {
        return this.pool[index];
    }

    // tslint:disable-next-line: no-any
    public find(predicate: (value: Component<T>, index: number, obj: Component<T>[]) => unknown, thisArg?: any) {
        let index = 0; // TODO: implement entries to get index in for loop
        for (const comp of this) {
            if (predicate(comp, index, this.pool)) { // TODO:
                this.pos = 0; 
                return comp;
            }
        }
        return null;
    }

    // tslint:disable-next-line: no-any
    public filter(callbackfn: (value: Component<T>, index: number, array: Component<T>[]) => unknown, thisArg?: any): Component<T>[] {
        const result: Component<T>[] = [];
        let index = 0; // TODO: implement entries to get index in for loop
        for (const comp of this) {
            if (callbackfn(comp, index, this.pool)) {
                result.push(comp);
            }

            index += 1;
        }

        return result;
    }

    private onExpandPool(firstExpand?: boolean): void {
        if (firstExpand) {
            this.pool = new Array<Component<T>>(this.stride);
        } else {
            this.pool.length += this.stride;
        }

        for (let i = this.length; i < this.pool.length; i++) {
            this.pool[i] = {
                entityId: -1,
                data: this.deepCopy(this.defaultValue)
            };
        }
    }

    // Source: https://medium.com/javascript-in-plain-english/how-to-deep-copy-objects-and-arrays-in-javascript-7c911359b089
    private deepCopy<G>(source: G): G {
        if (!source || typeof source !== 'object') {
            return source;
        }

        // tslint:disable-next-line: no-any
        let copy: any = Array.isArray(source) ? [] : {};

        for (const key in source) {
            copy[key] = this.deepCopy(source[key]);
        }

        return copy as G;
    }

    private deepClone<G>(source: G, target: G) {
        for (const key in target) {
            if (!source[key] || typeof source[key] !== 'object') {
                target[key] = source[key];
            }

            this.deepClone(source[key], target[key]);
        }
    }
}