# Security

## Reporting a vulnerability

Please do **not** open a public GitHub issue for security problems.

Email security reports to the maintainers via the GitHub repository’s private
vulnerability reporting (Security tab), or open a private advisory.

Include:

- A description of the issue and impact
- Steps to reproduce
- Whether user playground source, cookies on `*.vazue.com`, or deploy credentials are involved

## What this project stores

Playlang is a static SPA. User source is executed in the browser. Share links put a
compressed snapshot in the **URL hash**, which is not sent to our servers.

Do not send playground source, AWS keys, or `.env` files in public issues.
