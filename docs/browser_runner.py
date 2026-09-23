"""Thin browser adapter; delegates computation to the original Python modules."""
import json
import time
import pandas as pd
import sklearn
import numpy as np
import pyodide
from pathlib import Path

_model = None
_report = None

def browser_run(app, data):
    global _model, _report
    started = time.monotonic()
    if app == 'diabetes':
        import diabetes
        seed = int(data.get('seed', 42))
        folds = int(data.get('folds', 5))
        if not 0 <= seed <= 999999 or not 2 <= folds <= 5:
            raise ValueError('Seed must be 0–999999; folds must be 2–5.')
        frame = pd.read_csv('/project/diabetes.csv')
        result = diabetes.evaluate(frame, '/project/reports', seed=seed, folds=folds)
        result['source'] = 'OpenML dataset 37, version 1'
    else:
        raise ValueError('Unknown project.')
    result['runtime'] = {'pyodide': pyodide.__version__, 'scikit_learn': sklearn.__version__, 'pandas': pd.__version__, 'numpy': np.__version__}
    result['elapsed_seconds'] = round(time.monotonic()-started, 3)
    result['computed_at'] = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
    return json.dumps(result, allow_nan=False)
