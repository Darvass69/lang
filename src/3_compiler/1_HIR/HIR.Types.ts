import { TODO_LOCATION, Token, TokenType } from "../../1_lexer/token";
import { AST } from "../../2_parser/astNodes";

/* -------------------------------- Typed AST ------------------------------- */

export namespace TypedAST {
  export type ResolvedType = {
    type: "int32" | "bool" | "void";
  };

  export type FunctionType = {
    type: "function";
    params: ResolvedType[];
    returnType: ResolvedType;
  };

  type NodeShapes = {
    [Type.Module]: { body: Statement[] };
    [Type.ExpressionStatement]: { expression: Expression };
    [Type.VariableDeclarationStatement]: { identifiers: Node<Type.IdentifierExpression>; init?: Expression };
    [Type.BlockStatement]: { body: Statement[] };
    [Type.IfStatement]: { test: Expression; consequent: Node<Type.BlockStatement>; alternate?: Node<Type.IfStatement | Type.BlockStatement> };
    [Type.LoopStatement]: { test: Expression; body: Node<Type.BlockStatement> };
    [Type.FunctionDeclarationStatement]: {
      name: string;
      params: Node<Type.IdentifierExpression>[];
      returnType?: ResolvedType;
      body: Node<Type.BlockStatement>;
    };
    [Type.ReturnStatement]: { expression?: Expression };
    [Type.PrintStatement]: { expression: Expression };

    [Type.AssignmentExpression]: {
      identifier: Node<Type.IdentifierExpression>;
      expression: Expression;
      resolvedType: ResolvedType;
    };
    [Type.BinaryExpression]: {
      left: Expression;
      operator: Binop;
      right: Expression;
      resolvedType: ResolvedType;
    };
    [Type.FunctionCallExpression]: {
      callee: string;
      args: Expression[];
      resolvedType: ResolvedType;
    };
    [Type.BooleanExpression]: {
      value: string;
      resolvedType: ResolvedType;
    };
    [Type.NumberExpression]: {
      value: string;
      resolvedType: ResolvedType;
    };
    [Type.IdentifierExpression]: {
      name: string;
      resolvedType: ResolvedType;
    };
  };

  type NodeMap = {
    [K in keyof NodeShapes]: { type: K } & NodeShapes[K];
  };

  export type Node<T extends keyof NodeMap = keyof NodeMap> = NodeMap[T];

  export type Statement = Extract<
    Node,
    {
      type:
        | Type.ExpressionStatement
        | Type.VariableDeclarationStatement
        | Type.BlockStatement
        | Type.IfStatement
        | Type.LoopStatement
        | Type.FunctionDeclarationStatement
        | Type.ReturnStatement
        | Type.PrintStatement;
    }
  >;

  export type Expression = Extract<
    Node,
    {
      type:
        | Type.AssignmentExpression
        | Type.BinaryExpression
        | Type.FunctionCallExpression
        | Type.BooleanExpression
        | Type.NumberExpression
        | Type.IdentifierExpression;
    }
  >;

  /* ------------------------- Forwarding declarations ------------------------ */
  export import Type = AST.Type;

  /* --------------------------------- Helpers -------------------------------- */
  export function createNode<T extends Node["type"]>(
    type: T,
    properties: NodeShapes[T],
  ) {
    return {
      type,
      ...properties,
    };
  }
}

const paths = new WeakMap<any, string[]>();

export function hirToStringJson(this: any, key: any, value: any) {
  const holderPath = paths.get(this) || [];

  if (value && typeof value === "object") {
    paths.set(value, holderPath.concat(key));
  }

  if (key === "type") {
    const parentKeyOfHolder = holderPath[holderPath.length - 1];

    if (parentKeyOfHolder === "resolvedType") {
      return value;
    } else {
      return AST.Type[value] ?? value;
    }
  }

  if (key === "operator") {
    return TokenType[(value as Token).type];
  }

  return value;
}

export function printHIR(ast: any) {
  return JSON.stringify(ast, hirToStringJson, 2);
}

export enum Binop {
  LogicalOr,
  LogicalAnd,

  BitwiseOr,
  BitwiseXor,
  BitwiseAnd,

  Equal,
  NotEqual,
  Smaller,
  Greater,
  SmallerEqual,
  GreaterEqual,

  Add,
  Sub,
  Multiply,
  Divide,
  Modulo,
}

export function printBinop(binop: Binop) {
  switch (binop) {
    case Binop.LogicalOr:
      return "||";
    case Binop.LogicalAnd:
      return "&&";
    case Binop.BitwiseOr:
      return "|";
    case Binop.BitwiseXor:
      return "^";
    case Binop.BitwiseAnd:
      return "&";
    case Binop.Equal:
      return "==";
    case Binop.NotEqual:
      return "!=";
    case Binop.Smaller:
      return "<";
    case Binop.Greater:
      return ">";
    case Binop.SmallerEqual:
      return "<=";
    case Binop.GreaterEqual:
      return ">=";
    case Binop.Add:
      return "+";
    case Binop.Sub:
      return "-";
    case Binop.Multiply:
      return "*";
    case Binop.Divide:
      return "/";
    case Binop.Modulo:
      return "%";
  }
}

export function getOperatorFromToken(token: Token, type: TypedAST.ResolvedType): [Binop, TypedAST.ResolvedType] | [undefined, undefined] {
  if (type.type === "bool") {
    switch (token.type) {
      case TokenType.LogicalOr:
        return [Binop.LogicalOr, type];
      case TokenType.LogicalAnd:
        return [Binop.LogicalAnd, type];
    }
  } else if (type.type === "int32") {
    switch (token.type) {
      case TokenType.BitwiseOr:
        return [Binop.BitwiseOr, type];
      case TokenType.BitwiseXor:
        return [Binop.BitwiseXor, type];
      case TokenType.BitwiseAnd:
        return [Binop.BitwiseAnd, type];

      case TokenType.Equal:
        return [Binop.Equal, { type: "bool" }];
      case TokenType.NotEqual:
        return [Binop.NotEqual, { type: "bool" }];
      case TokenType.Smaller:
        return [Binop.Smaller, { type: "bool" }];
      case TokenType.Greater:
        return [Binop.Greater, { type: "bool" }];
      case TokenType.SmallerEqual:
        return [Binop.SmallerEqual, { type: "bool" }];
      case TokenType.GreaterEqual:
        return [Binop.GreaterEqual, { type: "bool" }];

      case TokenType.Add:
        return [Binop.Add, type];
      case TokenType.Sub:
        return [Binop.Sub, type];
      case TokenType.Multiply:
        return [Binop.Multiply, type];
      case TokenType.Divide:
        return [Binop.Divide, type];
      case TokenType.Modulo:
        return [Binop.Modulo, type];
    }
  }
  return [undefined, undefined];
}

// if (operator === undefined) {
//   throw `MIR: unknown binary operator ${tokenToString(node.operator)}`;
// }
