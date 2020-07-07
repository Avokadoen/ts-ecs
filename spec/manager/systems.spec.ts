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
        const compFourRef = new TestCompFour(0);
        manager.createEntity().addComponent(TestCompFour.identifier, compFourRef);

        manager.registerSystemWithEscQuery(testSystem, query);

        manager.dispatch();
        manager.dispatch();
        manager.dispatch();
        manager.dispatch();

        expect(compFourRef.someState).toBe(4);
    });

    it('Should mutate component state on event', () => {
        const compFourRef = new TestCompFour(0);
        manager.createEntity().addComponent(TestCompFour.identifier, compFourRef);

        const index = manager.registerEventWithEscQuery(testSystem, query);

        manager.onEvent(index, null);
        manager.onEvent(index, null);
        manager.onEvent(index, null);
        manager.onEvent(index, null);

        expect(compFourRef.someState).toBe(4);
    });

    it('Should delete self only after dispatch', () => {
        const compFourRef = new TestCompFour(0);
        manager.createEntity().addComponent(TestCompFour.identifier, compFourRef);

        manager.createEntity().addComponent(TestCompOne.identifier, new TestCompOne());
        manager.createEntity().addComponent(TestCompOne.identifier, new TestCompOne());
        manager.createEntity().addComponent(TestCompOne.identifier, new TestCompOne());

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

        expect(compFourRef.someState).toBe(3);
    });

    it('Should add new component only after dispatch', () => {
        const compFourRef = new TestCompFour(0);
        manager.createEntity().addComponent(TestCompFour.identifier, compFourRef);

        manager.createEntity().addComponent(TestCompOne.identifier, new TestCompOne());

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

            manager.createEntity().addComponent(TestCompOne.identifier, new TestCompOne());
        };

        manager.registerSystemWithEscQuery(addNewSystem, addQuery);

        manager.dispatch();
        manager.dispatch();

        expect(compFourRef.someState).toBe(3);
    });

    it('Should update query result on remove', () => {
        const compFourRef = new TestCompFour(0);
        const entityBuilder = manager.createEntity().addComponent(TestCompFour.identifier, compFourRef);

        const otherCompFourRef = new TestCompFour(0);
        manager.createEntity().addComponent(TestCompFour.identifier, otherCompFourRef);

        manager.registerSystemWithEscQuery(testSystem, query);

        entityBuilder.removeComponent(TestCompFour.identifier);

        manager.dispatch();
        manager.dispatch();

        expect(compFourRef.someState).toBe(0);
        expect(otherCompFourRef.someState).toBe(2);
    });

    it('Should update query result on add', () => {
        const compFourRef = new TestCompFour(0);
        const entityBuilder = manager.createEntity();

        manager.registerSystemWithEscQuery(testSystem, query);

        entityBuilder.addComponent(TestCompFour.identifier, compFourRef);

        manager.dispatch();
        manager.dispatch();

        expect(compFourRef.someState).toBe(2);
    });

    const sharedStateSystem = <T>(
        _: T, testCompOne: Component<TestCompOne>, testCompFour: Component<TestCompFour>[]) => {
        const shared = testCompFour[0].data;

        shared.someState += 1;
    };

    it('Should share entity between entities in system dispatch', () => {
        const compFourRef = new TestCompFour(0);
        manager.createEntity()
            .addComponent(TestCompFour.identifier, compFourRef)
            .addComponent(TestCompThree.identifier, new TestCompThree());

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

        expect(compFourRef.someState).toBe(2, 'Shared state was not mutated');
    });

    it('Should share entity between entities in system event with AND', () => {
        const compFourRef = new TestCompFour(0);
        manager.createEntity()
            .addComponent(TestCompFour.identifier, compFourRef)
            .addComponent(TestCompThree.identifier, new TestCompThree());

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

        expect(compFourRef.someState).toBe(2, 'Shared state was not mutated');
    });

    it('Should share entity between entities in system event with OR', () => {
        const compFourRef = new TestCompFour(0);
        manager.createEntity().addComponent(TestCompFour.identifier, compFourRef);
        manager.createEntity().addComponent(TestCompFour.identifier, compFourRef);
        manager.createEntity().addComponent(TestCompThree.identifier, new TestCompThree());

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

        expect(compFourRef.someState).toBe(1, 'Shared state was not mutated');
    });
});
