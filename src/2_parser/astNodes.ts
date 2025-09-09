import { Token, TokenType } from "../1_lexer/token";

export namespace AST {
  /* ------------------------------- Definitions ------------------------------ */
  export enum Type {
    Module,

    ExpressionStatement,
    VariableDeclarationStatement,
    BlockStatement,
    IfStatement,
    LoopStatement,
    PrintStatement,

    // PrefixExpression,

    AssignmentExpression,

    BinaryExpression,

    BooleanExpression,
    NumberExpression,
    IdentifierExpression,
  }

  type NodeShapes = {
    [Type.Module]: { body: Statement[] };

    [Type.ExpressionStatement]: { expression: Expression };
    [Type.VariableDeclarationStatement]: { identifiers: Node<Type.IdentifierExpression>; init?: Expression };
    [Type.BlockStatement]: { body: Statement[] };
    [Type.IfStatement]: { test: Expression; consequent: Node<Type.BlockStatement>; alternate?: Node<Type.IfStatement | Type.BlockStatement> };
    [Type.LoopStatement]: { /*init?: Statement[];*/ test: Expression; /*update?: Expression;*/ body: Node<Type.BlockStatement> }; //TODO init, how do we split statements?
    [Type.PrintStatement]: { expression: Expression };

    [Type.AssignmentExpression]: {
      identifier: Node<Type.IdentifierExpression>;
      expression: Expression;
      // operator?: Token;
    };

    [Type.BinaryExpression]: {
      left: Expression;
      operator: Token; //TODO specify what token can be here
      right: Expression;
    };

    [Type.BooleanExpression]: {
      value: string;
    };
    [Type.NumberExpression]: {
      value: string;
    };
    [Type.IdentifierExpression]: {
      name: string;
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
        | Type.PrintStatement;
    }
  >;

  export type Expression = Extract<
    Node,
    {
      type:
        | Type.AssignmentExpression
        | Type.BinaryExpression
        | Type.BooleanExpression
        | Type.NumberExpression
        | Type.IdentifierExpression;
    }
  >;

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

/* ---------------------------------- Utils --------------------------------- */
export function astToStringJson(key: any, value: any) {
  if (key === "type") {
    return AST.Type[value];
  }

  if (key === "operator") {
    return TokenType[(value as Token).type];
  }
  return value;
}
