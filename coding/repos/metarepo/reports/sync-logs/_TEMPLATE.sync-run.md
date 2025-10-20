# Sync Attempt Log — {{DATE_ISO}}

## Context
- Operator: {{USER}} @ {{HOST}}
- Repo scope: {{REPO_SCOPE}}
- Branch context: {{BRANCH_CONTEXT}}
- Git: {{GIT_VERSION}} | rsync: {{RSYNC_VERSION}} | gh: {{GH_VERSION}}
- Network: {{NETWORK_DESC}}
- Proxy configured: {{PROXY_SET}}

## Steps
1. Prereq check: {{PREREQ_STATUS}} — notes: {{PREREQ_NOTES}}
2. Fleet listing: {{FLEET_STATUS}} — repos: {{REPOS_LIST}}
3. Template validation: {{VALIDATION_STATUS}} — missing: {{MISSING_ITEMS}}
4. Sync: mode={{DRY_RUN}} — result: {{SYNC_RESULT}} (exit={{EXIT_CODE}})

## Blockers
- {{BLOCKERS}}

## Next Actions
- {{FOLLOW_UP}}
