import { ECSManager } from "../../src/ecs/manager";
import { QueryNode, QueryToken, EntityQueryResult } from "../../src/ecs/esc-query.model";
import { TestCompTwo, TestCompOne, TestCompThree, createSimpleQueryScenario } from "../utility";

// TODO: test shared args
describe('Query runtime components', () => {
    let manager = createSimpleQueryScenario(new ECSManager());

    it('Should find TestComponentTwo component', () => {
        const query: QueryNode = {
            token: QueryToken.OR,
            leftChild: {
                typeStr: TestCompTwo.identifier
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
            leftChild: {
                typeStr: TestCompOne.identifier
            },
            rightChild: {
                typeStr: TestCompThree.identifier
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

    it('Should serve shared args as an array', () => {
        const query: QueryNode = {
            token: QueryToken.SHARED,
            leftChild: {
                token: QueryToken.OR,
                leftChild: {
                    typeStr: TestCompOne.identifier
                }
            }
        };

        const expected = [
            [0, 3, 5]
        ];

        expect(manager.queryEntities(query).sharedArgs.map(a => a.map(c => c.entityId))).toEqual(expected);
    });
});
