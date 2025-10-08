import { TokenType } from "../../1_lexer/token";
import { AST } from "../astNodes";
import { BindingPower } from "../bindingPower";
import { Parser } from "../parser";
import { LedHandler } from "./lookup";

export function parseExpression(p: Parser, bp: BindingPower) {
  const nudHandler = p.lookup.getNudHandler(p.peek().type);

  if (nudHandler === undefined) {
    //TODO error
    throw "Parser: expected NUD";
  }

  let left = nudHandler(p);

  let ledHandler: LedHandler | undefined;
  while ((ledHandler = p.lookup.getLedHandler(p.peek().type)) && ledHandler.bp > bp) {
    left = ledHandler(p, left);
  }

  return left;
}

export function parseBinaryExpression(p: Parser, left: AST.Expression, bp: BindingPower) {
  const token = p.eat();
  const right = parseExpression(p, bp);

  return AST.createNode(AST.Type.BinaryExpression, { left, operator: token, right });
}

export function parsePrimaryExpression(p: Parser, bp: BindingPower) {
  const token = p.eat();

  switch (token.type) {
    case TokenType.Number: {
      return AST.createNode(AST.Type.NumberExpression, { value: token.value });
    }
    case TokenType.Identifier: {
      return AST.createNode(AST.Type.IdentifierExpression, { name: token.value });
    }
    case TokenType.Boolean: {
      return AST.createNode(AST.Type.BooleanExpression, { value: token.value });
    }
    default: {
      //TODO error message
      throw "Parser: primary not found";
    }
  }
}

export function parseGroupingExpression(p: Parser, bp: BindingPower) {
  p.expect(TokenType.OpenParen);
  const expression = parseExpression(p, BindingPower.default_bp);
  p.expect(TokenType.CloseParen);

  return expression;
}

export function parseAssignmentExpression(p: Parser, left: AST.Expression, bp: BindingPower) {
  const identifier = left.type === AST.Type.IdentifierExpression ? left : undefined;

  if (identifier === undefined) {
    throw `Parser: expected identifier, got ${left.type}`;
  }

  p.eat();

  const expression = parseExpression(p, bp);

  return AST.createNode(AST.Type.AssignmentExpression, { identifier, expression });
}

export function parseFunctionCallExpression(p: Parser, left: AST.Expression, bp: BindingPower) {
  const identifier = left.type === AST.Type.IdentifierExpression ? left : undefined;

  if (identifier === undefined) {
    throw `Parser: expected identifier, got ${left.type}`;
  }

  const args = parseArguments(p);

  return AST.createNode(AST.Type.FunctionCallExpression, { callee: identifier, args });
}

function parseArguments(p: Parser) {
  const args: AST.Expression[] = [];

  p.expect(TokenType.OpenParen);

  if (p.peek().type === TokenType.CloseParen) {
    p.expect(TokenType.CloseParen);
    return args;
  }

  args.push(parseExpression(p, BindingPower.default_bp));
  while (p.peek().type !== TokenType.CloseParen) {
    p.expect(TokenType.Comma);
    args.push(parseExpression(p, BindingPower.default_bp));
  }

  p.expect(TokenType.CloseParen);

  return args;
}
