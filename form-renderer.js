(function () {
  const config = window.PricingRuleConfig;

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
      if (renderOptions.index !== undefined) {
        input.dataset.index = String(renderOptions.index);
      }
      if (field.required) {
        input.setAttribute("aria-required", "true");
      }

      wrapper.append(label, inputFragment);

      if (field.note) {
        const note = document.createElement("div");
        note.className = "field-note";
        note.textContent = field.note;
        wrapper.appendChild(note);
      }

      container.appendChild(wrapper);
    });
  }

  function renderDetailEntries(state, detailStack) {
    detailStack.innerHTML = "";
    state.forms.detail.forEach((detailValues, index) => {
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
      auditFieldsGrid.id = "detailAuditGrid-" + index;

      renderFields(detailGrid, config.FIELD_SCHEMAS.detail.fields, detailValues, {
        bucket: "detail",
        index,
        idPrefix: "detail-" + index
      });
      renderFields(auditFieldsGrid, config.AUDIT_FIELDS, state.forms.detailAudits[index], {
        bucket: "detailAudits",
        index,
        idPrefix: "detail-audit-" + index
      });

      auditSection.append(auditTitle, auditFieldsGrid);
      entry.append(title, detailGrid, auditSection);
      detailStack.appendChild(entry);
    });
  }

  window.PricingRuleRenderer = {
    renderFields,
    renderDetailEntries
  };
}());
