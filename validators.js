(function () {
  const config = window.PricingRuleConfig;
  const utils = window.PricingRuleUtils;

  function shouldValidateManualId(field, values) {
    return !field.idModeKey || (values[field.idModeKey] || "manual") === "manual";
  }

  function validateRule(state) {
    const currentValues = state.forms.rule;

    for (const field of config.FIELD_SCHEMAS.rule.fields) {
      const validateValue = shouldValidateManualId(field, currentValues);
      if (field.required && validateValue && utils.isBlank(currentValues[field.key])) {
        return { valid: false, message: "Falta completar " + field.label + "." };
      }
      if (validateValue && field.type === "number" && !utils.isBlank(currentValues[field.key]) && !utils.isNumeric(currentValues[field.key])) {
        return { valid: false, message: field.label + " debe ser numérico." };
      }
    }

    for (const field of config.AUDIT_FIELDS) {
      const value = state.forms.audit[field.key];
      const validateValue = shouldValidateManualId(field, state.forms.audit);
      if (field.required && validateValue && utils.isBlank(value)) {
        return { valid: false, message: "Falta completar " + field.label + " del audit_log." };
      }
      if (validateValue && field.type === "number" && !utils.isBlank(value) && !utils.isNumeric(value)) {
        return { valid: false, message: field.label + " del audit_log debe ser numérico." };
      }
    }

    return { valid: true };
  }

  function validateDetail(state) {
    for (let index = 0; index < state.forms.detail.length; index += 1) {
      const detailValues = state.forms.detail[index];
      const auditValues = state.forms.detailAudits[index];

      for (const field of config.FIELD_SCHEMAS.detail.fields) {
        const validateValue = shouldValidateManualId(field, detailValues);
        if (field.required && validateValue && utils.isBlank(detailValues[field.key])) {
          return { valid: false, message: "Falta completar " + field.label + " de pricing_rule_detail #" + (index + 1) + "." };
        }
        if (validateValue && field.type === "number" && !utils.isBlank(detailValues[field.key]) && !utils.isNumeric(detailValues[field.key])) {
          return { valid: false, message: field.label + " de pricing_rule_detail #" + (index + 1) + " debe ser numérico." };
        }
      }

      for (const field of config.AUDIT_FIELDS) {
        const value = auditValues[field.key];
        const validateValue = shouldValidateManualId(field, auditValues);
        if (field.required && validateValue && utils.isBlank(value)) {
          return { valid: false, message: "Falta completar " + field.label + " del audit_log #" + (index + 1) + "." };
        }
        if (validateValue && field.type === "number" && !utils.isBlank(value) && !utils.isNumeric(value)) {
          return { valid: false, message: field.label + " del audit_log #" + (index + 1) + " debe ser numérico." };
        }
      }

      if (utils.isBlank(detailValues.pricingRuleId)) {
        return { valid: false, message: "pricing_rule_detail #" + (index + 1) + " necesita un PRICING_RULE_ID existente." };
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
