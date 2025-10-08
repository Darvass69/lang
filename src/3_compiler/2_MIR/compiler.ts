import { TypedAST } from "../1_HIR/HIR.Types";
import { Block, Function, Instruction, Module, Operand, Param, Terminator, Variable } from "./MIR-Types";

export function generateMIR(node: TypedAST.Node<TypedAST.Type.Module>): Module {
  const functions: Function[] = [];
  const start = generateFunctionDeclarationStatement(
    TypedAST.createNode(TypedAST.Type.FunctionDeclarationStatement, {
      name: "start",
      params: [],
      body: TypedAST.createNode(TypedAST.Type.BlockStatement, { body: node.body }),
    }),
    functions,
  ) as Function & { name: "start" };

  return {
    start,
    functions: functions.reverse(),
  };
}

function generateFunctionDeclarationStatement(node: TypedAST.Node<TypedAST.Type.FunctionDeclarationStatement>, declaredFunctions: Function[]): Function {
  const [entry] = parseBody(node.body.body, { name: "entry", instructions: [] }, declaredFunctions);

  const fn: Function = {
    name: node.name,
    params: node.params.map((param) => ({ name: param.name, type: "i32" })),
    returnType: node.returnType && node.returnType.type !== "void" ? "i32" : "void",
    entry,
    blocks: getBlocks(entry),
  };

  declaredFunctions.push(fn);
  return fn;
}

function parseBody(body: TypedAST.Statement[], beginningBlock: Block, declaredFunctions: Function[]) {
  let endingBlock: Block = beginningBlock;

  for (const stmt of body) {
    if (stmt.type === TypedAST.Type.FunctionDeclarationStatement) {
      generateFunctionDeclarationStatement(stmt, declaredFunctions);
      continue;
    }
    endingBlock = generateStatement(stmt, endingBlock);
  }

  return [beginningBlock, endingBlock];
}

function getBlocks(block: Block) {
  const blocks: Block[] = [];
  const uniqueBlocks: Set<Block> = new Set<Block>();

  getBlocksRecursive(block);
  return blocks;

  function getBlocksRecursive(block: Block) {
    if (uniqueBlocks.has(block)) return;
    uniqueBlocks.add(block);
    blocks.push(block);

    switch (block.terminator?.type) {
      case "goto": {
        getBlocksRecursive(block.terminator.target);
        break;
      }
      case "ifgoto": {
        getBlocksRecursive(block.terminator.consequent);
        getBlocksRecursive(block.terminator.alternate);
        break;
      }
    }
  }
}

/* ------------------------------- Statements ------------------------------- */

/**
 * @param stmt
 * @returns The ending block of the statement
 */
function generateStatement(stmt: Exclude<TypedAST.Statement, TypedAST.Node<TypedAST.Type.FunctionDeclarationStatement>>, beginningBlock: Block): Block {
  /*
  We pass the beginning block to each handler so that they can add to it.
  They return the ending block so  we can change its terminator to the next block in the graph.
  */

  switch (stmt.type) {
    case TypedAST.Type.ExpressionStatement: {
      return generateExpressionStatement(stmt, beginningBlock);
    }
    case TypedAST.Type.VariableDeclarationStatement: {
      return generateVariableDeclarationStatement(stmt, beginningBlock);
    }
    case TypedAST.Type.BlockStatement: {
      return generateBlockStatement(stmt, beginningBlock);
    }
    case TypedAST.Type.IfStatement: {
      return generateIfStatement(stmt, beginningBlock);
    }
    case TypedAST.Type.LoopStatement: {
      return generateLoopStatement(stmt, beginningBlock);
    }
    case TypedAST.Type.ReturnStatement: {
      return generateReturnStatement(stmt, beginningBlock);
    }
    case TypedAST.Type.PrintStatement: {
      return generatePrintStatement(stmt, beginningBlock);
    }
    default: {
      throw `MIR: statement not supported: ${(stmt as TypedAST.Statement).type}`;
    }
  }
}

function generateExpressionStatement(node: TypedAST.Node<TypedAST.Type.ExpressionStatement>, beginningBlock: Block): Block {
  const [, ...instructions] = generateExpression(node.expression);
  beginningBlock.instructions.push(...instructions);
  return beginningBlock;
}

function generateVariableDeclarationStatement(node: TypedAST.Node<TypedAST.Type.VariableDeclarationStatement>, beginningBlock: Block): Block {
  if (node.init !== undefined) {
    const [, ...instructions] = generateExpression(node.init, { type: "variable", name: node.identifiers.name });
    beginningBlock.instructions.push(...instructions);
  }

  return beginningBlock;
}

function generateBlockStatement(node: TypedAST.Node<TypedAST.Type.BlockStatement>, beginningBlock: Block): Block {
  //TODO declared functions
  const [, endingBlock] = parseBody(node.body, beginningBlock, []);

  return endingBlock;
}

let ifId = 0;
function generateIfStatement(node: TypedAST.Node<TypedAST.Type.IfStatement>, beginningBlock: Block): Block {
  const id = ifId++;
  const ifLabel = `if_${id}`;
  const consequentLabel = `consequent_${id}`;
  const alternateLabel = `alternate_${id}`;
  const endifLabel = `end_if_${id}`;

  const [testVariable, ...testInstructions] = generateExpression(node.test);

  const endIfBlock: Block = { name: endifLabel, instructions: [] };

  const consequentBlock: Block = { name: consequentLabel, instructions: [] };
  const consequentBlockEnd: Block = generateBlockStatement(node.consequent, consequentBlock);
  consequentBlockEnd.terminator = { type: "goto", target: endIfBlock };

  let alternateBlock: Block;
  if (node.alternate) {
    alternateBlock = { name: alternateLabel, instructions: [] };
    let endAlternateBlock: Block = node.alternate.type === TypedAST.Type.IfStatement
      ? generateIfStatement(node.alternate, alternateBlock)
      : generateBlockStatement(node.alternate, alternateBlock);

    endAlternateBlock.terminator = { type: "goto", target: endIfBlock };
  } else {
    alternateBlock = endIfBlock;
  }

  beginningBlock.instructions.push(...testInstructions);
  beginningBlock.terminator = {
    type: "ifgoto",
    test: testVariable,
    consequent: consequentBlock,
    alternate: alternateBlock,
    join: endIfBlock,
  };

  return endIfBlock;
}

let loopId = 0;
function generateLoopStatement(node: TypedAST.Node<TypedAST.Type.LoopStatement>, beginningBlock: Block): Block {
  const id = loopId++;
  const beginLoopLabel = `begin_loop_${id}`;
  const loopBodyLabel = `loop_body_${id}`;
  const endLoopLabel = `end_loop_${id}`;

  const [testVariable, ...testInstructions] = generateExpression(node.test);

  const loopBeginningBlock: Block = { name: beginLoopLabel, instructions: [...testInstructions] };

  const endLoopBlock: Block = { name: endLoopLabel, instructions: [] };

  const loopBodyBlock: Block = { name: loopBodyLabel, instructions: [] };
  const loopBodyBlockEnd: Block = generateBlockStatement(node.body, loopBodyBlock);

  loopBeginningBlock.terminator = { type: "loop", test: testVariable, body: loopBodyBlock, end: endLoopBlock };
  loopBodyBlockEnd.terminator = { type: "goto", target: loopBeginningBlock };
  beginningBlock.terminator = { type: "goto", target: loopBeginningBlock };

  return endLoopBlock;
}

function generateReturnStatement(node: TypedAST.Node<TypedAST.Type.ReturnStatement>, beginningBlock: Block): Block {
  if (node.expression === undefined) {
    beginningBlock.terminator = { type: "return" };
  } else {
    const [returnValue, ...instructions] = generateExpression(node.expression);
    beginningBlock.instructions.push(...instructions);
    beginningBlock.terminator = { type: "return", value: returnValue };
  }
  return beginningBlock;
}

function generatePrintStatement(node: TypedAST.Node<TypedAST.Type.PrintStatement>, beginningBlock: Block): Block {
  const [value, ...instructions] = generateExpression(node.expression);
  instructions.push({ type: "print", value });

  beginningBlock.instructions.push(...instructions);
  return beginningBlock;
}

/* ------------------------------- Expressions ------------------------------ */

function generateExpression(expr: TypedAST.Expression, target?: Variable) {
  switch (expr.type) {
    case TypedAST.Type.AssignmentExpression: {
      return generateAssignmentExpression(expr, target);
    }
    case TypedAST.Type.BinaryExpression: {
      return generateBinaryExpression(expr, target);
    }
    case TypedAST.Type.FunctionCallExpression: {
      return generateFunctionCallExpression(expr, target);
    }
    case TypedAST.Type.BooleanExpression: {
      return generateBooleanExpression(expr, target);
    }
    case TypedAST.Type.NumberExpression: {
      return generateNumberExpression(expr, target);
    }
    case TypedAST.Type.IdentifierExpression: {
      return generateIdentifierExpression(expr, target);
    }
    default: {
      throw `MIR: expression not supported: ${(expr as TypedAST.Expression).type}`;
    }
  }
}

function generateAssignmentExpression(node: TypedAST.Node<TypedAST.Type.AssignmentExpression>, target?: Variable): [target: Operand, ...instructions: Instruction[]] {
  return generateExpression(node.expression, { type: "variable", name: node.identifier.name });
}

function generateBinaryExpression(node: TypedAST.Node<TypedAST.Type.BinaryExpression>, target?: Variable): [target: Operand, ...instructions: Instruction[]] {
  const [left, ...leftInstructions] = generateExpression(node.left);
  const [right, ...rightInstructions] = generateExpression(node.right);
  const operator = node.operator;

  if (target === undefined) {
    target = newTemp();
  }

  // TODO: resolve operand types to know what operation to use later (i32 vs i64).

  return [target, ...leftInstructions, ...rightInstructions, { type: "binop", dst: target, operator, left, right, operandType: "i32" }];
}

function generateFunctionCallExpression(node: TypedAST.Node<TypedAST.Type.FunctionCallExpression>, target?: Variable): [target: Operand, ...instructions: Instruction[]] {
  const [loadArgs, argsInstructions] = node.args.map((arg) => generateExpression(arg))
    .reduce<[Instruction[], Instruction[]]>(([targets, accumulatedInstructions], [target, ...instructions]) => {
      targets.push({ type: "push_param", operand: target });
      accumulatedInstructions.push(...instructions);
      return [targets, accumulatedInstructions];
    }, [[], []]);

  if (target === undefined) {
    target = newTemp();
  }

  let dst: Variable | undefined;
  if (node.resolvedType.type !== "void") {
    dst = target;
  }

  //TODO how do we handle multiple return values?
  return [target, ...argsInstructions, ...loadArgs, { type: "call", dst, callee: node.callee, nbArgs: loadArgs.length }];
}

function generateBooleanExpression(node: TypedAST.Node<TypedAST.Type.BooleanExpression>, target?: Variable): [target: Operand, ...instructions: Instruction[]] {
  const result: Operand = { type: "value", value: Number(node.value === "true") }; //TODO resolving boolean strings here is a little out of place.

  if (target) {
    return [target, { type: "assign", dst: target, value: result }];
  }

  return [result];
}

function generateNumberExpression(node: TypedAST.Node<TypedAST.Type.NumberExpression>, target?: Variable): [target: Operand, ...instructions: Instruction[]] {
  const result: Operand = { type: "value", value: Number.parseInt(node.value) };

  if (target) {
    return [target, { type: "assign", dst: target, value: result }];
  }

  return [result];
}

function generateIdentifierExpression(node: TypedAST.Node<TypedAST.Type.IdentifierExpression>, target?: Variable): [target: Operand, ...instructions: Instruction[]] {
  const result: Operand = { type: "variable", name: node.name };

  if (target) {
    return [target, { type: "assign", dst: target, value: result }];
  }

  return [result];
}

/* --------------------------------- Helpers -------------------------------- */

let tempCount = 0;
function newTemp(): Variable {
  return { type: "variable", name: `t${tempCount++}` };
}
