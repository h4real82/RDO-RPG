import { describe,it,expect } from 'vitest';
import { accountView } from './AccountViews';
import { AccountController } from './AccountController';
describe('account views',()=>{
 it('shows no fake balances while checking or signed out',()=>{const c=new AccountController(()=>{});const html=accountView('character',c);expect(html).toContain('Profil wird geladen');expect(html).not.toContain('0 Coins');});
 it('escapes profile names and renders only owned inventory',()=>{const c=new AccountController(()=>{});c.state='authenticated';c.profile={id:'1',displayName:'<img src=x onerror=alert(1)>',characterId:'2',coins:'5000',inventory:[{id:'i',itemId:'potion_red',quantity:2,slot:0}],discord:null};const html=accountView('character',c);expect(html).not.toContain('<img src=x');expect(html).toContain('&lt;img');expect(html).toContain('5000');expect(html).toContain('potion_red');});
 it('supports real registration fields without external login buttons',()=>{const c=new AccountController(()=>{});c.state='signed-out';c.capabilities={accounts:true};const html=accountView('register',c);expect(html).not.toContain('Mit Google anmelden');expect(html).toContain('name="confirmPassword"');expect(html).toContain('name="displayName"');expect(html).not.toContain('Discord Schnell-Login');});
});
