import { QueryNode, QueryToken } from "./esc-query.model";

enum StateChange {
    Node,
    LeafNode
}

// TODO: this seems like it should be a state machine
// TODO: we should just write a text parser instead of using the builder
// Currently a terrible mess of if's. Should refactor asap
export function createQueryFromIdentifierList(identifiers: string[]): QueryNode {
    let sharedSet = false;
    const createTree = (identifiers: string []) => {
        const qBuilder = new QueryBuilder();
        for (let i = 0; i < identifiers.length; i++) {

            const identifierSplit = identifiers[i].split('[');
            qBuilder.identifier(identifierSplit[0]);
            const onLast = (i === identifiers.length - 1);
            const nextIsShared = !sharedSet && !onLast && identifiers[i + 1].split('[').length > 1;

            if (!onLast && !nextIsShared) {
                qBuilder.token(QueryToken.AND);
            } else if (nextIsShared) {
                sharedSet = true;
                qBuilder.token(QueryToken.OR);
                qBuilder.token(QueryToken.SHARED);
                qBuilder.append(createTree(identifiers.slice(i + 1, identifiers.length)));
                break;
            }

        }

        return qBuilder.build();
    };

    return createTree(identifiers);
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

    public append(tree: QueryNode) {
        if (this.lastChange === StateChange.LeafNode) {
            return;
        }

        if (!this.currentNode.leftChild) {
            this.currentNode.leftChild = tree;
        } else if (!this.currentNode.rightChild) {
            this.currentNode.rightChild = tree;
        } else {
            const rc = this.currentNode.rightChild;
            this.currentNode.rightChild = {
                token: QueryToken.AND,
                leftChild: tree
            };
        }
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