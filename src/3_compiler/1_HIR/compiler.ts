import { tokenToString } from "../../1_lexer/token";
import { AST, astToStringJson } from "../../2_parser/astNodes";
import { getOperatorFromToken, hirToStringJson, printHIR, TypedAST } from "./HIR.Types";

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
  private returnType: TypedAST.ResolvedType | null = null;
  private variables: Map<string, [type: TypedAST.ResolvedType | TypedAST.FunctionType, realName: string]> = new Map();

  constructor(parent: Context | null, returnType: TypedAST.ResolvedType | null = null) {
    this.parent = parent;
    this.returnType = returnType;
  }

  add(name: string, type: TypedAST.ResolvedType | TypedAST.FunctionType) {
    if (this.variables.has(name)) {
      throw new Error(`Variable ${name} already defined`);
    }
    if (this.parent !== null && type.type === "function") {
      throw new Error(`Functions can only be defined in the root context`);
    }

    const realName = `${name}#${this.id}`;
    this.variables.set(name, [type, realName]);
    return realName;
  }

  findVariable(name: string): [type: TypedAST.ResolvedType, realName: string] | [undefined, undefined] {
    if (this.variables.has(name)) {
      const variable = this.variables.get(name)!;
      if (variable[0].type === "function") {
        return [undefined, undefined];
      }
      return variable as [TypedAST.ResolvedType, string];
    }
    if (this.parent !== null) {
      return this.parent.findVariable(name);
    }

    return [undefined, undefined];
  }

  findFunction(name: string): [type: TypedAST.FunctionType, realName: string] | [undefined, undefined] {
    if (this.variables.has(name)) {
      const fn = this.variables.get(name)!;
      if (fn[0].type === "function") {
        return this.variables.get(name)! as [TypedAST.FunctionType, string];
      }
      return [undefined, undefined];
    }
    if (this.parent !== null) {
      return this.parent.findFunction(name);
    }
    return [undefined, undefined];
  }

  findReturnType(): TypedAST.ResolvedType | null {
    if (this.returnType !== null) {
      return this.returnType;
    }
    if (this.parent !== null) {
      return this.parent.findReturnType();
    }
    return null;
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
    case AST.Type.FunctionDeclarationStatement:
      return resolveFunctionDeclarationStatement(context, node);
    case AST.Type.ReturnStatement:
      return resolveReturnStatement(context, node);
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
  const typeDef = node.typeDef ? resolveTypeDef(node.typeDef) : undefined;

  var type: TypedAST.ResolvedType;
  if (typeDef) {
    if (init && !evaluateTypeEquality(typeDef, init.resolvedType)) {
      throw new Error(
        `HIR: variable declaration statement type mismatch.\ntypeDef: ${printHIR(typeDef)}\ninit: ${printHIR(init)}`,
      );
    }
    type = typeDef;
  } else if (init) {
    type = requireValidValueType(init.resolvedType, "variable declaration statement");
  } else {
    throw new Error(`HIR: unknown type for variable declaration:\n${JSON.stringify(node, astToStringJson, 2)}`);
  }

  const identifiers = resolveIdentifierDeclaration(context, node.identifiers, type);

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

function resolveFunctionDeclarationStatement(context: Context, node: AST.Node<AST.Type.FunctionDeclarationStatement>): TypedAST.Node<AST.Type.FunctionDeclarationStatement> {
  const returnType: TypedAST.ResolvedType = node.returnTypeDef ? resolveTypeDef(node.returnTypeDef) : { type: "void" };

  const newContext = new Context(context, returnType);

  const params = node.params.map((param) => resolveVariableDeclarationStatement(newContext, param)).map((param) => param.identifiers);
  const realName = context.add(node.name.name, { type: "function", params: params.map((param) => param.resolvedType), returnType });

  return TypedAST.createNode(
    AST.Type.FunctionDeclarationStatement,
    {
      name: realName,
      params,
      returnType,
      body: resolveBlockStatement(newContext, node.body),
    },
  );
}

function resolveReturnStatement(context: Context, node: AST.Node<AST.Type.ReturnStatement>): TypedAST.Node<AST.Type.ReturnStatement> {
  const expression = node.expression ? resolveExpression(context, node.expression) : undefined;

  const returnType = context.findReturnType() ?? { type: "void" };

  if (!evaluateTypeEquality(returnType, expression ? expression.resolvedType : { type: "void" })) {
    throw new Error(
      `HIR: return statement type mismatch.\nfnType: ${printHIR(returnType)}\nexpression: ${printHIR(expression)}`,
    );
  }

  return TypedAST.createNode(
    AST.Type.ReturnStatement,
    {
      expression,
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
    case AST.Type.FunctionCallExpression:
      return resolveFunctionCallExpression(context, node);
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

  if (!evaluateTypeEquality(identifier.resolvedType, expression.resolvedType)) {
    throw new Error(
      `HIR: assignment expression type mismatch.\nidentifier: ${printHIR(identifier)}\nexpression: ${printHIR(expression)}`,
    );
  }

  return TypedAST.createNode(
    AST.Type.AssignmentExpression,
    {
      identifier,
      expression,
      resolvedType: requireValidValueType(expression.resolvedType, "assignment expression"),
    },
  );
}

function resolveBinaryExpression(context: Context, node: AST.Node<AST.Type.BinaryExpression>): TypedAST.Node<AST.Type.BinaryExpression> {
  const left = resolveExpression(context, node.left);
  const right = resolveExpression(context, node.right);

  if (!evaluateTypeEquality(left.resolvedType, right.resolvedType)) {
    throw new Error(
      `HIR: binary expression type mismatch.\nleft: ${printHIR(left)}\nright: ${printHIR(right)}`,
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
      resolvedType: requireValidValueType(type, "binary expression"),
    },
  );
}

function resolveFunctionCallExpression(context: Context, node: AST.Node<AST.Type.FunctionCallExpression>): TypedAST.Node<AST.Type.FunctionCallExpression> {
  const [functionType, callee] = context.findFunction(node.callee.name);
  if (functionType === undefined) {
    throw new Error(`HIR: function not found in function call: ${node.callee.name}`);
  }

  const args = node.args.map((arg) => resolveExpression(context, arg));
  let invalidArgs: number[] = [];
  args.forEach((arg, index) => {
    if (!evaluateTypeEquality(functionType.params[index], arg.resolvedType)) {
      invalidArgs.push(index);
    }
  });

  if (invalidArgs.length !== 0) {
    throw new Error(
      `HIR: function call argument type mismatch.\ninvalidArgs: ${printHIR(invalidArgs)}\nfunctionType: ${printHIR(functionType)}\nargs: ${printHIR(args)}`,
    );
  }

  return TypedAST.createNode(
    AST.Type.FunctionCallExpression,
    {
      callee,
      args,
      resolvedType: functionType.returnType,
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
): TypedAST.Node<AST.Type.IdentifierExpression> {
  const [type, name] = context.findVariable(node.name);
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

function resolveIdentifierDeclaration(context: Context, node: AST.Node<AST.Type.IdentifierExpression>, typeDeclaration: TypedAST.ResolvedType) {
  const name = context.add(node.name, typeDeclaration);

  return TypedAST.createNode(
    AST.Type.IdentifierExpression,
    {
      name: name,
      resolvedType: typeDeclaration,
    },
  );
}

function resolveTypeDef(typeDef: AST.Node<AST.Type.IdentifierExpression>): TypedAST.ResolvedType {
  if (typeDef.name === "int32") {
    return { type: "int32" };
  } else if (typeDef.name === "bool") {
    return { type: "bool" };
  } else if (typeDef.name === "void") {
    return { type: "void" };
  }

  throw new Error(`HIR: type not supported: ${typeDef.name}`);
}

function evaluateTypeEquality(type1: TypedAST.ResolvedType, type2: TypedAST.ResolvedType) {
  if (type1.type === type2.type) {
    return true;
  }

  return false;
}

function requireValidValueType(type: TypedAST.ResolvedType, errorContext: string) {
  if (type.type === "void") {
    throw new Error(`HIR: in ${errorContext}: void type not allowed as a value`);
  }

  return type;
}
