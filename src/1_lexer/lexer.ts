import { DECIMAL_SEPARATOR, orderedSymbols, TODO_LOCATION, Token, tokenToString, TokenType } from "./token";

/* ----------------------------- Token handlers ----------------------------- */

type Handler = (source: SourceData, position: number) => Token | null;

const handlers: Handler[] = [
  numberHandler,
  identifierHandler,
  ...makeReservedSymbolsHandlers(),
];

function numberHandler(source: SourceData, position: number): Token | null {
  function getDigits() {
    let digits = "";

    let current: string;
    while ((current = source.get(position)) !== "") {
      if ("0" <= current && current <= "9") {
        digits += current;
      } else {
        break;
      }
      position++;
    }
    return digits;
  }

  const integerPart = getDigits();
  let value = integerPart;

  if (value.length === 0) {
    return null;
  }

  if (source.get(position) === DECIMAL_SEPARATOR) {
    position += DECIMAL_SEPARATOR.length;
    value += DECIMAL_SEPARATOR;

    const decimalPart = getDigits();
    value += decimalPart;
  }

  return { type: TokenType.Number, value, location: TODO_LOCATION };
}

function identifierHandler(source: SourceData, position: number): Token | null {
  let value = "";

  let isFirst = true;
  let current: string;
  while ((current = source.get(position)) !== "") {
    //TODO maybe allow 'é' and similar.
    if (
      "a" <= current && current <= "z" ||
      "A" <= current && current <= "Z" ||
      !isFirst && "0" <= current && current <= "9"
    ) {
      isFirst = false;
      value += current;
    } else {
      break;
    }
    position++;
  }

  if (value.length === 0) {
    return null;
  }

  return { type: TokenType.Identifier, value, location: TODO_LOCATION };
}

function makeReservedSymbolsHandlers(): Handler[] {
  //TODO this can be done better
  return orderedSymbols.map(([symbol, type]) => (source: SourceData, position: number) => {
    let value: string | null = "";
    let offset = 0;

    let current: string;
    while ((current = source.get(position + offset)) !== "") {
      if (current !== symbol[offset]) {
        value = null;
        break;
      }

      offset++;
      if (offset >= symbol.length) {
        value = symbol;
        break;
      }
    }

    if (value === null) {
      return null;
    }

    return { type, value, location: TODO_LOCATION };
  });
}

/* ---------------------------- Token generation ---------------------------- */

export function tokenize(rawSource: string): Token[] {
  const source = new SourceData(rawSource);
  let position = 0;

  const tokens: Token[] = [];

  while (!source.atEOF(position)) {
    if ([" ", "\t", "\n", "\r"].includes(source.get(position))) {
      position++;
      continue;
    }
    // get tokens
    const tokenCandidates = handlers.map((h) => h(source, position)).filter((t) => t !== null);

    if (tokenCandidates.length === 0) {
      throw new Error(`lexer error: unrecognized token (code: ${source.get(position).charCodeAt(0)}) near '${source.remainder(position)}'`);
    }

    // handle collisions
    const token = tokenCandidates.reduce((prev, current) => selectToken(prev, current));
    console.log(`Added token ${tokenToString(token)}`);
    tokens.push(token);
    position += token.value.length;
  }

  return tokens;
}

function selectToken(prev: Token, current: Token) {
  // We prioritize the longer token
  if (current.value.length > prev.value.length) {
    return current;
  } else if (current.value.length < prev.value.length) {
    return prev;
  } else {
    // We prioritize more specific tokens, like keywords, over identifiers
    if (current.type === TokenType.Identifier) {
      return prev;
    } else if (prev.type === TokenType.Identifier) {
      return current;
    } else {
      throw new Error(`lexer error: We found 2 tokens that are the same length and we couldn't choose one. Token 1: ${tokenToString(prev)}, Token 2: ${tokenToString(current)}`);
    }
  }
}

class SourceData {
  private source: string;

  constructor(source: string) {
    this.source = source;
  }

  public get(position: number) {
    if (this.atEOF(position)) {
      return "";
    }
    return this.source[position];
  }

  public remainder(position: number) {
    return this.source.slice(position);
  }

  public atEOF(position: number) {
    return position >= this.source.length;
  }
}
