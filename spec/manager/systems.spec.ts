import { TestCompFour, TestCompOne, TestCompThree } from "../utility";
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
            identifier: TestCompFour.identifier
        }
    };

    it('Should mutate component state on dispatch', () => {
        const manager = new ECSManager();

        const compFourRef = new TestCompFour(0);
        manager.createEntity().addComponent(compFourRef);

        manager.registerSystemWithEscQuery(testSystem, query);

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

        const index = manager.registerEventWithEscQuery(testSystem, query);

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

        const deleteQuery: QueryNode = {
            token: QueryToken.OR,
            leftChild: {
                identifier: TestCompOne.identifier
            },
            rightChild: {
                token: QueryToken.SHARED,
                leftChild: {
                    identifier: TestCompFour.identifier
                }
            }
        };

        const deleteSelfSystem = (_: number, testCompOne: Component<TestCompOne>, testCompFour: Component<TestCompFour>) => {
            const four = testCompFour.data;

            four.someState += 1;

            manager.removeComponent(testCompOne.entityId, testCompOne.data.identifier());
        };

        manager.registerSystemWithEscQuery(deleteSelfSystem, deleteQuery);

        manager.dispatch();
        manager.dispatch();

        expect(compFourRef.someState).toBe(3);
    });

    it('Should add new component only after dispatch', () => {
        const manager = new ECSManager();

        const compFourRef = new TestCompFour(0);
        manager.createEntity().addComponent(compFourRef);

        manager.createEntity().addComponent(new TestCompOne());

        const addQuery: QueryNode = {
            token: QueryToken.OR,
            leftChild: {
                identifier: TestCompOne.identifier
            },
            rightChild: {
                token: QueryToken.SHARED,
                leftChild: {
                    identifier: TestCompFour.identifier
                }
            }
        };

        const addNewSystem = (_: number, testCompOne: Component<TestCompOne>, testCompFour: Component<TestCompFour>) => {
            const four = testCompFour.data;

            four.someState += 1;

            manager.createEntity().addComponent(new TestCompOne());
        };

        manager.registerSystemWithEscQuery(addNewSystem, addQuery);

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

        manager.registerSystemWithEscQuery(testSystem, query);

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

        manager.registerSystemWithEscQuery(testSystem, query);

        entityBuilder.addComponent(compFourRef);

        manager.dispatch();
        manager.dispatch();

        expect(compFourRef.someState).toBe(2);
    });

    const sharedStateSystem = <T>(_: T, testCompOne: Component<TestCompOne>, testCompFour: Component<TestCompFour>) => {
        const shared = testCompFour.data;

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
            leftChild: {
                identifier: TestCompOne.identifier
            },
            rightChild: {
                token: QueryToken.SHARED,
                leftChild: {
                    token: QueryToken.AND,
                    leftChild: {
                        identifier: TestCompFour.identifier
                    },
                    rightChild: {
                        identifier: TestCompThree.identifier
                    }
                },
            }
        };

        manager.registerSystemWithEscQuery(sharedStateSystem, query);

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
            leftChild: {
                identifier: TestCompOne.identifier
            },
            rightChild: {
                token: QueryToken.SHARED,
                leftChild: {
                    token: QueryToken.AND,
                    leftChild: {
                        identifier: TestCompFour.identifier
                    },
                    rightChild: {
                        identifier: TestCompThree.identifier
                    }
                },
            }
        };

        const index = manager.registerEventWithEscQuery(sharedStateSystem, query);

        manager.onEvent(index, null);

        expect(compFourRef.someState).toBe(2, 'Shared state was not mutated');
    });

    it('Should share entity between entities in system event with OR', () => {
        const manager = new ECSManager();

        const compFourRef = new TestCompFour(0);
        manager.createEntity().addComponent(compFourRef);
        manager.createEntity().addComponent(compFourRef);
        manager.createEntity().addComponent(new TestCompThree());

        manager.createEntity().addComponent(new TestCompOne());
        manager.createEntity().addComponent(new TestCompOne());

        const query: QueryNode = {
            token: QueryToken.OR,
            leftChild: {
                identifier: TestCompOne.identifier
            },
            rightChild: {
                token: QueryToken.SHARED,
                leftChild: {
                    token: QueryToken.OR,
                    leftChild: {
                        identifier: TestCompFour.identifier
                    },
                    rightChild: {
                        identifier: TestCompThree.identifier
                    }
                },
            }
        };

        const sharedStateOrQuerySystem = <T>(
            _: T, 
            testCompOne: Component<TestCompOne>,
            testCompFour: Component<TestCompFour>,
            testCompThree: Component<TestCompThree>
            ) => {
                const shared = testCompFour.data;

                shared.someState = (testCompThree) ? 1 : 0;
        };

        const index = manager.registerEventWithEscQuery(sharedStateOrQuerySystem, query);

        manager.onEvent(index, null);

        expect(compFourRef.someState).toBe(1, 'Shared state was not mutated');
    });
});
