# MIR

Mid Intermediate Representation.

Three-Address Code (TAC) & Control Flow Graph (CFG)
Lower than HIR, we don't keep any high-level constructs. Loops and ifs are transformed into jumps, basic blocks.

To make control flow work without having to reloop or calculate the dominators and post dominators, we will just add that info directly when creating it.

We will do optimisations here.