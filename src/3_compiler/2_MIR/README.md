# MIR

Mid Intermediate Representation.
Lower than HIR, we don't keep any high-level constructs. Loops and ifs are transformed into jumps, basic blocks.

The form is like a Three-Address Code (TAC) & Control Flow Graph (CFG). The standard in compilers is SSA (Static Single Assignment), but I don't want to get into that yet.

To make control flow work without having to reloop or calculate the dominators and post dominators, we will just add that info directly when creating it.
