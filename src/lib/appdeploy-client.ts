import { supabase } from './supabase';

type ApiResponse<T=any> = { data: T };

async function request(path:string, options:RequestInit = {}):Promise<ApiResponse> {
  const { data:{session} } = await supabase.auth.getSession();
  const headers = new Headers(options.headers);
  headers.set('Content-Type','application/json');
  if (session?.access_token) headers.set('Authorization', `Bearer ${session.access_token}`);
  const response = await fetch(path,{...options,headers});
  const text = await response.text();
  let data:any = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = { error: text }; }
  if (!response.ok) throw new Error(data?.error || 'Request failed');
  return {data};
}

export const api = {
  get:(path:string)=>request(path),
  post:(path:string,body:any)=>request(path,{method:'POST',body:JSON.stringify(body)}),
  put:(path:string,body:any)=>request(path,{method:'PUT',body:JSON.stringify(body)}),
  delete:(path:string)=>request(path,{method:'DELETE'})
};

export const auth = {
  isSignedIn:()=>!!supabase.auth.getSession(),
  getUser:async()=>{const {data}=await supabase.auth.getUser();return data.user;},
  signIn:async({scope}:{scope?:string}={})=>{
    const email='yaikobdiriba22@gmail.com';
    const {error}=await supabase.auth.signInWithOtp({email,options:{emailRedirectTo:window.location.origin+'/#admin'}});
    if(error) throw error;
    return {user:null};
  },
  signOut:async()=>{await supabase.auth.signOut();}
};
