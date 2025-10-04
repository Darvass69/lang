import { Binop } from "../1_HIR/HIR.Types";
import { Block, Instruction, MIR, Operand } from "../2_MIR/MIR-Types";
import { blockinstr, instr, local, module, modulefield } from "./LIR-Types";

// TODO handle names/indexes better. We want to be able to easily generate the LIR, so we should be able to use names and then resolve them to indexes later when we emit the WASM.

// TODO we are quite inefficient here. We have a lot of superfluous instructions. We create a lot of locals from the temp variables in the MIR that we can easily optimise.

const IDX_PRINT = 0;

export function generateLIR(MIR: MIR): module {
  const body: modulefield[] = [];

  body.push({
    type: "type",
    functype: { params: [{ id: "x", value: "i32" }], results: [] },
    id: "print",
  });

  body.push({
    type: "import",
    module: "env",
    name: "print",
    desc: { type: "func", typeuse: "print", id: "print" },
  });

  body.push({
    type: "start",
    funcidx: "start",
  });

  body.push({
    type: "type",
    functype: { params: [], results: [] },
    id: "start",
  });

  const locals: local[] = [];
  const instructions = generateMIR(MIR, locals);
  body.push({
    type: "func",
    id: "start",
    typeuse: "start",
    locals: locals,
    instr: instructions,
  });

  return { body };
}

function generateMIR(mir: MIR, locals: local[]) {
  return generateBlock(mir.entry, locals);
}

const visitedBlocks = new Set<Block>();
function generateBlock(block: Block, locals: local[], ifJoin?: Block, loopHeader?: Block): instr[] {
  const instructions = generateInstructions(block.instructions, locals);

  if (block.terminator) {
    if (block.terminator.type === "goto") {
      /*
        if target is ifJoin, no br instructions, stop here.
        if target is loopStart, br to loopStart, stop here.
        else br to target, continue generating.
      */

      if (block.terminator.target === ifJoin) {
        return instructions;
      } else if (block.terminator.target === loopHeader) {
        instructions.push({ type: "br", labelidx: block.terminator.target.name });
        return instructions;
      } else {
        // instructions.push({ type: "br", labelidx: block.terminator.target.name });
        return [
          ...instructions,
          ...generateBlock(block.terminator.target, locals, ifJoin, loopHeader),
        ];
      }
    } else if (block.terminator.type === "ifgoto") {
      const consequentInstructions = generateBlock(block.terminator.consequent, locals, block.terminator.join, loopHeader); //! Don't make a br for the join block.
      const alternateInstructions = block.terminator.alternate === block.terminator.join
        ? []
        : generateBlock(block.terminator.alternate, locals, block.terminator.join, loopHeader);

      // instructions contains the test for the if
      instructions.push(
        resolveOperand(block.terminator.test, locals),
        { type: "if", label: block.terminator.join.name, instr1: consequentInstructions, instr2: alternateInstructions.length === 0 ? undefined : alternateInstructions },
      );
      return [
        ...instructions,
        ...generateBlock(block.terminator.join, locals, ifJoin, loopHeader),
      ];
    } else {
      //TODO handle break and continue (right now, if we are in an if we are not stopping at the loop end block and that is a problem for break and continue)
      const body = generateBlock(block.terminator.body, locals, undefined, block); //! Make a br for the end block

      // instructions: instructions for the test of the loop, they need to be included in the loop block
      instructions.push(resolveOperand(block.terminator.test, locals));
      instructions.push({ type: "if", label: block.terminator.body.name, instr1: body });

      return [
        { type: "loop", label: block.name, instr: instructions },
        ...generateBlock(block.terminator.end, locals, ifJoin, loopHeader),
      ];
    }
  } else {
    return generateInstructions(block.instructions, locals);
  }
}

function generateInstructions(instructions: Instruction[], locals: local[]): instr[] {
  const result: instr[] = [];

  instructions.forEach(
    (instruction) => {
      switch (instruction.type) {
        case "assign":
          result.push(...generateAssignInstruction(instruction, locals));
          break;
        case "binop":
          result.push(...generateBinopInstruction(instruction, locals));
          break;
        case "print":
          result.push(...generatePrintInstruction(instruction, locals));
          break;
        default:
          throw `LIR: instruction not supported: ${(instruction as Instruction).type}`;
      }
    },
  );

  return result;
}

function generateAssignInstruction(instruction: Instruction & { type: "assign" }, locals: local[]): instr[] {
  const result: instr[] = [];

  result.push(resolveOperand(instruction.value, locals));

  const dstIdx = addLocal(instruction.dst.name, locals);

  result.push({
    type: "local.set",
    localidx: dstIdx,
  });

  return result;
}

function generateBinopInstruction(instruction: Instruction & { type: "binop" }, locals: local[]): instr[] {
  const result: instr[] = [];

  result.push(resolveOperand(instruction.left, locals));
  result.push(resolveOperand(instruction.right, locals));
  result.push({ type: resolveOperator(instruction.operator) });

  const dstIdx = addLocal(instruction.dst.name, locals);

  result.push({
    type: "local.set",
    localidx: dstIdx,
  });

  return result;
}

function generatePrintInstruction(instruction: Instruction & { type: "print" }, locals: local[]): instr[] {
  const result: instr[] = [];

  result.push(resolveOperand(instruction.value, locals));

  result.push({
    type: "call",
    funcidx: IDX_PRINT,
  });

  return result;
}

function resolveOperand(operand: Operand, locals: local[]): instr {
  if (operand.type === "variable") {
    return {
      type: "local.get",
      localidx: findIdxLocal(operand.name, locals),
    };
  } else {
    return {
      type: "i32.const",
      value: operand.value,
    };
  }
}

/* --------------------------------- Helpers -------------------------------- */

function addLocal(name: string, locals: local[]) {
  if (findIdxLocal(name, locals) !== -1) {
    return findIdxLocal(name, locals);
  }
  locals.push({ valtype: "i32", id: name });
  return locals.length - 1;
}

function findIdxLocal(name: string, locals: local[]) {
  for (let i = 0; i < locals.length; i++) {
    if (locals[i].id === name) {
      return i;
    }
  }
  return -1;
}

function resolveOperator(operator: Binop) {
  switch (operator) {
    case Binop.BitwiseOr: {
      return "i32.or";
    }
    case Binop.BitwiseXor: {
      return "i32.xor";
    }
    case Binop.BitwiseAnd: {
      return "i32.and";
    }

    case Binop.LogicalOr: {
      return "i32.or";
    }
    case Binop.LogicalAnd: {
      return "i32.and";
    }

    case Binop.Add: {
      return "i32.add";
    }
    case Binop.Sub: {
      return "i32.sub";
    }
    case Binop.Multiply: {
      return "i32.mul";
    }
    case Binop.Divide: {
      return "i32.div_s";
    }
    case Binop.Modulo: {
      return "i32.rem_s";
    }

    case Binop.Equal: {
      return "i32.eq";
    }
    case Binop.NotEqual: {
      return "i32.ne";
    }
    case Binop.Smaller: {
      return "i32.lt_s";
    }
    case Binop.Greater: {
      return "i32.gt_s";
    }
    case Binop.SmallerEqual: {
      return "i32.le_s";
    }
    case Binop.GreaterEqual: {
      return "i32.ge_s";
    }
  }
}
