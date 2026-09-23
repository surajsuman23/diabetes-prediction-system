# Verification

Tested locally on 2026-09-22. These checks cover the current implementation.

Python 3.12, NumPy 2.5.3, pandas 3.0.6, scikit-learn 1.9.1: four automated tests passed. The documented CLI also completed successfully.

## Online interface verification — 2026-09-23

Executed the original Python source in Pyodide 0.27.5 under Node.js using the same runtime and package versions as the browser worker. Verified real dataset row counts, holdout confusion matrix totals, changes with a different seed, and fictional hospital ranking. This checks the computation runtime; it is not a claim of a full cross-browser test.
