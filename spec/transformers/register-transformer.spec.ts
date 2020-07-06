import { ECSManager } from "../../src/ecs/manager";
import { registerSystem, System, registerEvent } from "../../index";
import { TestCompTwo, TestCompOne } from "../utility";
import { Component } from "../../src/ecs/component.model";
import { QueryToken } from "../../src/ecs/esc-query.model";
import { ComponentIdentifier } from "../../src/ecs/component-identifier.model";

class OtherClass<T extends ComponentIdentifier> implements ComponentIdentifier{
    identifier: () => 'OtherClass';
    myOtherClass: T;
}

const simpleSystemType = <T>(_: T, tOne: Component<TestCompOne>, tTwo: Component<TestCompTwo>) => {
    console.log('wow1');
};

const simpleQueryResult = {
    token: QueryToken.AND,
    leftChild: {
        identifier: 'Component<TestCompOne>'
    },
    rightChild: {
        identifier: 'Component<TestCompTwo>'
    }
};

const complexSystemType = <T>(_: T, tOne: Component<OtherClass<OtherClass<TestCompOne>>>) => {
    console.log('wow2');
};

const complexQueryResult = {
    token: QueryToken.OR,
    leftChild: {
        identifier: 'Component<OtherClass<OtherClass<TestCompOne>>>'
    },
};

describe('Register system transformer', () => {
    it('Transform call to valid register call', () => {
        const manager = new ECSManager();

        registerSystem(manager, simpleSystemType);

        // tslint:disable-next-line: no-any
        const systems:  System<number>[] = (manager as any).systems;

        expect(systems.length).toBe(1);
        expect(systems[0].query).toEqual(simpleQueryResult);
    });

    it('Transform nested generic', () => {
        const manager = new ECSManager();

        registerSystem(manager, complexSystemType);

        // tslint:disable-next-line: no-any
        const systems:  System<number>[] = (manager as any).systems;

        expect(systems.length).toBe(1);
        expect(systems[0].query).toEqual(complexQueryResult);
    });
});

describe('Register event transformer', () => {
    it('Transform call to valid register call', () => {
        const manager = new ECSManager();

        registerEvent(manager, simpleSystemType);

        // tslint:disable-next-line: no-any
        const events:  System<Event>[] = (manager as any).events;

        expect(events.length).toBe(1);
        expect(events[0].query).toEqual(simpleQueryResult);
    });

    it('Transform nested generic', () => {
        const manager = new ECSManager();

        registerEvent(manager, complexSystemType);

        // tslint:disable-next-line: no-any
        const events:  System<number>[] = (manager as any).events;

        expect(events.length).toBe(1);
        expect(events[0].query).toEqual(
            {
                token: QueryToken.OR,
                leftChild: {
                    identifier: 'Component<OtherClass<OtherClass<TestCompOne>>>'
                },
            }
        );
    });
});