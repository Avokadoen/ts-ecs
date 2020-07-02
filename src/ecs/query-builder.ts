import { QueryNode, QueryLeafNode, QueryToken, queryTokenFromString } from "./esc-query.model";

enum StateChange {
    Node,
    LeafNode
}

export function createQueryFromIdentifierList(identifiers: string[]): QueryNode {
    const qBuilder = new QueryBuilder();
    for (const [i, identifier] of identifiers.entries()) {
        qBuilder.identifier(identifier);
        const onLast = (i === identifiers.length - 1);
        if (!onLast) {
            qBuilder.token(QueryToken.AND);
        }
    }

    return qBuilder.build();
}

export class QueryBuilder {
    private root: QueryNode;
    private currentNode: QueryNode; 

    private lastChange: StateChange;

    get workingNode(): QueryNode {
        return this.currentNode;
    }

    constructor(state?: QueryNode) {
        if (state) {
            this.root = state;
        } else {
            this.root = {
                token: null
            };
        }

        this.currentNode = this.root;

        return this;
    }

    // TODO: Error handling
    public identifier(identifier: string): QueryBuilder {
        if (this.lastChange === StateChange.LeafNode) {
            return this;
        }
        this.lastChange = StateChange.LeafNode;

        if (!this.currentNode.leftChild) {
            this.currentNode.leftChild = {
                identifier: identifier
            };
        } else if (!this.currentNode.rightChild) {
            this.currentNode.rightChild = {
                identifier: identifier
            };
        }

        return this;
    }

    public token(token: QueryToken): QueryBuilder {
        this.lastChange = StateChange.Node;

        if (this.currentNode.token === null) {
            this.currentNode.token = token;
        } else if (!this.currentNode.leftChild) {
            this.currentNode.leftChild = {
                token
            };

            this.currentNode = this.currentNode.leftChild;
        } else {
            if (!this.currentNode.rightChild) {
                this.currentNode.rightChild = {
                    token
                };
            } else {
                const leftChild = this.currentNode.rightChild;
                this.currentNode.rightChild = {
                    token,
                    leftChild
                };
            }
            

            this.currentNode = this.currentNode.rightChild;
        }

        return this;
    }

    public build(): QueryNode {
        const query = this.root;
        this.root = {
            token: null
        };
        this.currentNode = this.root;

        if (query.token === null) {
            query.token = QueryToken.OR;
        }
        return query;
    }

}