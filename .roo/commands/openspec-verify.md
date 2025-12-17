# OpenSpec: Verify

Verify that all tasks in an OpenSpec change have been completed.

<!-- OPENSPEC:START -->
**Purpose**
This command verifies that all tasks in `tasks.md` have been completed before archiving.
It ensures no tasks are missed and the implementation matches the proposal.

**Guardrails**
- Every task in `tasks.md` must be verified against actual implementation
- Do not mark tasks as complete unless the corresponding code/files exist
- If any task is incomplete, return to the implement phase

**Steps**
Track these steps as TODOs and complete them one by one.

1. **Read the tasks file**
   - Open `changes/<id>/tasks.md`
   - List all tasks and their current status

2. **Verify each task**
   For each task in the checklist:
   - Check if the corresponding code/file exists
   - Verify the implementation matches the task description
   - Note any discrepancies or issues

3. **Cross-reference with proposal**
   - Read `changes/<id>/proposal.md`
   - Ensure all requirements from the proposal are addressed
   - Check that acceptance criteria are met

4. **Update task statuses**
   - Mark verified tasks as `- [x]` if not already
   - For incomplete tasks, note what's missing
   - Update `tasks.md` to reflect reality

5. **Report verification results**
   Provide a summary:
   - Total tasks: X
   - Completed: Y
   - Incomplete: Z (if any)
   - Issues found: (list any problems)

6. **Next steps**
   - If all tasks complete: Suggest `/openspec-archive` to archive the change
   - If tasks incomplete: Return to implement phase to complete remaining work

**Verification Checklist**
- [ ] All tasks in `tasks.md` are marked `- [x]`
- [ ] Each task has corresponding implementation
- [ ] Implementation matches proposal requirements
- [ ] No orphaned or missing functionality
- [ ] Code compiles/runs without errors (if applicable)

**Reference**
- Use `openspec show <id>` to view the full proposal
- Refer to `openspec/AGENTS.md` for additional conventions
<!-- OPENSPEC:END -->
