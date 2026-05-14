(function () {
  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function isBlank(value) {
    return value === null || value === undefined || String(value).trim() === "";
  }

  function isNumeric(value) {
    return /^-?\d+(\.\d+)?$/.test(String(value).trim());
  }

  function todayDate() {
    return new Date().toISOString().slice(0, 10);
  }

  function nowDateTimeLocal() {
    const now = new Date();
    const offset = now.getTimezoneOffset();
    const local = new Date(now.getTime() - offset * 60000);
    return local.toISOString().slice(0, 16);
  }

  function addHoursDateTimeLocal(hoursOffset) {
    const now = new Date();
    const shifted = new Date(now.getTime() + hoursOffset * 60 * 60 * 1000);
    const offset = shifted.getTimezoneOffset();
    const local = new Date(shifted.getTime() - offset * 60000);
    return local.toISOString().slice(0, 16);
  }

  function nextDateTimeLocal(daysAhead) {
    const now = new Date();
    const future = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);
    const offset = future.getTimezoneOffset();
    const local = new Date(future.getTime() - offset * 60000);
    return local.toISOString().slice(0, 16);
  }

  function normalizeDateTime(value) {
    return String(value).trim().replace("T", " ") + (String(value).trim().length === 10 ? " 00:00:00" : ":00");
  }

  function isOracleSysdate(value) {
    return String(value).trim().toUpperCase() === "SYSDATE";
  }

  function escapeSql(value) {
    return value.replace(/'/g, "''");
  }

  window.PricingRuleUtils = {
    clone,
    isBlank,
    isNumeric,
    todayDate,
    nowDateTimeLocal,
    addHoursDateTimeLocal,
    nextDateTimeLocal,
    normalizeDateTime,
    isOracleSysdate,
    escapeSql
  };
}());
