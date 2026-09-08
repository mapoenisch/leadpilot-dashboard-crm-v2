import React from 'react';
import { renderToString } from 'react-dom/server';
import { Button } from '../src/components/ui/Button';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ Assertion failed: ${message}`);
    process.exit(1);
  }
  console.log(`✅ ${message}`);
}

console.log('\n=======================================================');
console.log('🧪 TESTING BUTTON COMPONENT (Loading, States & A11y)');
console.log('=======================================================\n');

// 1. Default button
const defaultHtml = renderToString(React.createElement(Button, null, 'Speichern'));
assert(defaultHtml.includes('Speichern'), 'Default button contains child text');
assert(!defaultHtml.includes('disabled'), 'Default button is not disabled');
assert(!defaultHtml.includes('aria-busy="true"'), 'Default button has no aria-busy="true"');
assert(!defaultHtml.includes('Laden...'), 'Default button has no loading spinner');

// 2. Loading button
const loadingHtml = renderToString(React.createElement(Button, { loading: true }, 'Speichern'));
assert(loadingHtml.includes('Speichern'), 'Loading button preserves accessible child text');
assert(loadingHtml.includes('disabled'), 'Loading button is disabled');
assert(loadingHtml.includes('aria-busy="true"'), 'Loading button sets aria-busy="true"');
assert(loadingHtml.includes('role="status"'), 'Loading button renders accessible SVG spinner with role="status"');
assert(loadingHtml.includes('aria-label="Laden..."'), 'Loading spinner has accessible aria-label');

// 3. Explicitly disabled button without loading
const disabledHtml = renderToString(React.createElement(Button, { disabled: true }, 'Abbrechen'));
assert(disabledHtml.includes('disabled'), 'Disabled button is disabled');
assert(!disabledHtml.includes('aria-busy="true"'), 'Disabled button does not have aria-busy="true"');
assert(!disabledHtml.includes('role="status"'), 'Disabled button has no loading spinner');

console.log('\n🎉 ALL BUTTON COMPONENT TESTS PASSED SUCCESSFULLY!\n');
