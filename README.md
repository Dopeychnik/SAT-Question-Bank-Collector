# SAT Question Bank Collector

**A lightweight, browser-based utility for exploring, filtering, and exporting SAT practice questions.**

![JavaScript](https://img.shields.io/badge/JavaScript-Vanilla_JS-F7DF1E?logo=javascript&logoColor=black)
![License](https://img.shields.io/badge/License-MIT-blue)
![Dependencies](https://img.shields.io/badge/Dependencies-None-success)
![Status](https://img.shields.io/badge/Status-Experimental-orange)

## Overview

SAT Question Bank Collector is a JavaScript utility designed to simplify working with the College Board SAT Educator Question Bank.

Instead of manually selecting and exporting individual questions, the tool provides a browser-based interface for discovering available questions, filtering by skill and difficulty, and exporting structured JSON datasets.

The tool runs directly in the browser without additional dependencies.

## Features

- **Catalog discovery** — retrieve question metadata across SAT Reading and Writing domains.
- **Skill-based filtering** — select specific skills such as Inferences, Command of Evidence, and Words in Context.
- **Difficulty selection** — filter questions by Easy, Medium, or Hard.
- **Question retrieval** — retrieve available question content and associated explanations.
- **JSON export** — save question collections and catalog metadata in structured files.
- **Progress tracking** — monitor retrieval progress and stop ongoing operations.
- **Duplicate prevention** — organize catalog entries using unique question identifiers.

## Getting Started

### Requirements

- A modern browser with Developer Tools
- Access to the [SAT Educator Question Bank](https://satsuiteeducatorquestionbank.collegeboard.org/)
- JavaScript enabled

No Node.js installation, package manager, or build process is required.

### Installation

1. Open the SAT Educator Question Bank in your browser.
2. Open Developer Tools (`F12` or `Ctrl + Shift + J`).
3. Navigate to the **Console** tab.
4. Copy the contents of [`SatCollector.js`](./SatCollector.js).
5. Paste the code into the console and execute it.

A floating **SAT Question Bank Collector** panel will appear on the page.

Only execute browser-console scripts after reviewing and understanding their contents.

## Usage

### 1. Scan the catalog

Choose the domains you want to explore and click **Scan catalog**.

The collector retrieves available question metadata, including identifiers, skills, domains, and difficulty levels.

### 2. Configure filters

Select the skills and difficulty levels you want to include.

For example, to create a targeted advanced Reading and Writing practice collection, select:

- Information and Ideas
- Inferences
- Command of Evidence
- Hard

### 3. Retrieve questions

Click **Download selected** to retrieve matching questions.

The interface displays progress and provides an option to stop the process.

### 4. Export your collection

Use **Export JSON** to save retrieved question data, or **Export catalog** to save the metadata index.

Exported files can be processed locally for personal study and analysis, subject to applicable content-use restrictions.

## Project Structure

```text
SAT-Question-Bank-Collector/
├── SatCollector.js
├── README.md
└── LICENSE
```

## Limitations

- The collector relies on the current structure of the SAT Question Bank website and its underlying endpoints.
- Changes to the website or API may require updates to the script.
- Retrieval may fail due to network errors, browser restrictions, or service-side limitations.
- The collector does not bypass authentication, access controls, or rate limits.
- The tool is experimental and is not guaranteed to work with future versions of the website.

## Disclaimer

This is an independent, unofficial project and is **not affiliated with, endorsed by, or sponsored by College Board**.

SAT and related trademarks belong to their respective owners.

The software is provided for educational and technical purposes. It does not grant rights to reproduce, redistribute, or publicly host copyrighted question content. Users are responsible for complying with applicable terms and content-use restrictions.

## License

The source code is released under the [MIT License](./LICENSE).
