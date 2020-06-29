import { ECSManager } from '../src/ecs/manager';
import {ComponentIdentifier} from '../src/ecs/component-identifier.model';
import { QueryToken, QueryNode, EntityQueryResult} from '../src/ecs/esc-query.model';
import {Entity, EntityEntry} from '../src/ecs/entity.model';
import {Component} from '../src/ecs/component.model';

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

    const entitiesTransformer = (entities: EntityEntry[]): Entity[] => {
        return entities.sort(sortFn).map(e => { return { id: e.id }; });
    };

    const sharedArgsTransformer = (args: Component<object>[]): Entity[] => {
        return args.sort((c1, c2) => c1.entityId - c2.entityId).map(e => { return { id: e.entityId }; });
    };

    beforeEach(() => {
        manager = createSimpleQueryScenario(new ECSManager());
    });

    it('Should succeed on single comp query with AND root entity', () => {
        const query: QueryNode = {
            token: QueryToken.AND,
            left_sibling: {
                identifier: TestCompTwo.identifier
            }
        };
        
        const entities = manager.queryEntities(query).entities;

        expect(entitiesTransformer(entities)).toEqual([], "Query returned unexpected result");
    });

    it('Should succeed on single comp query with OR root entity', () => {
        const query: QueryNode = {
            token: QueryToken.OR,
            left_sibling: {
                identifier: TestCompTwo.identifier
            }
        };
        
        const entities = manager.queryEntities(query).entities;

        expect(entitiesTransformer(entities)).toEqual([ { id: 2 }], "Query returned unexpected result");
    });

    it('Should succeed on multiple comp query entity', () => {
        const query: QueryNode = {
            token: QueryToken.OR,
            left_sibling: {
                identifier: TestCompOne.identifier
            }
        };
        
        const entities = manager.queryEntities(query).entities;

        expect(entitiesTransformer(entities)).toEqual([{ id: 0 }, { id: 3 }, { id: 5 }], "Query returned unexpected result");
    });

    it('Should succeed on "AND" comp query entity', () => {

        const query: QueryNode = {
            token: QueryToken.AND,
            left_sibling: {
                identifier: TestCompOne.identifier
            },
            right_sibling: {
                identifier: TestCompThree.identifier
            }
        };

        const entities = manager.queryEntities(query).entities;

        expect(entitiesTransformer(entities)).toEqual([{ id: 3 }, { id: 5 }], "Query returned unexpected result");
    });


    it('Should succeed on "AND" any order', () => {
        const query: QueryNode = {
            token: QueryToken.AND,
            left_sibling: {
                identifier: TestCompThree.identifier
            },
            right_sibling: {
                identifier: TestCompOne.identifier
            }
        };

        const entities = manager.queryEntities(query).entities;

        expect(entitiesTransformer(entities))
        .toEqual([{ id: 3 }, { id: 5 }], "Query returned unexpected result");
    });

    it('Should succeed on "OR" comp query entity', () => {
        const query: QueryNode = {
            token: QueryToken.OR,
            left_sibling: {
                identifier: TestCompThree.identifier
            },
            right_sibling: {
                identifier: TestCompTwo.identifier
            }
        };

        const entities = manager.queryEntities(query).entities;

        expect(entitiesTransformer(entities))
        .toEqual([{ id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }, { id: 6 }], "Query returned unexpected result");
    });

    it('Should succeed on "NOT" comp query entity', () => {
        const query: QueryNode = {
            token: QueryToken.NOT,
            left_sibling: {
                identifier: TestCompThree.identifier
            },
            right_sibling: {
                identifier: TestCompOne.identifier
            }
        };

        const entities = manager.queryEntities(query).entities;

        expect(entitiesTransformer(entities))
        .toEqual([{ id: 4 }, { id: 6 }], "Query returned unexpected result");
    });

    it('Should succeed on "AND" and "SHARED" comp query entity', () => {
        const query: QueryNode = {
            token: QueryToken.OR,
            left_sibling: {
                identifier: TestCompOne.identifier
            },
            right_sibling: {
                token: QueryToken.SHARED,
                left_sibling: {
                    token: QueryToken.AND,
                    left_sibling: {
                        identifier: TestCompFour.identifier
                    },
                    right_sibling: {
                        identifier: TestCompThree.identifier
                    }
                },
            }
        };

        const result = manager.queryEntities(query);

        expect(entitiesTransformer(result.entities)).toEqual([{ id: 0 }, { id: 3 }, { id: 5 }], "Query returned unexpected result");
        expect(sharedArgsTransformer(result.sharedArgs)).toEqual([ { id: 6 }, { id: 6 } ], "Query returned unexpected result");
    });

    it('Should succeed on "OR" and "SHARED" comp query entity', () => {
        const query: QueryNode = {
            token: QueryToken.OR,
            left_sibling: {
                identifier: TestCompOne.identifier
            },
            right_sibling: {
                token: QueryToken.SHARED,
                left_sibling: {
                    token: QueryToken.OR,
                    left_sibling: {
                        identifier: TestCompFour.identifier
                    },
                    right_sibling: {
                        identifier: TestCompThree.identifier
                    }
                },
            }
        };


        const result = manager.queryEntities(query);

        expect(entitiesTransformer(result.entities)).toEqual([{ id: 0 }, { id: 3 }, { id: 5 }], "Query returned unexpected result");
        expect(sharedArgsTransformer(result.sharedArgs)).toEqual([{id: 3}, {id: 4}, {id: 5}, {id: 6}], "Query returned unexpected result");
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
            const query: QueryNode = {
                token: QueryToken.AND,
                left_sibling: {
                    identifier: TestCompOne.identifier
                },
                right_sibling: {
                    identifier: TestCompFour.identifier
                }
            };

            const result = _manager.queryEntities(query).entities;

            expect(result.length).toBe(100, "Query returned unexpected result");
        });

        it('Should filter all entities not meeting requirement', () => {
            const query: QueryNode = {
                token: QueryToken.AND,
                left_sibling: {
                    identifier: TestCompOne.identifier
                },
                right_sibling: {
                    identifier: TestCompThree.identifier
                }
            };

            const result = _manager.queryEntities(query).entities;

            expect(result.length).toBe(0, "Query returned unexpected result");
        });

    });

});


// TODO: test shared args
describe('Query runtime components', () => {
    let manager = createSimpleQueryScenario(new ECSManager());

    it('Should find TestComponentTwo component', () => {
        const query: QueryNode = {
            token: QueryToken.OR,
            left_sibling: {
                identifier: TestCompTwo.identifier
            }
        };

        const expected: EntityQueryResult = {
            entities: [
                {
                    id: 2,
                    components: new Map()
                }
            ],
            sharedArgs: null
        };
        expected.entities[0].components.set(TestCompTwo.identifier, 0);

        expect(manager.queryEntities(query)).toEqual(expected);
    });

    it('Should find TestComponentOne "AND" TestComponentThree component', () => {
        const query: QueryNode = {
            token: QueryToken.AND,
            left_sibling: {
                identifier: TestCompOne.identifier
            },
            right_sibling: {
                identifier: TestCompThree.identifier
            }
        };

        const expected: EntityQueryResult = {
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

        expect(manager.queryEntities(query)).toEqual(expected);
    });
});

describe('Systems', () => {
    const testSystem = <T>(_: T, args: Component<TestCompFour>[]) => {
        const testCompFour = args[0].data;

        testCompFour.someState += 1;
    };

    const query = {
        token: QueryToken.OR,
        left_sibling: {
            identifier: TestCompFour.identifier
        }
    };

    it('Should mutate component state on dispatch', () => {
        const manager = new ECSManager();

        const compFourRef = new TestCompFour(0);
        manager.createEntity().addComponent(compFourRef);


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

        const index = manager.registerEvent(testSystem, query);

        manager.onEvent(index, null);
        manager.onEvent(index, null);
        manager.onEvent(index, null);
        manager.onEvent(index, null);

        expect(compFourRef.someState).toBe(4);
    });

    it('Should delete self only after dispatch', () => {
        const manager = new ECSManager();

        const compFourRef = new TestCompFour(0);
        manager.createEntity().addComponent(compFourRef);

        manager.createEntity().addComponent(new TestCompOne());
        manager.createEntity().addComponent(new TestCompOne());
        manager.createEntity().addComponent(new TestCompOne());

        const deleteQuery = {
            token: QueryToken.OR,
            left_sibling: {
                identifier: TestCompOne.identifier
            },
            right_sibling: {
                token: QueryToken.SHARED,
                left_sibling: {
                    identifier: TestCompFour.identifier
                }
            }
        };

        const deleteSelfSystem = (_: number, args: Component<TestCompOne>[], sharedArgs: Component<TestCompFour>[]) => {
            const four = sharedArgs[0].data;

            four.someState += 1;

            manager.removeComponent(args[0].entityId, args[0].data.identifier());
        };

        manager.registerSystem(deleteSelfSystem, deleteQuery);

        manager.dispatch();
        manager.dispatch();

        expect(compFourRef.someState).toBe(3);
    });

    it('Should add new component only after dispatch', () => {
        const manager = new ECSManager();

        const compFourRef = new TestCompFour(0);
        manager.createEntity().addComponent(compFourRef);

        manager.createEntity().addComponent(new TestCompOne());

        const addQuery = {
            token: QueryToken.OR,
            left_sibling: {
                identifier: TestCompOne.identifier
            },
            right_sibling: {
                token: QueryToken.SHARED,
                left_sibling: {
                    identifier: TestCompFour.identifier
                }
            }
        };

        const addNewSystem = (_: number, args: Component<TestCompOne>[], sharedArgs: Component<TestCompFour>[]) => {
            const four = sharedArgs[0].data;

            four.someState += 1;

            manager.createEntity().addComponent(new TestCompOne());
        };

        manager.registerSystem(addNewSystem, addQuery);

        manager.dispatch();
        manager.dispatch();

        expect(compFourRef.someState).toBe(3);
    });

    it('Should update query result on remove', () => {
        const manager = new ECSManager();

        const compFourRef = new TestCompFour(0);
        const entityBuilder = manager.createEntity().addComponent(compFourRef);

        const otherCompFourRef = new TestCompFour(0);
        manager.createEntity().addComponent(otherCompFourRef);

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

        const query: QueryNode = {
            token: QueryToken.OR,
            left_sibling: {
                identifier: TestCompOne.identifier
            },
            right_sibling: {
                token: QueryToken.SHARED,
                left_sibling: {
                    token: QueryToken.AND,
                    left_sibling: {
                        identifier: TestCompFour.identifier
                    },
                    right_sibling: {
                        identifier: TestCompThree.identifier
                    }
                },
            }
        };

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

        const query: QueryNode = {
            token: QueryToken.OR,
            left_sibling: {
                identifier: TestCompOne.identifier
            },
            right_sibling: {
                token: QueryToken.SHARED,
                left_sibling: {
                    token: QueryToken.AND,
                    left_sibling: {
                        identifier: TestCompFour.identifier
                    },
                    right_sibling: {
                        identifier: TestCompThree.identifier
                    }
                },
            }
        };

        const index = manager.registerEvent(sharedStateSystem, query);

        manager.onEvent(index, null);

        expect(compFourRef.someState).toBe(2, 'Shared state was not mutated');
    });

    it('Should share entity between entities in system event with OR', () => {
        const manager = new ECSManager();

        const compFourRef = new TestCompFour(0);
        manager.createEntity().addComponent(compFourRef);
        manager.createEntity().addComponent(new TestCompThree());

        manager.createEntity().addComponent(new TestCompOne());
        manager.createEntity().addComponent(new TestCompOne());

        const query: QueryNode = {
            token: QueryToken.OR,
            left_sibling: {
                identifier: TestCompOne.identifier
            },
            right_sibling: {
                token: QueryToken.SHARED,
                left_sibling: {
                    token: QueryToken.OR,
                    left_sibling: {
                        identifier: TestCompFour.identifier
                    },
                    right_sibling: {
                        identifier: TestCompThree.identifier
                    }
                },
            }
        };

        const sharedStateOrQuerySystem = <T>(
            _: T,
            args: Component<TestCompOne>[],
            sharedArgs: Component<TestCompFour>[]) => {
            const shared = sharedArgs[0].data;

            shared.someState = sharedArgs.length;
        };

        const index = manager.registerEvent(sharedStateOrQuerySystem, query);

        manager.onEvent(index, null);

        expect(compFourRef.someState).toBe(2, 'Shared state was not mutated');
    });
});
