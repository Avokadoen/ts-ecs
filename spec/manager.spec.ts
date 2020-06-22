import { ECSManager } from '../ecs/manager';
import {ComponentIdentifier} from '../ecs/component-identifier.model';
import {ComponentQueryResult, QueryToken} from '../ecs/esc-query.model';
import {Entity} from '../ecs/entity.model';
import {Component} from '../ecs/component.model';

class TestCompOne implements ComponentIdentifier {
    static readonly identifier = 'TestComp1';

    identifier(): string {
        return TestCompOne.identifier;
    }
}

class TestCompTwo implements ComponentIdentifier {
    static readonly identifier = 'TestComp2';

    identifier(): string {
        return TestCompTwo.identifier;
    }
}

class TestCompThree implements ComponentIdentifier {
    static readonly identifier = 'TestComp3';

    identifier(): string {
        return TestCompThree.identifier;
    }
}

class TestCompFour implements ComponentIdentifier {
    static readonly identifier = 'TestComp4';

    constructor(public someState: number) { }

    identifier(): string {
        return TestCompFour.identifier;
    }
}

describe('AddComponent', () => {
    it('Should succeed on ComponentIdentifier', () => {
        const manager = new ECSManager();
        const testComp = new TestCompOne();
        expect(manager.createEntity().addComponent(testComp).entityId)
            .toBe(0, "First entity was of unexpected value");
    });

    it('Should succeed on nested addComponent', () => {
        const manager = new ECSManager();
        const testComp = new TestCompOne();
        const testComp1 = new TestCompOne();
        const testComp2 = new TestCompOne();
        expect(manager.createEntity()
            .addComponent(testComp)
            .addComponent(testComp1)
            .addComponent(testComp2)
            .entityId)
            .toBe(0, "First entity was of unexpected value");
    });
});

const createSimpleQueryScenario = (manager: ECSManager) => {
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

    return manager;
};

const sortFn = (a: Entity, b: Entity) => a.id - b.id;

describe('Query Entities', () => {
    let manager: ECSManager;

    beforeEach(() => {
        manager = createSimpleQueryScenario(new ECSManager());
    });

    it('Should succeed on single comp query entity', () => {
        const query = [
            {
                componentIdentifier: TestCompTwo.identifier,
                token: QueryToken.FIRST
            }
        ];


        expect(manager.queryEntities(query).sort(sortFn))
            .toEqual([{ id: 2 }], "Query returned unexpected result");
    });

    it('Should succeed on multiple comp query entity', () => {
        const query = [
            {
                componentIdentifier: TestCompOne.identifier,
                token: QueryToken.FIRST
            }
        ];


        expect(manager.queryEntities(query).sort(sortFn))
            .toEqual([{ id: 0 }, { id: 3 }, { id: 5 }], "Query returned unexpected result");
    });

    it('Should succeed on "AND" comp query entity', () => {
        const query = [
            {
                componentIdentifier: TestCompOne.identifier,
                token: QueryToken.FIRST
            },
            {
                componentIdentifier: TestCompThree.identifier,
                token: QueryToken.AND
            }
        ];


        expect(manager.queryEntities(query).sort(sortFn))
            .toEqual([{ id: 3 }, { id: 5 }], "Query returned unexpected result");
    });

    it('Should succeed on "AND" any order', () => {
        const query = [
            {
                componentIdentifier: TestCompThree.identifier,
                token: QueryToken.FIRST
            },
            {
                componentIdentifier: TestCompOne.identifier,
                token: QueryToken.AND
            },
        ];


        expect(manager.queryEntities(query).sort(sortFn))
            .toEqual([{ id: 3 }, { id: 5 }], "Query returned unexpected result");
    });

    it('Should succeed on "OR" comp query entity', () => {
        const query = [
            {
                componentIdentifier: TestCompThree.identifier,
                token: QueryToken.FIRST
            },
            {
                componentIdentifier: TestCompTwo.identifier,
                token: QueryToken.OR
            }
        ];


        expect(manager.queryEntities(query).sort(sortFn))
            .toEqual([{ id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }], "Query returned unexpected result");
    });

    describe('Bigger data set', () => {
        const _manager = new ECSManager();

        for (let i = 0; i < 100; i++) {
            _manager.createEntity()
                .addComponent(new TestCompFour(i))
                .addComponent(new TestCompOne())
                .addComponent(new TestCompTwo());
        }

        it('Should find all entities meeting requirement', () => {
            const query = [
                {
                    componentIdentifier: TestCompOne.identifier,
                    token: QueryToken.FIRST
                },
                {
                    componentIdentifier: TestCompFour.identifier,
                    token: QueryToken.AND
                },
            ];

            const result = _manager.queryEntities(query);

            expect(result.length).toBe(100, "Query returned unexpected result");
        });

        it('Should filter all entities not meeting requirement', () => {
            const query = [
                {
                    componentIdentifier: TestCompOne.identifier,
                    token: QueryToken.FIRST
                },
                {
                    componentIdentifier: TestCompThree.identifier,
                    token: QueryToken.AND
                },
            ];

            const result = _manager.queryEntities(query);

            expect(result.length).toBe(0, "Query returned unexpected result");
        });

    });



});

describe('Query runtime components', () => {
    let manager: ECSManager;

    beforeEach(() => {
        manager = createSimpleQueryScenario(new ECSManager());
    });

    it('Should find TestComponentTwo component', () => {
        const query = [
            {
                componentIdentifier: TestCompTwo.identifier,
                token: QueryToken.FIRST
            }
        ];

        const expected: ComponentQueryResult = {
            entities: [
                {
                    id: 2,
                    components: new Map()
                }
            ]
        };
        expected.entities[0].components.set(TestCompTwo.identifier, 0);

        expect(manager.queryComponents(query)).toEqual(expected);
    });

    it('Should find TestComponentOne "AND" TestComponentThree component', () => {
        const query = [
            {
                componentIdentifier: TestCompOne.identifier,
                token: QueryToken.FIRST
            },
            {
                componentIdentifier: TestCompThree.identifier,
                token: QueryToken.AND
            }
        ];

        const expected: ComponentQueryResult = {
            entities: [
                {
                    id: 3,
                    components: new Map()
                },
                {
                    id: 5,
                    components: new Map()
                }
            ]
        };
        expected.entities[0].components.set(TestCompOne.identifier, 1);
        expected.entities[0].components.set(TestCompThree.identifier, 0);

        expected.entities[1].components.set(TestCompOne.identifier, 2);
        expected.entities[1].components.set(TestCompThree.identifier, 2);

        expect(manager.queryComponents(query)).toEqual(expected);
    });
});

describe('Systems', () => {
    it('Should mutate component state on dispatch', () => {
        const manager = new ECSManager();

        const compFourRef = new TestCompFour(0);
        manager.createEntity().addComponent(compFourRef);

        const query = [
            {
                componentIdentifier: TestCompFour.identifier,
                token: QueryToken.FIRST
            },
        ];

        const testSystem = (_: number, args: Component<TestCompFour>[]) => {
            const testCompFour = args[0].data;

            testCompFour.someState += 1;
        };

        manager.registerSystem(testSystem, query);

        manager.dispatch();
        manager.dispatch();
        manager.dispatch();
        manager.dispatch();

        expect(compFourRef.someState).toBe(4);
    });

    it('Should mutate component state on event', () => {
        const manager = new ECSManager();

        const compFourRef = new TestCompFour(0);
        manager.createEntity().addComponent(compFourRef);

        const query = [
            {
                componentIdentifier: TestCompFour.identifier,
                token: QueryToken.FIRST
            },
        ];

        const testSystem = (_: Event, args: Component<TestCompFour>[]) => {
            const testCompFour = args[0].data;

            testCompFour.someState += 1;
        };

        const index = manager.registerEvent(testSystem, query);

        manager.onEvent(index, null);
        manager.onEvent(index, null);
        manager.onEvent(index, null);
        manager.onEvent(index, null);

        expect(compFourRef.someState).toBe(4);
    });
});
