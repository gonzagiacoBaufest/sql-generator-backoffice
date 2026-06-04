(function () {
  const config = window.PricingRuleConfig;
  const utils = window.PricingRuleUtils;
  const validators = window.PricingRuleValidators;
  const sql = window.PricingRuleSql;
  const stateManager = window.PricingRuleState;
  const renderer = window.PricingRuleRenderer;

  const state = stateManager.loadState();
  let lastGeneratedSql = state.generatedSql || "";

  const generatorForm = document.getElementById("generatorForm");
  const fieldGrid = document.getElementById("fieldGrid");
  const ruleNav = document.getElementById("ruleNav");
  const auditGrid = document.getElementById("auditGrid");
  const auditPanel = document.getElementById("auditPanel");
  const detailStack = document.getElementById("detailStack");
  const detailEntryControls = document.getElementById("detailEntryControls");
  const detailControls = document.getElementById("detailControls");
  const floatingPrimaryLabel = document.getElementById("floatingPrimaryLabel");
  const addDetailButton = document.getElementById("addDetailButton");
  const removeDetailButton = document.getElementById("removeDetailButton");
  const addDetailEntryButton = document.getElementById("addDetailEntryButton");
  const removeDetailEntryButton = document.getElementById("removeDetailEntryButton");
  const sqlEditor = document.getElementById("sqlEditor");
  const formTitle = document.getElementById("formTitle");
  const entityBadge = document.getElementById("entityBadge");
  const editorSummary = document.getElementById("editorSummary");
  const formStatus = document.getElementById("formStatus");
  const editorStatus = document.getElementById("editorStatus");
  const restoreDefaultsButton = document.getElementById("restoreDefaultsButton");
  const clearEditorButton = document.getElementById("clearEditorButton");
  const copySqlButton = document.getElementById("copySqlButton");
  const globalAuditUserIdInput = document.getElementById("globalAuditUserId");
  const globalTablePrefixInput = document.getElementById("globalTablePrefix");

  function setFormStatus(message, tone) {
    formStatus.textContent = message;
    formStatus.className = "status " + tone;
  }

  function setEditorStatus(message, tone) {
    editorStatus.textContent = message;
    editorStatus.className = "status " + tone;
  }

  function clearStatus() {
    formStatus.textContent = "";
    formStatus.className = "status";
    editorStatus.textContent = "";
    editorStatus.className = "status";
  }

  function syncValidationUi(validation) {
    const validationResult = validation || validators.validateCurrentForm(state);
    const fieldErrors = validationResult.fieldErrors || {};

    generatorForm.querySelectorAll(".field").forEach((fieldWrapper) => {
      const input = fieldWrapper.querySelector("[data-error-key]");
      if (!input || !input.dataset.errorKey) {
        return;
      }

      const message = fieldErrors[input.dataset.errorKey] || "";
      const errorNode = fieldWrapper.querySelector(".field-error");

      fieldWrapper.classList.toggle("invalid", Boolean(message));
      input.classList.toggle("invalid", Boolean(message));
      input.setAttribute("aria-invalid", message ? "true" : "false");

      if (errorNode) {
        errorNode.textContent = message;
      }
    });

    return validationResult;
  }

  function findFormBucket(fieldName) {
    if (config.AUDIT_FIELDS.some((field) => field.key === fieldName)) {
      return "audit";
    }
    return state.mode;
  }

  function buildRuleTitle(entryValues, index) {
    const pricingRuleId = String(entryValues.rule.pricingRuleId || "").trim();
    return pricingRuleId ? "pricing_rule #" + (index + 1) + " - PRICING_RULE_ID " + pricingRuleId : "pricing_rule #" + (index + 1);
  }

  function buildBlockTitle(blockValues, index) {
    const pricingRuleId = String(blockValues.pricingRuleId || "").trim();
    return pricingRuleId ? "Bloque " + (index + 1) + " - PRICING_RULE_ID " + pricingRuleId : "Bloque " + (index + 1);
  }

  function updateRuleEntryTitle(ruleIndex) {
    const title = ruleNav.querySelector("#ruleGrid-" + ruleIndex)?.closest("section")?.querySelector(":scope > .detail-entry-title");
    if (title) {
      title.textContent = buildRuleTitle(state.forms.ruleEntries[ruleIndex], ruleIndex);
    }
  }

  function updateDetailBlockTitles(blockIndex) {
    const blockValues = state.forms.detailBlocks[blockIndex];
    const blockTab = detailStack.querySelector("[data-block-tab-index=\"" + blockIndex + "\"]");
    if (blockTab) {
      blockTab.textContent = buildBlockTitle(blockValues, blockIndex);
    }

    if (blockIndex === state.ui.activeDetailBlockIndex) {
      const blockTitle = detailStack.querySelector(".detail-block-header .detail-entry-title");
      if (blockTitle) {
        blockTitle.textContent = buildBlockTitle(blockValues, blockIndex);
      }
    }
  }

  function render() {
    const schema = config.FIELD_SCHEMAS[state.mode];
    stateManager.ensureDetailCollections(state);
    stateManager.syncAuditUserId(state);
    globalAuditUserIdInput.value = state.settings.globalAuditUserId || "";
    globalTablePrefixInput.value = state.settings.globalTablePrefix || config.DEFAULT_TABLE_PREFIX;
    formTitle.textContent = schema.title;
    entityBadge.textContent = "ENTITY_TYPE_ID " + schema.entityTypeId;
    editorSummary.textContent = schema.summary;
    detailControls.classList.remove("hidden");
    detailEntryControls.classList.toggle("hidden", state.mode !== "detail");
    fieldGrid.classList.add("hidden");
    ruleNav.classList.toggle("hidden", state.mode !== "rule");
    auditPanel.classList.add("hidden");
    detailStack.classList.toggle("hidden", state.mode !== "detail");
    floatingPrimaryLabel.textContent = state.mode === "rule" ? "Pricing rule" : "Bloques";
    removeDetailButton.disabled = state.mode === "rule"
      ? state.forms.ruleEntries.length === 1
      : state.forms.detailBlocks.length === 1;
    addDetailEntryButton.disabled = state.mode !== "detail";
    removeDetailEntryButton.disabled = state.mode !== "detail"
      || state.forms.detailBlocks[state.ui.activeDetailBlockIndex].entries.length === 1;
    addDetailButton.setAttribute("aria-label", state.mode === "rule" ? "Agregar pricing_rule" : "Agregar bloque pricing_rule_detail");
    removeDetailButton.setAttribute("aria-label", state.mode === "rule" ? "Eliminar pricing_rule" : "Eliminar bloque pricing_rule_detail");

    document.querySelectorAll(".tab").forEach((tab) => {
      const isActive = tab.dataset.mode === state.mode;
      tab.classList.toggle("active", isActive);
      tab.setAttribute("aria-selected", String(isActive));
    });

    if (state.mode === "rule") {
      renderer.renderRuleEntries(state, ruleNav);
    } else {
      renderer.renderDetailEntries(state, detailStack);
    }

    sqlEditor.value = state.editorSql || lastGeneratedSql || "";
    syncValidationUi();
  }

  function regenerate() {
    const validation = validators.validateCurrentForm(state);
    syncValidationUi(validation);
    if (!validation.valid) {
      setFormStatus(validation.message, "error");
      return;
    }

    const generatedSql = state.mode === "rule" ? sql.generateRuleSql(state) : sql.generateDetailSql(state);
    lastGeneratedSql = generatedSql;
    state.generatedSql = generatedSql;
    state.editorSql = generatedSql;
    sqlEditor.value = generatedSql;
    stateManager.persistState(state);
    setFormStatus("SQL regenerado correctamente.", "success");
    setEditorStatus("El editor quedó sincronizado con la última versión generada.", "success");
  }

  function handleInputChange(event) {
    const target = event.target;
    if (!target.name) {
      return;
    }

    const formBucket = target.dataset.bucket || findFormBucket(target.name);
    const ruleIndex = target.dataset.ruleIndex === undefined ? null : Number(target.dataset.ruleIndex);
    const blockIndex = target.dataset.blockIndex === undefined ? null : Number(target.dataset.blockIndex);
    const index = target.dataset.index === undefined ? null : Number(target.dataset.index);

    if (formBucket === "settings") {
      state.settings[target.name] = target.value;
    } else if (formBucket === "ruleEntries" && ruleIndex !== null) {
      state.forms.ruleEntries[ruleIndex].rule[target.name] = target.value;
    } else if (formBucket === "ruleEntryAudits" && ruleIndex !== null) {
      state.forms.ruleEntries[ruleIndex].audit[target.name] = target.value;
    } else if (formBucket === "detailBlocks" && blockIndex !== null) {
      state.forms.detailBlocks[blockIndex][target.name] = target.value;
    } else if (formBucket === "detailBlockDetails" && blockIndex !== null && index !== null) {
      state.forms.detailBlocks[blockIndex].entries[index].detail[target.name] = target.value;
    } else if (formBucket === "detailBlockAudits" && blockIndex !== null && index !== null) {
      state.forms.detailBlocks[blockIndex].entries[index].audit[target.name] = target.value;
    } else if (index === null) {
      state.forms[formBucket][target.name] = target.value;
    } else {
      state.forms[formBucket][index][target.name] = target.value;
    }

    if (target.name === "globalAuditUserId") {
      stateManager.syncAuditUserId(state);
      render();
    }

    if (target.name === "globalTablePrefix") {
      state.settings.globalTablePrefix = target.value;
      render();
    }

    if (target.name === "auditUserIdRule" || target.name === "auditUserIdDetail" || target.name === "auditUserId") {
      state.settings.globalAuditUserId = target.value;
      stateManager.syncAuditUserId(state);
      render();
    }

    if (formBucket === "ruleEntries" && target.name === "pricingRuleId" && ruleIndex !== null) {
      updateRuleEntryTitle(ruleIndex);
    }
    if (formBucket === "detailBlocks" && target.name === "pricingRuleId" && blockIndex !== null) {
      updateDetailBlockTitles(blockIndex);
    }

    stateManager.persistState(state);
    syncValidationUi();
  }

  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      state.mode = tab.dataset.mode;
      stateManager.ensureDetailCollections(state);
      stateManager.syncAuditUserId(state);
      clearStatus();
      render();
      stateManager.persistState(state);
    });
  });

  addDetailButton.addEventListener("click", () => {
    stateManager.ensureDetailCollections(state);
    if (state.mode === "rule") {
      const referenceEntry = state.forms.ruleEntries[0];
      const nextEntry = config.createDefaultRuleEntry();
      nextEntry.rule.pricingRuleIdMode = referenceEntry.rule.pricingRuleIdMode;
      nextEntry.audit.auditLogIdMode = referenceEntry.audit.auditLogIdMode;
      state.forms.ruleEntries.push(nextEntry);
      state.ui.activeRuleIndex = state.forms.ruleEntries.length - 1;
      stateManager.syncAuditUserId(state);
      clearStatus();
      render();
      stateManager.persistState(state);
      return;
    }

    state.forms.detailBlocks.push(config.createDefaultDetailBlock());
    state.ui.activeDetailBlockIndex = state.forms.detailBlocks.length - 1;
    stateManager.syncAuditUserId(state);
    clearStatus();
    render();
    stateManager.persistState(state);
  });

  removeDetailButton.addEventListener("click", () => {
    stateManager.ensureDetailCollections(state);
    if (state.mode === "rule") {
      if (state.forms.ruleEntries.length === 1) {
        return;
      }
      state.forms.ruleEntries.pop();
      state.ui.activeRuleIndex = Math.max(0, state.forms.ruleEntries.length - 1);
      clearStatus();
      render();
      stateManager.persistState(state);
      return;
    }

    if (state.forms.detailBlocks.length === 1) {
      return;
    }
    state.forms.detailBlocks.splice(state.ui.activeDetailBlockIndex, 1);
    state.ui.activeDetailBlockIndex = Math.max(0, state.ui.activeDetailBlockIndex - 1);
    clearStatus();
    render();
    stateManager.persistState(state);
  });

  addDetailEntryButton.addEventListener("click", () => {
    if (state.mode !== "detail") {
      return;
    }

    const activeBlock = state.forms.detailBlocks[state.ui.activeDetailBlockIndex];
    const referenceEntry = activeBlock.entries[0];
    const nextDetail = config.createDefaultDetail();
    const nextAudit = config.createDefaultDetailAudit();
    nextDetail.pricingRuleDetailIdMode = referenceEntry.detail.pricingRuleDetailIdMode;
    nextAudit.auditLogIdMode = referenceEntry.audit.auditLogIdMode;

    activeBlock.entries.push({
      detail: nextDetail,
      audit: nextAudit
    });
    stateManager.syncAuditUserId(state);
    clearStatus();
    render();
    stateManager.persistState(state);
  });

  removeDetailEntryButton.addEventListener("click", () => {
    if (state.mode !== "detail") {
      return;
    }

    const activeBlock = state.forms.detailBlocks[state.ui.activeDetailBlockIndex];
    if (activeBlock.entries.length === 1) {
      return;
    }

    activeBlock.entries.pop();
    clearStatus();
    render();
    stateManager.persistState(state);
  });

  detailStack.addEventListener("click", (event) => {
    const target = event.target.closest("button");
    if (!target) {
      return;
    }

    if (target.dataset.blockTabIndex !== undefined) {
      state.ui.activeDetailBlockIndex = Number(target.dataset.blockTabIndex);
      clearStatus();
      render();
      stateManager.persistState(state);
      return;
    }
  });

  generatorForm.addEventListener("input", handleInputChange);
  generatorForm.addEventListener("change", handleInputChange);
  globalAuditUserIdInput.addEventListener("input", handleInputChange);
  globalAuditUserIdInput.addEventListener("change", handleInputChange);
  globalTablePrefixInput.addEventListener("input", handleInputChange);
  globalTablePrefixInput.addEventListener("change", handleInputChange);
  generatorForm.addEventListener("submit", (event) => {
    event.preventDefault();
    regenerate();
  });

  sqlEditor.addEventListener("input", () => {
    state.editorSql = sqlEditor.value;
    stateManager.persistState(state);
  });

  restoreDefaultsButton.addEventListener("click", () => {
    stateManager.resetModeDefaults(state);
    clearStatus();
    render();
    stateManager.persistState(state);
    regenerate();
  });

  clearEditorButton.addEventListener("click", () => {
    sqlEditor.value = "";
    state.editorSql = "";
    stateManager.persistState(state);
    setEditorStatus("Editor limpio. Puedes pegar o regenerar una query nueva.", "success");
  });

  copySqlButton.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(sqlEditor.value);
      setEditorStatus("SQL copiado al portapapeles.", "success");
    } catch (error) {
      setEditorStatus("No se pudo copiar automáticamente. Usa Ctrl+C sobre el editor.", "error");
    }
  });

  render();
  if (!state.editorSql) {
    regenerate();
  } else {
    sqlEditor.value = state.editorSql;
  }

  window.PricingRuleApp = {
    render,
    regenerate,
    state
  };
}());
