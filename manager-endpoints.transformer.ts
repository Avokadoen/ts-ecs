import ts, { CallExpression, createLiteral, Expression, isVariableDeclaration, isArrowFunction, NodeArray, isFunctionDeclaration, isExpressionStatement, TypeChecker, isJSDocSignature, Identifier, isClassDeclaration, MethodDeclaration, createArrayLiteral, Declaration, TypeFlags, TypeNode, createNodeArray, isNewExpression, isClassExpression, SymbolTable, isMethodDeclaration, isIdentifier, ArrowFunction, VariableDeclaration } from 'typescript';
import path from 'path';
import { Type } from 'typedoc/dist/lib/models';

// SOURCE: https://github.com/kimamula/ts-transformer-keys

// TODO: Major refactor to clean this code please
//      - There is a lot of duplicate code between functions implementations
//      - all TargetFunction's should be in a container to reduce the switches
//      - a lot of hacks because i have no idea how to use the typescript API
//      - Use state machine pattern to reduce ifs

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
    node: Identifier | undefined;
}

const registerSystemFn: TargetFunction = {
    name: 'registerSystem',
    node: undefined
};

const registerEventFn: TargetFunction = {
    name: 'registerEvent',
    node: undefined
};

const registerComponentFn: TargetFunction = {
    name: 'registerComponentType',
    node: undefined
};

const addComponentFn: TargetFunction = {
    name: 'addComponent',
    node: undefined
};

const removeComponentFn: TargetFunction = {
    name: 'removeComponent',
    node: undefined
};

const accessComponentDataFn: TargetFunction = {
    name: 'accessComponentData',
    node: undefined
};

let fnDefinedCount = 0;
const managerName = 'ECSManager';

export default function transformer(program: ts.Program): ts.TransformerFactory<ts.SourceFile> {
    console.log('ECS compiling functions');
    return (context: ts.TransformationContext) => (file: ts.SourceFile) => visitNodeAndChildren(file, program, context);
}

function visitNodeAndChildren(node: ts.SourceFile, program: ts.Program, context: ts.TransformationContext): ts.SourceFile;
function visitNodeAndChildren(node: ts.Node, program: ts.Program, context: ts.TransformationContext): ts.Node | undefined;
function visitNodeAndChildren(node: ts.Node, program: ts.Program, context: ts.TransformationContext): ts.Node | undefined {
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
    let typeArguments: NodeArray<TypeNode> | undefined;

    const getFirstTypeArgumentAsString = (callExpr: CallExpression): string | undefined => {
        if (!callExpr.typeArguments) {
            return;
        }

        const typeArg = typeChecker.getTypeAtLocation(callExpr.typeArguments[0]);
        return typeChecker.typeToString(typeArg);
    };

    switch (activeNode.kind) {
        case ActiveNodeKind.RegSystem:
            let parametersTypeStrings: string[];
            if (isArrowFunction(arg)) {
                parametersTypeStrings = extractArrowFunctionTypeString(arg, typeChecker);
            } else {
                const systemSymbol = typeChecker.getSymbolAtLocation(arg) ;
                const systemDecl = systemSymbol?.valueDeclaration;
                if (!systemDecl) {
                    reportInternalError('failed to find system declaration', arg);
                }
                parametersTypeStrings = extractSystemParameterTypeString(systemDecl, typeChecker);
            }
        
            callArguments = ts.createNodeArray([
                arg, 
                createArrayLiteral(parametersTypeStrings.map(p => createLiteral(p)))
            ]);
            typeArguments = node.typeArguments;
            break;
        case ActiveNodeKind.RegComponent:
            let typeStr: string | undefined;
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

            const callArrs = [
                createLiteral(typeStr),
                arg,
            ];

            if (node.arguments.length > 2) {
                callArrs.push(node.arguments[2]);
            }

            callArguments = ts.createNodeArray(callArrs);

            break;
        case ActiveNodeKind.AddComponent:
            let addTypeStr: string;
            if (node.arguments.length > 2) {
                let typeArg: ts.Type;
                if (node.typeArguments) {
                    typeArg = typeChecker.getTypeAtLocation(node.typeArguments[0]);
                    addTypeStr = getFirstTypeArgumentAsString(node);
                } else {
                    typeArg = typeChecker.getTypeAtLocation(node.arguments[2]);
                    addTypeStr = typeChecker.typeToString(typeArg);
                }

                if (!addTypeStr) {
                    reportInternalError('unable to infer type of addComponent\n\
                    try to specify type with type argument or send a typed object instead', node);
                }

                callArguments = ts.createNodeArray([
                    arg,
                    createLiteral(addTypeStr),
                    node.arguments[2]
                ]);

                const typeNode = typeChecker.typeToTypeNode(typeArg);
                typeArguments = createNodeArray([
                    typeNode
                ]);
            } else if (node.typeArguments) {
                addTypeStr = getFirstTypeArgumentAsString(node);
                
                callArguments = ts.createNodeArray([
                    arg,
                    createLiteral(addTypeStr)
                ]);
                typeArguments = node.typeArguments;
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
    }

    return ts.updateCall(
        node, 
        properyAccess,
        typeArguments,
        callArguments
    );
}

function getActiveFnNode(node: CallExpression, typeChecker: TypeChecker): ActiveNode | undefined {
    const declaration = typeChecker.getResolvedSignature(node)?.declaration;
    if (!declaration) {
        return;
    }

    if (!isFunctionDeclaration(declaration)) {
        return;
    }

    const manager = node.arguments[0];
    const managerType = typeChecker.getTypeAtLocation(manager);
    if (typeChecker.typeToString(managerType) !== managerName) {
        return;
    }

    const managerMembers = managerType.getSymbol().members; 

    const extractFnNode = (target: TargetFunction): void | never => {
        if (target.node) {
            return;
        }

        const vDecl = managerMembers.get(target.name as ts.__String).valueDeclaration;
        if (!isMethodDeclaration(vDecl)) {
            reportInternalError(`expected ${target.name} to be assigned`, manager);
        }

        if (!isIdentifier(vDecl.name)) {
            reportInternalError(`expected value declaration name to be identifier`, vDecl.name);
        }

        target.node = vDecl.name;
    };

    switch (declaration.name?.getText()) {
        case registerSystemFn.name: 
            extractFnNode(registerSystemFn);
            return { kind: ActiveNodeKind.RegSystem, node: registerSystemFn.node };
        case registerEventFn.name: 
            extractFnNode(registerEventFn);
            return { kind: ActiveNodeKind.RegSystem, node: registerEventFn.node };
        case registerComponentFn.name:
            extractFnNode(registerComponentFn);
            return { kind: ActiveNodeKind.RegComponent, node: registerComponentFn.node };
        case addComponentFn.name:
            extractFnNode(addComponentFn);
            return { kind: ActiveNodeKind.AddComponent, node: addComponentFn.node };
        case removeComponentFn.name:
            extractFnNode(removeComponentFn);
            return { kind: ActiveNodeKind.RemComponent, node: removeComponentFn.node };
        case accessComponentDataFn.name:
            extractFnNode(accessComponentDataFn);
            return { kind: ActiveNodeKind.AccessComponent, node: accessComponentDataFn.node };
        default:
            return;
    }
}

function extractArrowFunctionTypeString(arrowFunction: ArrowFunction, typeChecker: TypeChecker): string[] {

    let typeArray: string[] = [];
    for (const p of arrowFunction.parameters) {

        const type = typeChecker.getTypeAtLocation(p);
    
        const typeStr = (type.flags === TypeFlags.Object) 
            ? typeChecker.typeToString(type)
            : undefined;

        if (typeStr && typeStr !== 'Event') {
            const strSplit = typeStr.split('Component<');
            
            if (strSplit.length !== 2) {
                reportInternalError('expect system to utilize Component<T> i.e Component<MyComponent>', p);
            }

            typeArray.push(strSplit[1].slice(0, strSplit[1].length - 1));
        }
    }
    return typeArray;
}

function extractSystemParameterTypeString(valueDeclaration: Declaration, typeChecker: TypeChecker): string[] {
    if (!isVariableDeclaration(valueDeclaration)) {
        reportInternalError('expected valueDeclaration to be of type variable declaration', valueDeclaration);
    }

    const arrowFunction = valueDeclaration.initializer;
    if (!arrowFunction) {
        reportInternalError('expected initializer to exist', valueDeclaration);
    }

    if (!isArrowFunction(arrowFunction)) {
        reportInternalError('expected initializer to be a arrow function declaration', arrowFunction);
    }

    return extractArrowFunctionTypeString(arrowFunction, typeChecker);
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

const indexTs = path.join(__dirname.replace('dist', 'index.ts'), ); // TODO: if dev
const indexDTs = path.join(__dirname, 'index.d.ts');                // TODO if prod
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

function reportInternalError(message: string, context: ts.Node): never {
    throw `ECS internal error: ${message}, context kind: ${context.kind}, position: ${context.pos}`;
}