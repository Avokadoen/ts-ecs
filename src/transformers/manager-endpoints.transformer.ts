import ts, { CallExpression, createLiteral, Expression, isVariableDeclaration, isArrowFunction, NodeArray, isFunctionDeclaration, isExpressionStatement, TypeChecker, isJSDocSignature, Identifier, isClassDeclaration, MethodDeclaration, createArrayLiteral, Declaration, TypeFlags, TypeNode, createNodeArray } from 'typescript';
import path from 'path';

// SOURCE: https://github.com/kimamula/ts-transformer-keys

// TODO: Major refactor to clean this code please

enum ActiveNodeKind {
    RegSystem, // Both normal and event
    RegComponent,
    AddComponent
}

interface ActiveNode {
    kind: ActiveNodeKind;
    node: Identifier;
}

interface TargetFunction {
    name: string;
    node: Identifier;
}

const registerSystemFn: TargetFunction = {
    name: 'registerSystem',
    node: null
};

const registerEventFn: TargetFunction = {
    name: 'registerEvent',
    node: null
};

const registerComponentFn: TargetFunction = {
    name: 'registerComponentType',
    node: null
};

const addComponentFn: TargetFunction = {
    name: 'addComponent',
    node: null
};

const managerName = 'ECSManager';

export default function transformer(program: ts.Program): ts.TransformerFactory<ts.SourceFile> {
    return (context: ts.TransformationContext) => (file: ts.SourceFile) => visitNodeAndChildren(file, program, context);
}

function visitNodeAndChildren(node: ts.SourceFile, program: ts.Program, context: ts.TransformationContext): ts.SourceFile;
function visitNodeAndChildren(node: ts.Node, program: ts.Program, context: ts.TransformationContext): ts.Node | undefined;
function visitNodeAndChildren(node: ts.Node, program: ts.Program, context: ts.TransformationContext): ts.Node | undefined {
    const managerClassDeclFinder = (node: ts.Node): ts.Node => {
        const nodeAssigner = (target: TargetFunction, member: MethodDeclaration) => {
            if (target.node) {
                return;
            }

            if (ts.isIdentifier(member.name)) {
                target.node = member.name;
            } else {
                reportInternalError(`${target.name}: member was not an identifier`, member);
            } 
        };

        if (registerSystemFn.node && registerEventFn.node) {
            return node;
        }

        if (isClassDeclaration(node) && node.name.getText() === managerName) {
            for (const member of node.members) {
                if (!member) {
                    continue;
                }
                
                if (!ts.isMethodDeclaration(member)) {
                    continue;
                }

                switch (member.name.getText()) {
                    case registerSystemFn.name:
                        nodeAssigner(registerSystemFn, member);
                        break;
                    case registerEventFn.name:
                        nodeAssigner(registerEventFn, member);
                        break;
                    case registerComponentFn.name:
                        nodeAssigner(registerComponentFn, member);
                        break;
                    case addComponentFn.name:
                        nodeAssigner(addComponentFn, member);
                        break;
                }
            }
        }

        return ts.visitEachChild(node, managerClassDeclFinder, context);
    };
    
    ts.visitEachChild(node, managerClassDeclFinder, context);

    return ts.visitEachChild(visitNode(node, program), childNode => visitNodeAndChildren(childNode, program, context), context);
}

function visitNode(node: ts.SourceFile, program: ts.Program): ts.SourceFile;
function visitNode(node: ts.Node, program: ts.Program): ts.Node | undefined;
function visitNode(node: ts.Node, program: ts.Program): ts.Node | undefined {
    const typeChecker = program.getTypeChecker();
      
    if (isFnParameterTypesImportExpression(node)) {
        return;
    }
    if (!isFnParameterTypesCallExpression(node, typeChecker)) {
        return node;
    }

    if (!isExpressionStatement(node.parent)) {
        return node;
    }

    const activeNode = getActiveFnNode(node, typeChecker);
    if (!activeNode) {
        return node;
    }
    
    const manager = node.arguments[0];
    const arg = node.arguments[1];

    const properyAccess = ts.createPropertyAccess(
        manager,
        activeNode.node
    );


    let callArguments: NodeArray<Expression>;
    let typeArguments: NodeArray<TypeNode>;
    switch (activeNode.kind) {
        case ActiveNodeKind.RegSystem:
            const systemDecl = typeChecker.getSymbolAtLocation(arg).valueDeclaration;
            const parametersTypeStrings = extractSystemParameterTypeString(systemDecl, typeChecker);
            callArguments = ts.createNodeArray([
                arg, 
                createArrayLiteral(parametersTypeStrings.map(p => createLiteral(p)))
            ]);
            typeArguments = null;
            break;
        case ActiveNodeKind.RegComponent:
            const defaultDecl = typeChecker.getSymbolAtLocation(arg).valueDeclaration;
            let typeStr: string;
            if (isVariableDeclaration(defaultDecl)) {
                const type = typeChecker.getTypeAtLocation(defaultDecl);
                typeStr = typeChecker.typeToString(type);
            }
            
            callArguments = ts.createNodeArray([
                createLiteral(typeStr),
                arg
            ]);
            typeArguments = null;
            break;
        case ActiveNodeKind.AddComponent:
            let compTypeStr: string;
            if (node.typeArguments) {
                const typeArg = typeChecker.getTypeAtLocation(node.typeArguments[0]);
                compTypeStr = typeChecker.typeToString(typeArg);
                
                callArguments = ts.createNodeArray([
                    arg,
                    createLiteral(compTypeStr)
                ]);
                typeArguments = node.typeArguments;
            } else if (node.arguments.length > 2) {
                const typeArg = typeChecker.getTypeAtLocation(node.arguments[2]);
                compTypeStr = typeChecker.typeToString(typeArg);
                
                callArguments = ts.createNodeArray([
                    arg,
                    createLiteral(compTypeStr),
                    node.arguments[2]
                ]);
                typeArguments = createNodeArray([
                    typeChecker.typeToTypeNode(typeArg)
                ]);
            } else {
                reportInternalError('addComponent should either have a type specifier or a override value', node);
            }
            break;
    }

    return ts.updateCall(
        node, 
        properyAccess,
        typeArguments,
        callArguments
    );
}

function getActiveFnNode(node: CallExpression, typeChecker: TypeChecker): ActiveNode | undefined {
    const { declaration } = typeChecker.getResolvedSignature(node);
    if (!isFunctionDeclaration(declaration)) {
        return;
    }

    switch (declaration.name?.getText()) {
        case registerSystemFn.name: 
            return { kind: ActiveNodeKind.RegSystem, node: registerSystemFn.node };
        case registerEventFn.name: 
            return { kind: ActiveNodeKind.RegSystem, node: registerEventFn.node };
        case registerComponentFn.name:
            return { kind: ActiveNodeKind.RegComponent, node: registerComponentFn.node };
        case addComponentFn.name:
            return { kind: ActiveNodeKind.AddComponent, node: addComponentFn.node };
        default:
            return;
    }
}

function extractSystemParameterTypeString(valueDeclaration: Declaration, typeChecker: TypeChecker): string[] {
    if (!isVariableDeclaration(valueDeclaration)) {
        reportInternalError('expected valueDeclaration to be of type variable declatation', valueDeclaration);
        return [];
    }

    const arrowFunction = valueDeclaration.initializer;
    if (!isArrowFunction(arrowFunction)) {
        reportInternalError('expected initializer to be a variable declaration', arrowFunction);
        return [];
    }

    let typeArray: string[] = [];
    for (const p of arrowFunction.parameters) {

        const type = typeChecker.getTypeAtLocation(p);
    
        const typeStr = (type.flags === TypeFlags.Object) 
            ? typeChecker.typeToString(type)
            : undefined;

        if (typeStr) {
            typeArray.push(typeStr);
        }
    }
    return typeArray;
}

const indexJs = path.join(__dirname, 'index.js');
function isFnParameterTypesImportExpression(node: ts.Node): node is ts.ImportDeclaration {
    if (!ts.isImportDeclaration(node)) {
        return false;
    }
    const module = (node.moduleSpecifier as ts.StringLiteral).text;
    try {
        return indexJs === (
        module.startsWith('.')
            ? require.resolve(path.resolve(path.dirname(node.getSourceFile().fileName), module))
            : require.resolve(module)
        );
    } catch(e) {
        return false;
    }
}

const indexTs = path.join(__dirname.replace('\\src\\transformers', '').replace('/src/transformers', ''), 'index.ts');
function isFnParameterTypesCallExpression(node: ts.Node, typeChecker: ts.TypeChecker): node is ts.CallExpression {
    if (!ts.isCallExpression(node)) {
        return false;
    }
    const signature = typeChecker.getResolvedSignature(node);
    if (typeof signature === 'undefined') {
        return false;
    }
    const { declaration } = signature;

    if (!declaration) {
        return false;
    }

    if (isJSDocSignature(declaration)) {
        return false;
    }

    return require.resolve(declaration.getSourceFile().fileName) === indexTs
        && (declaration.name?.getText() === registerSystemFn.name  
        ||  declaration.name?.getText() === registerEventFn.name
        ||  declaration.name?.getText() === registerComponentFn.name
        ||  declaration.name?.getText() === addComponentFn.name
    );
}

function reportInternalError(message: string, context: ts.Node) {
    throw `ECS internal error: ${message}, context kind: ${context.kind}`;
}