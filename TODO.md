# TODO

## Phase 1
- [x] Basic operators
- [x] variable declaration (no checks on the name, we assume each identifier is unique)
- [x] number (int32)
- [x] print

## Phase 2
- [x] Boolean
	- [x] Token
	- [x] AST
	- [x] Type checking
- [x] Comparison operators

- [x] Blocks/context for name resolution
	- [x] tokens
	- [x] AST
	- [x] HIR

- [x] Assignment expression

- [x] Control flow
	- If
	- Loop (for)
	- [x] tokens
	- [x] AST
	- [x] HIR
	- [x] MIR
		- [x] Turn MIR into a CFG form (control flow graph)
		- [x] ~~Do we do dominators here? Or when lowering to LIR? I think its better if we do it here.~~ No, we just mark loop headers and joining blocks when we create the MIR. That way, we don't need to compute it from the MIR, we just remember it from the HIR.
		- [ ] static single assignment?
	- [x] LIR
	- [x] WASM

## Phase 3
- [x] Comments
	- [x] tokens: ignore comments.
- [x] Add '_' to identifiers
- [x] Type definition on variables
	- [x] tokens
		- [x] add `:` token
	- [x] AST
		- [x] Add type definition to variable declaration statement
	- [x] HIR
	 - [x] Check type definition when declaring a variable, then infer. If no inference and no type declaration, error.
- [ ] functions
	+ Only at the top level of a file. If we find one inside a context (if, other function, etc) we may or may not make errors (its not worth trying to handle those edge cases because we will change that behavior later anyway).
	+ We might need to do hoisting like JS or declaration like in C. But that will be later.
	- [ ] tokens
		- [ ] Add `function` token
		- [ ] Add `return` token
	- [ ] AST
		- [ ] parse function declaration statement.
		- [ ] parse the parameters and their type definition
		- [ ] parse return statement
		- [ ] parse function call
	- [ ] HIR
		- [ ] should be pretty simple. Just handle the new AST nodes.
		- [ ] typ check the return statement
	- [ ] MIR
		- [ ] Quite complex. We need to separate the function definition from the rest of the statements in the file.
		- [ ] Then, we handle the statements of the file and the contents of the functions (we might need to handle some context here if we allow to use global variables in the functions)
	- [ ] LIR
		- [ ] find all the function declarations and create the functions.
		- [ ] ...
- [ ] simple import/export
	+ just add a simple way to import/export functions through WASM
	+ `import function add(x: int32, y: bool) {};`
	+ `export function add(x: int32, y: bool) {...};`
	- [ ] tokens
		- [ ] `import`, `export`
	- [ ] AST
		- [ ] Add import/export on function declaration statements (we don't need to add special case for import, we will just not check its body ever.)
	- [ ] HIR
		- [ ] I don't think we have much to do here other than maybe resolving the types
	- [ ] MIR
		- [ ] In the function definition, add a field for import or export.
	- [ ] LIR
		- [ ] Add a way to handle the import/export. Make sure the names are clean (the context might butcher the names)
	- [ ] WASM
		- [ ] Just handle the new stuff from the LIR

## Feature ideas

- Add a way to have highlighting for like SQL or something like that baked in the language itself using the constraints or meta programming.
- Memory arenas