import { tokenToString } from "../../1_lexer/token";
import { AST, astToStringJson } from "../../2_parser/astNodes";
import { getOperatorFromToken, hirToStringJson, TypedAST } from "./HIR.Types";

/*
infer type from use

logical operators and comparison operators result in a boolean
other operators result in the same type they used
doing math operations on a boolean is forbidden (for now?)


compare types both ways of the operation, they need to be the same to be allowed to operate.

arithmetic, bitwise = int -> int -> int
comparison = int -> int -> boolean
logical = boolean -> boolean -> boolean

*/

class Context {
  private static contextId = 0;

  private id = Context.contextId++;
  private parent: Context | null = null;
  private variables: Map<string, [type: TypedAST.ResolvedType, realName: string]> = new Map();

  constructor(parent: Context | null) {
    this.parent = parent;
  }

  add(name: string, type: TypedAST.ResolvedType) {
    if (this.variables.has(name)) {
      throw new Error(`Variable ${name} already defined`);
    }
    const realName = `${name}_${this.id}`;
    this.variables.set(name, [type, realName]);
    return realName;
  }

  find(name: string): [type: TypedAST.ResolvedType, realName: string] | [undefined, undefined] {
    if (this.variables.has(name)) {
      return this.variables.get(name)!;
    }
    if (this.parent !== null) {
      return this.parent.find(name);
    }

    return [undefined, undefined];
  }
}

export function generateHIR(module: AST.Node<AST.Type.Module>): TypedAST.Node<AST.Type.Module> {
  return resolveModule(module);
}

function resolveModule(node: AST.Node<AST.Type.Module>): TypedAST.Node<AST.Type.Module> {
  const context = new Context(null);
  return TypedAST.createNode(
    AST.Type.Module,
    {
      body: node.body.map((statement) => resolveStatement(context, statement)),
    },
  );
}

function resolveStatement(context: Context, node: AST.Statement): TypedAST.Statement {
  switch (node.type) {
    case AST.Type.ExpressionStatement:
      return resolveExpressionStatement(context, node);
    case AST.Type.VariableDeclarationStatement:
      return resolveVariableDeclarationStatement(context, node);
    case AST.Type.BlockStatement:
      return resolveBlockStatement(new Context(context), node);
    case AST.Type.IfStatement:
      return resolveIfStatement(context, node);
    case AST.Type.LoopStatement:
      return resolveLoopStatement(context, node);
    case AST.Type.PrintStatement:
      return resolvePrintStatement(context, node);
  }
  throw new Error("HIR: should be unreachable");
}

function resolveExpressionStatement(context: Context, node: AST.Node<AST.Type.ExpressionStatement>): TypedAST.Node<AST.Type.ExpressionStatement> {
  return TypedAST.createNode(
    AST.Type.ExpressionStatement,
    {
      expression: resolveExpression(context, node.expression),
    },
  );
}

function resolveVariableDeclarationStatement(context: Context, node: AST.Node<AST.Type.VariableDeclarationStatement>): TypedAST.Node<AST.Type.VariableDeclarationStatement> {
  const init = node.init ? resolveExpression(context, node.init) : undefined;
  let varType: TypedAST.ResolvedType;

  if (init === undefined) {
    varType = { type: "int32" };
  } else {
    varType = init.resolvedType;
  }

  const identifiers = resolveIdentifierExpression(context, node.identifiers, varType);

  return TypedAST.createNode(
    AST.Type.VariableDeclarationStatement,
    {
      identifiers,
      init,
    },
  );
}

function resolveBlockStatement(context: Context, node: AST.Node<AST.Type.BlockStatement>): TypedAST.Node<AST.Type.BlockStatement> {
  return TypedAST.createNode(
    AST.Type.BlockStatement,
    {
      body: node.body.map((statement) => resolveStatement(context, statement)),
    },
  );
}

function resolveIfStatement(context: Context, node: AST.Node<AST.Type.IfStatement>): TypedAST.Node<AST.Type.IfStatement> {
  return TypedAST.createNode(
    AST.Type.IfStatement,
    {
      test: resolveExpression(context, node.test),
      consequent: resolveBlockStatement(new Context(context), node.consequent),
      alternate: node.alternate
        ? node.alternate.type === AST.Type.IfStatement ? resolveIfStatement(new Context(context), node.alternate) : resolveBlockStatement(new Context(context), node.alternate)
        : undefined,
    },
  );
}

function resolveLoopStatement(context: Context, node: AST.Node<AST.Type.LoopStatement>): TypedAST.Node<AST.Type.LoopStatement> {
  return TypedAST.createNode(
    AST.Type.LoopStatement,
    {
      test: resolveExpression(context, node.test),
      body: resolveBlockStatement(new Context(context), node.body),
    },
  );
}

function resolvePrintStatement(context: Context, node: AST.Node<AST.Type.PrintStatement>): TypedAST.Node<AST.Type.PrintStatement> {
  return TypedAST.createNode(
    AST.Type.PrintStatement,
    {
      expression: resolveExpression(context, node.expression),
    },
  );
}

function resolveExpression(context: Context, node: AST.Expression): TypedAST.Expression {
  switch (node.type) {
    case AST.Type.AssignmentExpression:
      return resolveAssignmentExpression(context, node);
    case AST.Type.BinaryExpression:
      return resolveBinaryExpression(context, node);
    case AST.Type.BooleanExpression:
      return resolveBooleanExpression(context, node);
    case AST.Type.NumberExpression:
      return resolveNumberExpression(context, node);
    case AST.Type.IdentifierExpression:
      return resolveIdentifierExpression(context, node);
  }
  throw new Error("HIR: should be unreachable");
}

function resolveAssignmentExpression(context: Context, node: AST.Node<AST.Type.AssignmentExpression>): TypedAST.Node<AST.Type.AssignmentExpression> {
  const identifier = resolveIdentifierExpression(context, node.identifier);
  const expression = resolveExpression(context, node.expression);

  if (identifier.resolvedType.type !== expression.resolvedType.type) {
    throw new Error(
      `HIR: assignment expression type mismatch.\nidentifier:\n${JSON.stringify(identifier, hirToStringJson, 2)}\nexpression:\n${JSON.stringify(expression, hirToStringJson, 2)}`,
    );
  }

  return TypedAST.createNode(
    AST.Type.AssignmentExpression,
    {
      identifier,
      expression,
      resolvedType: expression.resolvedType,
    },
  );
}

function resolveBinaryExpression(context: Context, node: AST.Node<AST.Type.BinaryExpression>): TypedAST.Node<AST.Type.BinaryExpression> {
  const left = resolveExpression(context, node.left);
  const right = resolveExpression(context, node.right);

  if (left.resolvedType.type !== right.resolvedType.type) {
    throw new Error(
      `HIR: binary expression type mismatch.\nleft:\n${JSON.stringify(left, hirToStringJson, 2)}\nright:\n${JSON.stringify(right, hirToStringJson, 2)}`,
    );
  }

  const [operator, type] = getOperatorFromToken(node.operator, left.resolvedType);

  if (operator === undefined) {
    throw new Error(`HIR: binary expression operator not supported: ${tokenToString(node.operator)} type: ${left.resolvedType.type}`);
  }

  return TypedAST.createNode(
    AST.Type.BinaryExpression,
    {
      left,
      operator,
      right,
      resolvedType: type,
    },
  );
}

function resolveBooleanExpression(context: Context, node: AST.Node<AST.Type.BooleanExpression>): TypedAST.Node<AST.Type.BooleanExpression> {
  return TypedAST.createNode(
    AST.Type.BooleanExpression,
    {
      value: node.value,
      resolvedType: { type: "bool" },
    },
  );
}

function resolveNumberExpression(context: Context, node: AST.Node<AST.Type.NumberExpression>): TypedAST.Node<AST.Type.NumberExpression> {
  return TypedAST.createNode(
    AST.Type.NumberExpression,
    {
      value: node.value,
      resolvedType: { type: "int32" },
    },
  );
}

function resolveIdentifierExpression(
  context: Context,
  node: AST.Node<AST.Type.IdentifierExpression>,
  typeDeclaration?: TypedAST.ResolvedType,
): TypedAST.Node<AST.Type.IdentifierExpression> {
  if (typeDeclaration) {
    const name = context.add(node.name, typeDeclaration);

    return TypedAST.createNode(
      AST.Type.IdentifierExpression,
      {
        name: name,
        resolvedType: typeDeclaration,
      },
    );
  }

  const [type, name] = context.find(node.name);
  if (type === undefined) {
    throw new Error(`HIR: unresolved identifier ${node.name}`);
  }

  return TypedAST.createNode(
    AST.Type.IdentifierExpression,
    {
      name: name,
      resolvedType: type,
    },
  );
}
