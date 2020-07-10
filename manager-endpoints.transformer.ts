import ts, { CallExpression, createLiteral, Expression, isVariableDeclaration, isArrowFunction, NodeArray, isFunctionDeclaration, isExpressionStatement, TypeChecker, isJSDocSignature, Identifier, isClassDeclaration, MethodDeclaration, createArrayLiteral, Declaration, TypeFlags, TypeNode, createNodeArray } from 'typescript';
import path from 'path';

// SOURCE: https://github.com/kimamula/ts-transformer-keys

// TODO: Major refactor to clean this code please
//      - There is a lot of duplicate code between functions implementations
//      - all TargetFunction's should be in a container to reduce the switches
//      - a lot of hacks because i have no idea how to use the typescript API
//      - More

enum ActiveNodeKind {
    RegSystem, // Both normal and event
    RegComponent,
    AddComponent,
    RemComponent,
    AccessComponent
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

const removeComponentFn: TargetFunction = {
    name: 'removeComponent',
    node: null
};

const accessComponentDataFn: TargetFunction = {
    name: 'accessComponentData',
    node: null
};

const managerName = 'ECSManager';

export default function transformer(program: ts.Program): ts.TransformerFactory<ts.SourceFile> {
    console.log('ECS compiling functions');
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
                    case removeComponentFn.name:
                        nodeAssigner(removeComponentFn, member);
                        break;
                    case accessComponentDataFn.name:
                        nodeAssigner(accessComponentDataFn, member);
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
        return node;
    }

    if (!isFnParameterTypesCallExpression(node, typeChecker)) {
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

    const getFirstTypeArgumentAsString = (node: CallExpression) => {
        const typeArg = typeChecker.getTypeAtLocation(node.typeArguments[0]);
        return typeChecker.typeToString(typeArg);
    };

    switch (activeNode.kind) {
        case ActiveNodeKind.RegSystem:
            const systemDecl = typeChecker.getSymbolAtLocation(arg).valueDeclaration;
            const parametersTypeStrings = extractSystemParameterTypeString(systemDecl, typeChecker);
            callArguments = ts.createNodeArray([
                arg, 
                createArrayLiteral(parametersTypeStrings.map(p => createLiteral(p)))
            ]);
            typeArguments = node.typeArguments;
            break;
        case ActiveNodeKind.RegComponent:
            let typeStr: string;
            if (node.typeArguments) {
                typeStr = getFirstTypeArgumentAsString(node);
                typeArguments = node.typeArguments;
            } else {
                const defaultDecl = typeChecker.getSymbolAtLocation(arg)?.valueDeclaration;
                if (defaultDecl && isVariableDeclaration(defaultDecl)) {
                    const type = typeChecker.getTypeAtLocation(defaultDecl);
                    typeArguments = createNodeArray([typeChecker.typeToTypeNode(type)]);
                    typeStr = typeChecker.typeToString(type);
                } else {
                    reportInternalError(
                        'unable to extract type information from registerComponentType. \n\
                        Try to send a specific typed object in the arguments or use the type arguments <>', 
                        node
                    );
                }
            }
            console.log(node.pos);
            callArguments = ts.createNodeArray([
                createLiteral(typeStr),
                arg
            ]);
            break;
        case ActiveNodeKind.AddComponent:
            let addTypeStr: string;
            if (node.typeArguments) {
                addTypeStr = getFirstTypeArgumentAsString(node);
                
                callArguments = ts.createNodeArray([
                    arg,
                    createLiteral(addTypeStr)
                ]);
                typeArguments = node.typeArguments;
            } else if (node.arguments.length > 2) {
                const typeArg = typeChecker.getTypeAtLocation(node.arguments[2]);
                addTypeStr = typeChecker.typeToString(typeArg);
                
                callArguments = ts.createNodeArray([
                    arg,
                    createLiteral(addTypeStr),
                    node.arguments[2]
                ]);
                typeArguments = createNodeArray([
                    typeChecker.typeToTypeNode(typeArg)
                ]);
            } else {
                reportInternalError('addComponent should either have a type specifier or a override value', node);
            }
            break;
        case ActiveNodeKind.RemComponent:
            if (!node.typeArguments) {
                reportInternalError('addComponent should either have a type specifier or a override value', node);
            }

            typeArguments = node.typeArguments;
            const removeTypeStr = getFirstTypeArgumentAsString(node);
            callArguments = ts.createNodeArray([
                arg,
                createLiteral(removeTypeStr),
            ]);
            break;
        case ActiveNodeKind.AccessComponent:
            if (!node.typeArguments) {
                reportInternalError('accessComponentData should either have a type specifier (generic)', node);
            }

            typeArguments = node.typeArguments;
            const accessTypeStr = getFirstTypeArgumentAsString(node);
            callArguments = ts.createNodeArray([
                arg,
                createLiteral(accessTypeStr),
            ]);
            break;
        default:
            reportInternalError(`unexpected activeNode kind: ${activeNode.kind}`, node);
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
        case removeComponentFn.name:
            return { kind: ActiveNodeKind.RemComponent, node: removeComponentFn.node };
        case accessComponentDataFn.name:
            return { kind: ActiveNodeKind.AccessComponent, node: accessComponentDataFn.node };
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
            const strSplit = typeStr.split('Component<');
            
            if (strSplit.length !== 2) {
                reportInternalError('expect system to utilize Component<T> i.e Component<MyComponent>', p);
            }

            typeArray.push(strSplit[1].slice(0, strSplit[1].length - 1));
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

const indexTs = path.join(__dirname, 'index.ts'); // TODO: if dev
const indexDTs = path.join(__dirname, 'index.d.ts'); // TODO if prod
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

    const resolveDeclFile = require.resolve(declaration.getSourceFile().fileName);
    return (resolveDeclFile === indexTs
        || resolveDeclFile === indexDTs)
        && (declaration.name?.getText() === registerSystemFn.name  
        ||  declaration.name?.getText() === registerEventFn.name
        ||  declaration.name?.getText() === registerComponentFn.name
        ||  declaration.name?.getText() === addComponentFn.name
        ||  declaration.name?.getText() === removeComponentFn.name
        ||  declaration.name?.getText() === accessComponentDataFn.name
    );
}

function reportInternalError(message: string, context: ts.Node) {
    throw `ECS internal error: ${message}, context kind: ${context.kind}`;
}