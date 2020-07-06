import ts, { CallExpression, isIdentifier, TypeNode, isFunctionTypeNode, isTypeReferenceNode, createLiteral, FlowNode, FlowCall, Expression, isVariableDeclaration, isArrowFunction, NodeArray, ParameterDeclaration, SyntaxKind, isCallExpression, Node, isFunctionDeclaration, isExpressionStatement, TypeChecker, isJSDocSignature, Identifier, isClassDeclaration, MethodDeclaration, sys, isCallLikeExpression, CallLikeExpression } from 'typescript';
import path from 'path';

// SOURCE: https://github.com/kimamula/ts-transformer-keys


const systemFunctionName = 'registerSystem';
const eventFunctionName = 'registerEvent';
let systemFnNodeName: Identifier = null;
let eventFnNodeName: Identifier = null;
const managerName = 'ECSManager';

export default function transformer(program: ts.Program): ts.TransformerFactory<ts.SourceFile> {
    return (context: ts.TransformationContext) => (file: ts.SourceFile) => visitNodeAndChildren(file, program, context);
}

function visitNodeAndChildren(node: ts.SourceFile, program: ts.Program, context: ts.TransformationContext): ts.SourceFile;
function visitNodeAndChildren(node: ts.Node, program: ts.Program, context: ts.TransformationContext): ts.Node | undefined;
function visitNodeAndChildren(node: ts.Node, program: ts.Program, context: ts.TransformationContext): ts.Node | undefined {
    const managerClassDeclFinder = (node: ts.Node): ts.Node => {
        if (systemFnNodeName && eventFnNodeName) {
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
                
                if (!systemFnNodeName) {
                    if (member.name.getText() === systemFunctionName) {
                        if (ts.isIdentifier(member.name)) {
                            systemFnNodeName = member.name;
                        } else {
                            reportInternalError('registerSystemFnNode.name was not an identifier', member);
                        } 
                    } 
                }
                if (!eventFnNodeName) {
                    if (member.name.getText() === eventFunctionName) {
                        if (ts.isIdentifier(member.name)) {
                            eventFnNodeName = member.name;
                        } else {
                            reportInternalError('registerEventFnNode.name was not an identifier', member);
                        } 
                    }
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
    const system = node.arguments[1];

    const properyAccess = ts.createPropertyAccess(
        manager,
        activeNode
    );

    const parametersTypeStrings = extractSystemParameterTypeString(system, typeChecker);

    const callArguments = ts.createNodeArray([
        system, 
        ts.createArrayLiteral(parametersTypeStrings.map(p => ts.createLiteral(p)))
    ]);

    return ts.updateCall(
        node, 
        properyAccess,
        null,
        callArguments
    );
}

function getActiveFnNode(node: CallExpression, typeChecker: TypeChecker): Identifier | undefined {
    const { declaration } = typeChecker.getResolvedSignature(node);
    if (!isFunctionDeclaration(declaration)) {
        return;
    }

    switch (declaration.name?.getText()) {
        case systemFunctionName: 
            return systemFnNodeName;
        case eventFunctionName: 
            return eventFnNodeName;
        default:
            return;
    }
}

function extractSystemParameterTypeString(system: Expression, typeChecker: TypeChecker): string[] {
    const {valueDeclaration} = typeChecker.getSymbolAtLocation(system);
    if (!isVariableDeclaration(valueDeclaration)) {
        reportInternalError('expected system symbol to be of type variable declatation', system);
        return [];
    }

    const arrowFunction = valueDeclaration.initializer;
    if (!isArrowFunction(arrowFunction)) {
        reportInternalError('expected initializer to be a variable declaration', arrowFunction);
        return [];
    }

    return extractParametersTypeAsString(arrowFunction.parameters);
}


function extractParametersTypeAsString(parameters: NodeArray<ParameterDeclaration>): string[] {
    let typeArray: string[] = [];
    for (const p of parameters) {
        const t = p.type;

        if (t && isTypeReferenceNode(t)) {
            if (isIdentifier(t.typeName)) {
                let typeString = t.typeName.escapedText as string;
                // hack to skip template type 
                // TODO: find more robust solution as generics can be more than one in length ...
                if (typeString.length <= 1) { 
                    continue;
                }

                if (t.typeArguments) {
                    typeString += '<'.repeat(t.typeArguments.length);
                    for (const tArg of t.typeArguments) {
                        typeString = typeString.concat(tArg.getText() + '>');
                    }
                }

                typeArray.push(typeString);
            }
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
    return !!declaration
        && !ts.isJSDocSignature(declaration)
        && require.resolve(declaration.getSourceFile().fileName) === indexTs
        && (declaration.name?.getText() === systemFunctionName  
            || declaration.name?.getText() === eventFunctionName);
}

function reportInternalError(message: string, context: ts.Node) {
    console.log(`ECS internal error: ${message}, context kind: ${context.kind}`);
}