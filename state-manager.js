(function () {
  const config = window.PricingRuleConfig;
  const utils = window.PricingRuleUtils;

  function ensureDetailCollections(state) {
    if (!Array.isArray(state.forms.detail)) {
      state.forms.detail = [config.createDefaultDetail()];
    }
    if (!Array.isArray(state.forms.detailAudits)) {
      state.forms.detailAudits = [config.createDefaultDetailAudit()];
    }
    if (state.forms.detail.length === 0) {
      state.forms.detail.push(config.createDefaultDetail());
    }
    while (state.forms.detailAudits.length < state.forms.detail.length) {
      state.forms.detailAudits.push(config.createDefaultDetailAudit());
    }
    if (state.forms.detailAudits.length > state.forms.detail.length) {
      state.forms.detailAudits = state.forms.detailAudits.slice(0, state.forms.detail.length);
    }
  }

  function syncAuditUserId(state) {
    const globalAuditUserId = (state.settings && state.settings.globalAuditUserId) || config.DEFAULT_AUDIT_USER_ID;
    state.forms.rule.auditUserIdRule = globalAuditUserId;
    state.forms.audit.auditUserId = globalAuditUserId;
    state.forms.detail.forEach((detailEntry) => {
      detailEntry.auditUserIdDetail = globalAuditUserId;
    });
    state.forms.detailAudits.forEach((auditEntry) => {
      auditEntry.auditUserId = globalAuditUserId;
    });
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(config.STORAGE_KEY);
      if (!raw) {
        return config.createDefaultState();
      }
      const parsed = JSON.parse(raw);
      const defaults = config.createDefaultState();
      const parsedForms = parsed.forms || {};
      const parsedDetail = parsedForms.detail;
      const parsedAudit = parsedForms.audit;
      const detailArray = Array.isArray(parsedDetail)
        ? parsedDetail
        : [parsedDetail || config.createDefaultDetail()];
      const detailAuditsArray = Array.isArray(parsedForms.detailAudits)
        ? parsedForms.detailAudits
        : [parsedAudit || config.createDefaultDetailAudit()];

      const state = {
        mode: parsed.mode || defaults.mode,
        settings: { ...defaults.settings, ...(parsed.settings || {}) },
        forms: {
          rule: { ...defaults.forms.rule, ...(parsedForms.rule || {}) },
          detail: detailArray.map((entry) => ({ ...config.createDefaultDetail(), ...entry })),
          detailAudits: detailAuditsArray.map((entry, index) => ({
            ...config.createDefaultDetailAudit(),
            ...(index === 0 && !Array.isArray(parsedForms.detailAudits) && parsedAudit ? parsedAudit : {}),
            ...entry
          })),
          audit: { ...defaults.forms.audit, ...(parsedAudit || {}) }
        },
        generatedSql: parsed.generatedSql || "",
        editorSql: parsed.editorSql || ""
      };

      ensureDetailCollections(state);
      syncAuditUserId(state);
      return state;
    } catch (error) {
      return config.createDefaultState();
    }
  }

  function persistState(state) {
    localStorage.setItem(config.STORAGE_KEY, JSON.stringify(state));
  }

  function resetModeDefaults(state) {
    const defaults = config.createDefaultState();
    state.forms[state.mode] = utils.clone(defaults.forms[state.mode]);
    if (state.mode === "rule") {
      state.forms.audit = utils.clone(defaults.forms.audit);
    } else {
      state.forms.detailAudits = utils.clone(defaults.forms.detailAudits);
    }
    ensureDetailCollections(state);
    syncAuditUserId(state);
  }

  function resetAllState(state) {
    const defaults = config.createDefaultState();
    Object.assign(state, utils.clone(defaults));
    ensureDetailCollections(state);
    syncAuditUserId(state);
  }

  window.PricingRuleState = {
    ensureDetailCollections,
    syncAuditUserId,
    loadState,
    persistState,
    resetModeDefaults,
    resetAllState
  };
}());
