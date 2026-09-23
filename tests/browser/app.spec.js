import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
test('reference results, selection, cancellation and accessibility',async({page})=>{
 await page.goto('/');await expect(page.locator('.metric-table')).toBeVisible();
 await expect(page.locator('#provenance')).toHaveText('Saved reference');
 await page.getByRole('button',{name:'Naive Bayes',exact:true}).click();
 await expect(page.getByRole('button',{name:'Naive Bayes',exact:true})).toHaveAttribute('aria-pressed','true');
 const download=page.waitForEvent('download');await page.getByRole('button',{name:'Download result JSON'}).click();expect((await download).suggestedFilename()).toBe('diabetes-benchmark.json');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations).toEqual([]);
 await page.getByLabel('Random seed').fill('7');await expect(page.getByRole('status')).toContainText('Settings changed');
 await page.getByRole('button',{name:'Run experiment'}).click();await page.getByRole('button',{name:'Cancel run'}).click();await expect(page.getByRole('status')).toContainText('Run cancelled');await expect(page.locator('#provenance')).toHaveText('Saved reference');
});
test('computes a new result with the actual Python worker',async({page},info)=>{
 test.skip(info.project.name!=='chromium','One full scientific runtime execution per CI run');
 await page.goto('/');await page.getByRole('button',{name:'Run experiment'}).click();await expect(page.getByRole('status')).toHaveText('Experiment complete',{timeout:170000});await expect(page.locator('#provenance')).toHaveText('Computed in browser');await expect(page.locator('.metric-table')).toContainText('Naive Bayes');
});
