(function () {
  const config = window.PricingRuleConfig;
  const utils = window.PricingRuleUtils;

  function shouldValidateManualId(field, values) {
    return !field.idModeKey || (values[field.idModeKey] || "manual") === "manual";
  }

  function validateRule(state) {
    for (let ruleIndex = 0; ruleIndex < state.forms.ruleEntries.length; ruleIndex += 1) {
      const currentValues = state.forms.ruleEntries[ruleIndex].rule;
      const auditValues = state.forms.ruleEntries[ruleIndex].audit;

      for (const field of config.FIELD_SCHEMAS.rule.fields) {
        const validateValue = shouldValidateManualId(field, currentValues);
        if (field.required && validateValue && utils.isBlank(currentValues[field.key])) {
          return { valid: false, message: "Falta completar " + field.label + " de pricing_rule #" + (ruleIndex + 1) + "." };
        }
        if (validateValue && field.type === "number" && !utils.isBlank(currentValues[field.key]) && !utils.isNumeric(currentValues[field.key])) {
          return { valid: false, message: field.label + " de pricing_rule #" + (ruleIndex + 1) + " debe ser numérico." };
        }
      }

      for (const field of config.AUDIT_FIELDS) {
        const value = auditValues[field.key];
        const validateValue = shouldValidateManualId(field, auditValues);
        if (field.required && validateValue && utils.isBlank(value)) {
          return { valid: false, message: "Falta completar " + field.label + " del audit_log de pricing_rule #" + (ruleIndex + 1) + "." };
        }
        if (validateValue && field.type === "number" && !utils.isBlank(value) && !utils.isNumeric(value)) {
          return { valid: false, message: field.label + " del audit_log de pricing_rule #" + (ruleIndex + 1) + " debe ser numérico." };
        }
      }
    }

    return { valid: true };
  }

  function validateDetail(state) {
    for (let blockIndex = 0; blockIndex < state.forms.detailBlocks.length; blockIndex += 1) {
      const blockValues = state.forms.detailBlocks[blockIndex];

      for (const field of config.DETAIL_BLOCK_FIELDS) {
        if (field.required && utils.isBlank(blockValues[field.key])) {
          return { valid: false, message: "Falta completar " + field.label + " del bloque #" + (blockIndex + 1) + "." };
        }
        if (field.type === "number" && !utils.isBlank(blockValues[field.key]) && !utils.isNumeric(blockValues[field.key])) {
          return { valid: false, message: field.label + " del bloque #" + (blockIndex + 1) + " debe ser numérico." };
        }
      }

      for (let entryIndex = 0; entryIndex < blockValues.entries.length; entryIndex += 1) {
        const detailValues = blockValues.entries[entryIndex].detail;
        const auditValues = blockValues.entries[entryIndex].audit;

        for (const field of config.FIELD_SCHEMAS.detail.fields) {
          const validateValue = shouldValidateManualId(field, detailValues);
          if (field.required && validateValue && utils.isBlank(detailValues[field.key])) {
            return { valid: false, message: "Falta completar " + field.label + " del pricing_rule_detail #" + (entryIndex + 1) + " del bloque #" + (blockIndex + 1) + "." };
          }
          if (validateValue && field.type === "number" && !utils.isBlank(detailValues[field.key]) && !utils.isNumeric(detailValues[field.key])) {
            return { valid: false, message: field.label + " del pricing_rule_detail #" + (entryIndex + 1) + " del bloque #" + (blockIndex + 1) + " debe ser numérico." };
          }
        }

        for (const field of config.AUDIT_FIELDS) {
          const value = auditValues[field.key];
          const validateValue = shouldValidateManualId(field, auditValues);
          if (field.required && validateValue && utils.isBlank(value)) {
            return { valid: false, message: "Falta completar " + field.label + " del audit_log #" + (entryIndex + 1) + " del bloque #" + (blockIndex + 1) + "." };
          }
          if (validateValue && field.type === "number" && !utils.isBlank(value) && !utils.isNumeric(value)) {
            return { valid: false, message: field.label + " del audit_log #" + (entryIndex + 1) + " del bloque #" + (blockIndex + 1) + " debe ser numérico." };
          }
        }
      }
    }

    return { valid: true };
  }

  function validateCurrentForm(state) {
    return state.mode === "rule" ? validateRule(state) : validateDetail(state);
  }

  window.PricingRuleValidators = {
    validateCurrentForm
  };
}());
