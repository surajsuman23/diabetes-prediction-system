# Diabetes Prediction System

**[Open interactive demo](https://suraj-diabetes-benchmark.m16labs-0951.chatgpt.site)**


A reproducible educational comparison of K-Nearest Neighbors and Gaussian Naive Bayes on the historical Pima Indians Diabetes dataset. Includes a majority-class baseline, training-set exploratory analysis, and a held-out evaluation.

## Implementation

This repository includes the command-line implementation, an interactive browser demo, tests and documentation. Reported results apply to the documented implementation and runtime. References and data sources are listed in `SOURCES.md`.

## Setup

Requires Python 3.11 or newer. Run these commands from this project folder:

```sh
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
```

On Windows, activate with `.venv\Scripts\activate` instead.

## Run

```sh
python diabetes.py --download-openml
python -m unittest discover -v
```

The first command downloads **OpenML dataset 37, version 1** into `.cache/openml/`. The browser demo includes a copy in `docs/diabetes.csv`. The CLI download command requires network access on its first run; alternatively, pass `--csv docs/diabetes.csv`. A download failure is an error, not a reason to substitute synthetic results.

To use an existing compatible file:

```sh
python diabetes.py --csv path/to/diabetes.csv --output reports --folds 5 --seed 42
```

The required columns are `preg,plas,pres,skin,insu,mass,pedi,age,class`. The target accepts `0/1` or `tested_negative/tested_positive`. Missing numeric features are allowed; missing or unknown target labels are rejected. The CLI validates numeric inputs and class counts and removes exact duplicate rows.

## Evaluation design

1. Use a stratified 75/25 train/test split with a recorded seed.
2. Treat zero glucose, blood pressure, skin thickness, insulin and BMI values as missing measurements. Zero pregnancies remains valid. This is an explicit preprocessing assumption, not an assertion that OpenML marks these entries as missing.
3. Fit median imputation and scaling inside each training fold using a scikit-learn pipeline.
4. Tune KNN neighbors/weights and Naive Bayes smoothing using stratified cross-validation, selecting by recall on the training folds.
5. Compare the selected configurations with a majority-class baseline on the untouched test set. Select the model family by training CV recall, never by test performance.

Optimizing recall can reduce precision. The report includes both; it does not claim fewer false negatives without supporting output. The default classifier threshold is retained.

## Outputs

- `reports/metrics.json`: configuration, selected model, CV recall, test accuracy, precision, recall, F1, ROC AUC and confusion-matrix counts.
- `reports/training_summary.csv`: descriptive statistics for training features.
- `reports/training_missing_counts.csv`: missing counts after the zero-value rule.
- `reports/training_correlations.csv`: training-only numeric correlations, including the target.

No performance figure is hard-coded into this README. Run the benchmark and inspect the report before quoting results.

## Limitations

This historical dataset describes a restricted population: women aged at least 21 of Pima heritage. It does not support claims about all patients or current clinical practice. This project is for learning and retrospective benchmarking, not diagnosis, treatment, or deployment in patient care. No patient-facing prediction endpoint is included.

The implementation performs preprocessing and exploratory analysis, but does not invent a feature-engineering benefit or clinical outcome.

## Benchmark results

`benchmark_results.json` records a run on 2026-09-22 with Python 3.12, NumPy 2.5.3, pandas 3.0.6 and scikit-learn 1.9.1. It uses the documented seed 42 split and five folds. These results were measured on the current implementation. The selected KNN model has test accuracy 0.7135 and recall 0.5672; Naive Bayes has accuracy 0.7240 and recall 0.6269. KNN was selected by training CV recall even though Naive Bayes scored higher on this holdout.

## Browser interface

The `docs/` folder contains a standalone browser interface. To run it locally from the repository root:

```sh
npm ci
npm start
```

Open http://localhost:8212. Serve these files over HTTP or HTTPS; opening `index.html` directly as a file does not support the worker and module imports.

The interface loads Python through Pyodide 0.27.5 in a dedicated Web Worker and executes the project's original Python module. The first run downloads Python and scientific packages from the jsDelivr CDN, so it needs an internet connection and may take a minute. Later runs reuse the loaded runtime while the page remains open. Inputs and calculations stay in the browser; there is no application account or server-side input storage.

The browser runtime uses scikit-learn 1.6.1, pandas 2.2.3 and NumPy 2.0.2. These differ from the original desktop benchmark environment; exported result JSON records the actual runtime versions. Results should always be quoted with their runtime and split configuration.

`docs/diabetes.csv` is the 768-row OpenML dataset 37, version 1, downloaded for the demo. Its column names and class labels are preserved. This is a historical educational dataset, not private user input. Source: https://www.openml.org/d/37.

The public demo is hosted independently of this computer. The project can also be served from the `docs/` directory on a static host.

## Independent application

This app has its own deployment and source repository. It has no shared navigation or runtime dependency on the other portfolio projects.

## Experiment studio

The opening metrics are a labeled saved reference run from the browser runtime, not a claim that a new calculation has occurred. Select **Run experiment** to calculate fresh results. The interface supports seed/fold changes, model-specific confusion matrices, cancellation, timeout/error handling and a JSON export that distinguishes reference results from live computation. Cancelling preserves prior results. See `OPERATIONS.md` for verification and monitoring.

## Independent server

Run `npm ci` and `npm start` to serve frontend and API together on http://127.0.0.1:8212. Use `npm run build` for the Worker deployment bundle. The Node entry point is `server/local.mjs`; the hosted Worker entry point is `server/worker.mjs`. `npm run test:api` verifies its contracts. A non-root Dockerfile is included.

The backend serves `GET /api/v1/benchmark/reference` and `GET /api/v1/benchmark/config`, plus the frontend and dataset. Fresh model training remains in the browser's Python worker; reference data is never presented as a fresh server computation.
