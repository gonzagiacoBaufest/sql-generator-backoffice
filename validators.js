(function () {
  const config = window.PricingRuleConfig;
  const utils = window.PricingRuleUtils;

  function shouldValidateManualId(field, values) {
    return !field.idModeKey || (values[field.idModeKey] || "manual") === "manual";
  }

  function addFieldError(result, key, message) {
    if (!result.message) {
      result.message = message;
    }
    result.fieldErrors[key] = message;
  }

  function validateFieldConstraints(field, value) {
    if (utils.isBlank(value)) {
      return null;
    }

    const trimmed = String(value).trim();

    if (field.maxBytes && utils.byteLength(trimmed) > field.maxBytes) {
      return field.label + " supera el maximo de " + field.maxBytes + " caracteres.";
    }

    if (field.maxDigits !== undefined) {
      if (!utils.isNumeric(trimmed)) {
        return field.label + " debe ser numerico.";
      }

      const numericMatch = trimmed.match(/^-?(\d+)(?:\.(\d+))?$/);
      if (!numericMatch) {
        return field.label + " debe ser numerico.";
      }

      const integerDigits = numericMatch[1].length;
      const decimalDigits = numericMatch[2] ? numericMatch[2].length : 0;
      const totalDigits = integerDigits + decimalDigits;

      if ((field.maxScale || 0) === 0 && decimalDigits > 0) {
        return field.label + " no admite decimales.";
      }

      if (field.maxScale !== undefined && decimalDigits > field.maxScale) {
        return field.label + " admite hasta " + field.maxScale + " decimales.";
      }

      if (totalDigits > field.maxDigits) {
        return field.label + " admite hasta " + field.maxDigits + " digitos en total.";
      }

      if (field.maxScale !== undefined && field.maxScale > 0) {
        const maxIntegerDigits = field.maxDigits - field.maxScale;
        if (integerDigits > maxIntegerDigits) {
          return field.label + " admite hasta " + maxIntegerDigits + " digitos enteros.";
        }
      }
    }

    return null;
  }

  function validateSingleField(result, field, value, containerValues, key, missingMessage) {
    const validateValue = shouldValidateManualId(field, containerValues);
    if (field.required && validateValue && utils.isBlank(value)) {
      addFieldError(result, key, missingMessage);
      return;
    }

    if (!validateValue) {
      return;
    }

    if (field.type === "number" && !utils.isBlank(value) && !utils.isNumeric(value)) {
      addFieldError(result, key, field.label + " debe ser numerico.");
      return;
    }

    const constraintMessage = validateFieldConstraints(field, value);
    if (constraintMessage) {
      addFieldError(result, key, constraintMessage);
    }
  }

  function validateRule(state) {
    const result = { valid: true, message: "", fieldErrors: {} };

    for (let ruleIndex = 0; ruleIndex < state.forms.ruleEntries.length; ruleIndex += 1) {
      const currentValues = state.forms.ruleEntries[ruleIndex].rule;
      const auditValues = state.forms.ruleEntries[ruleIndex].audit;

      for (const field of config.FIELD_SCHEMAS.rule.fields) {
        validateSingleField(
          result,
          field,
          currentValues[field.key],
          currentValues,
          "ruleEntries." + ruleIndex + ".rule." + field.key,
          "Falta completar " + field.label + " de pricing_rule #" + (ruleIndex + 1) + "."
        );
      }

      for (const field of config.AUDIT_FIELDS) {
        validateSingleField(
          result,
          field,
          auditValues[field.key],
          auditValues,
          "ruleEntries." + ruleIndex + ".audit." + field.key,
          "Falta completar " + field.label + " del audit_log de pricing_rule #" + (ruleIndex + 1) + "."
        );
      }
    }

    result.valid = Object.keys(result.fieldErrors).length === 0;
    return result;
  }

  function validateDetail(state) {
    const result = { valid: true, message: "", fieldErrors: {} };

    for (let blockIndex = 0; blockIndex < state.forms.detailBlocks.length; blockIndex += 1) {
      const blockValues = state.forms.detailBlocks[blockIndex];

      for (const field of config.DETAIL_BLOCK_FIELDS) {
        validateSingleField(
          result,
          field,
          blockValues[field.key],
          blockValues,
          "detailBlocks." + blockIndex + "." + field.key,
          "Falta completar " + field.label + " del bloque #" + (blockIndex + 1) + "."
        );
      }

      for (let entryIndex = 0; entryIndex < blockValues.entries.length; entryIndex += 1) {
        const detailValues = blockValues.entries[entryIndex].detail;
        const auditValues = blockValues.entries[entryIndex].audit;

        for (const field of config.FIELD_SCHEMAS.detail.fields) {
          validateSingleField(
            result,
            field,
            detailValues[field.key],
            detailValues,
            "detailBlocks." + blockIndex + ".entries." + entryIndex + ".detail." + field.key,
            "Falta completar " + field.label + " del pricing_rule_detail #" + (entryIndex + 1) + " del bloque #" + (blockIndex + 1) + "."
          );
        }

        for (const field of config.AUDIT_FIELDS) {
          validateSingleField(
            result,
            field,
            auditValues[field.key],
            auditValues,
            "detailBlocks." + blockIndex + ".entries." + entryIndex + ".audit." + field.key,
            "Falta completar " + field.label + " del audit_log #" + (entryIndex + 1) + " del bloque #" + (blockIndex + 1) + "."
          );
        }
      }
    }

    result.valid = Object.keys(result.fieldErrors).length === 0;
    return result;
  }

  function validateCurrentForm(state) {
    return state.mode === "rule" ? validateRule(state) : validateDetail(state);
  }

  window.PricingRuleValidators = {
    validateCurrentForm
  };
}());
