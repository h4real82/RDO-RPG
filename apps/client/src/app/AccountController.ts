import type { PlayerAccount, AccountCapabilities, AccountState } from '@rdo-rpg/shared';
export class AccountController {
 state:AccountState='checking';profile:PlayerAccount|null=null;capabilities:AccountCapabilities={};busy=false;error='';message='';
 private generation=0;private disposed=false;private abort?:AbortController;
 constructor(private changed:()=>void,private request:typeof fetch=(input,init)=>fetch(input,init)){}
 private async call(path:string,body?:unknown,method=body===undefined?'GET':'POST'){
  const res=await this.request('/api'+path,{method,credentials:'same-origin',cache:'no-store',signal:this.abort?.signal,
   headers:body===undefined?{}:{'Content-Type':'application/json','X-RDO-Request':'1'},...(body===undefined?{}:{body:JSON.stringify(body)})});
  const data=await res.json().catch(()=>({}));if(!res.ok)throw Object.assign(new Error(data.error??'accounts_unavailable'),{status:res.status});return data;
 }
 private begin(){this.abort?.abort();this.abort=new AbortController();this.busy=true;this.error='';this.message='';return ++this.generation;}
 async load(){
  const generation=this.begin();if(!this.profile)this.state='checking';this.changed();
  try{
   const caps=await this.call('/auth/capabilities');if(this.disposed||generation!==this.generation)return;this.capabilities=caps;
   if(!caps.accounts)throw new Error('accounts_unavailable');
   const data=await this.call('/me');if(this.disposed||generation!==this.generation)return;
   this.profile=data.profile;this.capabilities={...caps,...data.capabilities};this.state='authenticated';
  }catch(e){if(this.disposed||generation!==this.generation)return;const err=e as Error&{status?:number};
   if(err.status===401){this.profile=null;this.state='signed-out';}
   else if(err.message==='password_update_required')this.state='password-update';
   else {this.state='unavailable';this.error=err.message;}
  }finally{if(!this.disposed&&generation===this.generation){this.busy=false;this.changed();}}
 }
 async action(path:string,body:unknown,method='POST'):Promise<any>{
  const generation=this.begin();this.changed();
  try{
   const data=await this.call(path,body,method);if(this.disposed||generation!==this.generation)return null;
   if(data.profile){this.profile=data.profile;this.state='authenticated';}
   if(data.state==='verification-required'||data.state==='reset-requested'||data.state==='password-update')this.state=data.state;
   if(data.state==='signed-out'){this.profile=null;this.state='signed-out';}
   return data;
  }catch(e){if(!this.disposed&&generation===this.generation){const err=e as Error;this.error=err.message;if((e as any).status===401&&path!=='/auth/login'){this.profile=null;this.state='signed-out';}}return null;
  }finally{if(!this.disposed&&generation===this.generation){this.busy=false;this.changed();}}
 }
 feedback(message:string){this.error=message;this.changed();}
 dispose(){this.disposed=true;this.generation++;this.abort?.abort();}
}
