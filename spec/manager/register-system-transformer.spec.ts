import { ECSManager } from "../../src/ecs/manager";
import { registerSystem, System } from "../../index";
import { TestCompTwo, TestCompOne } from "./utility";
import { Component } from "../../src/ecs/component.model";
import { QueryToken } from "../../src/ecs/esc-query.model";

describe('Register system transformer', () => {
    it('Transform call to valid register call', () => {
        const manager = new ECSManager();

        const system = (dt: number, tOne: Component<TestCompOne>, tTwo: Component<TestCompTwo>) => {
            console.log('wow');
        };

        registerSystem(manager, system);

        // tslint:disable-next-line: no-any
        const systems:  System<number>[] = (manager as any).systems;

        expect(systems.length).toBeGreaterThan(0);
        expect(systems[0].query).toEqual(
            {
                token: QueryToken.AND,
                leftChild: {
                    identifier: 'Component'
                },
                rightChild: {
                    identifier: 'Component'
                }
            }
        );
    });
});