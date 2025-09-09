import { Token, TokenType } from "../1_lexer/token";
import ParsingFunctionLookup from "./parsingFunctions/lookup";
import { parseProgram } from "./parsingFunctions/statement";

export function parseAST(tokens: Token[]) {
  return parseProgram(new Parser(tokens));
}

export class Parser {
  private tokens: Token[] = [];
  private position: number = 0;
  public lookup: ParsingFunctionLookup = new ParsingFunctionLookup();

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  public hasTokens() {
    return this.position < this.tokens.length;
  }

  public peek() {
    return this.tokens[this.position];
  }

  public eat(): Token {
    const token = this.peek();
    this.position++;
    return token;
  }

  public expect<T extends TokenType>(expected: T, error?: (expected: TokenType, received: Token) => string): Token & { type: T } {
    const token = this.peek();

    if (token.type !== expected) {
      //TODO error
      let message: string;
      if (error !== undefined) {
        message = error(expected, token);
      } else {
        message = `Parser: Expected ${TokenType[expected]} but received ${TokenType[token.type]} instead.`;
      }
      throw message;
    }

    return this.eat() as any;
  }
}
