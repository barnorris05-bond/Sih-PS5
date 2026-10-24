import { loadRulePack } from "./rules.js";
import { runRuleTests } from "./rules.js";
const rule = loadRulePack("../../../rules/aph-2024-27").find((r) => r.id === "faculty_count_form_vs_roster");
console.log("tests:", JSON.stringify(rule, null, 2));
console.log("runRuleTests:", runRuleTests(rule));
