/**
 * @name Non-Deterministic Contract Behavior
 * @description Detects patterns that could lead to non-deterministic behavior in smart contracts
 * @kind problem
 * @problem.severity error
 * @id cosmos/non-deterministic-behavior
 */

import rust

/**
 * Detects usage of system time functions
 */
class SystemTimeUsage extends Call {
  SystemTimeUsage() {
    this.getTarget().hasQualifiedName("std", "time", "SystemTime") or
    this.getTarget().hasQualifiedName("std", "time", "Instant") or
    this.getTarget().hasName("now")
  }
}

/**
 * Detects random number generation
 */
class RandomGeneration extends Call {
  RandomGeneration() {
    this.getTarget().hasQualifiedName("rand", _, _) or
    this.getTarget().getName().matches(".*rand.*") or
    this.getTarget().getName().matches(".*random.*")
  }
}

/**
 * Detects floating point arithmetic
 */
class FloatingPointArithmetic extends Type {
  FloatingPointArithmetic() {
    this.toString() = "f32" or this.toString() = "f64"
  }
}

/**
 * Detects HashMap iteration (non-deterministic order)
 */
class HashMapIteration extends Call {
  HashMapIteration() {
    this.getTarget().hasQualifiedName("std", "collections", "HashMap") and
    (this.getTarget().getName() = "iter" or this.getTarget().getName() = "keys")
  }
}

/**
 * Detects external system calls
 */
class ExternalSystemCall extends Call {
  ExternalSystemCall() {
    this.getTarget().hasQualifiedName("std", "process", "Command") or
    this.getTarget().hasQualifiedName("std", "fs", _) or
    this.getTarget().hasQualifiedName("std", "net", _)
  }
}

/**
 * Detects usage of thread-local storage
 */
class ThreadLocalUsage extends Call {
  ThreadLocalUsage() {
    this.getTarget().hasQualifiedName("std", "thread", "thread_local") or
    this.getTarget().hasName("thread_local")
  }
}

from SystemTimeUsage time
select time, "System time usage can lead to non-deterministic behavior in smart contracts"

from RandomGeneration rand
select rand, "Random number generation leads to non-deterministic behavior"

from FloatingPointArithmetic fp, Variable var
where var.getType() = fp
select var, "Floating point arithmetic can be non-deterministic across platforms"

from HashMapIteration hashmap
select hashmap, "HashMap iteration order is non-deterministic"

from ExternalSystemCall syscall
select syscall, "External system calls are non-deterministic and not allowed in smart contracts"

from ThreadLocalUsage thread
select thread, "Thread-local storage is non-deterministic in smart contracts"