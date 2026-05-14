(function () {
  const utils = window.PricingRuleUtils;
  const DEFAULT_AUDIT_USER_ID = "DEVUSER";

  function createDefaultDetail() {
    return {
      pricingRuleDetailId: "",
      pricingRuleDetailIdMode: "manual",
      pricingRuleId: "",
      entityTypeIdDetail: "1",
      objectEntityId: "",
      activeTypeDetail: "1",
      auditDateDetail: "SYSDATE",
      auditUserIdDetail: DEFAULT_AUDIT_USER_ID
    };
  }

  function createDefaultDetailAudit() {
    return {
      auditLogId: "",
      auditLogIdMode: "manual",
      auditDate: "SYSDATE",
      auditUserId: DEFAULT_AUDIT_USER_ID,
      operationType: "ADD",
      suboperationName: ""
    };
  }

  const STORAGE_KEY = "pricing-rule-sql-generator-state-v1";

  const FIELD_SCHEMAS = {
    rule: {
      title: "Formulario de pricing_rule",
      entityTypeId: 8,
      summary: "Se generará audit_log + pricing_rule.",
      fields: [
        { key: "pricingRuleId", label: "PRICING_RULE_ID", required: true, type: "number", note: "Elige si lo cargas manualmente o si se calcula como MAX + 1.", width: 220, idModeKey: "pricingRuleIdMode" },
        { key: "pricingRuleName", label: "PRICING_RULE_NAME", required: false, type: "text", width: 220 },
        { key: "progressiveType", label: "PROGRESSIVE_TYPE", required: false, type: "text", width: 132 },
        { key: "feeType", label: "FEE_TYPE", required: false, type: "text", width: 96 },
        { key: "totalFeeNumber", label: "TOTAL_FEE_NUMBER", required: false, type: "number", step: "0.01", width: 124 },
        { key: "precedenceType", label: "PRECEDENCE_TYPE", required: false, type: "text", width: 132 },
        { key: "parentPricingRuleId", label: "PARENT_PRICING_RULE_ID", required: false, type: "number", width: 132 },
        { key: "entityVersionId", label: "ENTITY_VERSION_ID", required: false, type: "number", width: 116 },
        { key: "pricingRuleStatusType", label: "PRICING_RULE_STATUS_TYPE", required: false, type: "select", width: 116, options: ["PAA", "APR", "SYC", "REJ", "PAU", "DBU"] },
        { key: "startingDate", label: "STARTING_DATE", required: false, type: "datetime-local", width: 184 },
        { key: "finishDate", label: "FINISH_DATE", required: false, type: "datetime-local", width: 248 },
        { key: "commentsDesc", label: "COMMENTS_DESC", required: false, type: "text", width: 248 },
        { key: "activeType", label: "ACTIVE_TYPE", required: false, type: "number", width: 88 },
        { key: "auditDateRule", label: "AUDIT_DATE", required: true, type: "text", note: "Valor de T_ABKO_PRICING_RULE.AUDIT_DATE.", width: 192 },
        { key: "auditUserIdRule", label: "AUDIT_USER_ID", required: true, type: "text", note: "Valor de T_ABKO_PRICING_RULE.AUDIT_USER_ID.", width: 208 },
        { key: "pricingRuleType", label: "PRICING_RULE_TYPE", required: false, type: "text", width: 208 }
      ]
    },
    detail: {
      title: "Formulario de pricing_rule_detail",
      entityTypeId: 9,
      summary: "Se generará audit_log + pricing_rule_detail.",
      fields: [
        { key: "pricingRuleDetailId", label: "PRICING_RULE_DETAIL_ID", required: true, type: "number", note: "Elige si lo cargas manualmente o si se calcula como MAX + 1.", width: 220, idModeKey: "pricingRuleDetailIdMode" },
        { key: "pricingRuleId", label: "PRICING_RULE_ID", required: true, type: "number", note: "Debe existir antes de crear el detail.", width: 114 },
        { key: "entityTypeIdDetail", label: "ENTITY_TYPE_ID", required: true, type: "select", width: 168, options: [
          { value: "1", label: "1    Activity" },
          { value: "2", label: "2    Category" },
          { value: "3", label: "3    Segment" },
          { value: "4", label: "4    Settlement" },
          { value: "5", label: "5    Installment" },
          { value: "6", label: "6    Payment method" }
        ] },
        { key: "objectEntityId", label: "OBJECT_ENTITY_ID", required: false, type: "number", width: 120 },
        { key: "activeTypeDetail", label: "ACTIVE_TYPE", required: false, type: "text", width: 88 },
        { key: "auditDateDetail", label: "AUDIT_DATE", required: true, type: "text", width: 248 },
        { key: "auditUserIdDetail", label: "AUDIT_USER_ID", required: true, type: "text", width: 208 }
      ]
    }
  };

  const AUDIT_FIELDS = [
    { key: "auditLogId", label: "AUDIT_LOG_ID", required: true, type: "number", note: "Elige si lo cargas manualmente o si se calcula como MAX + 1.", width: 220, idModeKey: "auditLogIdMode" },
    { key: "auditDate", label: "AUDIT_DATE", required: true, type: "text", width: 248 },
    { key: "auditUserId", label: "AUDIT_USER_ID", required: true, type: "text", width: 208 },
    { key: "operationType", label: "OPERATION_TYPE", required: true, type: "select", width: 100, options: ["ADD", "DEL", "UPD"] },
    { key: "suboperationName", label: "SUBOPERATION_NAME", required: false, type: "text", width: 148 }
  ];

  function createDefaultState() {
    return {
      mode: "rule",
      settings: {
        globalAuditUserId: DEFAULT_AUDIT_USER_ID
      },
      forms: {
        rule: {
          pricingRuleId: "",
          pricingRuleIdMode: "manual",
          pricingRuleName: "",
          progressiveType: "UNIQUE",
          feeType: "PE",
          totalFeeNumber: "",
          precedenceType: "",
          parentPricingRuleId: "",
          entityVersionId: "1",
          pricingRuleStatusType: "PAA",
          startingDate: utils.addHoursDateTimeLocal(-1),
          finishDate: "",
          commentsDesc: "",
          activeType: "1",
          auditDateRule: "SYSDATE",
          auditUserIdRule: DEFAULT_AUDIT_USER_ID,
          pricingRuleType: "V"
        },
        detail: [createDefaultDetail()],
        detailAudits: [createDefaultDetailAudit()],
        audit: {
          auditLogId: "",
          auditLogIdMode: "manual",
          auditDate: "SYSDATE",
          auditUserId: DEFAULT_AUDIT_USER_ID,
          operationType: "ADD",
          suboperationName: ""
        }
      },
      generatedSql: "",
      editorSql: ""
    };
  }

  window.PricingRuleConfig = {
    STORAGE_KEY,
    DEFAULT_AUDIT_USER_ID,
    FIELD_SCHEMAS,
    AUDIT_FIELDS,
    createDefaultDetail,
    createDefaultDetailAudit,
    createDefaultState
  };
}());
