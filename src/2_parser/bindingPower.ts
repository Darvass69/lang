// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Operator_precedence#table

/** Binding power decides the order of operations. More binding power means higher precedence */
export enum BindingPower {
  default_bp,
  comma,
  assignment, // and function declaration? for arrow functions?
  logical_or,
  logical_and,
  bitwise_or,
  bitwise_xor, // **
  bitwise_and,
  equality, // ==, !=
  relational, // <, >, >=, <=
  bitwise_shift, // <<, >>
  additive, // +, -
  multiplicative, // /, *, %
  exponentiation, // ^
  prefix, // --, ++, ;, ~, +, -,
  postfix, // --, ++
  //! I'm not sure this does anything. its when doing new without arguments (ex 'new x' instead of 'new x(...)'). Either remove it completely or remove new from the next BP
  new,
  access_call_new, // x.y, x[y], new x(y), x(y), import
  grouping,
  primary,
}
