import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const base=process.env.ACCOUNT_UI_URL??'http://127.0.0.1:4180';
const out=resolve('data/runtime/valentine/account-evidence');await mkdir(out,{recursive:true});
const report={scope:'Real production UI; deterministic mocked account HTTP only. Provider/email delivery and deployed DB are NOT certified by this test.',cases:[],pageErrors:[]};
const browser=await chromium.launch({headless:true});const context=await browser.newContext({viewport:{width:1440,height:1050}});const page=await context.newPage();page.setDefaultTimeout(7000);page.on('pageerror',e=>report.pageErrors.push(e.message));
let signedIn=false,available=true,verificationAttempts=0;
const profile={id:'test-account',displayName:'Martha Test',characterId:'test-character',coins:'5000',inventory:[{id:'item-test',itemId:'potion_red',quantity:3,slot:0}],discord:null};
await context.route('**/api/**',async route=>{
 const request=route.request(),path=new URL(request.url()).pathname;
 const json=(body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
 if(path==='/api/auth/capabilities')return json({accounts:available,discordLink:false});
 if(!available)return json({error:'accounts_unavailable'},503);
 if(path==='/api/auth/login'){signedIn=true;return json({profile});}
 if(path==='/api/auth/register')return json({state:'verification-required'},202);
 if(path==='/api/auth/password-reset')return json({state:'reset-requested'});
 if(path==='/api/auth/verify'){verificationAttempts++;return verificationAttempts===1?json({error:'accounts_unavailable'},503):json({state:'password-update',profile:null});}
 if(path.startsWith('/api/auth/logout')){signedIn=false;return json({state:'signed-out'});}
 if(path==='/api/me/wallet/entries')return signedIn?json({entries:[{reason:'Einmaliger Startbonus',amount:'5000'}]}):json({error:'sign_in_required'},401);
 if(path==='/api/me')return signedIn?json({profile,capabilities:{password:true,discordLink:false,persistentGameplay:false,discordSessions:false}}):json({error:'sign_in_required'},401);
 return json({error:'unavailable'},503);
});
async function check(name,run){try{await run();report.cases.push({name,passed:true});}catch(e){report.cases.push({name,passed:false,error:String(e)});console.error(String(e));await page.screenshot({path:resolve(out,'failure-'+report.cases.length+'.png'),fullPage:true});}console.log(name,report.cases.at(-1).passed?'PASS':'FAIL');}
const action=id=>page.locator(`button[data-action="${id}"]`).last();
const screen=id=>page.locator(`.app-concept[data-screen="${id}"]`).waitFor();
async function noOverflow(){assert.ok(await page.locator('.app-overlay').evaluate(el=>el.scrollWidth<=el.clientWidth+1));}
try{
 await check('menu, E-Mail login, reload and owned profile',async()=>{
  await page.goto(base);await action('login').first().waitFor();await action('login').click();await screen('login');
  await page.locator('input[name=email]').fill('martha@example.org');await page.locator('input[name=password]').fill('correct-password');
  await page.screenshot({path:resolve(out,'login-desktop.png'),fullPage:true});
  await page.locator('form[data-account-form=login] button[type=submit]').click();await screen('character');
  await page.getByRole('heading',{name:'Martha Test',exact:true}).waitFor();assert.ok((await page.locator('.app-coin-balance').innerText()).includes('5000'));
  await action('account-history').click();await page.locator('.app-wallet-history').waitFor();await noOverflow();
  await page.screenshot({path:resolve(out,'profile-desktop.png'),fullPage:true});
  await page.reload();await action('character').first().waitFor();await action('character').first().click();await screen('character');await page.getByRole('heading',{name:'Martha Test',exact:true}).waitFor();
 });
 await check('logout, registration confirmation, recovery and keyboard',async()=>{
  await action('account-logout').click();await screen('login');await action('register').click();await screen('register');
  const form=page.locator('form[data-account-form=register]');await form.locator('input[name=displayName]').fill('Outlaw');await form.locator('input[name=email]').fill('outlaw@example.org');await form.locator('input[name=password]').fill('correct-password');await form.locator('input[name=confirmPassword]').fill('correct-password');await form.locator('button[type=submit]').click();await page.getByRole('heading',{name:'Prüfe dein Postfach'}).waitFor();
  await action('login').click();await action('password-reset').click();await screen('password-reset');await page.locator('input[name=email]').fill('outlaw@example.org');await page.locator('form button[type=submit]').click();await page.getByRole('heading',{name:'Prüfe dein Postfach'}).waitFor();await page.keyboard.press('Escape');await screen('directory');
 });
 await check('mobile form and profile fit viewport',async()=>{
  await page.setViewportSize({width:390,height:844});await action('login').click();await screen('login');await noOverflow();await page.screenshot({path:resolve(out,'login-mobile.png'),fullPage:true});
  await page.locator('input[name=email]').fill('martha@example.org');await page.locator('input[name=password]').fill('correct-password');await page.locator('form button[type=submit]').click();await screen('character');await noOverflow();await page.screenshot({path:resolve(out,'profile-mobile.png'),fullPage:true});
 });
 await check('verification can retry after transient failure without exposing token in address',async()=>{
  await page.goto(base+'/?account=recovery&token_hash=test-recovery-token-hash&type=recovery');await screen('verify');
  assert.ok(!page.url().includes('token_hash'));
  await action('account-verify').click();await page.getByRole('alert').waitFor();
  await action('account-verify').click();await screen('password-update');assert.equal(verificationAttempts,2);
 });
 await check('unavailable service shows retry, no fake zero balance or Google',async()=>{
  available=false;await page.reload();await action('character').first().waitFor();await action('character').first().click();await screen('character');await action('account-retry').waitFor();assert.equal(await page.locator('.app-coin-balance').count(),0);assert.equal(await page.getByText('Mit Google anmelden',{exact:true}).count(),0);await noOverflow();
 });
 assert.deepEqual(report.pageErrors,[]);
}finally{await browser.close();await writeFile(resolve(out,'ui-report.json'),JSON.stringify(report,null,2));}
if(report.cases.some(c=>!c.passed)||report.pageErrors.length)process.exitCode=1;
