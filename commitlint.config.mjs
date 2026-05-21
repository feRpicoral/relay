/**
 * Enforces the conventions in CLAUDE.md:
 *  - Header line only — no body, no footer.
 *  - Lowercase, imperative subject, no trailing period.
 *  - No `Co-Authored-By:` trailer or attribution lines.
 */
const config = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "subject-case": [2, "always", "lower-case"],
    "subject-full-stop": [2, "never", "."],
    "header-max-length": [2, "always", 72],
    // Body and footer must be empty: no rationale, no trailers, no attribution.
    "body-empty": [2, "always"],
    "footer-empty": [2, "always"],
  },
};

export default config;
