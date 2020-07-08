import { TestCompFour, TestCompOne, TestCompThree, TestCompTwo } from "../utility";
import { Component } from "../../src/ecs/component.model";
import { QueryToken, QueryNode } from "../../src/ecs/esc-query.model";
import { ECSManager } from "../../src/ecs/manager";

describe('Systems', () => {
    const testSystem = <T>(_: T, testCompFour: Component<TestCompFour>) => {
        testCompFour.data.someState += 1;
    };

    const query: QueryNode = {
        token: QueryToken.OR,
        leftChild: {
            typeStr: TestCompFour.identifier
        }
    };

    let manager: ECSManager;
    beforeEach(() => {  
        manager = new ECSManager();
        manager.registerComponentType(TestCompOne.identifier, new TestCompOne()); 
        manager.registerComponentType(TestCompThree.identifier, new TestCompThree());
        manager.registerComponentType(TestCompFour.identifier, new TestCompFour(0));
    });

    it('Should mutate component state on dispatch', () => {
        manager.createEntity().addComponent(TestCompFour.identifier, new TestCompFour(0));

        manager.registerSystemWithEscQuery(testSystem, query);

        manager.dispatch();
        manager.dispatch();
        manager.dispatch();
        manager.dispatch();

        expect(manager.accessComponentData<TestCompFour>(TestCompFour.identifier, 0).someState).toBe(4);
    });

    it('Should mutate component state on event', () => {
        manager.createEntity().addComponent(TestCompFour.identifier);

        const index = manager.registerEventWithEscQuery(testSystem, query);

        manager.onEvent(index, null);
        manager.onEvent(index, null);
        manager.onEvent(index, null);
        manager.onEvent(index, null);

        expect(manager.accessComponentData<TestCompFour>(TestCompFour.identifier, 0).someState).toBe(4);
    });

    it('Should delete self only after dispatch', () => {
        manager.createEntity().addComponent(TestCompFour.identifier);

        manager.createEntity().addComponent(TestCompOne.identifier);
        manager.createEntity().addComponent(TestCompOne.identifier);
        manager.createEntity().addComponent(TestCompOne.identifier);

        const deleteQuery: QueryNode = {
            token: QueryToken.OR,
            leftChild: {
                typeStr: TestCompOne.identifier
            },
            rightChild: {
                token: QueryToken.SHARED,
                leftChild: {
                    typeStr: TestCompFour.identifier
                }
            }
        };

        const deleteSelfSystem = (_: number, testCompOne: Component<TestCompOne>, testCompFour: Component<TestCompFour>[]) => {
            const four = testCompFour[0].data;

            four.someState += 1;

            manager.removeComponent(testCompOne.entityId, TestCompOne.identifier);
        };

        manager.registerSystemWithEscQuery(deleteSelfSystem, deleteQuery);

        manager.dispatch();
        manager.dispatch();

        expect(manager.accessComponentData<TestCompFour>(TestCompFour.identifier, 0).someState).toBe(3);
    });

    it('Should add new component only after dispatch', () => {
        manager.createEntity().addComponent(TestCompFour.identifier);

        manager.createEntity().addComponent(TestCompOne.identifier);

        const addQuery: QueryNode = {
            token: QueryToken.OR,
            leftChild: {
                typeStr: TestCompOne.identifier
            },
            rightChild: {
                token: QueryToken.SHARED,
                leftChild: {
                    typeStr: TestCompFour.identifier
                }
            }
        };

        const addNewSystem = (_: number, testCompOne: Component<TestCompOne>, testCompFour: Component<TestCompFour>[]) => {
            const four = testCompFour[0].data;

            four.someState += 1;

            manager.createEntity().addComponent(TestCompFour.identifier);
        };

        manager.registerSystemWithEscQuery(addNewSystem, addQuery);

        expect(manager.accessComponentData<TestCompFour>(TestCompFour.identifier, 2)).toBeUndefined();
        manager.dispatch();
        expect(manager.accessComponentData<TestCompFour>(TestCompFour.identifier, 2).someState).toBe(0);
        expect(manager.accessComponentData<TestCompFour>(TestCompFour.identifier, 3)).toBeUndefined();
        manager.dispatch();
        expect(manager.accessComponentData<TestCompFour>(TestCompFour.identifier, 3).someState).toBe(0);
    });

    it('Should update query result on remove', () => {
        const entityBuilder = manager.createEntity().addComponent(TestCompFour.identifier);
        manager.createEntity().addComponent(TestCompFour.identifier);

        manager.registerSystemWithEscQuery(testSystem, query);

        manager.dispatch();
        expect(manager.accessComponentData<TestCompFour>(TestCompFour.identifier, 0).someState).toBe(1);

        entityBuilder.removeComponent(TestCompFour.identifier);
        manager.dispatch();

        expect(manager.accessComponentData<TestCompFour>(TestCompFour.identifier, 0)).toBeUndefined();
        expect(manager.accessComponentData<TestCompFour>(TestCompFour.identifier, 1).someState).toBe(2);
    });

    it('Should update query result on add', () => {
        manager.registerSystemWithEscQuery(testSystem, query);

        manager.createEntity().addComponent(TestCompFour.identifier);

        manager.dispatch();
        manager.dispatch();

        expect(manager.accessComponentData<TestCompFour>(TestCompFour.identifier, 0).someState).toBe(2);
    });

    const sharedStateSystem = <T>(
        _: T, testCompOne: Component<TestCompOne>, testCompFour: Component<TestCompFour>[]) => {
        const shared = testCompFour[0].data;

        shared.someState += 1;
    };

    it('Should share entity between entities in system dispatch', () => {
        manager.createEntity()
            .addComponent(TestCompFour.identifier)
            .addComponent(TestCompThree.identifier);

        manager.createEntity().addComponent(TestCompOne.identifier, new TestCompOne());
        manager.createEntity().addComponent(TestCompOne.identifier, new TestCompOne());

        const query: QueryNode = {
            token: QueryToken.OR,
            leftChild: {
                typeStr: TestCompOne.identifier
            },
            rightChild: {
                token: QueryToken.SHARED,
                leftChild: {
                    token: QueryToken.AND,
                    leftChild: {
                        typeStr: TestCompFour.identifier
                    },
                    rightChild: {
                        typeStr: TestCompThree.identifier
                    }
                },
            }
        };

        manager.registerSystemWithEscQuery(sharedStateSystem, query);

        manager.dispatch();

        expect(manager.accessComponentData<TestCompFour>(TestCompFour.identifier, 0).someState).toBe(2, 'Shared state was not mutated');
    });

    it('Should share entity between entities in system event with AND', () => {
        manager.createEntity()
            .addComponent(TestCompFour.identifier)
            .addComponent(TestCompThree.identifier);

        manager.createEntity().addComponent(TestCompOne.identifier, new TestCompOne());
        manager.createEntity().addComponent(TestCompOne.identifier, new TestCompOne());

        const query: QueryNode = {
            token: QueryToken.OR,
            leftChild: {
                typeStr: TestCompOne.identifier
            },
            rightChild: {
                token: QueryToken.SHARED,
                leftChild: {
                    token: QueryToken.AND,
                    leftChild: {
                        typeStr: TestCompFour.identifier
                    },
                    rightChild: {
                        typeStr: TestCompThree.identifier
                    }
                },
            }
        };

        const index = manager.registerEventWithEscQuery(sharedStateSystem, query);

        manager.onEvent(index, null);

        expect(manager.accessComponentData<TestCompFour>(TestCompFour.identifier, 0).someState).toBe(2, 'Shared state was not mutated');
    });

    it('Should share entity between entities in system event with OR', () => {
        manager.createEntity().addComponent(TestCompFour.identifier);
        manager.createEntity().addComponent(TestCompThree.identifier);

        manager.createEntity().addComponent(TestCompOne.identifier);
        manager.createEntity().addComponent(TestCompOne.identifier);

        const query: QueryNode = {
            token: QueryToken.OR,
            leftChild: {
                typeStr: TestCompOne.identifier
            },
            rightChild: {
                token: QueryToken.SHARED,
                leftChild: {
                    token: QueryToken.OR,
                    leftChild: {
                        typeStr: TestCompFour.identifier
                    },
                    rightChild: {
                        typeStr: TestCompThree.identifier
                    }
                },
            }
        };

        const sharedStateOrQuerySystem = <T>(
            _: T, 
            testCompOne: Component<TestCompOne>,
            testCompFour: Component<TestCompFour>[],
            testCompThree: Component<TestCompThree>[]
            ) => {
                const shared = testCompFour[0].data;

                shared.someState = (testCompThree) ? 1 : 0;
        };

        const index = manager.registerEventWithEscQuery(sharedStateOrQuerySystem, query);

        manager.onEvent(index, null);

        expect(manager.accessComponentData<TestCompFour>(TestCompFour.identifier, 0).someState).toBe(1, 'Shared state was not mutated');
    });
});
