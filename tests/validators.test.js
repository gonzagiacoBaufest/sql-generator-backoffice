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
    delete window.PricingRuleSql;
    delete window.PricingRuleValidators;
    vi.restoreAllMocks();

    loadBrowserScript('utils.js');
    loadBrowserScript('config.js');
    loadBrowserScript('sql-generator.js');
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

  it('expone las opciones de OBJECT_ENTITY_ID segun el ENTITY_TYPE_ID del detail', () => {
    expect(window.PricingRuleConfig.getDetailObjectEntityOptions('1')).toEqual([
      { value: '97', label: 'Confit. y Panader. = 97' },
      { value: '96', label: 'Carn/Gran/Pesc = 96' }
    ]);

    expect(window.PricingRuleConfig.getDetailObjectEntityOptions('6')).toEqual([
      { value: '1', label: 'credito' },
      { value: '2', label: 'debito' },
      { value: '3', label: 'prepaga' },
      { value: '4', label: 'nacional' },
      { value: '5', label: 'internacional' },
      { value: '6', label: 'un pago' },
      { value: '7', label: 'cuotas' }
    ]);
  });

  it('considera invalido un OBJECT_ENTITY_ID que no pertenece al ENTITY_TYPE_ID del detail', () => {
    expect(window.PricingRuleConfig.isValidDetailObjectEntityId('3', '2')).toBe(true);
    expect(window.PricingRuleConfig.isValidDetailObjectEntityId('3', '97')).toBe(false);
    expect(window.PricingRuleConfig.isValidDetailObjectEntityId('3', '')).toBe(true);
  });

  it('normaliza ENTITY_TYPE_ID legacy con signo al valor positivo', () => {
    expect(window.PricingRuleConfig.normalizeDetailEntityTypeId('-1')).toBe('1');
    expect(window.PricingRuleConfig.normalizeDetailEntityTypeId('-3')).toBe('3');
    expect(window.PricingRuleConfig.normalizeDetailEntityTypeId('4')).toBe('4');
  });

  it('usa la secuencia Q_ABKO configurada cuando la tabla se genera sin schema', () => {
    const state = window.PricingRuleConfig.createDefaultState();
    state.forms.ruleEntries[0].rule.pricingRuleName = 'Regla';
    state.forms.ruleEntries[0].rule.totalFeeNumber = '3.8';

    const sql = window.PricingRuleSql.generateRuleSql(state);

    expect(sql).toContain('SELECT ABKO.Q_ABKO_AUDIT_LOG.NEXTVAL INTO v_audit_log_id_r1 FROM DUAL;');
    expect(sql).toContain('SELECT ABKO.Q_ABKO_PRICING_RULE.NEXTVAL INTO v_pricing_rule_id_r1 FROM DUAL;');
    expect(sql).not.toContain('SELECT T_ABKO_AUDIT_LOG_SEQ.NEXTVAL');
    expect(sql).not.toContain('SELECT T_ABKO_PRICING_RULE_SEQ.NEXTVAL');
  });
});
