# Diabetes Prediction System

A reproducible educational comparison of K-Nearest Neighbors and Gaussian Naive Bayes on the historical Pima Indians Diabetes dataset. Includes a majority-class baseline, training-set exploratory analysis, and a held-out evaluation.

## About this version

Rebuilt portfolio implementation based on an earlier project. This repository contains the current code, tests and documentation. Reported results apply to this version. References and data sources are listed in `SOURCES.md`.

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

The first command downloads **OpenML dataset 37, version 1** into `.cache/openml/`. Dataset files are not bundled or uploaded in this repository. Network access is required for the first download. A download failure is an error, not a reason to substitute synthetic results.

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
