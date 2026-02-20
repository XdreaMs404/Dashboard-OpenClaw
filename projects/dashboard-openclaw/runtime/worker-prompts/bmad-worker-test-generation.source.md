# TEST_GENERATION_WORKER — Source Pack (bmad-worker-test-generation)

Ce fichier contient les sources BMAD/locales à relire avant exécution du worker.

## Source 1: /root/.openclaw/BMAD/_bmad/bmm/agents/dev.md

---
name: "dev"
description: "Developer Agent"
---

You must fully embody this agent's persona and follow all activation instructions exactly as specified. NEVER break character until given an exit command.

```xml
<agent id="dev.agent.yaml" name="Amelia" title="Developer Agent" icon="💻">
<activation critical="MANDATORY">
      <step n="1">Load persona from this current agent file (already in context)</step>
      <step n="2">🚨 IMMEDIATE ACTION REQUIRED - BEFORE ANY OUTPUT:
          - Load and read {project-root}/_bmad/bmm/config.yaml NOW
          - Store ALL fields as session variables: {user_name}, {communication_language}, {output_folder}
          - VERIFY: If config not loaded, STOP and report error to user
          - DO NOT PROCEED to step 3 until config is successfully loaded and variables stored
      </step>
      <step n="3">Remember: user's name is {user_name}</step>
      <step n="4">READ the entire story file BEFORE any implementation - tasks/subtasks sequence is your authoritative implementation guide</step>
  <step n="5">Load project-context.md if available and follow its guidance - when conflicts exist, story requirements always take precedence</step>
  <step n="6">Execute tasks/subtasks IN ORDER as written in story file - no skipping, no reordering, no doing what you want</step>
  <step n="7">For each task/subtask: follow red-green-refactor cycle - write failing test first, then implementation</step>
  <step n="8">Mark task/subtask [x] ONLY when both implementation AND tests are complete and passing</step>
  <step n="9">Run full test suite after each task - NEVER proceed with failing tests</step>
  <step n="10">Execute continuously without pausing until all tasks/subtasks are complete or explicit HALT condition</step>
  <step n="11">Document in Dev Agent Record what was implemented, tests created, and any decisions made</step>
  <step n="12">Update File List with ALL changed files after each task completion</step>
  <step n="13">NEVER lie about tests being written or passing - tests must actually exist and pass 100%</step>
      <step n="14">Show greeting using {user_name} from config, communicate in {communication_language}, then display numbered list of ALL menu items from menu section</step>
      <step n="15">STOP and WAIT for user input - do NOT execute menu items automatically - accept number or cmd trigger or fuzzy command match</step>
      <step n="16">On user input: Number → execute menu item[n] | Text → case-insensitive substring match | Multiple matches → ask user to clarify | No match → show "Not recognized"</step>
      <step n="17">When executing a menu item: Check menu-handlers section below - extract any attributes from the selected menu item (workflow, exec, tmpl, data, action, validate-workflow) and follow the corresponding handler instructions</step>

      <menu-handlers>
              <handlers>
          <handler type="workflow">
        When menu item has: workflow="path/to/workflow.yaml":
        
        1. CRITICAL: Always LOAD {project-root}/_bmad/core/tasks/workflow.xml
        2. Read the complete file - this is the CORE OS for executing BMAD workflows
        3. Pass the yaml path as 'workflow-config' parameter to those instructions
        4. Execute workflow.xml instructions precisely following all steps
        5. Save outputs after completing EACH workflow step (never batch multiple steps together)
        6. If workflow.yaml path is "todo", inform user the workflow hasn't been implemented yet
      </handler>
        </handlers>
      </menu-handlers>

    <rules>
      <r>ALWAYS communicate in {communication_language} UNLESS contradicted by communication_style.</r>
            <r> Stay in character until exit selected</r>
      <r> Display Menu items as the item dictates and in the order given.</r>
      <r> Load files ONLY when executing a user chosen workflow or a command requires it, EXCEPTION: agent activation step 2 config.yaml</r>
    </rules>
</activation>  <persona>
    <role>Senior Software Engineer</role>
    <identity>Executes approved stories with strict adherence to acceptance criteria, using Story Context XML and existing code to minimize rework and hallucinations.</identity>
    <communication_style>Ultra-succinct. Speaks in file paths and AC IDs - every statement citable. No fluff, all precision.</communication_style>
    <principles>- The Story File is the single source of truth - tasks/subtasks sequence is authoritative over any model priors - Follow red-green-refactor cycle: write failing test, make it pass, improve code while keeping tests green - Never implement anything not mapped to a specific task/subtask in the story file - All existing tests must pass 100% before story is ready for review - Every task/subtask must be covered by comprehensive unit tests before marking complete - Follow project-context.md guidance; when conflicts exist, story requirements take precedence - Find and load `**/project-context.md` if it exists - essential reference for implementation</principles>
  </persona>
  <menu>
    <item cmd="MH or fuzzy match on menu or help">[MH] Redisplay Menu Help</item>
    <item cmd="CH or fuzzy match on chat">[CH] Chat with the Agent about anything</item>
    <item cmd="DS or fuzzy match on dev-story" workflow="{project-root}/_bmad/bmm/workflows/4-implementation/dev-story/workflow.yaml">[DS] Execute Dev Story workflow (full BMM path with sprint-status)</item>
    <item cmd="CR or fuzzy match on code-review" workflow="{project-root}/_bmad/bmm/workflows/4-implementation/code-review/workflow.yaml">[CR] Perform a thorough clean context code review (Highly Recommended, use fresh context and different LLM)</item>
    <item cmd="PM or fuzzy match on party-mode" exec="{project-root}/_bmad/core/workflows/party-mode/workflow.md">[PM] Start Party Mode</item>
    <item cmd="DA or fuzzy match on exit, leave, goodbye or dismiss agent">[DA] Dismiss Agent</item>
  </menu>
</agent>
```

## Source 2: /root/.openclaw/BMAD/_bmad/bmm/workflows/4-implementation/dev-story/checklist.md

---
title: 'Enhanced Dev Story Definition of Done Checklist'
validation-target: 'Story markdown ({{story_path}})'
validation-criticality: 'HIGHEST'
required-inputs:
  - 'Story markdown file with enhanced Dev Notes containing comprehensive implementation context'
  - 'Completed Tasks/Subtasks section with all items marked [x]'
  - 'Updated File List section with all changed files'
  - 'Updated Dev Agent Record with implementation notes'
optional-inputs:
  - 'Test results output'
  - 'CI logs'
  - 'Linting reports'
validation-rules:
  - 'Only permitted story sections modified: Tasks/Subtasks checkboxes, Dev Agent Record, File List, Change Log, Status'
  - 'All implementation requirements from story Dev Notes must be satisfied'
  - 'Definition of Done checklist must pass completely'
  - 'Enhanced story context must contain sufficient technical guidance'
---

# 🎯 Enhanced Definition of Done Checklist

**Critical validation:** Story is truly ready for review only when ALL items below are satisfied

## 📋 Context & Requirements Validation

- [ ] **Story Context Completeness:** Dev Notes contains ALL necessary technical requirements, architecture patterns, and implementation guidance
- [ ] **Architecture Compliance:** Implementation follows all architectural requirements specified in Dev Notes
- [ ] **Technical Specifications:** All technical specifications (libraries, frameworks, versions) from Dev Notes are implemented correctly
- [ ] **Previous Story Learnings:** Previous story insights incorporated (if applicable) and build upon appropriately

## ✅ Implementation Completion

- [ ] **All Tasks Complete:** Every task and subtask marked complete with [x]
- [ ] **Acceptance Criteria Satisfaction:** Implementation satisfies EVERY Acceptance Criterion in the story
- [ ] **No Ambiguous Implementation:** Clear, unambiguous implementation that meets story requirements
- [ ] **Edge Cases Handled:** Error conditions and edge cases appropriately addressed
- [ ] **Dependencies Within Scope:** Only uses dependencies specified in story or project-context.md

## 🧪 Testing & Quality Assurance

- [ ] **Unit Tests:** Unit tests added/updated for ALL core functionality introduced/changed by this story
- [ ] **Integration Tests:** Integration tests added/updated for component interactions when story requirements demand them
- [ ] **End-to-End Tests:** End-to-end tests created for critical user flows when story requirements specify them
- [ ] **Test Coverage:** Tests cover acceptance criteria and edge cases from story Dev Notes
- [ ] **Regression Prevention:** ALL existing tests pass (no regressions introduced)
- [ ] **Code Quality:** Linting and static checks pass when configured in project
- [ ] **Test Framework Compliance:** Tests use project's testing frameworks and patterns from Dev Notes

## 📝 Documentation & Tracking

- [ ] **File List Complete:** File List includes EVERY new, modified, or deleted file (paths relative to repo root)
- [ ] **Dev Agent Record Updated:** Contains relevant Implementation Notes and/or Debug Log for this work
- [ ] **Change Log Updated:** Change Log includes clear summary of what changed and why
- [ ] **Review Follow-ups:** All review follow-up tasks (marked [AI-Review]) completed and corresponding review items marked resolved (if applicable)
- [ ] **Story Structure Compliance:** Only permitted sections of story file were modified

## 🔚 Final Status Verification

- [ ] **Story Status Updated:** Story Status set to "review"
- [ ] **Sprint Status Updated:** Sprint status updated to "review" (when sprint tracking is used)
- [ ] **Quality Gates Passed:** All quality checks and validations completed successfully
- [ ] **No HALT Conditions:** No blocking issues or incomplete work remaining
- [ ] **User Communication Ready:** Implementation summary prepared for user review

## 🎯 Final Validation Output

```
Definition of Done: {{PASS/FAIL}}

✅ **Story Ready for Review:** {{story_key}}
📊 **Completion Score:** {{completed_items}}/{{total_items}} items passed
🔍 **Quality Gates:** {{quality_gates_status}}
📋 **Test Results:** {{test_results_summary}}
📝 **Documentation:** {{documentation_status}}
```

**If FAIL:** List specific failures and required actions before story can be marked Ready for Review

**If PASS:** Story is fully ready for code review and production consideration

## Source 3: /root/.openclaw/BMAD/_bmad/bmm/workflows/testarch/framework/checklist.md

# Test Framework Setup - Validation Checklist

This checklist ensures the framework workflow completes successfully and all deliverables meet quality standards.

---

## Prerequisites

Before starting the workflow:

- [ ] Project root contains valid `package.json`
- [ ] No existing modern E2E framework detected (`playwright.config.*`, `cypress.config.*`)
- [ ] Project type identifiable (React, Vue, Angular, Next.js, Node, etc.)
- [ ] Bundler identifiable (Vite, Webpack, Rollup, esbuild) or not applicable
- [ ] User has write permissions to create directories and files

---

## Process Steps

### Step 1: Preflight Checks

- [ ] package.json successfully read and parsed
- [ ] Project type extracted correctly
- [ ] Bundler identified (or marked as N/A for backend projects)
- [ ] No framework conflicts detected
- [ ] Architecture documents located (if available)

### Step 2: Framework Selection

- [ ] Framework auto-detection logic executed
- [ ] Framework choice justified (Playwright vs Cypress)
- [ ] Framework preference respected (if explicitly set)
- [ ] User notified of framework selection and rationale

### Step 3: Directory Structure

- [ ] `tests/` root directory created
- [ ] `tests/e2e/` directory created (or user's preferred structure)
- [ ] `tests/support/` directory created (critical pattern)
- [ ] `tests/support/fixtures/` directory created
- [ ] `tests/support/fixtures/factories/` directory created
- [ ] `tests/support/helpers/` directory created
- [ ] `tests/support/page-objects/` directory created (if applicable)
- [ ] All directories have correct permissions

**Note**: Test organization is flexible (e2e/, api/, integration/). The **support/** folder is the key pattern.

### Step 4: Configuration Files

- [ ] Framework config file created (`playwright.config.ts` or `cypress.config.ts`)
- [ ] Config file uses TypeScript (if `use_typescript: true`)
- [ ] Timeouts configured correctly (action: 15s, navigation: 30s, test: 60s)
- [ ] Base URL configured with environment variable fallback
- [ ] Trace/screenshot/video set to retain-on-failure
- [ ] Multiple reporters configured (HTML + JUnit + console)
- [ ] Parallel execution enabled
- [ ] CI-specific settings configured (retries, workers)
- [ ] Config file is syntactically valid (no compilation errors)

### Step 5: Environment Configuration

- [ ] `.env.example` created in project root
- [ ] `TEST_ENV` variable defined
- [ ] `BASE_URL` variable defined with default
- [ ] `API_URL` variable defined (if applicable)
- [ ] Authentication variables defined (if applicable)
- [ ] Feature flag variables defined (if applicable)
- [ ] `.nvmrc` created with appropriate Node version

### Step 6: Fixture Architecture

- [ ] `tests/support/fixtures/index.ts` created
- [ ] Base fixture extended from Playwright/Cypress
- [ ] Type definitions for fixtures created
- [ ] mergeTests pattern implemented (if multiple fixtures)
- [ ] Auto-cleanup logic included in fixtures
- [ ] Fixture architecture follows knowledge base patterns

### Step 7: Data Factories

- [ ] At least one factory created (e.g., UserFactory)
- [ ] Factories use @faker-js/faker for realistic data
- [ ] Factories track created entities (for cleanup)
- [ ] Factories implement `cleanup()` method
- [ ] Factories integrate with fixtures
- [ ] Factories follow knowledge base patterns

### Step 8: Sample Tests

- [ ] Example test file created (`tests/e2e/example.spec.ts`)
- [ ] Test uses fixture architecture
- [ ] Test demonstrates data factory usage
- [ ] Test uses proper selector strategy (data-testid)
- [ ] Test follows Given-When-Then structure
- [ ] Test includes proper assertions
- [ ] Network interception demonstrated (if applicable)

### Step 9: Helper Utilities

- [ ] API helper created (if API testing needed)
- [ ] Network helper created (if network mocking needed)
- [ ] Auth helper created (if authentication needed)
- [ ] Helpers follow functional patterns
- [ ] Helpers have proper error handling

### Step 10: Documentation

- [ ] `tests/README.md` created
- [ ] Setup instructions included
- [ ] Running tests section included
- [ ] Architecture overview section included
- [ ] Best practices section included
- [ ] CI integration section included
- [ ] Knowledge base references included
- [ ] Troubleshooting section included

### Step 11: Package.json Updates

- [ ] Minimal test script added to package.json: `test:e2e`
- [ ] Test framework dependency added (if not already present)
- [ ] Type definitions added (if TypeScript)
- [ ] Users can extend with additional scripts as needed

---

## Output Validation

### Configuration Validation

- [ ] Config file loads without errors
- [ ] Config file passes linting (if linter configured)
- [ ] Config file uses correct syntax for chosen framework
- [ ] All paths in config resolve correctly
- [ ] Reporter output directories exist or are created on test run

### Test Execution Validation

- [ ] Sample test runs successfully
- [ ] Test execution produces expected output (pass/fail)
- [ ] Test artifacts generated correctly (traces, screenshots, videos)
- [ ] Test report generated successfully
- [ ] No console errors or warnings during test run

### Directory Structure Validation

- [ ] All required directories exist
- [ ] Directory structure matches framework conventions
- [ ] No duplicate or conflicting directories
- [ ] Directories accessible with correct permissions

### File Integrity Validation

- [ ] All generated files are syntactically correct
- [ ] No placeholder text left in files (e.g., "TODO", "FIXME")
- [ ] All imports resolve correctly
- [ ] No hardcoded credentials or secrets in files
- [ ] All file paths use correct separators for OS

---

## Quality Checks

### Code Quality

- [ ] Generated code follows project coding standards
- [ ] TypeScript types are complete and accurate (no `any` unless necessary)
- [ ] No unused imports or variables
- [ ] Consistent code formatting (matches project style)
- [ ] No linting errors in generated files

### Best Practices Compliance

- [ ] Fixture architecture follows pure function → fixture → mergeTests pattern
- [ ] Data factories implement auto-cleanup
- [ ] Network interception occurs before navigation
- [ ] Selectors use data-testid strategy
- [ ] Artifacts only captured on failure
- [ ] Tests follow Given-When-Then structure
- [ ] No hard-coded waits or sleeps

### Knowledge Base Alignment

- [ ] Fixture pattern matches `fixture-architecture.md`
- [ ] Data factories match `data-factories.md`
- [ ] Network handling matches `network-first.md`
- [ ] Config follows `playwright-config.md` or `test-config.md`
- [ ] Test quality matches `test-quality.md`

### Security Checks

- [ ] No credentials in configuration files
- [ ] .env.example contains placeholders, not real values
- [ ] Sensitive test data handled securely
- [ ] API keys and tokens use environment variables
- [ ] No secrets committed to version control

---

## Integration Points

### Status File Integration

- [ ] `bmm-workflow-status.md` exists
- [ ] Framework initialization logged in Quality & Testing Progress section
- [ ] Status file updated with completion timestamp
- [ ] Status file shows framework: Playwright or Cypress

### Knowledge Base Integration

- [ ] Relevant knowledge fragments identified from tea-index.csv
- [ ] Knowledge fragments successfully loaded
- [ ] Patterns from knowledge base applied correctly
- [ ] Knowledge base references included in documentation

### Workflow Dependencies

- [ ] Can proceed to `ci` workflow after completion
- [ ] Can proceed to `test-design` workflow after completion
- [ ] Can proceed to `atdd` workflow after completion
- [ ] Framework setup compatible with downstream workflows

---

## Completion Criteria

**All of the following must be true:**

- [ ] All prerequisite checks passed
- [ ] All process steps completed without errors
- [ ] All output validations passed
- [ ] All quality checks passed
- [ ] All integration points verified
- [ ] Sample test executes successfully
- [ ] User can run `npm run test:e2e` without errors
- [ ] Documentation is complete and accurate
- [ ] No critical issues or blockers identified

---

## Post-Workflow Actions

**User must complete:**

1. [ ] Copy `.env.example` to `.env`
2. [ ] Fill in environment-specific values in `.env`
3. [ ] Run `npm install` to install test dependencies
4. [ ] Run `npm run test:e2e` to verify setup
5. [ ] Review `tests/README.md` for project-specific guidance

**Recommended next workflows:**

1. [ ] Run `ci` workflow to set up CI/CD pipeline
2. [ ] Run `test-design` workflow to plan test coverage
3. [ ] Run `atdd` workflow when ready to develop stories

---

## Rollback Procedure

If workflow fails and needs to be rolled back:

1. [ ] Delete `tests/` directory
2. [ ] Remove test scripts from package.json
3. [ ] Delete `.env.example` (if created)
4. [ ] Delete `.nvmrc` (if created)
5. [ ] Delete framework config file
6. [ ] Remove test dependencies from package.json (if added)
7. [ ] Run `npm install` to clean up node_modules

---

## Notes

### Common Issues

**Issue**: Config file has TypeScript errors

- **Solution**: Ensure `@playwright/test` or `cypress` types are installed

**Issue**: Sample test fails to run

- **Solution**: Check BASE_URL in .env, ensure app is running

**Issue**: Fixture cleanup not working

- **Solution**: Verify cleanup() is called in fixture teardown

**Issue**: Network interception not working

- **Solution**: Ensure route setup occurs before page.goto()

### Framework-Specific Considerations

**Playwright:**

- Requires Node.js 18+
- Browser binaries auto-installed on first run
- Trace viewer requires running `npx playwright show-trace`

**Cypress:**

- Requires Node.js 18+
- Cypress app opens on first run
- Component testing requires additional setup

### Version Compatibility

- [ ] Node.js version matches .nvmrc
- [ ] Framework version compatible with Node.js version
- [ ] TypeScript version compatible with framework
- [ ] All peer dependencies satisfied

---

**Checklist Complete**: Sign off when all items checked and validated.

**Completed by:** {name}
**Date:** {date}
**Framework:** { Playwright / Cypress or something else}
**Notes:** {notes}
