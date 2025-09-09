# Type system
This is a collection of ideas I am considering using for the type system, mostly copied from Wikipedia.

## Dependent type
> This is really good and cool.
> Being able to define a type relative to another type or value can allow to express very interesting relationships between data.


1. dependent functions
The return type of a dependent function may depend on the value (not just type) of one of its arguments. For instance, a function that takes a positive integer `n` may return an array of length `n`, where the array length is part of the type of the array. (Note that this is different from polymorphism and generic programming, both of which include the type as an argument.) 

2. dependent pairs
A dependent pair may have a second value, the type of which depends on the first value. Sticking with the array example, a dependent pair may be used to pair an array with its length in a type-safe way. 

Dependent types add complexity to a type system. Deciding the equality of dependent types in a program may require computations. If arbitrary values are allowed in dependent types, then deciding type equality may involve deciding whether two arbitrary programs produce the same result; hence the decidability of type checking may depend on the given type theory's semantics of equality, that is, whether the type theory is intensional or extensional.[1]


## Refinement type
Refinement types can express preconditions when used as function arguments or postconditions when used as return types: for instance, the type of a function which accepts natural numbers and returns natural numbers greater than 5 may be written as `f: N -> {n E N | n > 5}`


## Typestate analysis
Typestates define valid sequences of operations that can be performed upon an instance of a given type. Typestates, as the name suggests, associate state information with variables of that type. This state information is used to determine at compile-time which operations are valid to be invoked upon an instance of the type. Operations performed on an object that would usually only be executed at run-time are performed upon the type state information which is modified to be compatible with the new state of the object. 

Typestates are capable of representing behavioral type refinements such as "method A must be invoked before method B is invoked, and method C may not be invoked in between".

The name "typestate" stems from the fact that this kind of analysis often models each type of object as a finite-state machine. In this state machine, each state has a well-defined set of permitted methods/messages, and method invocations may cause state transitions.

## Row polymorphism
> I don't think this is that good. It feels more like database stuff, but we might be able to take inspiration from it.

The row-polymorphic record type defines a list of fields with their corresponding types, a list of missing fields, and a variable indicating the absence or presence of arbitrary additional fields. Both lists are optional, and the variable may be constrained. Specifically, the variable may be "empty", indicating that no additional fields may be present for the record. 


Thanks to row polymorphism, the function may perform two-dimensional transformation on a three-dimensional (in fact, n-dimensional) point, leaving the z coordinate (or any other coordinates) intact. In a more general sense, the function can perform on any record that contains the fields `x` and `y` with type `Number`. There is no loss of information: the type ensures that all the fields represented by the variable `ρ` are present in the return type. In contrast, the type definition `{ x : Number , y : Number , empty }` expresses the fact that a record of that type has exactly the `x` and `y` fields and nothing else. In this case, a classic record type is obtained.

## Logic programming 
> I don't think its that useful, very hard to do things with it, and it's a completely different paradigm.
> Might be useful to declare types.
> Is very powerful, so if we can leverage it, we could do a lot I think.
> Its very nice because its declarative, but it might be annoying to use.

- ex Datalog
Declarative logic statements

`A :- B1, ..., Bn.`
`A if B1 and ... and Bn.`

```
mother_child(elizabeth, charles).
father_child(charles, william).
father_child(charles, harry).
parent_child(X, Y) :- 
     mother_child(X, Y).
parent_child(X, Y) :- 
     father_child(X, Y).
grandparent_child(X, Y) :- 
     parent_child(X, Z), 
     parent_child(Z, Y).

?- parent_child(X, william)
X = charles
```

```
grandparent_child(X, william).
X = elizabeth

?- grandparent_child(elizabeth, Y).
Y = william;
Y = harry.

?- grandparent_child(X, Y).
X = elizabeth
Y = william;
X = elizabeth
Y = harry.

?- grandparent_child(william, harry).
no
?- grandparent_child(elizabeth, harry).
yes
```
