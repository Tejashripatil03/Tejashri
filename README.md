# Library TestLab — Software Testing Support System

A responsive, beginner-friendly mini-project built using HTML, CSS, and vanilla JavaScript.

## Files
- `index.html`: dashboard, functional requirements, test table, execution form, and report section.
- `style.css`: responsive styling and dashboard components.
- `script.js`: sample requirements, 12 test-case templates, execution comparison, defect notes, dashboard updates, and TXT report download.

## Run it
1. Keep all three files in the same folder.
2. Double-click `index.html` to open it in a modern browser.
3. Review the requirements and generated sample test cases.
4. Select a test case in Test Execution.
5. Enter the exact expected result text to mark Pass, or enter a different observed result to mark Fail.
6. Click Generate Testing Report, then Download Report (.txt).

No API key, backend, database, installation, or server is required.

## Important limitation
The system is a rule-based/AI-assisted simulation. It creates test cases from predefined templates and compares the actual-result text entered by a user against the expected-result text. It does **not** run the test against a real library management application. A failed comparison indicates a possible defect to investigate, not proof of a defect.

## Customise
Edit `REQUIREMENTS` and `TEST_TEMPLATES` near the top of `script.js`. Keep test IDs unique and fill in requirement ID, scenario, input, and expected result for each template.
