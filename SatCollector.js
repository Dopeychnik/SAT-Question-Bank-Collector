
/*
 SAT Question Bank Collector
 Запуск: DevTools -> Console на сайте College Board
*/

(async () => {
  const existing = document.getElementById("sat-qbank-collector");
  if (existing) existing.remove();

  const API =
    "https://qbank-api.collegeboard.org/msreportingquestionbank-prod/questionbank/digital/";

  const catalog = new Map();
  const downloaded = new Map();
  const failures = new Map();

  let stop = false;
  let busy = false;

  const sleep = ms =>
    new Promise(resolve => setTimeout(resolve, ms));

  function el(tag, props = {}, parent) {
    const node = document.createElement(tag);
    Object.assign(node, props);
    if (parent) parent.appendChild(node);
    return node;
  }

  async function request(path, body) {
    const response = await fetch(API + path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${path}`);
    }

    return response.json();
  }

  function unwrap(data) {
    if (Array.isArray(data)) return data;

    if (data && typeof data === "object") {
      return Object.values(data).flatMap(value =>
        Array.isArray(value) ? value : []
      );
    }

    return [];
  }

  function save(filename, data) {
    const blob = new Blob(
      [JSON.stringify(data, null, 2)],
      { type: "application/json" }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = filename;

    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  // ---------- UI ----------

  const panel = el(
    "div",
    { id: "sat-qbank-collector" },
    document.body
  );

  panel.style.cssText = `
    position: fixed;
    top: 16px;
    right: 16px;
    z-index: 2147483647;
    width: 370px;
    max-height: 85vh;
    overflow: auto;
    background: #101827;
    color: #e9eef8;
    border: 1px solid #64748b;
    border-radius: 12px;
    padding: 16px;
    box-shadow: 0 8px 30px #0008;
    font: 13px system-ui, sans-serif;
  `;

  const title = el(
    "div",
    { textContent: "SAT Question Bank Collector" },
    panel
  );

  title.style.cssText = `
    font-size: 18px;
    font-weight: 700;
    margin-bottom: 10px;
  `;

  const subtitle = el(
    "div",
    {
      textContent:
        "Scan catalog → Select skills → Download → Export"
    },
    panel
  );

  subtitle.style.marginBottom = "14px";

  function line(text) {
    const node = el(
      "div",
      { textContent: text },
      panel
    );

    node.style.margin = "10px 0";
    return node;
  }

  // ---------- Domains ----------

  line("Domains");

  const domainBox = el("div", {}, panel);

  const domains = [
    ["INI", "Information and Ideas"],
    ["CAS", "Craft and Structure"],
    ["SEC", "Standard English Conventions"],
    ["EOI", "Expression of Ideas"]
  ];

  const domainChecks = domains.map(([value, label]) => {
    const wrapper = el("label", {}, domainBox);

    wrapper.style.cssText = `
      display: block;
      margin: 5px 0;
    `;

    const checkbox = el(
      "input",
      {
        type: "checkbox",
        checked: true,
        value
      },
      wrapper
    );

    wrapper.append(" " + label);

    return checkbox;
  });

  // ---------- Skills ----------

  const skillLabel = line("Skills: scan catalog first");

  const skillBox = el("div", {}, panel);

  skillBox.style.cssText = `
    max-height: 180px;
    overflow: auto;
    border: 1px solid #334155;
    border-radius: 6px;
    padding: 8px;
  `;

  // ---------- Difficulty ----------

  line("Difficulty");

  const difficultyBox = el("div", {}, panel);

  const difficultyChecks = [
    ["H", "Hard"],
    ["M", "Medium"],
    ["E", "Easy"]
  ].map(([value, label]) => {
    const wrapper = el("label", {}, difficultyBox);

    wrapper.style.marginRight = "12px";

    const checkbox = el(
      "input",
      {
        type: "checkbox",
        value,
        checked: value === "H"
      },
      wrapper
    );

    wrapper.append(" " + label);

    return checkbox;
  });

  // ---------- Status ----------

  const status = line("Ready.");

  status.style.cssText = `
    white-space: pre-wrap;
    color: #93c5fd;
    margin-top: 14px;
  `;

  function log(message) {
    status.textContent = message;
    console.log("[SAT Collector]", message);
  }

  // ---------- Buttons ----------

  const buttonBox = el("div", {}, panel);

  buttonBox.style.cssText = `
    display: flex;
    flex-wrap: wrap;
    gap: 7px;
    margin: 14px 0;
  `;

  function button(label, handler) {
    const node = el(
      "button",
      {
        textContent: label,
        type: "button"
      },
      buttonBox
    );

    node.style.cssText = `
      background: #2563eb;
      color: white;
      border: 0;
      border-radius: 6px;
      padding: 8px 10px;
      cursor: pointer;
    `;

    node.addEventListener("click", handler);

    return node;
  }

  // ---------- Catalog ----------

  function refreshSkills() {
    skillBox.replaceChildren();

    const groups = new Map();

    for (const question of catalog.values()) {
      const skill =
        question.skill_desc ||
        question.skill_cd ||
        "Unknown";

      groups.set(
        skill,
        (groups.get(skill) || 0) + 1
      );
    }

    const sorted = [...groups.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]));

    for (const [skill, count] of sorted) {
      const wrapper = el("label", {}, skillBox);

      wrapper.style.cssText = `
        display: block;
        margin: 5px 0;
      `;

      const checkbox = el(
        "input",
        {
          type: "checkbox",
          checked: true,
          value: skill
        },
        wrapper
      );

      wrapper.append(` ${skill} (${count})`);
    }

    skillLabel.textContent =
      `Skills: ${groups.size} categories`;
  }

  async function scanCatalog() {
    if (busy) return;

    const selectedDomains = domainChecks
      .filter(checkbox => checkbox.checked)
      .map(checkbox => checkbox.value);

    if (!selectedDomains.length) {
      log("Select at least one domain.");
      return;
    }

    busy = true;
    stop = false;

    try {
      for (const domain of selectedDomains) {
        if (stop) break;

        log(`Scanning ${domain}...`);

        const response = await request(
          "get-questions",
          {
            asmtEventId: 99,
            test: 1,
            domain
          }
        );

        const questions = unwrap(response);

        for (const question of questions) {
          if (question.external_id) {
            catalog.set(
              question.external_id,
              question
            );
          }
        }

        log(
          `${domain}: ${questions.length} records\n` +
          `Catalog: ${catalog.size} unique questions`
        );

        await sleep(500);
      }

      refreshSkills();

      log(
        `Catalog ready!\n` +
        `${catalog.size} unique questions`
      );
    } catch (error) {
      log(`Scan stopped: ${error.message}`);
    } finally {
      busy = false;
    }
  }

  // ---------- Selection ----------

  function getSelection() {
    const selectedSkills = new Set(
      [...skillBox.querySelectorAll("input:checked")]
        .map(input => input.value)
    );

    const selectedDifficulties = new Set(
      difficultyChecks
        .filter(input => input.checked)
        .map(input => input.value)
    );

    return [...catalog.values()].filter(question => {
      const skill =
        question.skill_desc ||
        question.skill_cd ||
        "Unknown";

      return (
        selectedSkills.has(skill) &&
        selectedDifficulties.has(question.difficulty)
      );
    });
  }

  // ---------- Download ----------

  async function downloadSelected() {
    if (busy) return;

    if (!catalog.size) {
      log("Scan the catalog first.");
      return;
    }

    const selected = getSelection();

    if (!selected.length) {
      log("No questions match your filters.");
      return;
    }

    busy = true;
    stop = false;

    let processed = 0;

    try {
      log(`Selected ${selected.length} questions.`);

      for (const question of selected) {
        if (stop) {
          log("Stopped by user.");
          break;
        }

        if (downloaded.has(question.external_id)) {
          processed++;
          continue;
        }

        try {
          const detail = await request(
            "get-question",
            {
              external_id: question.external_id
            }
          );

          downloaded.set(question.external_id, {
            questionId: question.questionId,
            skill: question.skill_desc,
            difficulty: question.difficulty,
            domain: question.primary_class_desc,
            ...detail
          });

          failures.delete(question.external_id);
        } catch (error) {
          failures.set(question.external_id, {
            questionId: question.questionId,
            error: String(error)
          });

          log(
            `Stopped at ${question.questionId}\n` +
            `${error.message}\n` +
            `Downloaded: ${downloaded.size}`
          );

          break;
        }

        processed++;

        if (
          processed % 10 === 0 ||
          processed === selected.length
        ) {
          log(
            `${processed}/${selected.length} processed\n` +
            `${downloaded.size} downloaded\n` +
            `${failures.size} failures`
          );
        }

        await sleep(600);
      }

      if (!stop && failures.size === 0) {
        log(
          `Download complete!\n` +
          `${downloaded.size} questions saved`
        );
      }
    } finally {
      busy = false;
    }
  }

  // ---------- Export ----------

  function exportQuestions() {
    save("SAT_SQB_Collection.json", {
      source: "College Board SAT Question Bank",
      exportedAt: new Date().toISOString(),
      catalogSize: catalog.size,
      questions: [...downloaded.values()],
      failed: [...failures.values()]
    });

    log(
      `Exported ${downloaded.size} questions.`
    );
  }

  function exportCatalog() {
    save("SAT_SQB_Catalog.json", {
      source: "College Board SAT Question Bank",
      questions: [...catalog.values()]
    });

    log(
      `Exported catalog: ${catalog.size} records.`
    );
  }

  // ---------- Controls ----------

  button("Scan catalog", scanCatalog);

  button("Download selected", downloadSelected);

  button("Stop", () => {
    stop = true;
    log("Stopping after current request...");
  });

  button("Export JSON", exportQuestions);

  button("Export catalog", exportCatalog);

  button("Close", () => panel.remove());

  log("Ready. Click Scan catalog.");
})();
