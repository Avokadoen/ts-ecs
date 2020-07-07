import { ECSManager } from "../src/ecs/manager";
import { Entity } from "../src/ecs/entity.model";

export class TestCompOne {
    static readonly identifier = 'TestCompOne';
}

export class TestCompTwo {
    static readonly identifier = 'TestCompTwo';
}

export class TestCompThree {
    static readonly identifier = 'TestCompThree';
}

export class TestCompFour {
    static readonly identifier = 'TestCompFour';

    constructor(public someState: number) { }
}


export function createSimpleQueryScenario(manager: ECSManager) {
    manager.registerComponentType(TestCompOne.identifier, new TestCompOne());
    manager.registerComponentType(TestCompTwo.identifier, new TestCompTwo());
    manager.registerComponentType(TestCompThree.identifier, new TestCompThree());
    manager.registerComponentType(TestCompFour.identifier, new TestCompFour(0));

    // Entity: 0
    manager.createEntity()
        .addComponent(TestCompOne.identifier, new TestCompOne());

    // Entity: 1
    manager.createEntity();

    // Entity: 2
    manager.createEntity()
        .addComponent(TestCompTwo.identifier, new TestCompTwo());

    // Entity: 3
    manager.createEntity()
        .addComponent(TestCompThree.identifier, new TestCompThree())
        .addComponent(TestCompOne.identifier, new TestCompOne());

    // Entity: 4
    manager.createEntity()
        .addComponent(TestCompThree.identifier, new TestCompThree());

    // Entity: 5
    manager.createEntity()
        .addComponent(TestCompOne.identifier, new TestCompOne())
        .addComponent(TestCompThree.identifier, new TestCompThree());

    // Entity: 6
    manager.createEntity()
        .addComponent(TestCompFour.identifier, new TestCompFour(0))
        .addComponent(TestCompThree.identifier, new TestCompThree());

    return manager;
}

export function sortFn(a: Entity, b: Entity) { return a.id - b.id; }