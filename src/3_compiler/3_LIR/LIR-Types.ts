/* ------------------------------- Conventions ------------------------------ */

// Vectors
// type vec<A> = { type: "vec"; values: A[] };

/* --------------------------------- Values --------------------------------- */

// Integers
// type uN<N extends number> = { type: "uN"; length: N; value: number };
// type sN<N extends number> = { type: "sN"; length: N; value: number };
// type iN<N extends number> = uN<N>;

// Floating-Point
// type fN<N extends number> = { type: "fN"; length: N; value: number };

// Names
type name = string;

// Identifiers
type id = string;

/* ---------------------------------- Type ---------------------------------- */

// Number Types
type numtype = "i32" | "i64" | "f32" | "f64";

// Vector Types
type vectype = "v128";

// Reference Types
type reftype = "funcref" | "externref";

// Value Types
export type valtype = numtype | vectype | reftype;

// Function Types
export type functype = { params: param[]; results: result[] };
type param = { id: id; value: valtype };
type result = valtype;

// Limits
// type limits = { type: "limits"; min: number; max?: number };

// Memory Types
// type memtype = { type: "memtype"; lim: limits };

// Table Types
// type tabletype = { type: "tabletype"; lim: limits; reftype: reftype };

// Global Types
// type globaltype = { type: "globaltype"; mut: boolean; valType: valType };

/* ------------------------------ Instructions ------------------------------ */

export type instr = plaininstr | blockinstr;

// Labels
type label = string;

// Control Instructions
type blocktype = { type: "result"; value: result } | { type: "typeuse"; value: typeuse };
export type blockinstr =
  // | { type: "block"; label: label; blocktype?: blocktype; instr: instr[] }
  | { type: "loop"; label: label; blocktype?: blocktype; instr: instr[] }
  | { type: "if"; label: label; blocktype?: blocktype; instr1: instr[]; instr2?: instr[] };

type plaininstr =
  // Control Instructions
  // | { type: "unreachable" }
  // | { type: "nop" }
  | { type: "br"; labelidx: labelidx }
  // | { type: "br_if"; labelidx: labelidx }
  // | { type: "return" }
  | { type: "call"; funcidx: funcidx }
  // | { type: "call_indirect"; x: tableidx; y: typeuse }
  // Reference Instructions
  // | { type: "ref.null"; reftype: reftype }
  // | { type: "ref.is_null" }
  // | { type: "ref.func"; funcidx: funcidx }
  // Parametric Instructions
  // | { type: "drop" }
  // | { type: "select"; valtype?: result[] }
  // Variable Instructions
  | { type: "local.get"; localidx: localidx }
  | { type: "local.set"; localidx: localidx }
  // | { type: "local.tee"; localidx: localidx }
  // | { type: "global.get"; x: globalidx }
  // | { type: "global.set"; x: globalidx }
  // Table Instructions
  //TODO
  // Memory Instructions
  //TODO
  // | {type: "i32.load"; m:memarg }
  // Numeric Instructions
  | { type: "i32.const"; value: number }
  // | { type: "i64.const"; value: number }
  // | { type: "f32.const"; value: number }
  // | { type: "f64.const"; value: number }
  //
  // | { type: "i32.clz" }
  // | { type: "i32.ctz" }
  // | { type: "i32.popcnt" }
  | { type: "i32.add" }
  | { type: "i32.sub" }
  | { type: "i32.mul" }
  | { type: "i32.div_s" }
  // | { type: "i32.div_u" }
  | { type: "i32.rem_s" }
  // | { type: "i32.rem_u" }
  | { type: "i32.and" }
  | { type: "i32.or" }
  | { type: "i32.xor" }
  // | { type: "i32.shl" }
  // | { type: "i32.shr_s" }
  // | { type: "i32.shr_u" }
  // | { type: "i32.rotl" }
  // | { type: "i32.rotr" }
  //
  // | { type: "i64.clz" }
  // | { type: "i64.ctz" }
  // | { type: "i64.popcnt" }
  // | { type: "i64.add" }
  // | { type: "i64.sub" }
  // | { type: "i64.mul" }
  // | { type: "i64.div_s" }
  // | { type: "i64.div_u" }
  // | { type: "i64.rem_s" }
  // | { type: "i64.rem_u" }
  // | { type: "i64.and" }
  // | { type: "i64.or" }
  // | { type: "i64.xor" }
  // | { type: "i64.shl" }
  // | { type: "i64.shr_s" }
  // | { type: "i64.shr_u" }
  // | { type: "i64.rotl" }
  // | { type: "i64.rotr" }
  // TODO f32, f64
  // | { type: "i32.eqz" }
  | { type: "i32.eq" }
  | { type: "i32.ne" }
  | { type: "i32.lt_s" }
  // | { type: "i32.lt_u" }
  | { type: "i32.gt_s" }
  // | { type: "i32.gt_u" }
  | { type: "i32.le_s" }
  // | { type: "i32.le_u" }
  | { type: "i32.ge_s" }
  // | { type: "i32.ge_u" }
  //
  // | { type: "i64.eqz" }
  // | { type: "i64.eq" }
  // | { type: "i64.ne" }
  // | { type: "i64.lt_s" }
  // | { type: "i64.lt_u" }
  // | { type: "i64.gt_s" }
  // | { type: "i64.gt_u" }
  // | { type: "i64.le_s" }
  // | { type: "i64.le_u" }
  // | { type: "i64.ge_s" }
  // | { type: "i64.ge_u" }
  // TODO f32, f64
  // TODO wrap and stuff
  // Vector Instructions
  // TODO
  | never;

// Memory Instructions (part 2)
// type memarg = { type: "memarg"; o: offset, a: align}
// type offset = { type: "offset"; value: number }
// type align = { type: "align"; value: number }

// Expressions
// type expr = instr[];

/* --------------------------------- Modules -------------------------------- */

// Indices
export type typeidx = number | id;
export type funcidx = number | id;
// type tableidx = number | id;
// type memidx = number | id;
// type globalidx = number | id;
// type elemidx = number | id;
// type dataidx = number | id;
export type localidx = number | id;
export type labelidx = number | id;

// Types
export type _type = { type: "type"; id: id; functype: functype };
type typeuse = typeidx;

// Imports
export type _import = { type: "import"; module: name; name: name; desc: importdesc };
type importdesc =
  | { type: "func"; id: id; typeuse: typeuse }
  // | { type: "table"; id?: id; tt: tabletype }
  // | { type: "memory"; id?: id; mt: memtype }
  // | { type: "global"; id?: id; gt: globaltype }
  | never;

// Functions
export type func = { type: "func"; id: id; typeuse: typeuse; locals: local[]; instr: instr[] };
export type local = { id: id; valtype: valtype };

// Tables
// type table = { type: "table"; id?: id; tt: tabletype };

// Memories
// type mem = { type: "mem"; id?: id; mt: memtype };

// Globals
// type global = { type: "global"; id?: id; gt: globaltype; e: expr };

// Exports
export type _export = { type: "export"; name: name; desc: exportdesc };
type exportdesc =
  | { type: "func"; funcidx: funcidx }
  // | { type: "table"; x: tableidx }
  // | { type: "mem"; x: memidx }
  // | { type: "global"; x: globalidx }
  | never;

// Start Function
export type _start = { type: "start"; funcidx: funcidx };

// Element Segments
// type elem = { type: "elem"; id?: id };
// type elemelist = { type: "elemelist"; t: reftype; y: vec<elemexpr> };
// type elemexpr = { type: "item"; e: expr };
// type tableuse = { type: "table"; x: tableidx };

// Data Segments
// type data = { type: "data"; id?: id; b: datastring[] };
// type datastring = { type: "datastring"; s: string };
// type memuse = { type: "memory"; x: memidx };

// Modules
export type module = { file?: id; body: modulefield[] };
export type modulefield =
  | _type
  | _import
  | func
  // | table
  // | mem
  // | global
  | _export
  | _start
  // | elem
  // | data
  | never;
