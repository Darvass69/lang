import { Binop, printBinop } from "../1_HIR/HIR.Types";

//TODO SSA form ?

export type Variable = { type: "variable"; name: string };
export type Value = { type: "value"; value: number };

export type Operand = Variable | Value;

export type Instruction =
  | { type: "assign"; dst: Variable; value: Operand }
  | { type: "binop"; dst: Variable; operator: Binop; left: Operand; right: Operand; operandType: "i32" | "i64" | "f32" | "f64" }
  | { type: "print"; value: Operand };

export type Terminator =
  | { type: "goto"; target: Block }
  | { type: "ifgoto"; test: Operand; consequent: Block; alternate: Block; join: Block } // The join block is only there to make things easier when generating WASM, it can be ignored if you need a proper CFG.
  | { type: "loop"; test: Operand; body: Block; end: Block };
//? break?
// | { type: "return"; value?: Operand /*??? function: Function; ?? so we can know where to go next?*/ */ };

export type Block = {
  name: string;
  instructions: Instruction[];
  terminator?: Terminator;
};

export type MIR = {
  entry: Block;
  blocks: Block[]; // Blocks are there for JSON printing.
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

export function prettyPrintMIR(mir: MIR): string {
  const lines: string[] = [];
  const visited = new Set<Block>();

  function printBlock(block: Block) {
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
          printBlock(block.terminator.target);
          break;
        case "ifgoto":
          lines.push(
            `  if ${printOperand(block.terminator.test)} goto ${printLabel(block.terminator.consequent.name)} else ${printLabel(block.terminator.alternate.name)}`,
          );
          printBlock(block.terminator.consequent);
          printBlock(block.terminator.alternate);
          break;
      }
    }
  }

  printBlock(mir.entry);

  return lines.join("\n");
}
