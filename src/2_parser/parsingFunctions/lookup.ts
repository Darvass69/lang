import { parse } from "node:path";
import { TokenType } from "../../1_lexer/token";
import { AST } from "../astNodes";
import { BindingPower } from "../bindingPower";
import { Parser } from "../parser";
import { parseAssignmentExpression, parseBinaryExpression, parseGroupingExpression, parsePrimaryExpression } from "./expression";
import { parseBlockStatement, parseIfStatement, parsePrintStatement, parseVariableDeclarationStatement, parseWhileStatement } from "./statement";

export type StmtHandler = (parser: Parser) => AST.Statement;
export type NudHandler = ((parser: Parser) => AST.Expression) & { bp: number };
export type LedHandler = ((parser: Parser, left: AST.Expression) => AST.Expression) & { bp: number };

export type StmtParsingFunction = (parser: Parser) => AST.Statement;
export type NudParsingFunction = (parser: Parser, bp: BindingPower) => AST.Expression;
export type LedParsingFunction = (parser: Parser, left: AST.Expression, bp: BindingPower) => AST.Expression;

/** Lookup table for parsing functions. It defines what parsing function is used with which token */
export default class ParsingFunctionLookup {
  private statementLookup: Map<TokenType, StmtHandler> = new Map();
  private nudLookup: Map<TokenType, NudHandler> = new Map();
  private ledLookup: Map<TokenType, LedHandler> = new Map();

  constructor() {
    //~ Operators

    //* Bitwise
    this.addLed(TokenType.BitwiseOr, BindingPower.bitwise_or, parseBinaryExpression);
    this.addLed(TokenType.BitwiseXor, BindingPower.bitwise_xor, parseBinaryExpression);
    this.addLed(TokenType.BitwiseAnd, BindingPower.bitwise_and, parseBinaryExpression);

    //* Logical
    this.addLed(TokenType.LogicalOr, BindingPower.logical_or, parseBinaryExpression);
    this.addLed(TokenType.LogicalAnd, BindingPower.logical_and, parseBinaryExpression);

    //* Arithmetic
    this.addLed(TokenType.Add, BindingPower.additive, parseBinaryExpression);
    this.addLed(TokenType.Sub, BindingPower.additive, parseBinaryExpression);

    this.addLed(TokenType.Multiply, BindingPower.multiplicative, parseBinaryExpression);
    this.addLed(TokenType.Divide, BindingPower.multiplicative, parseBinaryExpression);
    this.addLed(TokenType.Modulo, BindingPower.multiplicative, parseBinaryExpression);

    //* Comparison
    this.addLed(TokenType.Equal, BindingPower.equality, parseBinaryExpression);
    this.addLed(TokenType.NotEqual, BindingPower.equality, parseBinaryExpression);
    this.addLed(TokenType.Smaller, BindingPower.relational, parseBinaryExpression);
    this.addLed(TokenType.Greater, BindingPower.relational, parseBinaryExpression);
    this.addLed(TokenType.SmallerEqual, BindingPower.relational, parseBinaryExpression);
    this.addLed(TokenType.GreaterEqual, BindingPower.relational, parseBinaryExpression);

    //* Primary
    this.addNud(TokenType.Boolean, BindingPower.primary, parsePrimaryExpression);
    this.addNud(TokenType.Number, BindingPower.primary, parsePrimaryExpression);
    this.addNud(TokenType.Identifier, BindingPower.primary, parsePrimaryExpression);

    //~ Grouping
    this.addNud(TokenType.OpenParen, BindingPower.grouping, parseGroupingExpression);

    //~ Assignment
    this.addLed(TokenType.Assignment, BindingPower.assignment, parseAssignmentExpression);

    //~ Statement

    //* Variable declaration
    this.addStmt(TokenType.Var, parseVariableDeclarationStatement);

    //* Block
    this.addStmt(TokenType.OpenCurly, parseBlockStatement);

    //* Control flow
    this.addStmt(TokenType.If, parseIfStatement);
    this.addStmt(TokenType.While, parseWhileStatement);

    //* Other
    this.addStmt(TokenType.Print, parsePrintStatement);
  }

  /** Add a Token/handler to the map */
  private addStmt(type: TokenType, parsingFunction: StmtParsingFunction) {
    //TODO check that there wasn't something there already
    this.statementLookup.set(
      type,
      parsingFunction,
    );
  }

  /** Add a Token/handler to the map */
  private addNud(type: TokenType, bp: BindingPower, parsingFunction: NudParsingFunction) {
    //TODO check that there wasn't something there already
    this.nudLookup.set(
      type,
      createNudHandler(bp, parsingFunction),
    );
  }

  /** Add a Token/handler to the map */
  private addLed(type: TokenType, bp: BindingPower, parsingFunction: LedParsingFunction) {
    //TODO check that there wasn't something there already
    this.ledLookup.set(
      type,
      createLedHandler(bp, parsingFunction),
    );
  }

  public getStmtHandler(type: TokenType) {
    return this.statementLookup.get(type);
  }

  public getNudHandler(type: TokenType) {
    return this.nudLookup.get(type);
  }

  public getLedHandler(type: TokenType) {
    return this.ledLookup.get(type);
  }
}

function createNudHandler(bp: BindingPower, parsingFunction: NudParsingFunction): NudHandler {
  const { [parsingFunction.name]: handler } = {
    [parsingFunction.name]: ((parser: Parser) => parsingFunction(parser, bp)) as NudHandler,
  };
  handler.bp = bp;
  return handler;
}

function createLedHandler(bp: BindingPower, parsingFunction: LedParsingFunction): LedHandler {
  const { [parsingFunction.name]: handler } = {
    [parsingFunction.name]: ((parser: Parser, left: AST.Expression) => parsingFunction(parser, left, bp)) as LedHandler,
  };
  handler.bp = bp;
  return handler;
}
