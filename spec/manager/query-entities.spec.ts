import { ECSManager } from "../../src/ecs/manager";
import { EntityEntry, Entity } from "../../src/ecs/entity.model";
import { sortFn, createSimpleQueryScenario, TestCompTwo, TestCompOne, TestCompThree, TestCompFour } from "../utility";
import { Component } from "../../src/ecs/component.model";
import { QueryNode, QueryToken } from "../../src/ecs/esc-query.model";

describe('Query Entities', () => {
    let manager: ECSManager;

    const entitiesTransformer = (entities: EntityEntry[]): Entity[] => {
        return entities.sort(sortFn).map((e: EntityEntry) => { return { id: e.id }; });
    };

    const sharedArgsTransformer = (args: Component<object>[][]): Entity[][] => {
        return args.map(a => a.sort((c1, c2) => c1.entityId - c2.entityId).map(e => { return { id: e.entityId }; }));
    };

    beforeEach(() => {
        manager = createSimpleQueryScenario(new ECSManager());
    });

    it('Should succeed on single comp query with AND root entity', () => {
        const query: QueryNode = {
            token: QueryToken.AND,
            leftChild: {
                typeStr: TestCompTwo.identifier
            }
        };
        
        const entities = manager.queryEntities(query).entities;

        expect(entitiesTransformer(entities)).toEqual([], "Query returned unexpected result");
    });

    it('Should succeed on single comp query with OR root entity', () => {
        const query: QueryNode = {
            token: QueryToken.OR,
            leftChild: {
                typeStr: TestCompTwo.identifier
            }
        };
        
        const entities = manager.queryEntities(query).entities;

        expect(entitiesTransformer(entities)).toEqual([ { id: 2 }], "Query returned unexpected result");
    });

    it('Should succeed on multiple comp query entity', () => {
        const query: QueryNode = {
            token: QueryToken.OR,
            leftChild: {
                typeStr: TestCompOne.identifier
            }
        };
        
        const entities = manager.queryEntities(query).entities;

        expect(entitiesTransformer(entities)).toEqual([{ id: 0 }, { id: 3 }, { id: 5 }], "Query returned unexpected result");
    });

    it('Should succeed on "AND" comp query entity', () => {

        const query: QueryNode = {
            token: QueryToken.AND,
            leftChild: {
                typeStr: TestCompOne.identifier
            },
            rightChild: {
                typeStr: TestCompThree.identifier
            }
        };

        const entities = manager.queryEntities(query).entities;

        expect(entitiesTransformer(entities)).toEqual([{ id: 3 }, { id: 5 }], "Query returned unexpected result");
    });


    it('Should succeed on "AND" any order', () => {
        const query: QueryNode = {
            token: QueryToken.AND,
            leftChild: {
                typeStr: TestCompThree.identifier
            },
            rightChild: {
                typeStr: TestCompOne.identifier
            }
        };

        const entities = manager.queryEntities(query).entities;

        expect(entitiesTransformer(entities))
        .toEqual([{ id: 3 }, { id: 5 }], "Query returned unexpected result");
    });

    it('Should succeed on "OR" comp query entity', () => {
        const query: QueryNode = {
            token: QueryToken.OR,
            leftChild: {
                typeStr: TestCompThree.identifier
            },
            rightChild: {
                typeStr: TestCompTwo.identifier
            }
        };

        const entities = manager.queryEntities(query).entities;

        expect(entitiesTransformer(entities)).toEqual([{ id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }, { id: 6 }], "Query returned unexpected result");
    });

    it('Should succeed on "NOT" comp query entity', () => {
        const query: QueryNode = {
            token: QueryToken.NOT,
            leftChild: {
                typeStr: TestCompThree.identifier
            },
            rightChild: {
                typeStr: TestCompOne.identifier
            }
        };

        const entities = manager.queryEntities(query).entities;

        expect(entitiesTransformer(entities))
        .toEqual([{ id: 4 }, { id: 6 }], "Query returned unexpected result");
    });

    it('Should succeed on "AND" and "SHARED" comp query entity', () => {
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

        const result = manager.queryEntities(query);

        expect(entitiesTransformer(result.entities)).toEqual([{ id: 0 }, { id: 3 }, { id: 5 }], "Query returned unexpected result");
        expect(sharedArgsTransformer(result.sharedArgs)).toEqual([ [{ id: 6 }], [{ id: 6 }] ], "Query returned unexpected result");
    });

    it('Should succeed on "OR" and "SHARED" comp query entity', () => {
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


        const result = manager.queryEntities(query);

        expect(entitiesTransformer(result.entities)).toEqual([{ id: 0 }, { id: 3 }, { id: 5 }], "Query returned unexpected result");
        expect(sharedArgsTransformer(result.sharedArgs)).toEqual([[{id: 6}], [{id: 3}, {id: 4}, {id: 5}, {id: 6}]], "Query returned unexpected result");
    });

    describe('Bigger data set', () => {
        const _manager = new ECSManager();

        beforeAll(() => {
            _manager.registerComponentType(TestCompOne.identifier, new TestCompOne());
            _manager.registerComponentType(TestCompTwo.identifier, new TestCompTwo());
            _manager.registerComponentType(TestCompFour.identifier, new TestCompFour(0));
    
            for (let i = 0; i < 100; i++) {
                _manager.createEntity()
                    .addComponent(TestCompFour.identifier, new TestCompFour(i))
                    .addComponent(TestCompOne.identifier, new TestCompOne())
                    .addComponent(TestCompTwo.identifier, new TestCompTwo());
            }
        });

        it('Should find all entities meeting requirement', () => {
            const query: QueryNode = {
                token: QueryToken.AND,
                leftChild: {
                    typeStr: TestCompOne.identifier
                },
                rightChild: {
                    typeStr: TestCompFour.identifier
                }
            };

            const result = _manager.queryEntities(query).entities;

            expect(result.length).toBe(100, "Query returned unexpected result");
        });

        it('Should filter all entities not meeting requirement', () => {
            const query: QueryNode = {
                token: QueryToken.AND,
                leftChild: {
                    typeStr: TestCompOne.identifier
                },
                rightChild: {
                    typeStr: TestCompThree.identifier
                }
            };

            const result = _manager.queryEntities(query).entities;

            expect(result.length).toBe(0, "Query returned unexpected result");
        });

    });

});