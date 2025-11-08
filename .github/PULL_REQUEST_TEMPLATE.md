## Summary

Describe the change clearly and link any related issue.

## Change Type

- [ ] Feature
- [ ] Fix
- [ ] Refactor
- [ ] Docs
- [ ] Chore

## Checklist

### Code Quality

- [ ] Small, focused diff (< ~400 LOC or justified)
- [ ] Follows existing patterns (Nuxt 3 / Vue 3 composition, composables for shared state)
- [ ] No unsolicited refactors outside scope

### Security

- [ ] All new API inputs validated with Zod (`server/api/*`)
- [ ] No secrets added / hardcoded
- [ ] No unsafe HTML injection (`innerHTML`) without sanitization rationale

### Performance

- [ ] Avoids recreating heavy objects/reactive state in hot paths
- [ ] Charts use shared utilities in `lib/util/echarts.ts`
- [ ] Large loops or high-frequency watchers justified

### Testing

- [ ] Added/updated tests (Playwright/E2E or unit) OR checked "No impact" below
- [ ] [ ] No impact (explain why)

### Documentation

- [ ] Public API or composable changes documented
- [ ] README / inline intent comments updated where needed

### Observability & Errors

- [ ] Error paths use existing patterns (structured, not silent)

## Screenshots / Evidence (if UI)

Attach before/after or GIF.

## Risk / Rollback Plan

Explain impact and how to revert quickly.

## Additional Notes

Anything reviewers should know (assumptions, follow-ups).
