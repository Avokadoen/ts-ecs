import { TestCompFour, TestCompOne, TestCompThree } from "./utility";
import { Component } from "../../src/ecs/component.model";
import { QueryToken, QueryNode } from "../../src/ecs/esc-query.model";
import { ECSManager } from "../../src/ecs/manager";

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
