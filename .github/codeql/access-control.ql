/**
 * @name Access Control Vulnerabilities
 * @description Detects access control vulnerabilities in smart contracts
 * @kind problem
 * @problem.severity error
 * @id cosmos/access-control-vulnerabilities
 */

import rust

/**
 * Detects execute functions without sender verification
 */
class UnprotectedExecuteFunction extends Function {
  UnprotectedExecuteFunction() {
    this.hasName("execute_*") and
    not exists(IfStmt check |
      check.getCondition().toString().matches("%info.sender%") or
      check.getCondition().toString().matches("%sender%")
    ) and
    not exists(Call errorReturn |
      errorReturn.getTarget().hasName("Unauthorized") and
      errorReturn.getEnclosingFunction() = this
    )
  }
}

/**
 * Detects admin-only functions without proper checks
 */
class MissingAdminCheck extends Function {
  MissingAdminCheck() {
    (this.hasName("execute_update_admin") or
     this.hasName("execute_add_issuer") or
     this.hasName("execute_remove_issuer") or
     this.hasName("execute_deactivate_circuit")) and
    not exists(IfStmt adminCheck |
      adminCheck.getCondition().toString().matches("%admin%") or
      adminCheck.getCondition().toString().matches("%config.admin%")
    )
  }
}

/**
 * Detects potential privilege escalation
 */
class PrivilegeEscalation extends Assignment {
  PrivilegeEscalation() {
    this.getLeftOperand().toString().matches("%.admin%") and
    not exists(IfStmt check |
      check.getCondition().toString().matches("%admin%") and
      check.getEnclosingFunction() = this.getEnclosingFunction()
    )
  }
}

/**
 * Detects missing input validation
 */
class MissingInputValidation extends Function {
  MissingInputValidation() {
    this.hasName("execute_*") and
    exists(Parameter param |
      param.getFunction() = this and
      param.getType().toString().matches("String")
    ) and
    not exists(IfStmt validation |
      validation.getCondition().toString().matches("%.is_empty()%") or
      validation.getCondition().toString().matches("%.len()%")
    )
  }
}

/**
 * Detects potential reentrancy issues
 */
class ReentrancyVulnerability extends Call {
  ReentrancyVulnerability() {
    this.getTarget().hasName("execute") and
    exists(Call stateWrite |
      stateWrite.getTarget().hasName("save") and
      stateWrite.getLocation().getStartLine() > this.getLocation().getStartLine() and
      stateWrite.getEnclosingFunction() = this.getEnclosingFunction()
    )
  }
}

from UnprotectedExecuteFunction func
select func, "Execute function lacks sender verification"

from MissingAdminCheck func
select func, "Admin-only function missing admin verification"

from PrivilegeEscalation assign
select assign, "Potential privilege escalation without proper authorization"

from MissingInputValidation func
select func, "Function missing input validation for string parameters"

from ReentrancyVulnerability call
select call, "Potential reentrancy vulnerability - state writes after external calls"