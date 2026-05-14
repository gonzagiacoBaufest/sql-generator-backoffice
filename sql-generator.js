(function () {
  const utils = window.PricingRuleUtils;

  function sqlValue(value) {
    return String(value).trim();
  }

  function sqlString(value) {
    return "'" + utils.escapeSql(String(value).trim()) + "'";
  }

  function sqlNullableString(value) {
    return utils.isBlank(value) ? "NULL" : sqlString(value);
  }

  function sqlNullableNumber(value) {
    return utils.isBlank(value) ? "NULL" : String(value).trim();
  }

  function sqlTimestamp(value) {
    if (utils.isOracleSysdate(value)) {
      return "SYSDATE";
    }
    return "TO_TIMESTAMP('" + utils.escapeSql(utils.normalizeDateTime(value)) + "', 'YYYY-MM-DD HH24:MI:SS')";
  }

  function sqlNullableTimestamp(value) {
    return utils.isBlank(value) ? "NULL" : sqlTimestamp(value);
  }

  function nextIdSelectInto(variableName, tableName, columnName) {
    return "SELECT NVL(MAX(" + columnName + "), 0) + 1 INTO " + variableName + " FROM " + tableName + ";";
  }

  function wrapInPlSqlBlock(lines, declarations, initializers) {
    return [
      "DECLARE",
      ...declarations.map((declaration) => "  " + declaration),
      "BEGIN",
      ...initializers.map((initializer) => "  " + initializer),
      ...lines.map((line) => (line ? "  " + line : "")),
      "END;"
    ].join("\n");
  }

  function buildAuditPayload(state, mode, primaryIndex, entryIndex) {
    if (mode === "detail") {
      const entry = state.forms.detailBlocks[primaryIndex].entries[entryIndex];
      const audit = entry.audit;
      const detail = entry.detail;
      return {
        auditLogId: audit.auditLogId,
        auditLogIdMode: audit.auditLogIdMode,
        auditDate: audit.auditDate,
        auditUserId: detail.auditUserIdDetail,
        operationType: audit.operationType,
        suboperationName: audit.suboperationName,
        entityTypeId: 9
      };
    }

    if (mode === "rule") {
      const entry = state.forms.ruleEntries[primaryIndex];
      return {
        auditLogId: entry.audit.auditLogId,
        auditLogIdMode: entry.audit.auditLogIdMode,
        auditDate: entry.audit.auditDate,
        auditUserId: entry.rule.auditUserIdRule,
        operationType: entry.audit.operationType,
        suboperationName: entry.audit.suboperationName,
        entityTypeId: 8
      };
    }

    return {
      auditLogId: "",
      auditLogIdMode: "manual",
      auditDate: "SYSDATE",
      auditUserId: "",
      operationType: "ADD",
      suboperationName: "",
      entityTypeId: 8
    };
  }

  function buildRuleStatements(rule, audit, auditLogIdSql, pricingRuleIdSql) {
    return [
      "INSERT INTO T_ABKO_AUDIT_LOG (",
      "  AUDIT_LOG_ID, ENTITY_TYPE_ID, OBJECT_ENTITY_ID, OPERATION_TYPE, SUBOPERATION_NAME, AUDIT_DATE, AUDIT_USER_ID",
      ") VALUES (",
      "  " + auditLogIdSql + ",",
      "  8,",
      "  " + pricingRuleIdSql + ",",
      "  " + sqlString(audit.operationType) + ",",
      "  " + sqlNullableString(audit.suboperationName) + ",",
      "  " + sqlTimestamp(audit.auditDate) + ",",
      "  " + sqlString(audit.auditUserId),
      ");",
      "",
      "INSERT INTO T_ABKO_PRICING_RULE (",
      "  PRICING_RULE_ID, PRICING_RULE_NAME, PROGRESSIVE_TYPE, FEE_TYPE, TOTAL_FEE_NUMBER, PRECEDENCE_TYPE,",
      "  PARENT_PRICING_RULE_ID, ENTITY_VERSION_ID, PRICING_RULE_STATUS_TYPE, STARTING_DATE, FINISH_DATE, COMMENTS_DESC,",
      "  ACTIVE_TYPE, AUDIT_LOG_ID, AUDIT_DATE, AUDIT_USER_ID, PRICING_RULE_TYPE",
      ") VALUES (",
      "  " + pricingRuleIdSql + ",",
      "  " + sqlNullableString(rule.pricingRuleName) + ",",
      "  " + sqlNullableString(rule.progressiveType) + ",",
      "  " + sqlNullableString(rule.feeType) + ",",
      "  " + sqlNullableNumber(rule.totalFeeNumber) + ",",
      "  " + sqlNullableString(rule.precedenceType) + ",",
      "  " + sqlNullableNumber(rule.parentPricingRuleId) + ",",
      "  " + sqlNullableNumber(rule.entityVersionId) + ",",
      "  " + sqlNullableString(rule.pricingRuleStatusType) + ",",
      "  " + sqlNullableTimestamp(rule.startingDate) + ",",
      "  " + sqlNullableTimestamp(rule.finishDate) + ",",
      "  " + sqlNullableString(rule.commentsDesc) + ",",
      "  " + sqlNullableNumber(rule.activeType) + ",",
      "  " + auditLogIdSql + ",",
      "  " + sqlTimestamp(rule.auditDateRule) + ",",
      "  " + sqlString(rule.auditUserIdRule) + ",",
      "  " + sqlNullableString(rule.pricingRuleType),
      ");"
    ];
  }

  function buildDetailStatements(detail, pricingRuleId, audit, auditLogIdSql, pricingRuleDetailIdSql) {
    const objectEntityIdSql = sqlNullableNumber(detail.objectEntityId);
    return [
      "INSERT INTO T_ABKO_AUDIT_LOG (",
      "  AUDIT_LOG_ID, ENTITY_TYPE_ID, OBJECT_ENTITY_ID, OPERATION_TYPE, SUBOPERATION_NAME, AUDIT_DATE, AUDIT_USER_ID",
      ") VALUES (",
      "  " + auditLogIdSql + ",",
      "  9,",
      "  " + pricingRuleDetailIdSql + ",",
      "  " + sqlString(audit.operationType) + ",",
      "  " + sqlNullableString(audit.suboperationName) + ",",
      "  " + sqlTimestamp(audit.auditDate) + ",",
      "  " + sqlString(audit.auditUserId),
      ");",
      "",
      "INSERT INTO T_ABKO_PRICING_RULE_DETAIL (",
      "  PRICING_RULE_DETAIL_ID, PRICING_RULE_ID, ENTITY_TYPE_ID, OBJECT_ENTITY_ID, ACTIVE_TYPE, AUDIT_LOG_ID, AUDIT_DATE, AUDIT_USER_ID",
      ") VALUES (",
      "  " + pricingRuleDetailIdSql + ",",
      "  " + sqlValue(pricingRuleId) + ",",
      "  " + sqlValue(detail.entityTypeIdDetail) + ",",
      "  " + objectEntityIdSql + ",",
      "  " + sqlNullableString(detail.activeTypeDetail) + ",",
      "  " + auditLogIdSql + ",",
      "  " + sqlTimestamp(detail.auditDateDetail) + ",",
      "  " + sqlString(detail.auditUserIdDetail),
      ");"
    ];
  }

  function generateRuleSql(state) {
    const ruleEntries = state.forms.ruleEntries.map((entry, index) => {
      const rule = entry.rule;
      const audit = buildAuditPayload(state, "rule", index);
      const usesAutoAuditLogId = audit.auditLogIdMode === "auto";
      const usesAutoPricingRuleId = rule.pricingRuleIdMode === "auto";
      const suffix = "_r" + (index + 1);
      const auditLogIdVariable = "v_audit_log_id" + suffix;
      const pricingRuleIdVariable = "v_pricing_rule_id" + suffix;

      return {
        usesAutoAuditLogId,
        usesAutoPricingRuleId,
        declarations: [
          usesAutoAuditLogId ? auditLogIdVariable + " NUMBER;" : null,
          usesAutoPricingRuleId ? pricingRuleIdVariable + " NUMBER;" : null
        ].filter(Boolean),
        initializers: [
          usesAutoAuditLogId ? nextIdSelectInto(auditLogIdVariable, "T_ABKO_AUDIT_LOG", "AUDIT_LOG_ID") : null,
          usesAutoPricingRuleId ? nextIdSelectInto(pricingRuleIdVariable, "T_ABKO_PRICING_RULE", "PRICING_RULE_ID") : null
        ].filter(Boolean),
        statements: buildRuleStatements(
          rule,
          audit,
          usesAutoAuditLogId ? auditLogIdVariable : sqlValue(audit.auditLogId),
          usesAutoPricingRuleId ? pricingRuleIdVariable : sqlValue(rule.pricingRuleId)
        )
      };
    });

    const hasAutoIds = ruleEntries.some((entry) => entry.usesAutoAuditLogId || entry.usesAutoPricingRuleId);
    if (!hasAutoIds) {
      return ruleEntries.map((entry) => entry.statements.join("\n")).join("\n\n");
    }

    const declarations = ruleEntries.flatMap((entry) => entry.declarations);
    const statements = ruleEntries.flatMap((entry, index) => {
      const entryLines = entry.initializers.concat(entry.statements);
      if (index === 0) {
        return entryLines;
      }
      return [""].concat(entryLines);
    });

    return wrapInPlSqlBlock(statements, declarations, []);
  }

  function generateDetailSql(state) {
    const detailEntries = state.forms.detailBlocks.flatMap((block, blockIndex) => block.entries.map((entry, entryIndex) => {
      const detail = entry.detail;
      const audit = buildAuditPayload(state, "detail", blockIndex, entryIndex);
      const usesAutoAuditLogId = audit.auditLogIdMode === "auto";
      const usesAutoPricingRuleDetailId = detail.pricingRuleDetailIdMode === "auto";
      const suffix = "_b" + (blockIndex + 1) + "_d" + (entryIndex + 1);
      const auditLogIdVariable = "v_audit_log_id" + suffix;
      const pricingRuleDetailIdVariable = "v_pricing_rule_detail_id" + suffix;

      return {
        usesAutoAuditLogId,
        usesAutoPricingRuleDetailId,
        declarations: [
          usesAutoAuditLogId ? auditLogIdVariable + " NUMBER;" : null,
          usesAutoPricingRuleDetailId ? pricingRuleDetailIdVariable + " NUMBER;" : null
        ].filter(Boolean),
        initializers: [
          usesAutoAuditLogId ? nextIdSelectInto(auditLogIdVariable, "T_ABKO_AUDIT_LOG", "AUDIT_LOG_ID") : null,
          usesAutoPricingRuleDetailId ? nextIdSelectInto(pricingRuleDetailIdVariable, "T_ABKO_PRICING_RULE_DETAIL", "PRICING_RULE_DETAIL_ID") : null
        ].filter(Boolean),
        statements: buildDetailStatements(
          detail,
          block.pricingRuleId,
          audit,
          usesAutoAuditLogId ? auditLogIdVariable : sqlValue(audit.auditLogId),
          usesAutoPricingRuleDetailId ? pricingRuleDetailIdVariable : sqlValue(detail.pricingRuleDetailId)
        )
      };
    }));

    const hasAutoIds = detailEntries.some((entry) => entry.usesAutoAuditLogId || entry.usesAutoPricingRuleDetailId);
    if (!hasAutoIds) {
      return detailEntries.map((entry) => entry.statements.join("\n")).join("\n\n");
    }

    const declarations = detailEntries.flatMap((entry) => entry.declarations);
    const statements = detailEntries.flatMap((entry, index) => {
      const entryLines = entry.initializers.concat(entry.statements);
      if (index === 0) {
        return entryLines;
      }
      return [""].concat(entryLines);
    });

    return wrapInPlSqlBlock(statements, declarations, []);
  }

  window.PricingRuleSql = {
    generateRuleSql,
    generateDetailSql
  };
}());
