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

describe('AccessComponentData', () => {
   it('Should return component on valid request', () => {
       const manager = new ECSManager();

       const testComp = new TestCompFour(10);
       manager.createEntity().addComponent(testComp);

       const testCompAccessed = manager.accessComponentData(testComp, 0);
       expect(testCompAccessed.someState).toBe(10, 'State had unexpected type!');
   });

    it('Should return null on invalid request', () => {
        const manager = new ECSManager();

        const testComp = new TestCompFour(10);
        manager.createEntity().addComponent(testComp);

        const testCompAccessed = manager.accessComponentData(testComp, 999);
        expect(testCompAccessed).toBeNull('Got component on invalid access');
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

    // Entity: 6
    manager.createEntity()
        .addComponent(new TestCompFour(0))
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


        expect(manager.queryEntities(query).entities.sort(sortFn))
            .toEqual([{ id: 2 }], "Query returned unexpected result");
    });

    it('Should succeed on multiple comp query entity', () => {
        const query = [
            {
                componentIdentifier: TestCompOne.identifier,
                token: QueryToken.FIRST
            }
        ];


        expect(manager.queryEntities(query).entities.sort(sortFn))
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


        expect(manager.queryEntities(query).entities.sort(sortFn))
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


        expect(manager.queryEntities(query).entities.sort(sortFn))
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


        expect(manager.queryEntities(query).entities.sort(sortFn))
            .toEqual([{ id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }, { id: 6 }], "Query returned unexpected result");
    });

    it('Should succeed on "AND_NOT" comp query entity', () => {
        const query = [
            {
                componentIdentifier: TestCompThree.identifier,
                token: QueryToken.FIRST
            },
            {
                componentIdentifier: TestCompOne.identifier,
                token: QueryToken.AND_NOT
            }
        ];


        expect(manager.queryEntities(query).entities).toEqual([{ id: 4 }, { id: 6 }], "Query returned unexpected result");
    });

    it('Should succeed on "AND" and "SHARED" comp query entity', () => {
        const query = [
            {
                componentIdentifier: TestCompOne.identifier,
                token: QueryToken.FIRST
            },
            {
                componentIdentifier: TestCompFour.identifier,
                token: QueryToken.SHARED
            },
            {
                componentIdentifier: TestCompThree.identifier,
                token: QueryToken.AND
            }
        ];

        const result = manager.queryEntities(query);

        expect(result.entities.sort(sortFn)).toEqual([{ id: 0 }, { id: 3 }, { id: 5 }], "Query returned unexpected result");
        expect(result.sharedEntities).toEqual([{id: 6}], "Query returned unexpected result");
    });

    it('Should succeed on "OR" and "SHARED" comp query entity', () => {
        const query = [
            {
                componentIdentifier: TestCompOne.identifier,
                token: QueryToken.FIRST
            },
            {
                componentIdentifier: TestCompFour.identifier,
                token: QueryToken.SHARED
            },
            {
                componentIdentifier: TestCompThree.identifier,
                token: QueryToken.OR
            }
        ];

        const result = manager.queryEntities(query);

        expect(result.entities.sort(sortFn)).toEqual([{ id: 0 }, { id: 3 }, { id: 5 }], "Query returned unexpected result");
        expect(result.sharedEntities.sort(sortFn)).toEqual([{id: 3}, {id: 4}, {id: 5}, {id: 6}], "Query returned unexpected result");
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

            const result = _manager.queryEntities(query).entities;

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

            const result = _manager.queryEntities(query).entities;

            expect(result.length).toBe(0, "Query returned unexpected result");
        });

    });



});

// TODO: test shared args
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
            ],
            sharedArgs: null
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
            ],
            sharedArgs: null
        };
        expected.entities[0].components.set(TestCompOne.identifier, 1);
        expected.entities[0].components.set(TestCompThree.identifier, 0);

        expected.entities[1].components.set(TestCompOne.identifier, 2);
        expected.entities[1].components.set(TestCompThree.identifier, 2);

        expect(manager.queryComponents(query)).toEqual(expected);
    });
});

describe('Systems', () => {
    const testSystem = <T>(_: T, args: Component<TestCompFour>[]) => {
        const testCompFour = args[0].data;

        testCompFour.someState += 1;
    };

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

        const index = manager.registerEvent(testSystem, query);

        manager.onEvent(index, null);
        manager.onEvent(index, null);
        manager.onEvent(index, null);
        manager.onEvent(index, null);

        expect(compFourRef.someState).toBe(4);
    });

    it('Should update query result on remove', () => {
        const manager = new ECSManager();

        const compFourRef = new TestCompFour(0);
        const entityBuilder = manager.createEntity().addComponent(compFourRef);

        const otherCompFourRef = new TestCompFour(0);
        manager.createEntity().addComponent(otherCompFourRef);


        const query = [
            {
                componentIdentifier: TestCompFour.identifier,
                token: QueryToken.FIRST
            },
        ];

        manager.registerSystem(testSystem, query);

        entityBuilder.removeComponent(TestCompFour.identifier);

        manager.dispatch();
        manager.dispatch();

        expect(compFourRef.someState).toBe(0);
        expect(otherCompFourRef.someState).toBe(2);
    });

    it('Should update query result on add', () => {
        const manager = new ECSManager();

        const compFourRef = new TestCompFour(0);
        const entityBuilder = manager.createEntity();

        const query = [
            {
                componentIdentifier: TestCompFour.identifier,
                token: QueryToken.FIRST
            },
        ];

        manager.registerSystem(testSystem, query);

        entityBuilder.addComponent(compFourRef);

        manager.dispatch();
        manager.dispatch();

        expect(compFourRef.someState).toBe(2);
    });

    const sharedStateSystem = <T>(
        _: T,
        args: Component<TestCompOne>[],
        sharedArgs: Component<TestCompFour>[]) => {
        const shared = sharedArgs[0].data;
        const three = sharedArgs[1].data;

        shared.someState += 1;
    };

    it('Should share entity between entities in system dispatch', () => {
        const manager = new ECSManager();

        const compFourRef = new TestCompFour(0);
        manager.createEntity()
            .addComponent(compFourRef)
            .addComponent(new TestCompThree());

        manager.createEntity().addComponent(new TestCompOne());
        manager.createEntity().addComponent(new TestCompOne());

        const query = [
            {
                componentIdentifier: TestCompOne.identifier,
                token: QueryToken.FIRST
            },
            {
                componentIdentifier: TestCompFour.identifier,
                token: QueryToken.SHARED
            },
            {
                componentIdentifier: TestCompThree.identifier,
                token: QueryToken.AND
            },
        ];

        manager.registerSystem(sharedStateSystem, query);

        manager.dispatch();

        expect(compFourRef.someState).toBe(2, 'Shared state was not mutated');
    });

    it('Should share entity between entities in system event with AND', () => {
        const manager = new ECSManager();

        const compFourRef = new TestCompFour(0);
        manager.createEntity()
            .addComponent(compFourRef)
            .addComponent(new TestCompThree());

        manager.createEntity().addComponent(new TestCompOne());
        manager.createEntity().addComponent(new TestCompOne());

        const query = [
            {
                componentIdentifier: TestCompOne.identifier,
                token: QueryToken.FIRST
            },
            {
                componentIdentifier: TestCompFour.identifier,
                token: QueryToken.SHARED
            },
            {
                componentIdentifier: TestCompThree.identifier,
                token: QueryToken.AND
            },
        ];

        const index = manager.registerEvent(sharedStateSystem, query);

        manager.onEvent(index, null);

        expect(compFourRef.someState).toBe(2, 'Shared state was not mutated');
    });

    it('Should share entity between entities in system event with OR', () => {
        const manager = new ECSManager();

        const compFourRef = new TestCompFour(0);
        manager.createEntity()
            .addComponent(compFourRef);

        manager.createEntity().addComponent(new TestCompOne());
        manager.createEntity().addComponent(new TestCompOne());

        const query = [
            {
                componentIdentifier: TestCompFour.identifier,
                token: QueryToken.FIRST
            },
            {
                componentIdentifier: TestCompFour.identifier,
                token: QueryToken.SHARED
            },
            {
                componentIdentifier: TestCompOne.identifier,
                token: QueryToken.OR
            },
        ];

        const sharedStateOrQuerySystem = <T>(
            _: T,
            args: Component<TestCompOne>[],
            sharedArgs: Component<TestCompFour>[]) => {
            const shared = sharedArgs[0].data;

            shared.someState = sharedArgs.length;
        };

        const index = manager.registerEvent(sharedStateOrQuerySystem, query);

        manager.onEvent(index, null);

        expect(compFourRef.someState).toBe(3, 'Shared state was not mutated');
    });
});
