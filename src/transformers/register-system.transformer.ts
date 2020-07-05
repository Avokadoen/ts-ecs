import ts, { CallExpression, isIdentifier, TypeNode, isFunctionTypeNode, isTypeReferenceNode, createLiteral, FlowNode, FlowCall, Expression, isVariableDeclaration, isArrowFunction, NodeArray, ParameterDeclaration, SyntaxKind, isCallExpression, Node, isFunctionDeclaration, isExpressionStatement, TypeChecker, isJSDocSignature, Identifier, isClassDeclaration, MethodDeclaration, sys } from 'typescript';
import path from 'path';

// SOURCE: https://github.com/kimamula/ts-transformer-keys


const registerFunctionName = 'registerSystem';
const managerName = 'ECSManager';
let registerSystemFnNodeName: Identifier = null;

export default function transformer(program: ts.Program): ts.TransformerFactory<ts.SourceFile> {
    return (context: ts.TransformationContext) => (file: ts.SourceFile) => visitNodeAndChildren(file, program, context);
}

function visitNodeAndChildren(node: ts.SourceFile, program: ts.Program, context: ts.TransformationContext): ts.SourceFile;
function visitNodeAndChildren(node: ts.Node, program: ts.Program, context: ts.TransformationContext): ts.Node | undefined;
function visitNodeAndChildren(node: ts.Node, program: ts.Program, context: ts.TransformationContext): ts.Node | undefined {
    const managerClassDeclFinder = (node: ts.Node): ts.Node => {
        if (registerSystemFnNodeName) {
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
                
                if (member.name.getText() === registerFunctionName) {
                    if (ts.isIdentifier(member.name)) {
                        registerSystemFnNodeName = member.name;
                        return registerSystemFnNodeName;
                    } else {
                        console.error(`ECS internal error: registerSystemFnNode.name was not an identifier, kind: ${member.kind}`);
                        return member;
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

    const manager = node.arguments[0];
    const system = node.arguments[1];
    const properyAccess = ts.createPropertyAccess(
        manager,
        registerSystemFnNodeName
    );

    const parametersTypeStrings = extractSystemParameterTypeString(system);
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

function extractSystemParameterTypeString(system: ts.Expression): string[] {
    // tslint:disable-next-line: no-any
    const sFlowNode = (system as any).flowNode;
    if (!sFlowNode) {
        reportInternalError('expected flowNode on system', system);
        return [];
    }

    const systemVariableDecl = (sFlowNode as ts.FlowAssignment)?.node;
    if (!isVariableDeclaration(systemVariableDecl)) {
        reportInternalError('expected node to be a variable declaration', systemVariableDecl);
        return [];
    }

    const arrowFunction = systemVariableDecl.initializer;
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
                typeArray.push(t.typeName.escapedText as string);
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
        && declaration.name?.getText() === registerFunctionName;
}

function reportInternalError(message: string, context: ts.Node) {
    console.log(`ECS internal error: ${message}, context kind: ${context.kind}`);
}