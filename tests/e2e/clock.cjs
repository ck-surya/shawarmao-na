// Only the isolated E2E server uses this clock; no production code reads a test bypass.
// Keep timers and Date.now real while default restaurant date stays in open hours.
const RealDate = Date;
global.Date = class extends RealDate {
  constructor(...args) {
    super(...(args.length ? args : ["2026-09-22T10:00:00Z"]));
  }
};
