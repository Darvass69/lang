# WebAssembly WAT Feature Cookbook (Core + Common Post‑MVP)

This cookbook shows *small, runnable* WebAssembly Text Format (WAT) snippets that demonstrate the core features of WebAssembly **MVP** plus a handful of widely-supported post‑MVP features (multi-value, reference types, and bulk memory). Each example is self-contained or clearly notes its dependencies.

> How to try them: With [WABT](https://github.com/WebAssembly/wabt) installed, save a snippet as `example.wat`, then run:
>
> ```bash
> wat2wasm example.wat -o example.wasm
> wasm-interp example.wasm --invoke <exported-func> [args...]
> ```
>
> (Or load in your favorite runtime.)

---

## 0) Minimal module + exporting a function

```wat
(module
  ;; (func (export "add") (param i32 i32) (result i32)
  ;;   local.get 0
  ;;   local.get 1
  ;;   i32.add)
  (func (export "add") (param i32 i32) (result i32)
    local.get 0
    local.get 1
    i32.add))
```

---

## 1) Types, imports, exports

```wat
(module
  (type $binop (func (param i32 i32) (result i32)))
  (import "env" "imp_add" (func $imp_add (type $binop)))
  (func $twice (type $binop)
    local.get 0
    local.get 1
    call $imp_add
    local.get 0
    local.get 1
    call $imp_add
    i32.add) ;; add the two results
  (export "twice" (func $twice)))
```

---

## 2) Start function (runs on instantiation)

```wat
(module
  (global $g (mut i32) (i32.const 0))
  (func $init
    i32.const 42
    global.set $g)
  (start $init)
  (func (export "get") (result i32) global.get $g))
```

---

## 3) Locals, `local.set` / `local.tee`

```wat
(module
  (func (export "square_plus_one") (param $x i32) (result i32)
    (local $t i32)
    local.get $x
    local.set $t
    local.get $t
    local.get $t
    i32.mul
    local.tee $t         ;; keeps a copy on the stack
    i32.const 1
    i32.add))
```

---

## 4) Control flow: `block`, `loop`, `br`, `br_if`, `if`/`else`

```wat
(module
  ;; while (n > 0) { sum += n; n--; } return sum;
  (func (export "sum_down") (param $n i32) (result i32)
    (local $sum i32)
    (block $exit
      (loop $top
        local.get $n
        i32.eqz
        br_if $exit
        local.get $sum
        local.get $n
        i32.add
        local.set $sum
        local.get $n
        i32.const 1
        i32.sub
        local.set $n
        br $top))
    local.get $sum)

  ;; if/else
  (func (export "abs") (param i32) (result i32)
    local.get 0
    i32.const 0
    i32.lt_s
    if (result i32)
      local.get 0
      i32.const -1
      i32.mul
    else
      local.get 0
    end))
```

---

## 5) `br_table` (switch-like)

```wat
(module
  ;; 0->10, 1->20, 2->30, default->-1
  (func (export "switch") (param $x i32) (result i32)
    (block $default (block $c0 (block $c1 (block $c2
      local.get $x
      br_table $c0 $c1 $c2 $default
    ))))
    i32.const -1
    return
  $c0: i32.const 10
       return
  $c1: i32.const 20
       return
  $c2: i32.const 30)
)
```

---

## 6) Numeric ops & comparisons (i32/i64/f32/f64)

```wat
(module
  (func (export "mix") (param i32 i64 f32 f64) (result i64)
    ;; (x + 3) * 2 as i64 + floor(f32) + trunc(f64)
    local.get 0
    i32.const 3
    i32.add
    i32.const 2
    i32.mul
    i64.extend_i32_s
    local.get 2
    i32.trunc_f32_s
    i64.extend_i32_s
    i64.add
    local.get 3
    i64.trunc_f64_s
    i64.add)

  (func (export "cmp") (param i32 i32) (result i32)
    local.get 0
    local.get 1
    i32.gt_s) ;; returns 0/1
)
```

---

## 7) Conversions & reinterprets

```wat
(module
  (func (export "bits_of_f32") (param $x f32) (result i32)
    local.get $x
    i32.reinterpret_f32)
  (func (export "f32_of_bits") (param $x i32) (result f32)
    local.get $x
    f32.reinterpret_i32))
```

---

## 8) `select` (with and without explicit type)

```wat
(module
  ;; return a if cond!=0 else b
  (func (export "sel") (param $a i32) (param $b i32) (param $cond i32) (result i32)
    local.get $a
    local.get $b
    local.get $cond
    select)

  ;; typed select (useful with polymorphic stacks)
  (func (export "sel_typed") (param f64 f64 i32) (result f64)
    local.get 0
    local.get 1
    local.get 2
    select (result f64)))
```

---

## 9) `nop` and `unreachable`

```wat
(module
  (func (export "maybe_crash") (param i32) (result i32)
    nop
    local.get 0
    i32.eqz
    if
      unreachable ;; trap if param was 0
    end
    i32.const 1))
```

---

## 10) Globals (immutable & mutable)

```wat
(module
  (global $pi f32 (f32.const 3.1415927))
  (global $counter (mut i32) (i32.const 0))

  (func (export "tick") (result i32)
    global.get $counter
    i32.const 1
    i32.add
    global.set $counter
    global.get $counter)

  (func (export "pi_times2") (result f32)
    global.get $pi
    f32.const 2
    f32.mul))
```

---

## 11) Linear memory: declare, load/store, `memory.size`, `memory.grow`

```wat
(module
  (memory (export "mem") 1) ;; 1 page = 64KiB
  (data (i32.const 0) "\01\02\03\04")

  ;; load 32-bit little-endian at offset 0 => 0x04030201
  (func (export "load32") (result i32)
    i32.const 0
    i32.load)

  ;; store a value at address 8
  (func (export "store32") (param i32)
    i32.const 8
    local.get 0
    i32.store)

  (func (export "pages") (result i32)
    memory.size)

  (func (export "grow1") (result i32)
    i32.const 1
    memory.grow) ;; returns old size in pages or -1 on failure
)
```

---

## 12) Loads/stores with alignment & immediate offset

```wat
(module
  (memory 1)
  (func (export "ld_st_aligned") (param $addr i32) (result i32)
    local.get $addr
    i32.load align=4 offset=0   ;; explicit align
    local.get $addr
    i32.const 16
    i32.add
    i32.store align=4 offset=0
    i32.const 0)
)
```

---

## 13) Tables + `call_indirect` (function pointers)

```wat
(module
  (type $un (func (param i32) (result i32)))
  (table (export "tbl") 2 funcref)
  (elem (i32.const 0) $inc $dec)

  (func $inc (type $un) local.get 0 i32.const 1 i32.add)
  (func $dec (type $un) local.get 0 i32.const 1 i32.sub)

  (func (export "do_call") (param $idx i32) (param $x i32) (result i32)
    local.get $x
    local.get $idx
    call_indirect (type $un))
)
```

---

## 14) Reference types: `ref.null`, `ref.func`, `ref.is_null`, tables ops

```wat
(module
  (type $t0 (func))
  (table 3 funcref)
  (func $f)
  (start $init)
  (func $init
    (table.set 0 (i32.const 0) (ref.func $f))
    (table.set 0 (i32.const 1) (ref.null funcref)))

  (func (export "is_null_at1") (result i32)
    (table.get 0 (i32.const 1))
    ref.is_null)

  (func (export "index_of_f") (result i32)
    (ref.func $f) drop ;; showing creation; return constant for demo
    i32.const 0)
)
```

---

## 15) Bulk memory: passive data/elem, `memory.init`, `data.drop`, `memory.copy`, `memory.fill`, `elem.drop`

```wat
(module
  (memory (export "mem") 1)
  (data $blob "hello, wasm!") ;; passive by naming
  (table 2 funcref)
  (func $g)
  (elem $elist func $g) ;; passive element segment

  ;; copy "hello, wasm!" into memory at 100, then fill 3 bytes with 'X'
  (func (export "init_and_fill")
    i32.const 100      ;; dst
    i32.const 0        ;; src offset in data seg
    i32.const 12       ;; size
    memory.init $blob
    data.drop $blob

    i32.const 103      ;; dst
    i32.const 88       ;; 'X'
    i32.const 3        ;; len
    memory.fill)

  ;; demonstrate memory.copy (overlapping safe)
  (func (export "copy")
    i32.const 110  ;; dst
    i32.const 100  ;; src
    i32.const 10   ;; len
    memory.copy)

  ;; drop a passive element segment
  (func (export "drop_elem")
    elem.drop $elist)
)
```

---

## 16) Multi-value: multiple results & `block` with results

```wat
(module
  (func $pair (param i32) (result i32 i32)
    local.get 0
    i32.const 1
    i32.add
    local.get 0)

  (func (export "sum_pair") (param i32) (result i32)
    call $pair
    i32.add)

  (func (export "block_result") (param i32) (result i32)
    (block (result i32)
      local.get 0
      i32.const 2
      i32.mul))
)
```

---

## 17) Extended constant expressions (init globals/tables with ops)

```wat
(module
  (global $two (mut i32) (i32.const 2))
  (global (export "four") i32 (i32.mul (global.get $two) (i32.const 2)))
)
```

---

## 18) Sign-ext, saturating truncation (post‑MVP number ops)

```wat
(module
  (func (export "sext8") (param i32) (result i32)
    local.get 0
    i32.extend8_s)
  (func (export "sat_trunc") (param f32) (result i32)
    local.get 0
    i32.trunc_sat_f32_s)
)
```

---

## 19) Importing and using memory

```wat
(module
  (import "env" "mem" (memory 1))
  (func (export "poke8") (param $addr i32) (param $val i32)
    local.get $addr
    local.get $val
    i32.store8)
)
```

---

## 20) Importing and mutating globals

```wat
(module
  (import "env" "g" (global $g (mut i32)))
  (func (export "bump")
    global.get $g
    i32.const 1
    i32.add
    global.set $g))
```

---

## 21) Table grow/size (reference types)

```wat
(module
  (table (export "t") 0 funcref)
  (func (export "grow1") (result i32)
    (table.grow 0 (ref.null funcref) (i32.const 1))) ;; returns old size
  (func (export "size") (result i32)
    (table.size 0))
)
```

---

## 22) Memory address spaces: shared memory & atomics (threads-ready engines)

> Note: Requires engines started with threads support and proper host setup. Shown for completeness.

```wat
(module
  (memory (export "mem") 1 2 shared)
  (func (export "atomic_add") (param $addr i32) (param $x i32) (result i32)
    local.get $addr
    local.get $x
    i32.atomic.rmw.add)
)
```

---

## 23) Exception handling (proposal) – basic `try`/`catch`

> Support varies. Skip if your tooling/runtime doesn’t enable EH.

```wat
(module
  (tag $e (param i32))
  (func (export "may_throw") (param i32) (result i32)
    try (result i32)
      local.get 0
      throw $e
      i32.const 0
    catch $e
      drop
      i32.const 123
    end))
```

---

## 24) Putting it together: a tiny library

```wat
(module
  (memory (export "mem") 1)
  (global $count (mut i32) (i32.const 0))

  (func $hash (param i32 i32) (result i32)
    local.get 0
    i32.const 16777619
    i32.mul
    local.get 1
    i32.xor)

  (func (export "store_hash") (param $addr i32) (param $x i32)
    global.get $count
    i32.const 1
    i32.add
    global.set $count

    local.get $addr
    local.get $x
    i32.const 2166136261
    call $hash
    i32.store)

  (func (export "get_count") (result i32)
    global.get $count))
```

---

## Notes & Tips

- WebAssembly itself does not provide I/O (printing, files, etc.); use **imports** from your host environment for that.
- The post‑MVP features above are broadly available in modern engines, but you may need flags depending on your runtime/tooling.
- Fo
