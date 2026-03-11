# Security Policy

## Supported versions

Security fixes are supported on a best-effort basis for the currently maintained code line:

| Version | Supported |
| --- | --- |
| `main` | yes |
| latest release | yes |
| older releases | no |

## Reporting a vulnerability

Please do not open a public issue for security-sensitive reports.

Use one of the following channels:

1. GitHub private vulnerability reporting, if it is available in the repository Security tab.
2. If private reporting is not available in your interface, contact the maintainer through the GitHub profile associated with this repository and clearly mark the message as a security report.

Include, when possible:

- a short description of the issue
- affected area or file/path
- reproduction steps or proof of concept
- impact assessment
- any suggested remediation

## Response expectations

This repository is maintained as a serious portfolio project rather than a commercial service, but security reports are treated with priority.

Target response times:

- acknowledgement within 5 business days
- initial triage within 10 business days
- coordinated remediation timeline communicated after triage

## Disclosure policy

- please allow time for investigation and remediation before public disclosure
- avoid sharing secrets, production credentials, or destructive proof-of-concept payloads
- if a report is confirmed, remediation will be coordinated and credited unless you request otherwise

## Scope notes

This repository currently focuses on a production-grade core auth service. Reports related to:

- authentication flows
- session lifecycle
- refresh-token rotation
- rate limiting
- deployment automation
- dependency or supply-chain exposure

are in scope for responsible disclosure.
