import { Binop, printBinop } from "../1_HIR/HIR.Types";

//TODO SSA form ?

//TODO we'll need a way to deal with globals at some point.
export type Variable = { type: "variable"; name: string };
export type Value = { type: "value"; value: number };

export type Operand = Variable | Value;

export type Instruction =
  | { type: "assign"; dst: Variable; value: Operand }
  | { type: "binop"; dst: Variable; operator: Binop; left: Operand; right: Operand; operandType: "i32" | "i64" | "f32" | "f64" }
  | { type: "push_param"; operand: Operand }
  | { type: "call"; dst?: Variable; callee: string; nbArgs: number }
  | { type: "print"; value: Operand };

export type Terminator =
  | { type: "goto"; target: Block }
  // The join block is only there to make things easier when generating WASM, it can be ignored if you need a proper CFG. It would usually be computed from the CFG itself.
  | { type: "ifgoto"; test: Operand; consequent: Block; alternate: Block; join: Block }
  | { type: "loop"; test: Operand; body: Block; end: Block }
  //? break?
  | { type: "return"; value?: Operand };

export type Block = {
  name: string;
  instructions: Instruction[];
  terminator?: Terminator;
};

//TODO this might just be replaced by Variable if we had types to Variable.
export type Param = {
  //TODO the reason we have the name is so we can do add local (or add param? would need to check how WASM works with params) and be able to reference them.
  name: string;
  type: "i32" | "i64" | "f32" | "f64";
};

export type Function = {
  name: string;
  params: Param[];
  returnType: "i32" | "i64" | "f32" | "f64" | "void";

  entry: Block;
  blocks: Block[]; // Blocks are there for JSON printing.
};

export type Module = {
  start: Function & { name: "start" };
  functions: Function[];
};

export function mirToStringJson(key: any, value: any) {
  if (key === "operator") {
    return Binop[value];
  }

  if (key === "entry") {
    return undefined;
  }

  if (key === "target") {
    return value.name;
  } else if (key === "consequent") {
    return value.name;
  } else if (key === "alternate") {
    return value.name;
  }

  return value;
}

function printOperand(operand: Operand) {
  return operand.type === "variable" ? operand.name : operand.value;
}

function printLabel(label: string) {
  return `$${label}`;
}

export function prettyPrintMIR(mir: Module): string {
  const linesMain: string[] = [];

  for (const fn of mir.functions) {
    linesMain.push(`function ${fn.name === "" ? "$start$" : fn.name}(${printParams(fn.params)}) returns (${fn.returnType}) {`);
    const linesFn = printFunction(fn).map((line) => "  " + line);
    linesMain.push(...linesFn);
    linesMain.push("}");
  }

  return linesMain.join("\n");
}

function printParams(params: Param[]) {
  return params.map((param) => `${param.name}: ${param.type}`).join(", ");
}

function printFunction(fn: Function) {
  const visited = new Set<Block>();
  const lines: string[] = [];

  printBlock(fn.entry, visited, lines);
  return lines;
}

function printBlock(block: Block, visited: Set<Block>, lines: string[]) {
  if (visited.has(block)) return;
  visited.add(block);

  // Block header
  lines.push(printLabel(block.name) + ":");

  // Instructions
  for (const instr of block.instructions) {
    switch (instr.type) {
      case "assign":
        lines.push(`  ${instr.dst.name} = ${printOperand(instr.value)}`);
        break;
      case "binop":
        lines.push(
          `  ${instr.dst.name} = ${printOperand(instr.left)} ${printBinop(instr.operator)} ${printOperand(instr.right)} (${instr.operandType})`,
        );
        break;
      case "push_param":
        lines.push(`  push_param ${printOperand(instr.operand)}`);
        break;
      case "call":
        lines.push(`  ${instr.dst && instr.dst.name + " = "}call ${instr.callee}(${instr.nbArgs})`);
        break;
      case "print":
        lines.push(`  print ${printOperand(instr.value)}`);
        break;
    }
  }

  // Terminator
  if (block.terminator) {
    switch (block.terminator.type) {
      case "goto":
        lines.push(`  goto ${printLabel(block.terminator.target.name)}`);
        printBlock(block.terminator.target, visited, lines);
        break;
      case "ifgoto":
        lines.push(
          `  if ${printOperand(block.terminator.test)} goto ${printLabel(block.terminator.consequent.name)} else ${printLabel(block.terminator.alternate.name)}`,
        );
        printBlock(block.terminator.consequent, visited, lines);
        printBlock(block.terminator.alternate, visited, lines);
        break;
      case "loop":
        lines.push(`  loop ${printOperand(block.terminator.test)} body ${printLabel(block.terminator.body.name)} end ${printLabel(block.terminator.end.name)}`);
        printBlock(block.terminator.body, visited, lines);
        printBlock(block.terminator.end, visited, lines);
        break;
      case "return":
        lines.push(`  return${block.terminator.value && " " + printOperand(block.terminator.value)}`);
        break;
    }
  }
}

export function moduleToGraphView(module: Module): string {
  return "";
}
