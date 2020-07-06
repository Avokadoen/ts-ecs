import { ComponentIdentifier } from "../src/ecs/component-identifier.model";
import { ECSManager } from "../src/ecs/manager";
import { Entity } from "../src/ecs/entity.model";

export class TestCompOne implements ComponentIdentifier {
    static readonly identifier = 'TestComp1';

    identifier(): string {
        return TestCompOne.identifier;
    }
}

export class TestCompTwo implements ComponentIdentifier {
    static readonly identifier = 'TestComp2';

    identifier(): string {
        return TestCompTwo.identifier;
    }
}

export class TestCompThree implements ComponentIdentifier {
    static readonly identifier = 'TestComp3';

    identifier(): string {
        return TestCompThree.identifier;
    }
}

export class TestCompFour implements ComponentIdentifier {
    static readonly identifier = 'TestComp4';

    constructor(public someState: number) { }

    identifier(): string {
        return TestCompFour.identifier;
    }
}


export function createSimpleQueryScenario(manager: ECSManager) {
    // Entity: 0
    manager.createEntity()
        .addComponent(new TestCompOne());

    // Entity: 1
    manager.createEntity();

    // Entity: 2
    manager.createEntity()
        .addComponent(new TestCompTwo());

    // Entity: 3
    manager.createEntity()
        .addComponent(new TestCompThree())
        .addComponent(new TestCompOne());

    // Entity: 4
    manager.createEntity()
        .addComponent(new TestCompThree());

    // Entity: 5
    manager.createEntity()
        .addComponent(new TestCompOne())
        .addComponent(new TestCompThree());

    // Entity: 6
    manager.createEntity()
        .addComponent(new TestCompFour(0))
        .addComponent(new TestCompThree());

    return manager;
}

export function sortFn(a: Entity, b: Entity) { return a.id - b.id; }