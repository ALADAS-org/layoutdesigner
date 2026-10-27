// =====================================================================================
// ===============================  pattern_validate.js  ===============================
// =====================================================================================
// Semantic validator for .pattern files — complements pattern.schema.json (structure)
// with the checks a JSON Schema cannot express, all grounded in pattern_loader.js:
//   - $ref resolution      : every $Name resolves to a defined Variable
//   - macro arity          : $Name('a','b') matches the declared Name(p1,p2)
//   - prefix collision     : the textual preprocessor mis-hits when one var name is a
//                            prefix of another ($Digit inside $DigitMark)
//   - param scoping        : a Name(p) body uses only its own params or known vars
//   - cell coverage        : Shapes keys cover 0..MaxCellValue (skipped for text "*")
//   - quad colorPairs       : SquareQuadCell/TriangleQuadCell carry exactly 4 pairs
//
// Zero dependencies. Usage:
//   node pattern_validate.js file1.pattern [file2.pattern ...]
//   node pattern_validate.js ./patterns/*.pattern
// Exit code 0 if no ERROR, 1 otherwise (usable as a pre-commit hook).
"use strict";
const fs = require("fs");

const REF_RE = /\$([A-Za-z_][A-Za-z0-9_]*)(\(([^)]*)\))?/g;

// cell value -> Shapes key encoding (0..9 then A,B,...) as seen in Truchet_2
function valueToKey(n) {
	return n < 10 ? String(n) : String.fromCharCode("A".charCodeAt(0) + (n - 10));
}

function splitArgs(inside) {
	if (inside == null || inside.trim() === "") return [];
	// split on commas, strip quotes/spaces (matches loader's replaceAll("'","").replaceAll(" ",""))
	return inside.split(",").map(s => s.replace(/'/g, "").trim());
}

// collect $refs from any nested value; returns [{name, argc, hasParens}]
function collectRefs(node, out) {
	if (typeof node === "string") {
		let m;
		REF_RE.lastIndex = 0;
		while ((m = REF_RE.exec(node)) !== null) {
			out.push({ name: m[1], hasParens: m[2] !== undefined, argc: splitArgs(m[3]).length });
		}
	} else if (Array.isArray(node)) {
		node.forEach(v => collectRefs(v, out));
	} else if (node && typeof node === "object") {
		Object.values(node).forEach(v => collectRefs(v, out));
	}
	return out;
}

function validate(filepath) {
	const issues = [];
	const add = (level, msg) => issues.push({ level, msg });

	let raw, data;
	try { raw = fs.readFileSync(filepath, "utf8"); }
	catch (e) { return [{ level: "ERROR", msg: "cannot read file: " + e.message }]; }
	try { data = JSON.parse(raw); }
	catch (e) { return [{ level: "ERROR", msg: "invalid JSON: " + e.message }]; }

	// ---- variable table ----
	const vars = {};            // name -> [params]
	const varNames = [];
	const variables = data["Variables"] || {};
	for (const key of Object.keys(variables)) {
		const mm = key.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*(?:\(([^)]*)\))?$/);
		if (!mm) { add("WARN", `variable name '${key}' has an unexpected shape`); continue; }
		const name = mm[1];
		const params = mm[2] !== undefined ? splitArgs(mm[2]) : [];
		if (vars[name] !== undefined) add("ERROR", `duplicate variable definition '${name}'`);
		vars[name] = params;
		varNames.push(name);
	}

	// ---- prefix collision (textual preprocessor hazard) ----
	for (const a of varNames) for (const b of varNames) {
		if (a !== b && b.startsWith(a)) {
			add("WARN", `prefix collision: "$${a}" is a prefix of "$${b}" — the textual `
			          + `preprocessor may mis-substitute; rename one (e.g. add a suffix)`);
		}
	}

	// ---- references in Shapes (and top-level non-Variables) ----
	const shapeRefs = [];
	collectRefs(data["Shapes"] || {}, shapeRefs);
	for (const r of shapeRefs) {
		if (vars[r.name] === undefined) {
			add("ERROR", `unresolved reference "$${r.name}" — no such variable `
			           + `(would survive preprocessing and crash ComboShape.build)`);
			continue;
		}
		const arity = vars[r.name].length;
		if (arity === 0 && r.hasParens && r.argc > 0)
			add("ERROR", `"$${r.name}" called with ${r.argc} arg(s) but is a plain variable (0)`);
		else if (arity > 0 && r.argc !== arity)
			add("ERROR", `"$${r.name}" called with ${r.argc} arg(s) but declares ${arity} `
			           + `(${vars[r.name].join(", ")}) — arity mismatch leaves $params unreplaced`);
	}

	// ---- param scoping inside each variable body ----
	for (const name of varNames) {
		const params = vars[name];
		const bodyRefs = collectRefs(variables[Object.keys(variables).find(k => k.startsWith(name))] , []);
		for (const r of bodyRefs) {
			const isParam = params.includes(r.name);
			const isVar   = vars[r.name] !== undefined;
			if (!isParam && !isVar)
				add("WARN", `variable "${name}" uses "$${r.name}" which is neither its param `
				          + `(${params.join(", ") || "none"}) nor a known variable`);
		}
	}

	// ---- cell-value coverage ----
	const maxRaw = data["MaxCellValue"];
	const shapes = data["Shapes"] || {};
	if (maxRaw !== "*" && maxRaw !== undefined) {
		const max = parseInt(maxRaw, 10);
		if (!isNaN(max)) {
			const present = new Set(Object.keys(shapes));
			const missing = [];
			for (let n = 0; n <= max; n++) if (!present.has(valueToKey(n))) missing.push(valueToKey(n));
			if (missing.length)
				add("WARN", `Shapes miss cell value(s) for 0..${max}: ${missing.join(", ")}`);
			const expected = new Set();
			for (let n = 0; n <= max; n++) expected.add(valueToKey(n));
			for (const k of present) if (!expected.has(k))
				add("INFO", `Shapes has key "${k}" outside 0..${max}`);
		}
	}

	// ---- quad colorPairs cardinality + format ----
	const scanQuad = (node) => {
		if (Array.isArray(node)) return node.forEach(scanQuad);
		if (node && typeof node === "object") {
			const t = node["type"];
			const QUAD_CARD = { SquareQuadCell:4, TriangleQuadCell:4, HexTriangleCell:6, HexRhombusCell:3 };
			if (QUAD_CARD[t] !== undefined) {
				const need = QUAD_CARD[t];
				const cp = node["colorPairs"];
				if (!Array.isArray(cp) || cp.length !== need)
					add("WARN", `${t}: colorPairs should have exactly ${need} entries (found `
					          + `${Array.isArray(cp) ? cp.length : "none"})`);
				else cp.forEach(p => { if (!/^[^+|]+\+[^+|]+$/.test(p))
					add("WARN", `${t}: colorPair "${p}" is not "fill+draw"`); });
			}
			Object.values(node).forEach(scanQuad);
		}
	};
	scanQuad(shapes);

	return issues;
}

// ---- CLI ----
// Expand any directory argument into its *.pattern files (recursive). Cross-platform:
// no shell globbing needed, so `node pattern_validate.js assets/legacy/patterns` works
// on Windows cmd as well as POSIX shells.
const path = require("path");
function expandArgs(args) {
	const out = [];
	for (const a of args) {
		let st;
		try { st = fs.statSync(a); } catch { out.push(a); continue; }
		if (st.isDirectory()) walk(a, out);
		else out.push(a);
	}
	return out;
}
function walk(dir, out) {
	for (const name of fs.readdirSync(dir)) {
		const p = path.join(dir, name);
		const st = fs.statSync(p);
		if (st.isDirectory()) walk(p, out);
		else if (name.toLowerCase().endsWith(".pattern")) out.push(p);
	}
}

function main() {
	const files = expandArgs(process.argv.slice(2)).sort();
	if (!files.length) { console.error("usage: node pattern_validate.js <file.pattern | directory> ..."); process.exit(2); }
	let totalErr = 0, totalWarn = 0;
	for (const f of files) {
		const issues = validate(f);
		const errs = issues.filter(i => i.level === "ERROR").length;
		const warns = issues.filter(i => i.level === "WARN").length;
		totalErr += errs; totalWarn += warns;
		const tag = errs ? "FAIL" : (warns ? "warn" : "ok  ");
		console.log(`[${tag}] ${f}`);
		for (const i of issues) console.log(`        ${i.level}: ${i.msg}`);
	}
	console.log(`\n${files.length} file(s) — ${totalErr} error(s), ${totalWarn} warning(s)`);
	process.exit(totalErr ? 1 : 0);
}
if (require.main === module) main();
module.exports = { validate };
