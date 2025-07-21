/**
 * @name Cosmos SDK Security Rules
 * @description Security rules for Cosmos SDK smart contracts
 * @kind problem
 * @problem.severity warning
 * @id cosmos/security-rules
 */

import rust

/**
 * Detects potential non-deterministic timestamp usage in contracts
 */
class NonDeterministicTimestamp extends Call {
  NonDeterministicTimestamp() {
    this.getTarget().hasQualifiedName("cosmwasm_std", "Env", "block") and
    this.getTarget().getName() = "time"
  }
}

/**
 * Detects unsafe state writes that could lead to reentrancy
 */
class UnsafeStateWrite extends Call {
  UnsafeStateWrite() {
    this.getTarget().hasQualifiedName("cw_storage_plus", _, "save") and
    not exists(Call check |
      check.getTarget().hasQualifiedName("cosmwasm_std", _, "may_load") and
      check.getEnclosingFunction() = this.getEnclosingFunction()
    )
  }
}

/**
 * Detects missing access control checks
 */
class MissingAccessControl extends Function {
  MissingAccessControl() {
    this.hasName("execute_*") and
    not exists(IfStmt accessCheck |
      accessCheck.getCondition().toString().matches("%unauthorized%") or
      accessCheck.getCondition().toString().matches("%admin%") or
      accessCheck.getCondition().toString().matches("%sender%")
    )
  }
}

/**
 * Detects potential integer overflow vulnerabilities
 */
class IntegerOverflow extends BinaryOperation {
  IntegerOverflow() {
    this.getOperator() = "+" and
    this.getLeftOperand().getType().toString().matches("u%") and
    not exists(Call check |
      check.getTarget().hasName("checked_add") and
      check.getEnclosingFunction() = this.getEnclosingFunction()
    )
  }
}

/**
 * Detects hardcoded secrets or keys
 */
class HardcodedSecret extends StringLiteral {
  HardcodedSecret() {
    this.getValue().regexpMatch(".*[Kk]ey.*|.*[Pp]assword.*|.*[Ss]ecret.*|.*[Tt]oken.*") and
    this.getValue().length() > 10
  }
}

/**
 * Query for non-deterministic timestamp usage
 */
from NonDeterministicTimestamp timestamp
select timestamp, "Potential non-deterministic timestamp usage in smart contract"

/**
 * Query for unsafe state writes
 */
from UnsafeStateWrite write
select write, "Unsafe state write without proper validation"

/**
 * Query for missing access control
 */
from MissingAccessControl func
select func, "Execute function missing access control checks"

/**
 * Query for integer overflow
 */
from IntegerOverflow overflow
select overflow, "Potential integer overflow - use checked arithmetic"

/**
 * Query for hardcoded secrets
 */
from HardcodedSecret secret
select secret, "Potential hardcoded secret or key"