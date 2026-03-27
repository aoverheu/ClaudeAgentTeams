# Security Review Findings

## Summary

The DevKit codebase has a generally sound security posture for a local CLI tool. The most significant finding is an SSRF vector in the dependency audit module where a user-controllable registry URL is used without validation. Several lower-severity issues exist around path traversal via the `--target` flag and potential prototype pollution through config deep-merge. No command injection vulnerabilities were found — the codebase uses `simple-git` library calls and `glob` rather than shelling out with string interpolation.

## Findings

### [HIGH] Server-Side Request Forgery (SSRF) via Configurable Registry URL

**File:** src/modules/dep-audit/index.ts:102
**Issue:** The `registryUrl` is read from the options object (sourced from the `.devkitrc.json` config file) with no validation beyond a default fallback. The URL is passed directly to `fetch()` on line 64. An attacker who can modify the config file (or a malicious config file checked into a repo) could point the registry URL to any internal network endpoint.
**Risk:** An attacker could use DevKit as a proxy to probe internal services, exfiltrate data to an attacker-controlled server, or hit cloud metadata endpoints (e.g., `http://169.254.169.254/`). Each dependency name is appended to the URL and fetched, amplifying the number of requests.
**Recommendation:** Validate that `registryUrl` matches an allowlist of known registries or at minimum enforce HTTPS and reject private/link-local IP ranges. Also validate the URL parses correctly before use.

### [MEDIUM] Unbounded Path Traversal via --target Flag

**File:** src/index.ts:21, src/modules/todo-tracker/index.ts:91, src/modules/code-health/index.ts:123
**Issue:** The `--target` CLI option accepts any filesystem path and passes it to `resolve()` and then to `glob()` or `simpleGit()`. While the `validate()` functions check that the path exists, they do not restrict traversal outside the working directory. A path like `--target /etc` or `--target C:\Windows` would cause DevKit to scan system directories.
**Risk:** In a CI/CD context or when DevKit is exposed as a service, an attacker could use this to read file contents (via TODO scanner which reads file lines) or enumerate files (via glob results in the code-health module) from arbitrary directories on the host.
**Recommendation:** For a local CLI tool this is acceptable by design. However, if DevKit is ever used in a service context, add an optional `--restrict-root` flag or config option that confines `targetPath` to be a subdirectory of the working directory.

### [MEDIUM] Prototype Pollution via Deep Merge in Config

**File:** src/shared/config.ts:24-35
**Issue:** The `deepMerge()` function iterates over all keys from the override object using `Object.keys()` and recursively merges them. While `Object.keys()` does not enumerate `__proto__`, a JSON-parsed config file could contain a key literally named `"__proto__"` or `"constructor"` that gets merged into the result object, potentially polluting `Object.prototype`.
**Risk:** If a malicious `.devkitrc.json` contains `{"__proto__": {"polluted": true}}`, the `deepMerge` function would set `result["__proto__"]` which on most engines is the prototype. This could alter behavior of downstream code relying on property lookups. In practice, `JSON.parse` creates objects with `__proto__` as an own property (not prototype reference), mitigating this for the `__proto__` case — but `constructor.prototype` chains remain a theoretical vector.
**Recommendation:** Add a guard in `deepMerge` to skip keys like `__proto__`, `constructor`, and `prototype`: `if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;`

### [MEDIUM] Scoped Package Name Encoding in Registry URL

**File:** src/modules/dep-audit/index.ts:64
**Issue:** The `fetchLatest` function uses `encodeURIComponent(packageName)` to build the registry URL. For scoped packages like `@types/node`, this encodes the `@` and `/` characters, producing `%40types%2Fnode`. The npm registry expects scoped packages as `@types%2Fnode` (only the slash encoded, not the `@`). This means scoped package lookups will silently fail with HTTP 404, and the failure is swallowed as a warning.
**Risk:** All scoped packages will be silently skipped during audit, creating a false sense of security. If a project relies heavily on scoped packages (e.g., `@angular/*`, `@aws-sdk/*`), the audit results will be incomplete with no clear indication. An attacker could exploit this by publishing a malicious unscoped package with a similar name, knowing the scoped version won't be checked.
**Recommendation:** Handle scoped packages specially: if the name starts with `@`, encode only the portion after the first `/` or use the npm registry's expected format: `${registryUrl}/${packageName.replace('/', '%2F')}/latest`.

### [LOW] User-Supplied Values in Error Messages (Information Disclosure)

**File:** src/modules/dep-audit/index.ts:115, src/modules/git-stats/index.ts:158, src/shared/config.ts:107
**Issue:** Several error messages include raw user-supplied values (file paths, config paths) and internal error messages from caught exceptions. For example, `config.ts:107` includes the full error message in `Invalid config at ${configPath}: ${message}`.
**Risk:** In a service context, error messages could leak internal filesystem paths, library versions (from stack traces), or configuration details to end users. For a local CLI tool, this is expected behavior, but it would become a concern if output is ever logged or exposed remotely.
**Recommendation:** If DevKit is ever used in a service/API context, sanitize error messages to remove internal paths and stack traces. For CLI usage, this is informational only.

### [LOW] No Rate Limiting on NPM Registry Requests

**File:** src/modules/dep-audit/index.ts:142-144
**Issue:** The `execute` function fires `Promise.all()` with one HTTP request per dependency. For a project with hundreds of dependencies, this creates a burst of concurrent requests to the npm registry (or the configured registry URL).
**Risk:** This could trigger rate limiting or IP bans from the npm registry, causing the tool to fail intermittently. If the registry URL is pointed at an internal service (see SSRF finding above), this becomes a potential denial-of-service vector against that service.
**Recommendation:** Add concurrency limiting (e.g., process in batches of 10-20) and respect registry rate limits via retry-after headers.

### [LOW] Regex Applied to Untrusted File Content (Minor ReDoS Surface)

**File:** src/modules/todo-tracker/index.ts:29, src/modules/code-health/index.ts:22-33
**Issue:** The `COMMENT_PATTERN` regex `/\b(TODO|FIXME|HACK)\b[:\s]*(.*)/i` uses `(.*)` which is greedy but anchored to end-of-line (since it runs per-line). The complexity patterns in code-health use global regexes with simple alternations. Both are applied to every line of every scanned file.
**Risk:** The regexes themselves are not vulnerable to catastrophic backtracking — they use simple alternation and greedy quantifiers on bounded (per-line) input. The `(.*)` could be slow on extremely long lines (megabytes), but this is unlikely in practice. This is a low/informational finding.
**Recommendation:** No immediate action needed. If scanning untrusted input becomes a concern, add a max line-length cutoff (e.g., skip lines > 10,000 chars).

## Finding Count by Severity

- Critical: 0
- High: 1
- Medium: 3
- Low: 3
