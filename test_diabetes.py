import tempfile
import unittest
from pathlib import Path
import numpy as np
import pandas as pd
from diabetes import FEATURES, ZeroToMissing, evaluate, pipeline, validate
from sklearn.naive_bayes import GaussianNB

class DiabetesTests(unittest.TestCase):
    def fixture(self):
        rng = np.random.default_rng(17)
        frame = pd.DataFrame(rng.uniform(1, 100, (100, 8)), columns=FEATURES)
        frame['class'] = np.tile([0, 1], 50)
        return frame

    def test_zero_semantics_and_no_mutation(self):
        frame = self.fixture(); frame.loc[0, ['preg', 'plas']] = 0
        result = ZeroToMissing().transform(frame)
        self.assertEqual(result.loc[0, 'preg'], 0)
        self.assertTrue(pd.isna(result.loc[0, 'plas']))
        self.assertEqual(frame.loc[0, 'plas'], 0)

    def test_labels_and_invalid_data(self):
        frame = self.fixture(); frame['class'] = frame['class'].astype(object); frame.loc[0, 'class'] = 'unknown'
        with self.assertRaises(ValueError): validate(frame)
        frame = self.fixture(); frame.loc[0, 'age'] = float('inf')
        with self.assertRaises(ValueError): validate(frame)

    def test_preprocessing_fits_training_only(self):
        frame = self.fixture(); train = frame.iloc[:80]
        model = pipeline(GaussianNB()).fit(train[FEATURES], train['class'])
        mean_before = model.named_steps['scale'].mean_.copy()
        model.predict(frame.iloc[80:][FEATURES] * 1000)
        np.testing.assert_array_equal(mean_before, model.named_steps['scale'].mean_)

    def test_end_to_end_holdout_accounting(self):
        with tempfile.TemporaryDirectory() as folder:
            report = evaluate(self.fixture(), folder, folds=3)
            self.assertEqual(report['train_rows'] + report['test_rows'], 100)
            for result in report['models'].values():
                self.assertEqual(sum(result['confusion_matrix'].values()), report['test_rows'])
            self.assertTrue((Path(folder) / 'metrics.json').exists())

if __name__ == '__main__': unittest.main()
