import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { chromium } from '@playwright/test';

const flowRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const aiRoot = resolve(flowRoot, '../../ai-kit/admin');
const gateyRoot = resolve(flowRoot, '../../gatey/admin');
const targets = process.env.WPSUITE_ROUTING_TARGET === 'gatey' ? [['gatey', gateyRoot]] : [['flow', flowRoot], ['ai', aiRoot]];
const outputs = {};
for (const [plugin, root] of targets) {
  const bundled = await build({
    absWorkingDir: root, bundle: true, write: false, outfile: `/tmp/${plugin}-admin-navigation.js`,
    format: 'iife', jsx: 'automatic', loader: { '.jpg': 'dataurl', '.png': 'dataurl' },
    define: { 'process.env.NODE_ENV': '"production"', 'process.env.WPSUITE_PREMIUM': 'true' },
    stdin: { resolveDir: root, loader: 'tsx', contents: `
      import React from 'react'; import { createRoot } from 'react-dom/client';
      import { MantineProvider } from '@mantine/core';
      import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
      import Main from './src/main'; import '@mantine/core/styles.css';
      createRoot(document.getElementById('root')).render(<MantineProvider><QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false}}})}><Main nonce="synthetic" settings={{}} store={{}} /></QueryClientProvider></MantineProvider>);
    ` },
    plugins: [{ name: 'synthetic-backends', setup(builder) {
      builder.onResolve({filter:/^(?:@smart-cloud\/(?:ai-kit-core|flow-core|gatey-core|wpsuite-core)|@wordpress\/(?:data|i18n|api-fetch)|jquery)$/},({path})=>({path,namespace:'fixture'}));
      builder.onResolve({filter:/^\.\/(?:DocSidebar|onboarding|api\/backend-client|paid-features\/.*|index|CognitoAdminSession)$/},({path})=>({path,namespace:'fixture'}));
      builder.onLoad({filter:/.*/,namespace:'fixture'},({path})=> {
        if(path==='@wordpress/i18n')return {contents:'export const __=x=>x;'};
        if(path==='@wordpress/api-fetch')return {contents:'export default async ({path})=>path.includes("pages")?[]:{show_on_front:"posts"};'};
        if(path==='@wordpress/data')return {contents:'export const useSelect=()=>null;'};
        if(path==='jquery')return {contents:''};
        if(path==='@smart-cloud/wpsuite-core')return {contents:'export const SubscriptionType={}; export const getWpSuite=()=>window.WpSuite;'};
        if(path==='@smart-cloud/ai-kit-core')return {contents:`export const getAiKitPlugin=()=>({restUrl:'/rest'}); export const TEXT_DOMAIN='test'; export const LANGUAGE_OPTIONS=[{label:'English',value:'en'}]; export const sanitizeAiKitConfig=x=>x; export const reloadConfig=async()=>{};`};
        if(path==='@smart-cloud/flow-core')return {contents:`export const getStoreSelect=()=>({}); export const getFlowPlugin=()=>({restUrl:'/rest'}); export const TEXT_DOMAIN='test'; export const sanitizeFlowConfig=x=>x; export const resolveBackend=async(name)=>{await window.fixtureCapsPromise;return {available:window.fixtureCaps[name==='forms.admin'?'submissions':'workflows']};};`};
        if(path==='@smart-cloud/gatey-core')return {contents:`export const getStoreSelect=()=>({getConfig:()=>null}); export const getGateyPlugin=()=>({restUrl:'/rest'}); export const sanitizeAuthenticatorConfig=x=>x; export const TEXT_DOMAIN='test';`};
        if(path==='./index')return {contents:'export const signUpAttributes=[];'};
        if(path==='./CognitoAdminSession')return {contents:'export const CognitoAdminSession=()=>null;'};
        if(path==='./api/backend-client')return {contents:'export class FlowBackendClient {}'};
        if(path==='./DocSidebar')return {contents:'export default ()=>null;'};
        if(path==='./onboarding')return {contents:'export const AiKitOnboarding=()=>null; export const FlowOnboarding=()=>null; export const OnboardingBanner=()=>null;'};
        const name=path.split('/').at(-1);
        return {loader:'jsx',resolveDir:root,contents:`import React from 'react'; export default function Editor(){React.useEffect(()=>{window.fixtureEditorMounts.push('${name}');},[]);return <div data-editor="${name}">${name}</div>;}`};
      });
    }}],
  });
  outputs[plugin]={js:bundled.outputFiles.find(f=>f.path.endsWith('.js')).contents,css:bundled.outputFiles.find(f=>f.path.endsWith('.css')).contents};
}
const server=createServer((req,res)=>{
  const url=new URL(req.url,'http://localhost');
  const plugin=url.pathname.includes('gatey')?'gatey':url.pathname.includes('ai')?'ai':'flow';
  if(url.pathname.endsWith('.js')){res.setHeader('Content-Type','application/javascript');res.end(outputs[plugin].js);return;}
  if(url.pathname.endsWith('.css')){res.setHeader('Content-Type','text/css');res.end(outputs[plugin].css);return;}
  res.setHeader('Content-Type','text/html');
  const integrated = url.searchParams.has('integrated');
  const product = plugin === 'gatey' ? 'login-access' : 'forms-workflows';
  res.end(`<!doctype html><html><head><link rel="stylesheet" href="/${plugin}.css"></head><body>${integrated ? `<section id="wpsuite-product-details" data-wpsuite-product="${product}">` : ''}<div id="root"></div>${integrated ? '</section>' : ''}<script>
    window.WpSuite={siteSettings:{accountId:'fixture',siteId:'fixture',siteKey:'synthetic'},restUrl:'/rest'};
    window.wp={data:{select:()=>({getConfig:()=>null})}};
    window.fixtureEditorMounts=[];window.fixtureSawGeneral=false;window.fixtureDocumentIdentity=crypto.randomUUID();
    window.fixtureCaps={submissions:true,workflows:true};
    window.fixtureCapsPromise=new Promise(resolve=>window.fixtureReleaseCaps=resolve);
    window.fixtureConfigPromise=new Promise(resolve=>window.fixtureReleaseConfig=resolve);
    window.fetch=async(url)=>{if(String(url).endsWith('/settings')){const data=await window.fixtureConfigPromise;return {ok:data!==null,statusText:'Synthetic disconnected config',json:async()=>data};}return {ok:true,json:async()=>({})};};
    new MutationObserver(()=>{if(document.querySelector('form[name="general"]'))window.fixtureSawGeneral=true;}).observe(document.getElementById('root'),{subtree:true,childList:true});
  </script><script src="/${plugin}.js"></script></body></html>`);
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
let scenarios=0;
async function testRoute(plugin,query,editor,{denied=false,disconnected=false,localForm}={}){
  const page=await browser.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(`${origin}/${plugin}?${query}`);
  await page.waitForFunction(()=>typeof window.fixtureReleaseConfig==='function'&&document.querySelector('.mantine-Card-root'));
  // Let navigation effects run during the deliberately unresolved remote configuration.
  await page.waitForTimeout(120);
  if(editor||localForm)assert.equal(await page.evaluate(()=>window.fixtureSawGeneral),false,`${plugin} ${query} reset during hydration`);
  await page.evaluate(({denied})=>{window.fixtureCaps={submissions:!denied,workflows:!denied};window.fixtureReleaseCaps();},{denied});
  await page.waitForTimeout(60);
  await page.evaluate(({disconnected})=>window.fixtureReleaseConfig(disconnected?null:{accountId:'fixture',siteId:'fixture',settings:{mode:'cloud'},subscriptionType:'PROFESSIONAL'}),{disconnected});
  if(localForm){
    await page.locator(`form[name="${localForm}"]`).waitFor();
    assert.equal(await page.evaluate(()=>window.fixtureSawGeneral),false);
  } else if(denied||disconnected||!editor){
    await page.locator('form[name="general"]').waitFor();
    if((denied||disconnected)&&plugin!=='gatey')assert.match(await page.locator('body').innerText(),/Requested section unavailable/);
    if(denied){assert.match(await page.locator('body').innerText(),/Backend compatibility/);assert.equal(await page.locator('[data-editor]').count(),0);}
    if(disconnected)assert.equal(await page.locator('[data-editor]').count(),0);
  } else {
    await page.locator(`[data-editor="${editor}"]`).waitFor();
    assert.equal(await page.evaluate(()=>window.fixtureSawGeneral),false,`${plugin} ${query} reset after hydration`);
  }
  assert.deepEqual(errors,[],`${plugin} ${query} browser errors`);
  await page.close();scenarios++;
}
async function testHistory(plugin, { legacy = false, disconnected = false, denied = false } = {}) {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const wordpressPage = { ai: 'smartcloud-ai-kit', flow: 'smartcloud-flow', gatey: 'gatey' }[plugin];
  const initialSection = legacy ? 'aikit-page=kb-admin' : 'section=general';
  await page.goto(`${origin}/${plugin}?page=${wordpressPage}&extra=keep&${initialSection}#anchor`);
  await page.waitForFunction(() => typeof window.fixtureReleaseConfig === 'function' && document.querySelector('.mantine-NavLink-root'));
  const initial = await page.evaluate(() => ({ length: history.length, identity: window.fixtureDocumentIdentity }));
  await page.evaluate(({ disconnected, denied }) => {
    window.fixtureCaps = { submissions: !denied, workflows: !denied };
    window.fixtureReleaseCaps();
    window.fixtureReleaseConfig(disconnected ? null : { accountId: 'fixture', siteId: 'fixture', settings: { mode: 'cloud' }, subscriptionType: 'PROFESSIONAL' });
  }, { disconnected, denied });
  if (legacy) await page.locator('[data-editor="KBAdminEditor"]').waitFor();
  else await page.locator('form[name="general"]').waitFor();
  // Hydration may render again; it must not manufacture a browser visit.
  await page.waitForTimeout(150);
  assert.equal(await page.evaluate(() => history.length), initial.length);
  const click = async label => {
    await page.locator('.mantine-NavLink-root').filter({ hasText: new RegExp(`^${label}$`) }).click();
  };
  const routes = plugin === 'gatey'
    ? [['User Pools', 'user-pools'], ['WordPress Login', 'wordpress-login']]
    : plugin === 'flow' ? [['API Settings', 'api-settings'], ['Workflows', 'workflows']]
    : [['Chatbot Settings', 'chatbot-settings'], ['Conversation Profile', 'conversation-profile']];
  const expectSection = async section => {
    await page.waitForFunction(section => new URL(location.href).searchParams.get('section') === section, section);
    const info = await page.evaluate(() => ({ page: new URL(location.href).searchParams.get('page'), extra: new URL(location.href).searchParams.get('extra'), hash: location.hash, identity: window.fixtureDocumentIdentity, legacy: new URL(location.href).searchParams.has('aikit-page') }));
    assert.deepEqual(info, { page: wordpressPage, extra: 'keep', hash: '#anchor', identity: initial.identity, legacy: false });
    const editors = plugin === 'ai'
      ? { 'api-settings': 'ApiSettingsEditor', 'chatbot-settings': 'ChatbotSettingsEditor', 'conversation-profile': 'ConversationProfileEditor', 'kb-admin': 'KBAdminEditor' }
      : plugin === 'flow' ? { 'api-settings': 'ApiSettingsEditor', submissions: 'SubmissionsEditor', workflows: 'WorkflowsEditor' }
      : { 'api-settings': 'ApiSettingsEditor', 'custom-fields': 'CustomFieldsEditor', 'custom-providers': 'CustomProvidersEditor' };
    if (editors[section]) await page.locator(`[data-editor="${editors[section]}"]`).waitFor();
    else await page.locator(`form[name="${section}"]`).waitFor();
  };
  if ((disconnected && plugin !== 'gatey') || denied) {
    const denied = plugin === 'flow' ? 'workflows' : 'kb-admin';
    await page.evaluate(section => {
      const url = new URL(location.href); url.searchParams.set('section', section);
      history.pushState({}, '', url); dispatchEvent(new PopStateEvent('popstate', { state: history.state }));
    }, denied);
    await expectSection('general');
    await page.locator('form[name="general"]').waitFor();
    assert.equal(await page.locator('[data-editor]').count(), 0);
    if(plugin==='flow')assert.match(await page.locator('body').innerText(),/Requested section unavailable/);
  } else {
    await click(routes[0][0]); await expectSection(routes[0][1]);
    const firstLength = await page.evaluate(() => history.length);
    assert.equal(firstLength, initial.length + 1);
    await click(routes[0][0]);
    assert.equal(await page.evaluate(() => history.length), firstLength, 'same-section click must not duplicate history');
    await click(routes[1][0]); await expectSection(routes[1][1]);
    await page.evaluate(() => history.back()); await expectSection(routes[0][1]);
    await page.evaluate(() => history.back()); await expectSection(legacy ? 'kb-admin' : 'general');
    await page.evaluate(() => history.forward()); await expectSection(routes[0][1]);
    await page.evaluate(() => history.forward()); await expectSection(routes[1][1]);
    await page.evaluate(() => {
      const url = new URL(location.href); url.searchParams.set('section', 'unsupported');
      history.pushState({}, '', url); dispatchEvent(new PopStateEvent('popstate', { state: history.state }));
    });
    await expectSection('general');
    await page.locator('form[name="general"]').waitFor();
    if (disconnected && plugin === 'gatey') {
      await page.evaluate(() => {
        const url = new URL(location.href); url.searchParams.set('section', 'api-settings');
        history.pushState({}, '', url); dispatchEvent(new PopStateEvent('popstate', { state: history.state }));
      });
      await expectSection('general');
      assert.match(await page.locator('body').innerText(), /Requested section is unavailable/);
      assert.equal(await page.locator('[data-editor]').count(), 0);
    }
  }
  assert.deepEqual(errors, [], `${plugin} browser history errors`);
  await page.close(); scenarios++;
}

async function testIntegrated(plugin) {
  const page = await browser.newPage();
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  try {
    await page.goto(`${origin}/${plugin}?page=smartcloud-wpsuite-capability-${plugin === 'gatey' ? 'login-access' : 'forms-workflows'}&panel=details&section=general&integrated=1`);
    await page.waitForFunction(() => typeof window.fixtureReleaseConfig === 'function' && document.querySelector('.mantine-NavLink-root'));
    await page.evaluate(() => { window.fixtureReleaseCaps(); window.fixtureReleaseConfig({accountId:'fixture',siteId:'fixture',settings:{mode:'cloud'},subscriptionType:'PROFESSIONAL'}); });
    await page.locator('form[name="general"]').waitFor();
    assert.equal(await page.locator('h1').count(), 0, 'Product shell owns the heading; native intro is omitted.');
    assert.equal(await page.getByText('This interface allows', {exact:false}).count(), 0, 'Detailed editor does not repeat introductory prose.');
    const label = plugin === 'gatey' ? 'User Pools' : 'API Settings';
    await page.locator('.mantine-NavLink-root').filter({hasText:new RegExp(`^${label}$`)}).click();
    await page.waitForFunction(section => new URL(location.href).searchParams.get('section') === section, plugin === 'gatey' ? 'user-pools' : 'api-settings');
    assert.equal(new URL(page.url()).searchParams.get('panel'), 'details', 'Native history preserves integrated mode.');
    await page.evaluate(() => history.back());
    await page.locator('form[name="general"]').waitFor();
    assert.deepEqual(errors, []);
    scenarios++;
  } finally { await page.close(); }
}

try{
 if(process.env.WPSUITE_ROUTING_TARGET === 'gatey'){
  for(const [section,editor] of [['api-settings','ApiSettingsEditor'],['custom-fields','CustomFieldsEditor'],['custom-providers','CustomProvidersEditor']])await testRoute('gatey',`section=${section}`,editor);
  for(const section of ['user-pools','wordpress-login']){await testRoute('gatey',`section=${section}`,null,{localForm:section});await testRoute('gatey',`section=${section}`,null,{localForm:section,disconnected:true});}
  await testRoute('gatey','section=unknown',null);
  await testRoute('gatey','section=api-settings','ApiSettingsEditor',{disconnected:true});
  await testIntegrated('gatey');
  await testHistory('gatey');
  await testHistory('gatey', { disconnected: true });
 }else{
  await testIntegrated('flow');
  for(const [section,editor] of [['api-settings','ApiSettingsEditor'],['chatbot-settings','ChatbotSettingsEditor'],['conversation-profile','ConversationProfileEditor'],['kb-admin','KBAdminEditor']])await testRoute('ai',`section=${section}`,editor);
  await testRoute('ai','aikit-page=kb-admin','KBAdminEditor');
  await testRoute('ai','section=chatbot-settings&aikit-page=kb-admin','ChatbotSettingsEditor');
  await testRoute('ai','section=unknown',null);
  await testRoute('ai','section=kb-admin','KBAdminEditor',{disconnected:true});
  for(const [section,editor] of [['api-settings','ApiSettingsEditor'],['submissions','SubmissionsEditor'],['workflows','WorkflowsEditor'],['templates','WorkflowsEditor']])await testRoute('flow',`section=${section}`,editor);
  for(const section of ['submissions','workflows'])await testRoute('flow',`section=${section}`,section==='submissions'?'SubmissionsEditor':'WorkflowsEditor',{denied:true});
  await testRoute('flow','section=unknown',null);
  await testRoute('flow','section=workflows','WorkflowsEditor',{disconnected:true});
  await testHistory('ai');
  await testHistory('ai', { legacy: true });
  await testHistory('ai', { disconnected: true });
  await testHistory('flow');
  await testHistory('flow', { disconnected: true });
  await testHistory('flow', { denied: true });
 }
  console.log(`Passed ${scenarios} actual ${targets.map(([plugin])=>plugin).join('/')} component routing scenarios, delayed hydration and backend denial.`);
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
