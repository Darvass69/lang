# WASM
This is the last step where we transform the LIR into a WASM binary. The LIR is already very close to WASM, but we still have to do some modifications.
Because WASM has a pretty strict structure, we have to do things like collecting all the type definitions to put them at the top.
