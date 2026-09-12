import assert from 'node:assert/strict';
import { test } from 'node:test';
import prettier from 'prettier';
import { createPlaceholderPlan } from '../dist/embedding/placeholders.js';
import { resolveEmbeddedLanguage } from '../dist/html/embedded-language.js';
import { discoverProtectedRegions } from '../dist/html/raw-regions.js';
import { restorePlaceholderDoc, sourceToDoc, formatEmbeddedDoc } from '../dist/prettier/index.js';
const b = prettier.doc.builders;
const render = (doc, options={}) => prettier.doc.printer.printDocToString(doc, {printWidth:80,tabWidth:2,useTabs:false,...options}).formatted;

function plan(text='"{{value}}"') {
  const start=text.indexOf('{{value}}');
  return createPlaceholderPlan(text,[{start,end:start+9,replacement:'{{value}}'}]);
}

test('validates source ranges before preparing placeholders',()=>{
  for(const spans of [[{start:-1,end:1,replacement:''}],[{start:0,end:4,replacement:''}], [{start:1,end:2,replacement:''},{start:0,end:1,replacement:''}], [{start:0.1,end:2,replacement:''}]]) {
    assert.equal(createPlaceholderPlan('abc',spans),null);
  }
});
test('checks both source and replacement for marker collisions',()=>{
  const p=createPlaceholderPlan('m0_ {{v}}',[{start:4,end:9,replacement:'m1_'}]);
  assert.ok(p.text.includes('m2_'));
  assert.equal(restorePlaceholderDoc(p.text,p.restore),'m0_ m1_');
});
test('selects a salt without repeatedly rescanning a crowded source',()=>{
  const text=Array.from({length:10_000},(_,i)=>`m${i}_`).join(' ')+' {{value}}';
  assert.ok(plan(text).text.includes('m10000_'));
});
for(const width of [8,80]) test(`restores each alternative independently at width ${width}`,()=>{
  const p=plan();
  const restored=restorePlaceholderDoc(b.conditionalGroup([p.text,[p.text,b.line,'tail']]),p.restore);
  assert.notEqual(restored,null);
  assert.match(render(restored,{printWidth:width}),/\{\{value\}\}/);
});
test('rejects missing, duplicated, split and layout-dependent markers',()=>{
  const p=plan(); const marker=[...p.restore.keys()][0];
  for(const doc of ['', [p.text,p.text], [marker.slice(0,2),marker.slice(2)], b.ifBreak(p.text,'other'), b.conditionalGroup([p.text,'other'])]) assert.equal(restorePlaceholderDoc(doc,p.restore),null);
});
test('restoration preserves caller-owned fill parts and group references',()=>{
  const p=plan(); const id=Symbol('group');
  const doc=b.group(b.fill([p.text,b.line,'tail']),{id});
  const original=JSON.stringify(doc);
  const restored=restorePlaceholderDoc(doc,p.restore);
  assert.equal(JSON.stringify(doc),original);
  assert.equal(restored.id,id);
  assert.notEqual(restored,doc);
});
test('literal source Docs preserve all whitespace inside an indent',()=>{
  const text='\nfirst  \n  second\n';
  assert.equal(render(b.indent(sourceToDoc(text))),text);
});
test('dynamic attributes are not absent or default JavaScript',()=>{
  for(const name of ['type','lang','language','data-type']) assert.equal(resolveEmbeddedLanguage('script',new Map([[name,null]])),null);
  assert.equal(resolveEmbeddedLanguage('script',new Map([['src',null]])),null);
  assert.deepEqual(resolveEmbeddedLanguage('script',new Map()),{parser:'babel',sourceType:'script'});
  assert.deepEqual(resolveEmbeddedLanguage('script',new Map([['type','module']])),{parser:'babel',sourceType:'module'});
});
test('shared discovery respects caller template spans',()=>{
  const source='{{ "<script>fake</script>" }}<script>const x=1;</script>';
  const regions=discoverProtectedRegions(source,[{start:0,end:28}]);
  assert.equal(regions.length,1);
  assert.ok(regions[0].start>=28);
});
test('shared adapter fails closed when a caller printer drops markers',async()=>{
  const p=plan('const a="{{value}}";');
  assert.equal(await formatEmbeddedDoc(p.text,p.restore,{parser:'babel',sourceType:'script'},{},async()=>''),null);
});
test('shared adapter retains HTML/source-type context without overriding caller options',async()=>{
  const p=plan('const a="{{value}}";'); let seen;
  const result=await formatEmbeddedDoc(p.text,p.restore,{parser:'babel',sourceType:'script'},{singleQuote:true},async(text,options)=>{seen=options;return text;});
  assert.equal(result,'const a="{{value}}";');
  assert.equal(seen.__embeddedInHtml,true);
  assert.equal(seen.__babelSourceType,'script');
  assert.equal(seen.parser,'babel');
});
test('unknown regex-shaped marker maps do not throw or become patterns',()=>{
  assert.doesNotThrow(()=>restorePlaceholderDoc('m0_[',new Map([['m0_[','{{value}}']])));
  assert.equal(restorePlaceholderDoc('m0_X',new Map([['m0_.','{{value}}']])),null);
});
test('boundary readers reject invalid spans instead of guessing',()=>{
  assert.throws(()=>discoverProtectedRegions('abc',[{start:2,end:1}]),TypeError);
});
for(const whitespace of ['\t','\n','\f','\r',' ']) test('language normalization trims HTML ASCII edge '+JSON.stringify(whitespace),()=>{
  assert.deepEqual(resolveEmbeddedLanguage('script',new Map([['type',whitespace+'MODULE'+whitespace]])),{parser:'babel',sourceType:'module'});
});
for(const whitespace of ['\u000b','\u0085','\u00a0','\u2003','\ufeff']) test('language normalization preserves non-HTML edge '+JSON.stringify(whitespace),()=>{
  assert.equal(resolveEmbeddedLanguage('script',new Map([['type',whitespace+'module']])),null);
});
test('quote-preserving adapters reject a conflicting style before delegation',async()=>{
  const p=plan('const a="{{value}}";');let delegated=false;
  assert.equal(await formatEmbeddedDoc(p.text,p.restore,{parser:'babel',sourceType:'script'},{singleQuote:true},async text=>{delegated=true;return text;},{preserveTemplateQuoteStyle:true}),null);
  assert.equal(delegated,false);
});
