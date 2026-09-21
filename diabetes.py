"""Reproducible educational classification benchmark; not a diagnostic tool."""
import argparse
import json
from pathlib import Path
import numpy as np
import pandas as pd
from sklearn.base import BaseEstimator, TransformerMixin
from sklearn.datasets import fetch_openml
from sklearn.dummy import DummyClassifier
from sklearn.impute import SimpleImputer
from sklearn.metrics import accuracy_score, confusion_matrix, f1_score, precision_score, recall_score, roc_auc_score
from sklearn.model_selection import GridSearchCV, StratifiedKFold, train_test_split
from sklearn.naive_bayes import GaussianNB
from sklearn.neighbors import KNeighborsClassifier
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

FEATURES = ['preg', 'plas', 'pres', 'skin', 'insu', 'mass', 'pedi', 'age']
ZERO_MISSING = ['plas', 'pres', 'skin', 'insu', 'mass']

class ZeroToMissing(BaseEstimator, TransformerMixin):
    """Treat zero measurements as missing, preserving valid zero pregnancies."""
    def fit(self, X, y=None):
        return self

    def transform(self, X):
        result = X.copy()
        result[ZERO_MISSING] = result[ZERO_MISSING].replace(0, np.nan)
        return result

def validate(frame):
    required = FEATURES + ['class']
    missing = set(required) - set(frame.columns)
    if missing:
        raise ValueError(f'Missing columns: {sorted(missing)}')
    frame = frame[required].copy()
    labels = frame['class'].astype(str).str.strip()
    frame['class'] = labels.map({'tested_negative': 0, 'tested_positive': 1, '0': 0, '1': 1})
    if frame['class'].isna().any():
        raise ValueError('Class must be 0/1 or tested_negative/tested_positive; missing labels are invalid.')
    frame[FEATURES] = frame[FEATURES].apply(pd.to_numeric, errors='raise')
    if np.isinf(frame[FEATURES].to_numpy(dtype=float)).any() or (frame[FEATURES] < 0).any().any():
        raise ValueError('Features must be nonnegative finite values or missing.')
    if frame[FEATURES].isna().all().any():
        raise ValueError('A feature cannot be entirely missing.')
    frame = frame.drop_duplicates().reset_index(drop=True)
    if len(frame) < 40 or frame['class'].value_counts().reindex([0, 1], fill_value=0).min() < 10:
        raise ValueError('Provide at least 40 rows, with at least 10 rows in each class.')
    frame['class'] = frame['class'].astype(int)
    return frame

def pipeline(model):
    return Pipeline([('missing_zeros', ZeroToMissing()),
                     ('impute', SimpleImputer(strategy='median', keep_empty_features=True)),
                     ('scale', StandardScaler()), ('model', model)])

def evaluate(frame, output, seed=42, folds=5):
    frame = validate(frame)
    X_train, X_test, y_train, y_test = train_test_split(
        frame[FEATURES], frame['class'], test_size=.25, random_state=seed, stratify=frame['class'])
    if folds < 2 or folds > y_train.value_counts().min():
        raise ValueError('Folds must be between 2 and the smallest training class size.')
    cv = StratifiedKFold(n_splits=folds, shuffle=True, random_state=seed)
    minimum_fold_rows = len(X_train) - int(np.ceil(len(X_train) / folds))
    neighbors = [k for k in [3, 5, 7, 9] if k <= minimum_fold_rows]
    searches = {
        'knn': (KNeighborsClassifier(), {'model__n_neighbors': neighbors, 'model__weights': ['uniform', 'distance']}),
        'naive_bayes': (GaussianNB(), {'model__var_smoothing': [1e-9, 1e-8, 1e-7]})
    }
    report = {'seed': seed, 'folds': folds, 'rows_after_deduplication': len(frame),
              'train_rows': len(X_train), 'test_rows': len(X_test), 'positive_label': 1,
              'selection_metric': 'training cross-validation recall', 'models': {}}
    cv_scores = {}
    for name, (model, grid) in searches.items():
        search = GridSearchCV(pipeline(model), grid, scoring='recall', cv=cv, n_jobs=1, error_score='raise')
        search.fit(X_train, y_train)
        cv_scores[name] = float(search.best_score_)
        report['models'][name] = {
            'cv_recall': float(search.best_score_), 'best_parameters': search.best_params_,
            **metrics(search, X_test, y_test)}
    baseline = pipeline(DummyClassifier(strategy='most_frequent')).fit(X_train, y_train)
    report['models']['majority_baseline'] = metrics(baseline, X_test, y_test)
    report['selected_model'] = max(cv_scores, key=cv_scores.get)
    report['limitations'] = 'Historical restricted population; not validated for clinical use. One holdout split is not proof of deployment performance.'
    output = Path(output); output.mkdir(parents=True, exist_ok=True)
    # EDA uses training rows only; the holdout never influences model selection.
    X_train.describe().to_csv(output / 'training_summary.csv')
    ZeroToMissing().transform(X_train).isna().sum().to_csv(output / 'training_missing_counts.csv', header=['missing_count'])
    X_train.assign(target=y_train).corr().to_csv(output / 'training_correlations.csv')
    (output / 'metrics.json').write_text(json.dumps(report, indent=2) + '\n')
    return report

def metrics(model, X, y):
    prediction = model.predict(X)
    positive_index = list(model.classes_).index(1)
    probabilities = model.predict_proba(X)[:, positive_index]
    tn, fp, fn, tp = confusion_matrix(y, prediction, labels=[0, 1]).ravel()
    return {'accuracy': float(accuracy_score(y, prediction)),
            'precision': float(precision_score(y, prediction, zero_division=0)),
            'recall': float(recall_score(y, prediction, zero_division=0)),
            'f1': float(f1_score(y, prediction, zero_division=0)),
            'roc_auc': float(roc_auc_score(y, probabilities)),
            'confusion_matrix': {'tn': int(tn), 'fp': int(fp), 'fn': int(fn), 'tp': int(tp)}}

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    source = parser.add_mutually_exclusive_group(required=True)
    source.add_argument('--download-openml', action='store_true', help='Download dataset 37 into a local ignored cache.')
    source.add_argument('--csv', type=Path, help='Local CSV with the documented schema.')
    parser.add_argument('--output', type=Path, default=Path('reports'))
    parser.add_argument('--folds', type=int, default=5)
    parser.add_argument('--seed', type=int, default=42)
    args = parser.parse_args()
    try:
        if args.download_openml:
            dataset = fetch_openml(data_id=37, as_frame=True, data_home='.cache/openml')
            frame = dataset.frame
        else:
            frame = pd.read_csv(args.csv)
        report = evaluate(frame, args.output, args.seed, args.folds)
        report['source'] = 'OpenML dataset 37 version 1' if args.download_openml else 'User-supplied local CSV'
        (args.output / 'metrics.json').write_text(json.dumps(report, indent=2) + '\n')
        print(json.dumps(report, indent=2))
    except (ValueError, OSError) as error:
        parser.exit(2, f'Error: {error}\n')

if __name__ == '__main__':
    main()
