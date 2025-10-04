# HIR
High Intermediate Representation.
Basically a typed AST + desugaring and some high level optimisations. + semantic analysis
After desugaring, we should have a fairly simple representation that can be easily used for the MIR


## Phase 1
We don't have context, so we don't really need to do name resolution.
We only allow 1 variable of the same name, but we don't check.
We don't typecheck because everything is an int32.


## Phase 2
Do name resolution on the AST and modify the names so that we don't have to worry about names anymore.
Each variable should have an unique name. We do that by appending a number based on the context, so that 2 identical names in 2 different contexts are different. We use `#` to separate them so that we can never have collisions.

That way, we get rid of scope. We can then use a simple symbol table for all the variables.

Check the AST for types (make sure that all types are right)



