(function () {
  const utils = window.PricingRuleUtils;
  const DEFAULT_AUDIT_USER_ID = "DEVUSER";
  const DEFAULT_TABLE_PREFIX = "T_ABKO_";
  const USE_SEQUENCES = true;
  const DEFAULT_SEQUENCE_SUFFIX = "_SEQ";
  const SEQUENCE_MAP = {
    'ABKO.T_ABKO_AUDIT_LOG': 'ABKO.Q_ABKO_AUDIT_LOG',
    'ABKO.T_ABKO_PRICING_RULE': 'ABKO.Q_ABKO_PRICING_RULE',
    'ABKO.T_ABKO_PRICING_RULE_DETAIL': 'ABKO.Q_ABKO_PRICING_RULE_DETAIL'
  };

  const DETAIL_ENTITY_TYPE_OPTIONS = [
    { value: "1", label: "1    Activity" },
    { value: "3", label: "3    Segment" },
    { value: "4", label: "4    Settlement" },
    { value: "6", label: "6    Payment method" }
  ];

  const DETAIL_OBJECT_ENTITY_OPTIONS = {
    "1": [
      { value: "97", label: "Confit. y Panader. = 97" },
      { value: "96", label: "Carn/Gran/Pesc = 96" }
    ],
    "3": [
      { value: "1", label: "chico" },
      { value: "2", label: "mediano" },
      { value: "3", label: "grande" }
    ],
    "4": [
      { value: "2", label: "1dia" },
      { value: "8", label: "2dias" },
      { value: "3", label: "5dias" },
      { value: "4", label: "8dias" },
      { value: "5", label: "10dias" },
      { value: "6", label: "18dias" },
      { value: "7", label: "30dias" }
    ],
    "6": [
      { value: "1", label: "credito" },
      { value: "2", label: "debito" },
      { value: "3", label: "prepaga" },
      { value: "4", label: "nacional" },
      { value: "5", label: "internacional" },
      { value: "6", label: "un pago" },
      { value: "7", label: "cuotas" }
    ]
  };

  function normalizeDetailEntityTypeId(entityTypeId) {
    const normalized = String(entityTypeId ?? "").trim();
    if (normalized === "-1") {
      return "1";
    }
    if (normalized === "-3") {
      return "3";
    }
    if (normalized === "-4") {
      return "4";
    }
    if (normalized === "-6") {
      return "6";
    }
    return normalized;
  }

  function getDetailObjectEntityOptions(entityTypeId) {
    return DETAIL_OBJECT_ENTITY_OPTIONS[normalizeDetailEntityTypeId(entityTypeId)] || [];
  }

  function isValidDetailObjectEntityId(entityTypeId, objectEntityId) {
    if (utils.isBlank(objectEntityId)) {
      return true;
    }

    return getDetailObjectEntityOptions(entityTypeId).some((option) => option.value === String(objectEntityId));
  }

  function createDefaultRuleValues() {
    return {
      pricingRuleId: "",
      pricingRuleIdMode: "auto",
      pricingRuleName: "",
      progressiveType: "UNIQUE",
      feeType: "PE",
      totalFeeNumber: "",
      precedenceType: "",
      parentPricingRuleId: "",
      entityVersionId: "1",
      pricingRuleStatusType: "APR",
      startingDate: utils.nextDateTimeLocal(7),
      finishDate: utils.addMonthsDateTimeLocal(12),
      commentsDesc: "",
      activeType: "1",
      auditDateRule: "SYSDATE",
      auditUserIdRule: DEFAULT_AUDIT_USER_ID,
      pricingRuleType: "V"
    };

  }

  function createDefaultRuleAudit() {
    return {
      auditLogId: "",
      auditLogIdMode: "auto",
      auditDate: "SYSDATE",
      auditUserId: DEFAULT_AUDIT_USER_ID,
      operationType: "ADD",
      suboperationName: ""
    };
  }

  function createDefaultRuleEntry() {
    return {
      rule: createDefaultRuleValues(),
      audit: createDefaultRuleAudit()
    };
  }

  function createDefaultDetail() {
    return {
      pricingRuleDetailId: "",
      pricingRuleDetailIdMode: "auto",
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
      auditLogIdMode: "auto",
      auditDate: "SYSDATE",
      auditUserId: DEFAULT_AUDIT_USER_ID,
      operationType: "ADD",
      suboperationName: ""
    };
  }

  function createDefaultDetailBlock() {
    return {
      pricingRuleId: "",
      entries: [
        {
          detail: createDefaultDetail(),
          audit: createDefaultDetailAudit()
        }
      ]
    };
  }

  const STORAGE_KEY = "pricing-rule-sql-generator-state-v1";

  const FIELD_SCHEMAS = {
    rule: {
      title: "Formulario de pricing_rule",
      entityTypeId: 8,
      summary: "Se generará audit_log + pricing_rule.",
      fields: [
        { key: "pricingRuleId", label: "PRICING_RULE_ID", required: true, type: "number", note: "Elige si lo cargas manualmente o si se calcula como MAX + 1.", width: 220, idModeKey: "pricingRuleIdMode", maxDigits: 9, maxScale: 0 },
        { key: "pricingRuleName", label: "PRICING_RULE_NAME", required: false, type: "text", width: 220, maxBytes: 254 },
        { key: "progressiveType", label: "PROGRESSIVE_TYPE", required: false, type: "text", width: 132, maxBytes: 12 },
        { key: "feeType", label: "FEE_TYPE", required: false, type: "text", width: 96, maxBytes: 7 },
        { key: "totalFeeNumber", label: "TOTAL_FEE_NUMBER", required: false, type: "number", step: "0.01", width: 124, maxDigits: 7, maxScale: 2 },
        { key: "precedenceType", label: "PRECEDENCE_TYPE", required: false, type: "text", width: 132, maxBytes: 10 },
        { key: "parentPricingRuleId", label: "PARENT_PRICING_RULE_ID", required: false, type: "number", width: 132, maxDigits: 9, maxScale: 0 },
        { key: "entityVersionId", label: "ENTITY_VERSION_ID", required: false, type: "number", width: 116, maxDigits: 4, maxScale: 0 },
        { key: "pricingRuleStatusType", label: "PRICING_RULE_STATUS_TYPE", required: false, type: "select", width: 116, options: ["APR","PAA","SYC", "REJ", "PAU", "DBU"], maxBytes: 3 },
        { key: "startingDate", label: "STARTING_DATE", required: false, type: "datetime-local", width: 184, note: "Fecha de inicio: entre hoy y 7 días después." },
        { key: "finishDate", label: "FINISH_DATE", required: false, type: "datetime-local", width: 248 },
        { key: "commentsDesc", label: "COMMENTS_DESC", required: false, type: "text", width: 248, maxBytes: 50 },
        { key: "activeType", label: "ACTIVE_TYPE", required: false, type: "number", width: 88, maxDigits: 1, maxScale: 0 },
        { key: "auditDateRule", label: "AUDIT_DATE", required: true, type: "text", note: "Valor de T_ABKO_PRICING_RULE.AUDIT_DATE.", width: 192 },
        { key: "auditUserIdRule", label: "AUDIT_USER_ID", required: true, type: "text", note: "Valor de T_ABKO_PRICING_RULE.AUDIT_USER_ID.", width: 208, maxBytes: 10 },
        { key: "pricingRuleType", label: "PRICING_RULE_TYPE", required: false, type: "text", width: 208, maxBytes: 1 }
      ]
    },
    detail: {
      title: "Formulario de pricing_rule_detail",
      entityTypeId: 9,
      summary: "Se generará audit_log + pricing_rule_detail.",
      fields: [
        { key: "pricingRuleDetailId", label: "PRICING_RULE_DETAIL_ID", required: true, type: "number", note: "Elige si lo cargas manualmente o si se calcula como MAX + 1.", width: 220, idModeKey: "pricingRuleDetailIdMode", maxDigits: 9, maxScale: 0 },
        { key: "entityTypeIdDetail", label: "ENTITY_TYPE_ID", required: true, type: "select", width: 168, maxDigits: 4, maxScale: 0, options: DETAIL_ENTITY_TYPE_OPTIONS },
        { key: "objectEntityId", label: "OBJECT_ENTITY_ID", required: false, type: "select", width: 220, maxDigits: 9, maxScale: 0, options(values) { return getDetailObjectEntityOptions(values.entityTypeIdDetail); } },
        { key: "activeTypeDetail", label: "ACTIVE_TYPE", required: false, type: "text", width: 88, maxBytes: 1 },
        { key: "auditDateDetail", label: "AUDIT_DATE", required: true, type: "text", width: 248 },
        { key: "auditUserIdDetail", label: "AUDIT_USER_ID", required: true, type: "text", width: 208, maxBytes: 10 }
      ]
    }
  };

  const DETAIL_BLOCK_FIELDS = [
    { key: "pricingRuleId", label: "PRICING_RULE_ID", required: true, type: "number", note: "Se comparte entre todos los pricing_rule_detail del bloque activo.", width: 180, maxDigits: 9, maxScale: 0 }
  ];

  const AUDIT_FIELDS = [
    { key: "auditLogId", label: "AUDIT_LOG_ID", required: true, type: "number", note: "Elige si lo cargas manualmente o si se calcula como MAX + 1.", width: 220, idModeKey: "auditLogIdMode", maxDigits: 9, maxScale: 0 },
    { key: "auditDate", label: "AUDIT_DATE", required: true, type: "text", width: 248 },
    { key: "auditUserId", label: "AUDIT_USER_ID", required: true, type: "text", width: 208, maxBytes: 10 },
    { key: "operationType", label: "OPERATION_TYPE", required: true, type: "select", width: 100, options: ["ADD", "DEL", "UPD"], maxBytes: 3 },
    { key: "suboperationName", label: "SUBOPERATION_NAME", required: false, type: "text", width: 148, maxBytes: 20 }
  ];

  function createDefaultState() {
    return {
      mode: "rule",
      settings: {
        globalAuditUserId: DEFAULT_AUDIT_USER_ID,
        globalTablePrefix: DEFAULT_TABLE_PREFIX
      },
      forms: {
        ruleEntries: [createDefaultRuleEntry()],
        detailBlocks: [createDefaultDetailBlock()],
      },
      ui: {
        activeRuleIndex: 0,
        activeDetailBlockIndex: 0,
        collapsedEntries: {}
      },
      generatedSql: "",
      editorSql: ""
    };
  }

  window.PricingRuleConfig = {
    STORAGE_KEY,
    DEFAULT_AUDIT_USER_ID,
    DEFAULT_TABLE_PREFIX,
    USE_SEQUENCES,
    DEFAULT_SEQUENCE_SUFFIX,
    SEQUENCE_MAP,
    DETAIL_ENTITY_TYPE_OPTIONS,
    DETAIL_OBJECT_ENTITY_OPTIONS,
    FIELD_SCHEMAS,
    DETAIL_BLOCK_FIELDS,
    AUDIT_FIELDS,
    normalizeDetailEntityTypeId,
    getDetailObjectEntityOptions,
    isValidDetailObjectEntityId,
    createDefaultRuleValues,
    createDefaultRuleAudit,
    createDefaultRuleEntry,
    createDefaultDetail,
    createDefaultDetailAudit,
    createDefaultDetailBlock,
    createDefaultState
  };
}());
