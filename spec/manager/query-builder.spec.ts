import {QueryBuilder, createQueryFromIdentifierList} from '../../src/ecs/query-builder';
import { QueryToken } from '../../src/ecs/esc-query.model';

describe('Query builder creates valid query tree', () => {
    const identifier1 = 'identifier1';
    const identifier2 = 'identifier2';
    const identifier3 = 'identifier3';
    const identifier4 = 'identifier4';

    it('Should build valid query with only identifier', () => {
        const query = new QueryBuilder().identifier(identifier1).build();

        expect(query).toEqual({
            token: QueryToken.OR,
            leftChild: {
                identifier: identifier1
            }
        });
    });


    it('Should build valid query with two identifiers with AND', () => {
        const query = new QueryBuilder()
            .identifier(identifier1)
            .token(QueryToken.AND)
            .identifier(identifier2)
            .build();

        expect(query).toEqual({
            token: QueryToken.AND,
            leftChild: {
                identifier: identifier1
            },
            rightChild: {
                identifier: identifier2
            }
        });
    });

    it('Should build valid query with identifier AND identifier OR identifier', () => {
        const query = new QueryBuilder()
            .identifier(identifier1)
            .token(QueryToken.AND)
            .identifier(identifier2)
            .token(QueryToken.OR)
            .identifier(identifier3)
            .build();

        expect(query).toEqual({
            token: QueryToken.AND,
            leftChild: {
                identifier: identifier1
            },
            rightChild: {
                token: QueryToken.OR,
                leftChild: {
                    identifier: identifier2
                },
                rightChild: {
                    identifier: identifier3
                }
            }
        });
    });

    it('Should build a query with an identifier list of 1', () => {
        const list = [identifier1];
        const query = createQueryFromIdentifierList(list);
        expect(query).toEqual(
            {
                token: QueryToken.OR,
                leftChild: {
                    identifier: identifier1
                },
            }
        );
    });

    it('Should build a query with an identifier list of 2', () => {
        const list = [identifier1, identifier2];
        const query = createQueryFromIdentifierList(list);
        expect(query).toEqual(
            {
                token: QueryToken.AND,
                leftChild: {
                    identifier: identifier1
                },
                rightChild: {
                    identifier: identifier2
                }
            }
        );
    });

    it('Should build a query with an identifier list of 3', () => {
        const list = [identifier1, identifier2, identifier3];
        const query = createQueryFromIdentifierList(list);
        expect(query).toEqual(
            {
                token: QueryToken.AND,
                leftChild: {
                    identifier: identifier1
                },
                rightChild:    {
                    token: QueryToken.AND,
                    leftChild: {
                        identifier: identifier2
                    },
                    rightChild: {
                        identifier: identifier3
                    }
                }
            }
        );
    });

    
    it('Should build a query with an identifier list of 4', () => {
        const list = [identifier1, identifier2, identifier3, identifier4];
        const query = createQueryFromIdentifierList(list);
        expect(query).toEqual(
            {
                token: QueryToken.AND,
                leftChild: {
                    identifier: identifier1
                },
                rightChild:    {
                    token: QueryToken.AND,
                    leftChild: {
                        identifier: identifier2
                    },
                    rightChild: {
                        token: QueryToken.AND,
                        leftChild: {
                            identifier: identifier3
                        },
                        rightChild: {
                            identifier: identifier4
                        }
                    }
                }
            }
        );
    });

    it('Should build a query with an identifier list of 4 and shared', () => {
        const list = [identifier1, identifier2, identifier3 + '[]', identifier4 + '[]'];
        const query = createQueryFromIdentifierList(list);

        expect(query).toEqual(
            {
                token: QueryToken.AND,
                leftChild: {
                    identifier: identifier1
                },
                rightChild:    {
                    token: QueryToken.OR,
                    leftChild: {
                        identifier: identifier2
                    },
                    rightChild: 
                    {
                        token: QueryToken.SHARED,
                        leftChild: {
                            token: QueryToken.AND,
                            leftChild: {
                                identifier: identifier3
                            },
                            rightChild: {
                                identifier: identifier4
                            }
                        },
                    }
                }
            }
        );
    });
});