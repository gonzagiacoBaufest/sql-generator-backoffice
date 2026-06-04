import { beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

function loadBrowserScript(fileName) {
  const scriptPath = path.resolve(process.cwd(), fileName);
  const scriptContent = fs.readFileSync(scriptPath, 'utf8');
  window.eval(scriptContent);
}

describe('PricingRuleValidators', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    delete window.PricingRuleUtils;
    delete window.PricingRuleConfig;
    delete window.PricingRuleValidators;
    vi.restoreAllMocks();

    loadBrowserScript('utils.js');
    loadBrowserScript('config.js');
    loadBrowserScript('validators.js');
  });

  it('rechaza AUDIT_USER_ID con mas de 10 caracteres', () => {
    const state = window.PricingRuleConfig.createDefaultState();
    state.forms.ruleEntries[0].audit.auditUserId = 'ABCDEFGHIJK';

    const result = window.PricingRuleValidators.validateCurrentForm(state);

    expect(result.valid).toBe(false);
    expect(result.fieldErrors['ruleEntries.0.audit.auditUserId']).toContain('maximo de 10');
  });

  it('rechaza TOTAL_FEE_NUMBER con mas de 2 decimales', () => {
    const state = window.PricingRuleConfig.createDefaultState();
    state.forms.ruleEntries[0].rule.totalFeeNumber = '123.456';

    const result = window.PricingRuleValidators.validateCurrentForm(state);

    expect(result.valid).toBe(false);
    expect(result.fieldErrors['ruleEntries.0.rule.totalFeeNumber']).toContain('hasta 2 decimales');
  });

  it('no exige PRICING_RULE_ID manual cuando el modo es auto', () => {
    const state = window.PricingRuleConfig.createDefaultState();
    state.forms.ruleEntries[0].rule.pricingRuleId = '';
    state.forms.ruleEntries[0].rule.pricingRuleIdMode = 'auto';

    const result = window.PricingRuleValidators.validateCurrentForm(state);

    expect(result.fieldErrors['ruleEntries.0.rule.pricingRuleId']).toBeUndefined();
  });

  it('acepta un estado rule valido cuando los ids requeridos estan completos', () => {
    const state = window.PricingRuleConfig.createDefaultState();
    state.forms.ruleEntries[0].rule.pricingRuleId = '123';
    state.forms.ruleEntries[0].audit.auditLogId = '456';

    const result = window.PricingRuleValidators.validateCurrentForm(state);

    expect(result.valid).toBe(true);
    expect(result.fieldErrors).toEqual({});
  });
});
