# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| latest release on `main` | :white_check_mark: |
| older commits / forks   | :x:                |

## Reporting a Vulnerability

Please report security vulnerabilities privately:

1. **Preferred:** Use GitHub's private vulnerability reporting —
   **Security tab → Report a vulnerability**.
2. **Alternative:** Open a security advisory draft via
   `gh security-advisory` or contact the maintainer via a GitHub issue
   marked *confidential* (do **not** post exploit details publicly).

Please include:

- Description of the issue and potential impact
- Steps to reproduce (proof of concept, if possible)
- Affected file(s) / component(s)

You should receive a response within a few days. Please do **not**
disclose the issue publicly until a fix is released.

## Scope

AlimenCal is a **fully client-side static web app**: all calculations and
data processing (bank exports, financial figures) happen locally in the
browser. No data is transmitted to any server. Reports of issues in
third-party dependencies (CDN assets, icon fonts) should be directed
upstream, but reports of how they are integrated here are in scope.

## Data privacy

The application processes potentially sensitive personal and financial
data exclusively **on the user's device** (IndexedDB / local storage,
export/import to encrypted or plaintext files). No telemetry, analytics
or tracking is included.
