# Code Quality, Maintainability, and Performance Standards

This project enforces high standards for code quality, maintainability, and performance. All developers and contributors are expected to follow these guidelines for every pull request and ongoing maintenance.

## Code Quality
- Follow the [Code Quality & Maintainability Checklist](./CODE_QUALITY_CHECKLIST.md)
- Use consistent component patterns and naming conventions
- Remove code duplication and favor reusable components
- Ensure all code is covered by unit and integration tests

## Maintainability
- Separate business logic from UI components
- Use service layers for all database and business operations
- Maintain clear and up-to-date TypeScript types for all data models and API contracts
- Document all new components, services, and utilities

## Performance
- Benchmark all new database views and queries (see scripts/benchmark-view-performance.js)
- Monitor and log performance of critical operations (see scripts/performance-monitoring.js)
- Add indexes and optimize queries as needed (see design.md for recommendations)
- Ensure all UI components are responsive and performant

## Pull Request Expectations
- All PRs must pass lint, type check, and test suites
- Include a summary of changes and reference relevant checklist items
- Link to design.md for any new patterns or architectural changes
- Include before/after performance metrics for any DB or UI optimizations

## Ongoing Maintenance
- Regularly review and update the checklist and design.md as the system evolves
- Refactor legacy code to meet current standards
- Address technical debt and performance bottlenecks proactively

For more details, see [design.md](../.kiro/specs/audit-findings-remediation/design.md) and [requirements.md](../.kiro/specs/critical-audit-fixes/requirements.md). 