(function () {
  const config = window.PricingRuleConfig;

  function buildErrorKey(field, renderOptions) {
    if (renderOptions.bucket === "ruleEntries") {
      return "ruleEntries." + renderOptions.ruleIndex + ".rule." + field.key;
    }
    if (renderOptions.bucket === "ruleEntryAudits") {
      return "ruleEntries." + renderOptions.ruleIndex + ".audit." + field.key;
    }
    if (renderOptions.bucket === "detailBlocks") {
      return "detailBlocks." + renderOptions.blockIndex + "." + field.key;
    }
    if (renderOptions.bucket === "detailBlockDetails") {
      return "detailBlocks." + renderOptions.blockIndex + ".entries." + renderOptions.index + ".detail." + field.key;
    }
    if (renderOptions.bucket === "detailBlockAudits") {
      return "detailBlocks." + renderOptions.blockIndex + ".entries." + renderOptions.index + ".audit." + field.key;
    }
    return field.key;
  }

  function buildRuleTitle(entryValues, index) {
    const pricingRuleId = String(entryValues.rule.pricingRuleId || "").trim();
    return pricingRuleId ? "pricing_rule #" + (index + 1) + " - PRICING_RULE_ID " + pricingRuleId : "pricing_rule #" + (index + 1);
  }

  function buildBlockTitle(blockValues, index) {
    const pricingRuleId = String(blockValues.pricingRuleId || "").trim();
    return pricingRuleId ? "Bloque " + (index + 1) + " - PRICING_RULE_ID " + pricingRuleId : "Bloque " + (index + 1);
  }

  function buildIdModeControl(field, values, inputId) {
    const group = document.createElement("div");
    group.className = "id-mode-group";

    const modeSelect = document.createElement("select");
    modeSelect.id = inputId + "-mode";
    modeSelect.name = field.idModeKey;
    [
      { value: "manual", label: "Manual" },
      { value: "auto", label: "Ultimo id automatico" }
    ].forEach((optionValue) => {
      const option = document.createElement("option");
      option.value = optionValue.value;
      option.textContent = optionValue.label;
      modeSelect.appendChild(option);
    });
    modeSelect.value = values[field.idModeKey] || "manual";

    const valueInput = document.createElement("input");
    valueInput.type = field.type || "text";
    valueInput.id = inputId;
    valueInput.name = field.key;
    valueInput.value = values[field.key] ?? "";
    valueInput.placeholder = field.placeholder || "";
    valueInput.disabled = modeSelect.value === "auto";
    valueInput.className = "id-mode-value";
    if (field.step) {
      valueInput.step = field.step;
    }

    group.append(modeSelect, valueInput);
    return { group, input: valueInput, modeSelect };
  }

  function renderFields(container, fields, values, options) {
    const renderOptions = options || {};
    container.innerHTML = "";
    fields.forEach((field) => {
      const wrapper = document.createElement("div");
      wrapper.className = "field" + (field.full ? " full" : "");
      wrapper.style.setProperty("--field-width", (field.width || 120) + "px");

      const label = document.createElement("label");
      const inputId = renderOptions.idPrefix ? renderOptions.idPrefix + "-" + field.key : field.key;
      label.setAttribute("for", inputId);
      label.textContent = field.label + (field.required ? " *" : "");

      let input = field.type === "textarea"
        ? document.createElement("textarea")
        : document.createElement(field.type === "select" ? "select" : "input");
      let inputFragment = input;

      if (field.idModeKey) {
        const idModeControl = buildIdModeControl(field, values, inputId);
        input = idModeControl.input;
        inputFragment = idModeControl.group;
        if (renderOptions.bucket) {
          idModeControl.modeSelect.dataset.bucket = renderOptions.bucket;
        }
        if (renderOptions.ruleIndex !== undefined) {
          idModeControl.modeSelect.dataset.ruleIndex = String(renderOptions.ruleIndex);
        }
        if (renderOptions.blockIndex !== undefined) {
          idModeControl.modeSelect.dataset.blockIndex = String(renderOptions.blockIndex);
        }
        if (renderOptions.index !== undefined) {
          idModeControl.modeSelect.dataset.index = String(renderOptions.index);
        }
      }

      if (input.tagName === "INPUT") {
        input.type = field.type || "text";
        if (field.step) {
          input.step = field.step;
        }
      }

      if (input.tagName === "SELECT") {
        field.options.forEach((optionValue) => {
          const option = document.createElement("option");
          if (typeof optionValue === "object") {
            option.value = optionValue.value;
            option.textContent = optionValue.label;
          } else {
            option.value = optionValue;
            option.textContent = optionValue;
          }
          input.appendChild(option);
        });
      }

      input.id = inputId;
      input.name = field.key;
      if (!field.idModeKey) {
        input.value = values[field.key] ?? "";
        input.placeholder = field.placeholder || "";
      }
      if (renderOptions.bucket) {
        input.dataset.bucket = renderOptions.bucket;
      }
      if (renderOptions.ruleIndex !== undefined) {
        input.dataset.ruleIndex = String(renderOptions.ruleIndex);
      }
      if (renderOptions.blockIndex !== undefined) {
        input.dataset.blockIndex = String(renderOptions.blockIndex);
      }
      if (renderOptions.index !== undefined) {
        input.dataset.index = String(renderOptions.index);
      }
      if (field.required) {
        input.setAttribute("aria-required", "true");
      }

      input.dataset.errorKey = buildErrorKey(field, renderOptions);

      wrapper.append(label, inputFragment);

      if (field.note) {
        const note = document.createElement("div");
        note.className = "field-note";
        note.textContent = field.note;
        wrapper.appendChild(note);
      }

      const error = document.createElement("div");
      error.className = "field-error";
      error.dataset.errorKey = input.dataset.errorKey;
      error.setAttribute("aria-live", "polite");
      wrapper.appendChild(error);

      container.appendChild(wrapper);
    });
  }

  function renderDetailEntries(state, detailStack) {
    detailStack.innerHTML = "";

    const blockNav = document.createElement("div");
    blockNav.className = "detail-block-nav";

    const blockTabList = document.createElement("div");
    blockTabList.className = "detail-block-tablist";
    blockTabList.setAttribute("role", "tablist");
    blockTabList.setAttribute("aria-label", "Bloques de pricing_rule_detail");

    state.forms.detailBlocks.forEach((blockValues, index) => {
      const blockTab = document.createElement("button");
      const isActive = index === state.ui.activeDetailBlockIndex;
      blockTab.type = "button";
      blockTab.className = "detail-block-tab" + (isActive ? " active" : "");
      blockTab.dataset.blockTabIndex = String(index);
      blockTab.setAttribute("role", "tab");
      blockTab.setAttribute("aria-selected", String(isActive));
      blockTab.textContent = buildBlockTitle(blockValues, index);
      blockTabList.appendChild(blockTab);
    });

    blockNav.appendChild(blockTabList);
    detailStack.appendChild(blockNav);

    const activeBlock = state.forms.detailBlocks[state.ui.activeDetailBlockIndex];
    const activeBlockIndex = state.ui.activeDetailBlockIndex;
    const blockSection = document.createElement("section");
    blockSection.className = "detail-block-section";

    const blockHeader = document.createElement("div");
    blockHeader.className = "detail-block-header";

    const blockTitle = document.createElement("h3");
    blockTitle.className = "detail-entry-title";
    blockTitle.textContent = buildBlockTitle(activeBlock, activeBlockIndex);

    const blockActions = document.createElement("div");
    blockActions.className = "detail-entry-actions";

    const removeEntryButton = document.createElement("button");
    removeEntryButton.type = "button";
    removeEntryButton.className = "secondary detail-stepper";
    removeEntryButton.textContent = "-";
    removeEntryButton.dataset.action = "remove-detail-entry";
    removeEntryButton.disabled = activeBlock.entries.length === 1;
    removeEntryButton.setAttribute("aria-label", "Eliminar pricing_rule_detail del bloque activo");

    const addEntryButton = document.createElement("button");
    addEntryButton.type = "button";
    addEntryButton.className = "primary detail-stepper";
    addEntryButton.textContent = "+";
    addEntryButton.dataset.action = "add-detail-entry";
    addEntryButton.setAttribute("aria-label", "Agregar pricing_rule_detail al bloque activo");

    blockActions.append(removeEntryButton, addEntryButton);
    blockHeader.append(blockTitle, blockActions);

    const blockFields = document.createElement("div");
    blockFields.className = "form-grid detail-block-fields-grid";
    renderFields(blockFields, config.DETAIL_BLOCK_FIELDS, activeBlock, {
      bucket: "detailBlocks",
      blockIndex: activeBlockIndex,
      idPrefix: "detail-block-" + activeBlockIndex
    });

    blockSection.append(blockHeader, blockFields);

    activeBlock.entries.forEach((entryValues, index) => {
      const entry = document.createElement("section");
      entry.className = "detail-entry";

      const title = document.createElement("h3");
      title.className = "detail-entry-title";
      title.textContent = "pricing_rule_detail #" + (index + 1);

      const detailGrid = document.createElement("div");
      detailGrid.className = "form-grid detail-fields-grid";
      detailGrid.id = "detailGrid-" + index;

      const auditSection = document.createElement("div");
      auditSection.className = "subpanel";

      const auditTitle = document.createElement("h3");
      auditTitle.textContent = "Audit log #" + (index + 1);

      const auditFieldsGrid = document.createElement("div");
      auditFieldsGrid.className = "form-grid detail-audit-grid";
      auditFieldsGrid.id = "detailAuditGrid-" + activeBlockIndex + "-" + index;

      renderFields(detailGrid, config.FIELD_SCHEMAS.detail.fields, entryValues.detail, {
        bucket: "detailBlockDetails",
        blockIndex: activeBlockIndex,
        index,
        idPrefix: "detail-" + activeBlockIndex + "-" + index
      });
      renderFields(auditFieldsGrid, config.AUDIT_FIELDS, entryValues.audit, {
        bucket: "detailBlockAudits",
        blockIndex: activeBlockIndex,
        index,
        idPrefix: "detail-audit-" + activeBlockIndex + "-" + index
      });

      auditSection.append(auditTitle, auditFieldsGrid);
      entry.append(title, detailGrid, auditSection);
      blockSection.appendChild(entry);
    });

    detailStack.appendChild(blockSection);
  }

  function renderRuleEntries(state, container) {
    container.innerHTML = "";
    state.forms.ruleEntries.forEach((entryValues, index) => {
      const section = document.createElement("section");
      section.className = "detail-entry";

      const title = document.createElement("h3");
      title.className = "detail-entry-title";
      title.textContent = buildRuleTitle(entryValues, index);

      const ruleFieldsGrid = document.createElement("div");
      ruleFieldsGrid.className = "form-grid detail-fields-grid";
      ruleFieldsGrid.id = "ruleGrid-" + index;

      const auditSection = document.createElement("div");
      auditSection.className = "subpanel";

      const auditTitle = document.createElement("h3");
      auditTitle.textContent = "Audit log #" + (index + 1);

      const auditFieldsGrid = document.createElement("div");
      auditFieldsGrid.className = "form-grid detail-audit-grid";
      auditFieldsGrid.id = "ruleAuditGrid-" + index;

      renderFields(ruleFieldsGrid, config.FIELD_SCHEMAS.rule.fields, entryValues.rule, {
        bucket: "ruleEntries",
        ruleIndex: index,
        idPrefix: "rule-" + index
      });
      renderFields(auditFieldsGrid, config.AUDIT_FIELDS, entryValues.audit, {
        bucket: "ruleEntryAudits",
        ruleIndex: index,
        idPrefix: "rule-audit-" + index
      });

      auditSection.append(auditTitle, auditFieldsGrid);
      section.append(title, ruleFieldsGrid, auditSection);
      container.appendChild(section);
    });
  }

  window.PricingRuleRenderer = {
    renderFields,
    renderDetailEntries,
    renderRuleEntries
  };
}());
