# Lang

This is a language compiled to WASM.

## Goals
- Good high to mid level application language, focused on web dev at first but eventually flexible enough to do most tasks.
- A really good (and complex) type system that allows us to express complex relationships and state of our data.
	-	Example: We have a piece of data and a mutex to protect it. The type system would be able to enforce that when we don't have the lock, we can't access the data, and that once we have the lock, the type of the data is now inferred to be accessible.
	- Example 2: We have a form for a credit card number. When we get the string, we can check its format and refine its type to something like `####-####-####-####`. We then don't need to check the string for empty or if its the right format, because the format is baked into the type system.
- The base of the language should be simple, like C or Go, with a more complex type system on top. This will allow us to leverage the type system without needing to make complex types for everything. We want to avoid the problem with Rust being a bit to strict on memory making it hard to prototype stuff. It should be very easy to prototype code and to incrementally improve its typing. Good type inference for complex types should be enough to make this work, and tracking memory and different memory patterns, like arenas, should also help.
- Control over mutations and side effects (using the type system). Pure functions are known by the type system and can be optimized.
- Good error handling (like go or rust, error as a value) and easy syntax to handle them (not like go).

## Secondary Goals
- Good meta-programming (Should be enough to allow us to have compile time signals (like solid js, but not at runtime) and other complex code transformation). Also the meta programming should be typed checked, and we should have commands for the language server to make it easier to know how code is transformed at compile time.
- Good data transformation, especially JSON. We want to be able to manipulate JSON very easily.
- Good concurrency/async support. We can leverage the type system to protect against race conditions, deadlocks and other problems in threads.
- Good testing, and leveraging language features when testing to make tests easier.
- good ffi with both javascript (easy because of WASM) and other languages (C like API), whether it's in the browser environment or standalone.

## Design
1. lexer: transforms the source code into tokens to make it easier in the parser.
2. parser: creates an Abstract Syntax Tree from the tokens. We use a Pratt style parser because its the easiest way to do parsing by far, and it also makes really good parsing errors.
3. compiler: 
	1. HIR (High-level Intermediate Representation): Like the AST, but typed. We also transform complex syntax from the AST into a simpler form (desugaring). It also contains our type checking.
	2. MIR (Mid-level Intermediate Representation): Three-Address Code/Control Flow Graph. Its easier to create assembly from this form. This might be changed for a more standard Static Single-Assignment (SSA) form that is very good for optimisations.
	3. LIR (Low-level Intermediate Representation): This is very similar to Web Assembly Text format (WAT), but we don't have a text representation. The goal is to simplify generation from the MIR.
	4. WASM (Web Assembly): This is the compilation target.

## TODO
- how do we handle errors? We want to pretty print errors + language server eventually.
- where and when should we do our type checking? With the AST? The HIR?