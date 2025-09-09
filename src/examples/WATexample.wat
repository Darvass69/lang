(module
  ;; Feature: function type
  (type $binop (func (param i32 i32) (result i32)))
  (type $unop (func (param i32) (result i32)))
  (type $log (func (param i32) (result)))

  ;; Feature: import
  (import "env" "log" (func $log (type $log)))

  ;; Feature: export
  (export "square_plus_one" (func $square_plus_one))

  (func (export "get") (result i32) global.get $g)

  (export "count_even" (func $count_even))

  ;; Feature: function, param, result, local,
  (func $square_plus_one (param $x i32) (result i32)
    (local $t i32)
    local.get $x
    local.tee $t ;; set then load
    local.get $t
    i32.mul
    i32.const 1
    i32.add
  )

  ;; Feature: start function, global, call
  (global $g (mut i32) (i32.const 0))
  (global $pi f32 (f32.const 3.1415927))
  (func $init
    i32.const 42
    global.set $g
    global.get $g
    call $log
  )
  (start $init)

  ;; Feature: branch, loop
  (func $count_even (param $n i32) (result i32)
    (local $count i32) ;; counter for evens
    (local $i i32) ;; loop index

    ;; initialize locals
    i32.const 0
    local.set $count
    i32.const 0
    local.set $i

    (block $exit ;; exit block for the loop
      (loop $loop
        ;; check: if (i < n) ?
        local.get $i
        local.get $n
        i32.lt_s
        i32.eqz
        br_if $exit ;; if !(i < n) → break

        ;; if (i % 2 == 0) { count++ } else { log(i) }
        local.get $i
        i32.const 2
        i32.rem_s
        i32.eqz
        if
          local.get $count
          i32.const 1
          i32.add
          local.set $count
        else
          local.get $i
          call $log
        end

        ;; i++
        local.get $i
        i32.const 1
        i32.add
        local.set $i

        br $loop
      )
    )

    ;; return count
    local.get $count
  )

  ;; Feature: function pointers TODO
  ;; (func (export "test_indirect_call") (param $select i32)
  ;;   ;; select the function
  ;;   local.get $select
  ;;   if ;; if (select)
  ;;   else
  ;;   end

  ;;   i32.const 82
  ;;   call $do_indirect_call
  ;;   call $log
  ;; )
  ;; (func $do_indirect_call (param $function_pointer i32) (param $x i32) (result i32)
  ;;   local.get $x
  ;;   local.get $function_pointer
  ;;   call_indirect (type $unop)
  ;; )

)