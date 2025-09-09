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

- [ ] Assignment expression

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


## Feature ideas

- Add a way to have highlighting for like SQL or something like that baked in the language itself using the constraints or meta programming.
- Memory arenas