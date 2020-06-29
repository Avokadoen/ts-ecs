import { ECSManager } from "../../src/ecs/manager";
import { QueryNode, QueryToken, EntityQueryResult } from "../../src/ecs/esc-query.model";
import { TestCompTwo, TestCompOne, TestCompThree, createSimpleQueryScenario } from "./utility";

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
