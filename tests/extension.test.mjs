import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const manifest=JSON.parse(readFileSync(new URL('../extension/manifest.json',import.meta.url),'utf8'));
test('extension uses temporary tab access without persistent hosts or background capture',()=>{
 assert.equal(manifest.manifest_version,3);
 assert.deepEqual(new Set(manifest.permissions),new Set(['activeTab','scripting','clipboardWrite']));
 assert.ok(!manifest.host_permissions?.length);assert.ok(!manifest.content_scripts?.length);assert.ok(!manifest.background);
 assert.ok(existsSync(new URL('../extension/'+manifest.action.default_popup,import.meta.url)));
});
