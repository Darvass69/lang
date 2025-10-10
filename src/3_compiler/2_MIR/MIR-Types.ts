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
    linesMain.push(`function ${fn.name}(${printParams(fn.params)}) returns (${fn.returnType}) {`);
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

  printInstructions(block, lines);

  printTerminator(block, visited, lines);
}

function printInstructions(block: Block, lines: string[], trackFunctionCalls?: string[]) {
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
        lines.push(`  ${(instr.dst && instr.dst.name + " = ") ?? ""}call ${instr.callee}(${instr.nbArgs})`);
        if (trackFunctionCalls) trackFunctionCalls.push(instr.callee);
        break;
      case "print":
        lines.push(`  print ${printOperand(instr.value)}`);
        break;
    }
  }
}
function printTerminator(block: Block, visited: Set<Block>, lines: string[]) {
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
        lines.push(`  return${block.terminator.value ? " " + printOperand(block.terminator.value) : ""}`);
        break;
    }
  }
}

export function moduleToGraphView(module: Module): string {
  var result = `digraph MIR {\n` +
    `  graph [compound = true; fontsize = 12; splines = true;];\n` +
    `  node [shape = box; fontname = "Courier New"; fontsize = 10;];\n` +
    `  edge [fontname = "Courier New"; fontsize = 10;];\n`;

  const trackFunctionCalls: [calling: string, called: string][] = [];
  module.functions.forEach((fn) => result += graphFunction(fn, trackFunctionCalls));
  [...new Map(trackFunctionCalls.map((pair) => [pair.join("|"), pair])).values()]
    .forEach(([calling, called]) => result += `  "${calling}" -> "${called}::entry" [style=dashed label="call"];\n`);

  result += "}";
  return result;
}

function graphFunction(fn: Function, trackFunctionCalls: [calling: string, called: string][]): string {
  let result = `  subgraph "cluster_${fn.name}" {\n` +
    `    label = "${fn.name}";\n` +
    `    color = "#cfe2ff";\n` +
    `    style = "rounded,filled";\n`;

  const visited = new Set<Block>();
  const newTrackFunctionCalls: [blockName: string, callee: string][] = [];
  result += graphBlock(fn.entry, fn.name, visited, newTrackFunctionCalls);

  newTrackFunctionCalls.forEach(([blockName, callee]) => trackFunctionCalls.push([fn.name + "::" + blockName, callee]));

  result += `    "${fn.name}#end" [label="end", shape=oval];\n`;

  result += "  }\n";
  return result;
}

function graphBlock(block: Block, fnName: string, visited: Set<Block>, trackFunctionCalls: [blockName: string, callee: string][]): string {
  if (visited.has(block)) return "";
  visited.add(block);

  const newTrackFunctionCalls: string[] = [];
  let result = `    "${fnName}::${block.name}" [label = "${graphInstructions(block, newTrackFunctionCalls)}"];\n`;
  newTrackFunctionCalls.forEach((callee) => trackFunctionCalls.push([block.name, callee]));

  result += graphTerminator(block, fnName, visited, trackFunctionCalls);

  return result;
}

function graphInstructions(block: Block, trackFunctionCalls: string[]): string {
  let lines: string[] = [];

  printInstructions(block, lines, trackFunctionCalls);
  lines = lines.map((line) => line.replace(/^  /, ""));

  return lines.join("\\n");
}

function graphTerminator(block: Block, fnName: string, visited: Set<Block>, trackFunctionCalls: [blockName: string, callee: string][]): string {
  let result = "";

  if (block.terminator) {
    switch (block.terminator.type) {
      case "goto":
        result += `    "${fnName}::${block.name}" -> "${fnName}::${block.terminator.target.name}";\n`;
        result += graphBlock(block.terminator.target, fnName, visited, trackFunctionCalls);
        break;
      case "ifgoto":
        result += `    "${fnName}::${block.name}" -> "${fnName}::${block.terminator.consequent.name}" [label = "if ${printOperand(block.terminator.test)}"];\n`;
        result += graphBlock(block.terminator.consequent, fnName, visited, trackFunctionCalls);
        result += `    "${fnName}::${block.name}" -> "${fnName}::${block.terminator.alternate.name}" [label = "else"];\n`;
        result += graphBlock(block.terminator.alternate, fnName, visited, trackFunctionCalls);
        break;
      case "loop":
        result += `    "${fnName}::${block.name}" -> "${fnName}::${block.terminator.body.name}" [label = "loop ${printOperand(block.terminator.test)}"];\n`;
        result += graphBlock(block.terminator.body, fnName, visited, trackFunctionCalls);
        result += `    "${fnName}::${block.name}" -> "${fnName}::${block.terminator.end.name}" [label = "end"];\n`;
        result += graphBlock(block.terminator.end, fnName, visited, trackFunctionCalls);
        break;
      case "return":
        result += `    "${fnName}::${block.name}" -> "${fnName}#end" [label = "return${block.terminator.value ? " " + printOperand(block.terminator.value) : ""}"];\n`;
        break;
    }
  } else {
    result += `    "${fnName}::${block.name}" -> "${fnName}#end";\n`;
  }

  return result;
}
