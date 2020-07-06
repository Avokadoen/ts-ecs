import { ECSManager } from "../../src/ecs/manager";
import { registerSystem, System } from "../../index";
import { TestCompTwo, TestCompOne } from "../utility";
import { Component } from "../../src/ecs/component.model";
import { QueryToken } from "../../src/ecs/esc-query.model";
import { ComponentIdentifier } from "../../src/ecs/component-identifier.model";

class OtherClass<T extends ComponentIdentifier> implements ComponentIdentifier{
    identifier: () => 'OtherClass';
    myOtherClass: T;
}

describe('Register system transformer', () => {
    it('Transform call to valid register call', () => {
        const manager = new ECSManager();

        const system = (dt: number, tOne: Component<TestCompOne>, tTwo: Component<TestCompTwo>) => {
            console.log('wow');
        };

        registerSystem(manager, system);

        // tslint:disable-next-line: no-any
        const systems:  System<number>[] = (manager as any).systems;

        expect(systems.length).toBe(1);
        expect(systems[0].query).toEqual(
            {
                token: QueryToken.AND,
                leftChild: {
                    identifier: 'Component<TestCompOne>'
                },
                rightChild: {
                    identifier: 'Component<TestCompTwo>'
                }
            }
        );
    });

    it('Transform nested generic', () => {
        const manager = new ECSManager();

        const system = (dt: number, tOne: Component<OtherClass<OtherClass<TestCompOne>>>) => {
            console.log('wow');
        };

        registerSystem(manager, system);

        // tslint:disable-next-line: no-any
        const systems:  System<number>[] = (manager as any).systems;

        expect(systems.length).toBe(1);
        expect(systems[0].query).toEqual(
            {
                token: QueryToken.OR,
                leftChild: {
                    identifier: 'Component<OtherClass<OtherClass<TestCompOne>>>'
                },
            }
        );
    });
});