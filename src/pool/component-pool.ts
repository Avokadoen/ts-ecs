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

        this.pool[indexOf] = this.pool[this.length];
        this.length -= 1;
    }

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
        if (!source || typeof source !== 'object') {
            target = source;
        }

        for (const key in target) {
            this.deepClone(source[key], target[key]);
        }
    }
}