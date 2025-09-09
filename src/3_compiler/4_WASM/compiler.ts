import { _export, _import, _start, _type, func, funcidx, functype, instr, labelidx, local, localidx, module, typeidx, valtype } from "../3_LIR/LIR-Types";
import {
  concatBuffer,
  encodeCode,
  encodeExport,
  encodeFunctionType,
  encodeImport,
  encodeSection,
  encodeSLEB128,
  encodeULEB128,
  encodeVect,
  ImportType,
  nullBlocktype,
  OpCodes,
  SectionId,
  ValueType,
} from "./WASM-Types";

export function generateBinary(LIR: module): Uint8Array {
  // \0asm
  const magicModuleHeader = [0x00, 0x61, 0x73, 0x6d];
  // WASM version
  const moduleVersion = [0x01, 0x00, 0x00, 0x00];

  // 1 find all the sections, group them by type
  const type: _type[] = [];
  const _import: _import[] = [];
  const func: func[] = [];
  const _export: _export[] = [];
  const _start: _start[] = [];

  LIR.body.forEach((section) => {
    switch (section.type) {
      case "type": {
        type.push(section);
        break;
      }
      case "import": {
        _import.push(section);
        break;
      }
      case "func": {
        func.push(section);
        break;
      }
      case "export": {
        _export.push(section);
        break;
      }
      case "start": {
        _start.push(section);
        break;
      }
    }
  });
  // 2 encode each section
  const typeSection = generateTypeSection(type);
  const importSection = generateImportSection(_import);
  const [funcSection, codeSection] = generateFunctionSection(func);
  const exportSection = generateExportSection(_export);
  const startSection = generateStartSection(_start);
  // 3 concat all the sections
  return Uint8Array.from([
    ...magicModuleHeader,
    ...moduleVersion,
    ...typeSection,
    ...importSection,
    ...funcSection,
    ...exportSection,
    ...startSection,
    ...codeSection,
  ]);
}

// Type Section
function generateTypeSection(types: _type[]): Uint8Array {
  const encodedTypes = types.map((type) => {
    saveType(type.id, type.functype);
    return encodeFunctionType(
      type.functype.params.map((p) => convertValtype(p.value)),
      type.functype.results.map(convertValtype),
    );
  });
  return encodeSection(SectionId.TYPE, encodeVect(encodedTypes));
}

// Import Section
function generateImportSection(imports: _import[]): Uint8Array {
  const encodedImports = imports.map((_import) => {
    saveFunction(_import.desc.id);
    return encodeImport(
      _import.module,
      _import.name,
      convertImportType(_import.desc.type),
      resolveTypeidx(_import.desc.typeuse),
    );
  });

  return encodeSection(SectionId.IMPORT, encodeVect(encodedImports));
}

// Function Section
//TODO this is going to need the funcidx from the import section
function generateFunctionSection(funcs: func[]): [funcSection: Uint8Array, codeSection: Uint8Array] {
  const encodedFunc: Uint8Array[] = [];
  const encodedCode: Uint8Array[] = [];

  funcs.map((func) => {
    saveFunction(func.id);

    const code = encodeCode(
      generateLocals(func.locals),
      generateCode(func.instr, []),
    );

    return [resolveTypeidx(func.typeuse), code];
  }).forEach(([func, code]) => {
    encodedFunc.push(func);
    encodedCode.push(code);
  });

  return [
    encodeSection(SectionId.FUNCTION, encodeVect(encodedFunc)),
    encodeSection(SectionId.CODE, encodeVect(encodedCode)),
  ];
}

function generateLocals(locals: local[]): [count: number, type: ValueType][] {
  //TODO count the number of each local types
  return locals.map((l) => {
    saveLocal(l.id);
    return [1, convertValtype(l.valtype)];
  });
}

function generateCode(instr: instr[], labelPath: string[]): Uint8Array {
  const code = instr.map((i) => {
    switch (i.type) {
      case "call": {
        return concatBuffer(Uint8Array.of(OpCodes.call), resolveFuncidx(i.funcidx));
      }
      case "br": {
        const br = concatBuffer(Uint8Array.of(OpCodes.br), resolveLabelidx(labelPath, i.labelidx));
        popLabel(labelPath);
        return br;
      }
      case "if": {
        saveLabel(labelPath, i.label);

        return concatBuffer(
          Uint8Array.of(OpCodes.if),
          Uint8Array.of(nullBlocktype),
          generateCode(i.instr1, labelPath),
          ...(i.instr2 === undefined ? [] : [Uint8Array.of(OpCodes.else), generateCode(i.instr2, labelPath)]),
          Uint8Array.of(OpCodes.end),
        );
      }
      case "loop": {
        saveLabel(labelPath, i.label);

        return concatBuffer(
          Uint8Array.of(OpCodes.loop),
          Uint8Array.of(nullBlocktype),
          generateCode(i.instr, labelPath),
          Uint8Array.of(OpCodes.end),
        );
      }
      case "local.get": {
        return concatBuffer(Uint8Array.of(OpCodes.local_get), resolveLocalidx(i.localidx));
      }
      case "local.set": {
        return concatBuffer(Uint8Array.of(OpCodes.local_set), resolveLocalidx(i.localidx));
      }
      case "i32.const": {
        return concatBuffer(Uint8Array.of(OpCodes.i32_const), encodeSLEB128(i.value)); //TODO detect signed vs unsigned?
      }
      case "i32.add": {
        return concatBuffer(Uint8Array.of(OpCodes.i32_add));
      }
      case "i32.sub": {
        return concatBuffer(Uint8Array.of(OpCodes.i32_sub));
      }
      case "i32.mul": {
        return concatBuffer(Uint8Array.of(OpCodes.i32_mul));
      }
      case "i32.div_s": {
        return concatBuffer(Uint8Array.of(OpCodes.i32_div_s));
      }
      case "i32.rem_s": {
        return concatBuffer(Uint8Array.of(OpCodes.i32_rem_s));
      }
      case "i32.and": {
        return concatBuffer(Uint8Array.of(OpCodes.i32_and));
      }
      case "i32.or": {
        return concatBuffer(Uint8Array.of(OpCodes.i32_or));
      }
      case "i32.xor": {
        return concatBuffer(Uint8Array.of(OpCodes.i32_xor));
      }
      case "i32.eq": {
        return concatBuffer(Uint8Array.of(OpCodes.i32_eq));
      }
      case "i32.ne": {
        return concatBuffer(Uint8Array.of(OpCodes.i32_ne));
      }
      case "i32.lt_s": {
        return concatBuffer(Uint8Array.of(OpCodes.i32_lt_s));
      }
      case "i32.gt_s": {
        return concatBuffer(Uint8Array.of(OpCodes.i32_gt_s));
      }
      case "i32.le_s": {
        return concatBuffer(Uint8Array.of(OpCodes.i32_le_s));
      }
      case "i32.ge_s": {
        return concatBuffer(Uint8Array.of(OpCodes.i32_ge_s));
      }
    }
  });

  return concatBuffer(...code);
}

// Export Section
function generateExportSection(exports: _export[]): Uint8Array {
  const encodedExports = exports.map(
    (_export) =>
      encodeExport(
        _export.name,
        convertImportType(_export.desc.type),
        resolveFuncidx(_export.desc.funcidx),
      ),
  );

  return encodeSection(SectionId.EXPORT, encodeVect(encodedExports));
}

// Start Section
function generateStartSection(starts: _start[]): Uint8Array {
  if (starts.length > 0) {
    return encodeSection(SectionId.START, resolveFuncidx(starts[0].funcidx));
  }

  return Uint8Array.of();
}

/* ------------------------------ Symbol tables ----------------------------- */

// Type
const typeidxTable: { names: string[]; type: functype }[] = [];

function saveType(name: string, type: functype) {
  //TODO use functype for deduplication

  typeidxTable.push(
    { names: [name], type },
  );
}

function resolveTypeidx(typeidx: typeidx) {
  if (typeof typeidx === "number") {
    return encodeULEB128(typeidx);
  }

  return encodeULEB128(
    typeidxTable.findIndex((t) => t.names.includes(typeidx)),
  );
}

// Function
const funcidxTable: { name: string }[] = [];

function saveFunction(name: string) {
  funcidxTable.push({ name });
}

function resolveFuncidx(funcidx: funcidx) {
  if (typeof funcidx === "number") {
    return encodeULEB128(funcidx);
  }

  return encodeULEB128(
    funcidxTable.findIndex((f) => f.name === funcidx),
  );
}

// Labels
function saveLabel(labelPath: string[], label: string) {
  labelPath.unshift(label);
}

function popLabel(labelPath: string[]) {
  labelPath.shift();
}

function resolveLabelidx(labelPath: string[], labelidx: labelidx) {
  if (typeof labelidx === "number") {
    return encodeULEB128(labelidx);
  }

  const idx = labelPath.findIndex((l) => l === labelidx);
  return encodeULEB128(
    idx,
  );
}

// Local
const localidxTable: { name: string }[] = [];

function saveLocal(name: string) {
  localidxTable.push({ name });
}

function resolveLocalidx(localidx: localidx) {
  if (typeof localidx === "number") {
    return encodeULEB128(localidx);
  }

  return encodeULEB128(
    localidxTable.findIndex((l) => l.name === localidx),
  );
}

/* --------------------------------- Helpers -------------------------------- */
function convertValtype(valtype: valtype): ValueType {
  switch (valtype) {
    case "i32": {
      return ValueType.i32;
    }
    case "i64": {
      return ValueType.i64;
    }
    case "f32": {
      return ValueType.f32;
    }
    case "f64": {
      return ValueType.f64;
    }
    case "v128": {
      return ValueType.v128;
    }
    case "funcref": {
      return ValueType.funcref;
    }
    case "externref": {
      return ValueType.externref;
    }
  }
}

function convertImportType(type: "func" | "table" | "memory" | "global"): ImportType {
  switch (type) {
    case "func": {
      return ImportType.func;
    }
    case "table": {
      return ImportType.table;
    }
    case "memory": {
      return ImportType.mem;
    }
    case "global": {
      return ImportType.global;
    }
  }
}
