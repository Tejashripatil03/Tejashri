/*
 * Library TestLab — beginner-friendly testing support demo.
 * Test generation is rule-based; execution compares the user's recorded
 * observation to the expected result. No real library app is connected.
 */

const PROBLEM_STATEMENT = "Manual software testing of a library management system can be time-consuming and error-prone. This project provides a simple AI-assisted testing support system that converts functional requirements into structured test cases, records execution results, identifies failed tests, and generates a testing report.";

const REQUIREMENTS = [
  { id: "FR1", text: "The system shall allow users to log in with valid credentials." },
  { id: "FR2", text: "The system shall allow users to search for books by title or book ID." },
  { id: "FR3", text: "The system shall allow users to borrow an available book." },
  { id: "FR4", text: "The system shall prevent borrowing when a book is unavailable." },
  { id: "FR5", text: "The system shall allow users to return borrowed books and update their availability." }
];

// The generated test definitions are kept in one place for easy editing.
const TEST_TEMPLATES = [
  { id:"TC-001", requirementId:"FR1", scenario:"Login with valid credentials", input:"Username: student01; Password: ValidPass123", expected:"Login succeeds and the student dashboard is displayed." },
  { id:"TC-002", requirementId:"FR1", scenario:"Login with an incorrect password", input:"Username: student01; Password: WrongPass", expected:"Login is rejected and an error message is displayed." },
  { id:"TC-003", requirementId:"FR1", scenario:"Login with empty fields", input:"Username: empty; Password: empty", expected:"Validation message is displayed and login is not submitted." },
  { id:"TC-004", requirementId:"FR2", scenario:"Search for an existing book by title", input:"Title: Introduction to Algorithms", expected:"The matching book is displayed in the search results." },
  { id:"TC-005", requirementId:"FR2", scenario:"Search for an existing book by book ID", input:"Book ID: BK-1001", expected:"The book with ID BK-1001 is displayed." },
  { id:"TC-006", requirementId:"FR2", scenario:"Search for a nonexistent book", input:"Title: BookThatDoesNotExist999", expected:"A no matching books found message is displayed." },
  { id:"TC-007", requirementId:"FR3", scenario:"Borrow an available book", input:"User: student01; Book ID: BK-1001; Availability: Available", expected:"Borrowing succeeds and the book is marked as borrowed." },
  { id:"TC-008", requirementId:"FR4", scenario:"Attempt to borrow an unavailable book", input:"User: student01; Book ID: BK-1002; Availability: Unavailable", expected:"Borrowing is blocked and an unavailable-book message is displayed." },
  { id:"TC-009", requirementId:"FR5", scenario:"Return a borrowed book", input:"User: student01; Book ID: BK-1001; Status: Borrowed", expected:"Return succeeds and the book becomes available." },
  { id:"TC-010", requirementId:"FR5", scenario:"Return a book that was never borrowed", input:"User: student01; Book ID: BK-1003; Status: Not borrowed by user", expected:"Return is rejected and a clear validation message is displayed." },
  { id:"TC-011", requirementId:"FR2", scenario:"Search with an empty query", input:"Search query: empty", expected:"A prompt asks the user to enter a title or book ID." },
  { id:"TC-012", requirementId:"FR2", scenario:"Search using a long boundary-length query", input:"Search query: 256-character string", expected:"The input is handled safely and a valid result or no-results message is displayed without a crash." }
];

let testCases = [];
let lastReportText = "";
let toastTimeout = null;

const $ = id => document.getElementById(id);
const totalCount = $("total-count");
const passedCount = $("passed-count");
const failedCount = $("failed-count");
const pendingCount = $("pending-count");
const passPercent = $("pass-percent");
const passProgress = $("pass-progress");
const progressNote = $("progress-note");
const defectCount = $("defect-count");
const testCaseRows = $("test-case-rows");
const executionSelect = $("execution-test-id");
const actualResultInput = $("actual-result");
const executionError = $("execution-error");
const selectedPreview = $("selected-test-preview");
const testSearch = $("test-search");
const statusFilter = $("status-filter");
const reportPreview = $("report-preview");
const reportMessage = $("report-message");
const downloadReportButton = $("download-report");

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
  })[char]);
}

function normalizeResult(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function renderRequirements() {
  $("requirements-list").innerHTML = REQUIREMENTS.map(req => `
    <article class="requirement-card">
      <span class="requirement-id">${escapeHTML(req.id)}</span>
      <p>${escapeHTML(req.text)}</p>
    </article>
  `).join("");
}

function generateTestCases() {
  // Preserve recorded results if the user clicks Generate Test Cases again.
  const previous = new Map(testCases.map(test => [test.id, test]));
  testCases = TEST_TEMPLATES.map(template => {
    const old = previous.get(template.id);
    return old ? { ...template, actual: old.actual, status: old.status, defect: old.defect }
      : { ...template, actual: "", status: "Pending", defect: "" };
  });
  renderTestTable();
  renderExecutionOptions();
  updateDashboard();
  $("last-updated").textContent = `Updated ${new Date().toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"})}`;
  showToast(`${testCases.length} structured test cases are ready.`);
}

function getVisibleTestCases() {
  const query = normalizeResult(testSearch.value);
  const status = statusFilter.value;
  return testCases.filter(test => {
    const searchable = normalizeResult([
      test.id, test.requirementId, test.scenario, test.input, test.expected, test.actual
    ].join(" "));
    return (!query || searchable.includes(query)) && (status === "all" || test.status === status);
  });
}

function renderTestTable() {
  const visible = getVisibleTestCases();
  testCaseRows.innerHTML = visible.map(test => `
    <tr>
      <td>${escapeHTML(test.id)}</td>
      <td><span class="requirement-id">${escapeHTML(test.requirementId)}</span></td>
      <td>${escapeHTML(test.scenario)}</td>
      <td>${escapeHTML(test.input)}</td>
      <td>${escapeHTML(test.expected)}</td>
      <td>${escapeHTML(test.actual || "—")}${test.defect ? `<br><strong style="color:#c23c47">Defect:</strong> ${escapeHTML(test.defect)}` : ""}</td>
      <td><span class="status-badge ${test.status.toLowerCase()}">${escapeHTML(test.status)}</span></td>
    </tr>
  `).join("");
  $("table-empty").classList.toggle("hidden", visible.length !== 0);
}

function renderExecutionOptions() {
  const previous = executionSelect.value;
  executionSelect.innerHTML = `<option value="">Select a test case...</option>` + testCases.map(test =>
    `<option value="${escapeHTML(test.id)}">${escapeHTML(test.id)} · ${escapeHTML(test.scenario)}</option>`
  ).join("");
  if (testCases.some(test => test.id === previous)) executionSelect.value = previous;
  updateSelectedPreview();
}

function updateSelectedPreview() {
  const test = testCases.find(item => item.id === executionSelect.value);
  if (!test) {
    selectedPreview.textContent = "Select a test case to view its expected result.";
    return;
  }
  selectedPreview.innerHTML = `<strong>Scenario:</strong> ${escapeHTML(test.scenario)}<br><strong>Expected:</strong> ${escapeHTML(test.expected)}<br><strong>Current status:</strong> ${escapeHTML(test.status)}`;
}

function updateDashboard() {
  const total = testCases.length;
  const passed = testCases.filter(test => test.status === "Pass").length;
  const failed = testCases.filter(test => test.status === "Fail").length;
  const pending = testCases.filter(test => test.status === "Pending").length;
  const executed = passed + failed;
  const percentage = executed === 0 ? 0 : Math.round((passed / executed) * 100);

  totalCount.textContent = total;
  passedCount.textContent = passed;
  failedCount.textContent = failed;
  pendingCount.textContent = pending;
  passPercent.textContent = `${percentage}%`;
  passProgress.style.width = `${percentage}%`;
  defectCount.textContent = failed;
  progressNote.textContent = executed === 0
    ? "No tests executed yet. Pending tests are not counted as passed."
    : `${passed} passed out of ${executed} executed test${executed === 1 ? "" : "s"}; ${pending} still pending.`;
}

function showToast(message) {
  const toast = $("toast");
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(toastTimeout);
  toastTimeout = window.setTimeout(() => toast.classList.remove("show"), 2800);
}

function executeTest(event) {
  event.preventDefault();
  executionError.textContent = "";

  const testId = executionSelect.value.trim();
  const actual = actualResultInput.value.trim();

  if (!testId) {
    executionError.textContent = "Please select a test case before executing.";
    executionSelect.focus();
    return;
  }
  if (!actual) {
    executionError.textContent = "Please enter the actual result observed during testing.";
    actualResultInput.focus();
    return;
  }
  if (actual.length < 3) {
    executionError.textContent = "Actual result is too short. Enter a meaningful observation (at least 3 characters).";
    actualResultInput.focus();
    return;
  }

  const test = testCases.find(item => item.id === testId);
  if (!test || !test.id || !test.requirementId || !test.scenario || !test.expected) {
    executionError.textContent = "This test case is missing required fields. Generate the test cases again.";
    return;
  }

  test.actual = actual;
  // This is intentionally a transparent text comparison, not a real app assertion.
  const expectedNormalized = normalizeResult(test.expected);
  const actualNormalized = normalizeResult(actual);
  const matches = actualNormalized === expectedNormalized;
  test.status = matches ? "Pass" : "Fail";
  test.defect = matches ? "" : `Observed result differs from expected behavior for ${test.id}. Investigate: ${test.scenario}.`;

  renderTestTable();
  renderExecutionOptions();
  executionSelect.value = test.id;
  updateSelectedPreview();
  updateDashboard();
  $("last-updated").textContent = `Updated ${new Date().toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"})}`;
  actualResultInput.value = "";
  showToast(matches ? `${test.id} marked PASS.` : `${test.id} marked FAIL — possible defect recorded.`);
  if (!matches) {
    selectedPreview.innerHTML += `<br><strong style="color:#c23c47">Possible defect:</strong> ${escapeHTML(test.defect)}`;
  }
  invalidateReport();
}

function buildReport() {
  const now = new Date();
  const passed = testCases.filter(test => test.status === "Pass").length;
  const failed = testCases.filter(test => test.status === "Fail").length;
  const pending = testCases.filter(test => test.status === "Pending").length;
  const executed = passed + failed;
  const percentage = executed ? Math.round(passed / executed * 100) : 0;
  const lines = [
    "LIBRARY MANAGEMENT SYSTEM — SOFTWARE TESTING REPORT",
    "=".repeat(58),
    `Generated: ${now.toLocaleString()}`,
    "Execution mode: Simulated/manual result comparison (no live application connected)",
    "",
    "1. PROJECT OVERVIEW",
    "Library TestLab is a rule-based testing support demo for generating structured test cases, recording observed results, comparing them with expected results, and reporting possible defects.",
    "",
    "2. PROBLEM STATEMENT",
    PROBLEM_STATEMENT,
    "",
    "3. FUNCTIONAL REQUIREMENTS",
    ...REQUIREMENTS.map(req => `${req.id}: ${req.text}`),
    "",
    "4. GENERATED TEST CASES AND EXECUTION RESULTS",
    "-".repeat(58)
  ];

  testCases.forEach(test => {
    lines.push(
      `${test.id} | Requirement: ${test.requirementId}`,
      `Scenario: ${test.scenario}`,
      `Input data: ${test.input}`,
      `Expected result: ${test.expected}`,
      `Actual result: ${test.actual || "Not executed"}`,
      `Status: ${test.status}`,
      `Identified defect: ${test.defect || "None recorded"}`,
      ""
    );
  });

  lines.push(
    "5. OVERALL TESTING SUMMARY",
    `Total test cases: ${testCases.length}`,
    `Passed: ${passed}`,
    `Failed: ${failed}`,
    `Pending: ${pending}`,
    `Executed: ${executed}`,
    `Pass percentage among executed tests: ${percentage}%`,
    `Identified possible defects: ${failed}`,
    "",
    "6. LIMITATIONS AND NOTES",
    "Test generation is rule-based and uses predefined sample templates; it is not connected to a generative AI model.",
    "Execution status is based on text comparison between the user's entered actual result and the expected result. It does not run operations against a real library application.",
    "A failed text comparison is a possible defect indicator, not proof of a software defect. Review each failure manually."
  );
  return lines.join("\n");
}

function generateReport() {
  lastReportText = buildReport();
  reportPreview.textContent = lastReportText;
  reportPreview.classList.remove("hidden");
  reportMessage.textContent = `Report generated from ${testCases.length} test cases at ${new Date().toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"})}. Download it as a text file when ready.`;
  downloadReportButton.disabled = false;
  showToast("Testing report generated.");
}

function invalidateReport() {
  if (!lastReportText) return;
  lastReportText = "";
  downloadReportButton.disabled = true;
  reportMessage.textContent = "Test results changed. Generate the report again to include the latest results.";
}

function downloadReport() {
  if (!lastReportText) {
    reportMessage.textContent = "Please generate the report before downloading.";
    showToast("Generate the report first.");
    return;
  }
  const blob = new Blob([lastReportText], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "library-management-testing-report.txt";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  showToast("Report download started.");
}

$("execution-form").addEventListener("submit", executeTest);
executionSelect.addEventListener("change", updateSelectedPreview);
$("generate-tests").addEventListener("click", generateTestCases);
$("generate-report").addEventListener("click", generateReport);
downloadReportButton.addEventListener("click", downloadReport);
testSearch.addEventListener("input", renderTestTable);
statusFilter.addEventListener("change", renderTestTable);

// Load usable sample data immediately when index.html opens.
renderRequirements();
generateTestCases();
