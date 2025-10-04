import { TokenType } from "../../1_lexer/token";
import { Parser } from "../parser";
import { AST } from "../astNodes";
import { BindingPower } from "../bindingPower";
import { parseExpression } from "./expression";

export function parseProgram(p: Parser) {
  const body: AST.Statement[] = [];

  while (p.hasTokens()) {
    body.push(parseStatement(p));
  }

  return AST.createNode(AST.Type.Module, { body });
}

function parseStatement(p: Parser) {
  const handler = p.lookup.getStmtHandler(p.peek().type);

  if (handler !== undefined) {
    return handler(p);
  }

  return parseExpressionStatement(p);
}

function parseExpressionStatement(p: Parser) {
  const expression = parseExpression(p, BindingPower.default_bp);
  p.expect(TokenType.EndOfStatement);

  return AST.createNode(AST.Type.ExpressionStatement, { expression });
}

export function parseVariableDeclarationStatement(p: Parser) {
  const declarator = p.eat();

  const identifier = AST.createNode(AST.Type.IdentifierExpression, { name: p.expect(TokenType.Identifier).value });

  let typeDef: AST.Node<AST.Type.IdentifierExpression> | undefined;
  if (p.peek().type === TokenType.Colon) {
    p.expect(TokenType.Colon);
    typeDef = AST.createNode(AST.Type.IdentifierExpression, { name: p.expect(TokenType.Identifier).value });
  }

  let init: AST.Expression | undefined;
  if (p.peek().type !== TokenType.EndOfStatement) {
    p.expect(TokenType.Assignment);
    init = parseExpression(p, BindingPower.assignment);
  }

  p.expect(TokenType.EndOfStatement);

  return AST.createNode(AST.Type.VariableDeclarationStatement, { identifiers: identifier, typeDef, init });
}

export function parseBlockStatement(p: Parser) {
  p.expect(TokenType.OpenCurly);
  const body: AST.Statement[] = [];

  while (p.peek().type !== TokenType.CloseCurly) {
    body.push(parseStatement(p));
  }

  p.expect(TokenType.CloseCurly);

  return AST.createNode(AST.Type.BlockStatement, { body });
}

export function parseIfStatement(p: Parser): AST.Node<AST.Type.IfStatement> {
  p.eat();
  p.expect(TokenType.OpenParen);
  const test = parseExpression(p, BindingPower.assignment);
  p.expect(TokenType.CloseParen);
  const consequent = parseBlockStatement(p);

  let alternate: AST.Node<AST.Type.IfStatement | AST.Type.BlockStatement> | undefined = undefined;
  if (p.peek()?.type === TokenType.Else) {
    p.eat();

    if (p.peek().type === TokenType.If) {
      alternate = parseIfStatement(p);
    } else {
      alternate = parseBlockStatement(p);
    }
  }

  return AST.createNode(AST.Type.IfStatement, { test, consequent, alternate });
}

export function parseWhileStatement(p: Parser) {
  p.eat();
  p.expect(TokenType.OpenParen);
  const test = parseExpression(p, BindingPower.default_bp);
  p.expect(TokenType.CloseParen);
  const body = parseBlockStatement(p);

  return AST.createNode(AST.Type.LoopStatement, { test, body });
}

export function parsePrintStatement(p: Parser) {
  p.expect(TokenType.Print);
  const expression = parseExpression(p, BindingPower.default_bp);
  p.expect(TokenType.EndOfStatement);

  return AST.createNode(AST.Type.PrintStatement, { expression });
}
