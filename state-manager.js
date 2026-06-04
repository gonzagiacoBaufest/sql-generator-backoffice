(function () {
  const config = window.PricingRuleConfig;
  const utils = window.PricingRuleUtils;

  function createNormalizedRuleEntry(entry) {
    const rule = entry && entry.rule ? entry.rule : entry || {};
    const audit = entry && entry.audit ? entry.audit : {};

    return {
      rule: { ...config.createDefaultRuleValues(), ...rule },
      audit: { ...config.createDefaultRuleAudit(), ...audit }
    };
  }

  function migrateLegacyRuleEntries(parsedRule, parsedAudit) {
    return [createNormalizedRuleEntry({
      rule: parsedRule || config.createDefaultRuleValues(),
      audit: parsedAudit || config.createDefaultRuleAudit()
    })];
  }

  function createNormalizedBlockEntry(entry) {
    const detail = entry && entry.detail ? entry.detail : entry || {};
    const audit = entry && entry.audit ? entry.audit : {};

    return {
      detail: { ...config.createDefaultDetail(), ...detail },
      audit: { ...config.createDefaultDetailAudit(), ...audit }
    };
  }

  function createNormalizedBlock(block) {
    const normalizedEntries = Array.isArray(block && block.entries)
      ? block.entries.map((entry) => createNormalizedBlockEntry(entry))
      : [createNormalizedBlockEntry()];

    return {
      ...config.createDefaultDetailBlock(),
      ...(block || {}),
      entries: normalizedEntries.length > 0 ? normalizedEntries : [createNormalizedBlockEntry()]
    };
  }

  function migrateLegacyDetailBlocks(detailArray, detailAuditsArray) {
    const blocks = [];
    const blockByRuleId = new Map();

    detailArray.forEach((entry, index) => {
      const pricingRuleId = entry.pricingRuleId || "";
      const blockKey = pricingRuleId || "__blank__";
      let block = blockByRuleId.get(blockKey);

      if (!block) {
        block = config.createDefaultDetailBlock();
        block.pricingRuleId = pricingRuleId;
        block.entries = [];
        blockByRuleId.set(blockKey, block);
        blocks.push(block);
      }

      const detail = { ...config.createDefaultDetail(), ...entry };
      delete detail.pricingRuleId;

      block.entries.push({
        detail,
        audit: { ...config.createDefaultDetailAudit(), ...(detailAuditsArray[index] || {}) }
      });
    });

    return blocks.length > 0 ? blocks.map((block) => createNormalizedBlock(block)) : [config.createDefaultDetailBlock()];
  }

  function ensureDetailCollections(state) {
    if (!state.forms || !Array.isArray(state.forms.ruleEntries)) {
      state.forms.ruleEntries = [config.createDefaultRuleEntry()];
    }

    state.forms.ruleEntries = state.forms.ruleEntries.map((entry) => createNormalizedRuleEntry(entry));
    if (state.forms.ruleEntries.length === 0) {
      state.forms.ruleEntries.push(config.createDefaultRuleEntry());
    }

    if (!state.forms || !Array.isArray(state.forms.detailBlocks)) {
      state.forms.detailBlocks = [config.createDefaultDetailBlock()];
    }

    state.forms.detailBlocks = state.forms.detailBlocks.map((block) => createNormalizedBlock(block));
    if (state.forms.detailBlocks.length === 0) {
      state.forms.detailBlocks.push(config.createDefaultDetailBlock());
    }

    if (!state.ui) {
      state.ui = { activeRuleIndex: 0, activeDetailBlockIndex: 0 };
    }

    if (!state.ui.collapsedEntries || typeof state.ui.collapsedEntries !== "object") {
      state.ui.collapsedEntries = {};
    }

    const maxRuleIndex = state.forms.ruleEntries.length - 1;
    const requestedRuleIndex = Number(state.ui.activeRuleIndex || 0);
    state.ui.activeRuleIndex = Math.min(Math.max(requestedRuleIndex, 0), maxRuleIndex);

    const maxIndex = state.forms.detailBlocks.length - 1;
    const requestedIndex = Number(state.ui.activeDetailBlockIndex || 0);
    state.ui.activeDetailBlockIndex = Math.min(Math.max(requestedIndex, 0), maxIndex);
  }

  function syncAuditUserId(state) {
    const globalAuditUserId = (state.settings && state.settings.globalAuditUserId) || config.DEFAULT_AUDIT_USER_ID;
    state.forms.ruleEntries.forEach((entry) => {
      entry.rule.auditUserIdRule = globalAuditUserId;
      entry.audit.auditUserId = globalAuditUserId;
    });
    state.forms.detailBlocks.forEach((block) => {
      block.entries.forEach((entry) => {
        entry.detail.auditUserIdDetail = globalAuditUserId;
        entry.audit.auditUserId = globalAuditUserId;
      });
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
      const parsedRule = parsedForms.rule;
      const parsedDetail = parsedForms.detail;
      const parsedAudit = parsedForms.audit;
      const ruleEntries = Array.isArray(parsedForms.ruleEntries)
        ? parsedForms.ruleEntries.map((entry) => createNormalizedRuleEntry(entry))
        : migrateLegacyRuleEntries(parsedRule, parsedAudit);
      const detailArray = Array.isArray(parsedDetail)
        ? parsedDetail
        : [parsedDetail || config.createDefaultDetail()];
      const detailAuditsArray = Array.isArray(parsedForms.detailAudits)
        ? parsedForms.detailAudits
        : [parsedAudit || config.createDefaultDetailAudit()];
      const detailBlocks = Array.isArray(parsedForms.detailBlocks)
        ? parsedForms.detailBlocks.map((block) => createNormalizedBlock(block))
        : migrateLegacyDetailBlocks(detailArray, detailAuditsArray);

      const state = {
        mode: parsed.mode || defaults.mode,
        settings: { ...defaults.settings, ...(parsed.settings || {}) },
        forms: {
          ruleEntries,
          detailBlocks,
        },
        ui: { ...defaults.ui, ...(parsed.ui || {}) },
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
    if (state.mode === "rule") {
      ensureDetailCollections(state);
      state.forms.ruleEntries = state.forms.ruleEntries.map(() => config.createDefaultRuleEntry());
      state.ui.activeRuleIndex = 0;
    } else {
      ensureDetailCollections(state);
      const activeBlock = state.forms.detailBlocks[state.ui.activeDetailBlockIndex];
      const resetBlock = config.createDefaultDetailBlock();
      resetBlock.entries = activeBlock.entries.map(() => ({
        detail: config.createDefaultDetail(),
        audit: config.createDefaultDetailAudit()
      }));
      state.forms.detailBlocks[state.ui.activeDetailBlockIndex] = resetBlock;
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
