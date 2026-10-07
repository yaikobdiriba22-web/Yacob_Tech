import { createClient } from '@supabase/supabase-js';

const URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://agqozrfhwbjnvoaoqvfl.supabase.co';
const PUBLIC_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'yaikobdiriba22@gmail.com';

const publicClient = createClient(URL,PUBLIC_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const adminClient = SERVICE_KEY ? createClient(URL,SERVICE_KEY,{auth:{persistSession:false,autoRefreshToken:false}}) : publicClient;

function json(res:any,status:number,data:any){res.status(status).setHeader('Content-Type','application/json').send(JSON.stringify(data));}
function mapService(x:any){return {...x, number:x.number||String(x.sort_order||0).padStart(2,'0')};}
function mapProject(x:any){return {...x,id:x.id,technologies:x.tech_stack||[],status:x.status||'Concept / Demonstration Project'};}
function mapBlog(x:any){return {...x,published:!!x.published};}
function mapInquiry(x:any){return {...x,projectType:x.project_type,budget:x.budget_range,createdAt:x.created_at};}
function cleanProject(x:any){return {slug:x.slug||String(x.title||'').toLowerCase().replace(/[^a-z0-9]+/g,'-'),title:x.title||'',category:x.category||'',description:x.description||'',tech_stack:x.technologies||x.tech_stack||[],status:x.status||'Concept / Demonstration Project',sort_order:x.sort_order||0,featured:!!x.featured,active:x.active!==false};}
function cleanService(x:any){return {number:x.number||'',title:x.title||'',description:x.description||'',sort_order:x.sort_order||0,active:x.active!==false};}
function cleanBlog(x:any){return {slug:x.slug||String(x.title||'').toLowerCase().replace(/[^a-z0-9]+/g,'-'),title:x.title||'',category:x.category||'',excerpt:x.excerpt||'',content:x.content||'',reading_time:x.reading_time||'5 min',published:x.published!==false,published_at:x.published_at||new Date().toISOString(),active:true,sort_order:x.sort_order||0};}
function cleanTestimonial(x:any){return {name:x.name||'',role:x.role||'',company:x.company||'',quote:x.quote||'',avatar_url:x.avatar_url||null,sort_order:x.sort_order||0,active:x.active!==false};}

function requestClient(req:any){
  const token=(req.headers.authorization||'').startsWith('Bearer ')?req.headers.authorization.slice(7):'';
  return createClient(URL,PUBLIC_KEY,{auth:{persistSession:false,autoRefreshToken:false},global: token ? {headers:{Authorization:`Bearer ${token}`}} : undefined});
}

async function requireAdmin(req:any){
  const header=req.headers.authorization||'';
  if(!header.startsWith('Bearer ')) return null;
  const token=header.slice(7);
  const client=createClient(URL,PUBLIC_KEY,{auth:{persistSession:false,autoRefreshToken:false},global:{headers:{Authorization:`Bearer ${token}`}}});
  const {data,error}=await client.auth.getUser(token);
  if(error||!data.user||data.user.email?.toLowerCase()!==ADMIN_EMAIL.toLowerCase()) return null;
  return data.user;
}

async function tableList(table:string, order='sort_order.asc'){
  const {data,error}=await adminClient.from(table).select('*').order(order.split('.')[0],{ascending:order.endsWith('.asc')});
  if(error) throw error;
  return data||[];
}

async function handler(req:any,res:any){
  const raw=req.url||'';
  const pathname=new URL(raw,'http://localhost').pathname;
  const parts=pathname.split('/').filter(Boolean);
  const key=parts.join('/');
  try{
    if(req.method==='GET'&&key==='api/_healthcheck') return json(res,200,{ok:true,service:'Yacob Tech',database:'Supabase'});
    if(req.method==='GET'&&key==='api/services') return json(res,200,{items:(await tableList('services')).map(mapService)});
    if(req.method==='GET'&&key==='api/projects') return json(res,200,{items:(await tableList('projects')).map(mapProject)});
    if(req.method==='GET'&&key==='api/blog') return json(res,200,{items:(await tableList('blog','published_at.desc')).filter((x:any)=>x.active&&x.published).map(mapBlog)});
    if(req.method==='GET'&&key==='api/testimonials') return json(res,200,{items:(await tableList('testimonials')).filter((x:any)=>x.active)});

    if(req.method==='POST'&&key==='api/inquiries'){
      const x=req.body||{};
      if(!x.name||!x.email||!x.message) return json(res,400,{error:'Name, email and message are required'});
      const {data,error}=await adminClient.from('inquiries').insert({name:String(x.name).trim(),email:String(x.email).trim(),phone:x.phone||null,company:x.company||null,project_type:x.projectType||null,budget_range:x.budget||null,timeline:x.timeline||null,message:String(x.message).trim(),status:'new'}).select('id').single();
      if(error) throw error;
      let emailSent=false;
      if(process.env.RESEND_API_KEY){
        const safe=(v:any)=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]||c));
        const payload={from:'Yacob Tech <onboarding@resend.dev>',to:[ADMIN_EMAIL],subject:`New Yacob Tech Project Inquiry: ${x.projectType||'Project'}`,html:`<h2>New Project Inquiry</h2><p><b>Name:</b> ${safe(x.name)}</p><p><b>Email:</b> ${safe(x.email)}</p><p><b>Phone:</b> ${safe(x.phone)}</p><p><b>Company:</b> ${safe(x.company)}</p><p><b>Project:</b> ${safe(x.projectType)}</p><p><b>Budget:</b> ${safe(x.budget)}</p><p><b>Message:</b><br/>${safe(x.message)}</p>`};
        try{const rr=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+process.env.RESEND_API_KEY,'Content-Type':'application/json'},body:JSON.stringify(payload)});emailSent=rr.ok;}catch{}
      }
      return json(res,200,{ok:true,id:data.id,emailSent});
    }
    if(req.method==='POST'&&key==='api/analytics/event'){
      const x=req.body||{};
      await adminClient.from('analytics').insert({event_type:String(x.type||'event').slice(0,100),path:String(x.path||'').slice(0,500),metadata:x.metadata||{}});
      return json(res,200,{ok:true});
    }

    if(parts[1]==='admin'){
      const user=await requireAdmin(req);
      if(!user) return json(res,401,{error:'Administrator authentication required'});
      const adminDb=requestClient(req);
      if(req.method==='GET'&&key==='api/admin/metrics'){
        const counts:any={};
        for(const table of ['inquiries','projects','services','blog','analytics']){const {count,error}=await adminDb.from(table).select('*',{count:'exact',head:true});if(error)throw error;counts[table==='analytics'?'views':table]=count||0;}
        return json(res,200,counts);
      }
      if(req.method==='GET'&&key==='api/admin/inquiries'){const {data,error}=await adminDb.from('inquiries').select('*').order('created_at',{ascending:false}).limit(100);if(error)throw error;return json(res,200,{items:(data||[]).map(mapInquiry)});}
      const resource=parts[2]; const id=parts[3];
      if(['projects','services','blog','testimonials'].includes(resource)){
        const table=resource;
        if(req.method==='POST'){
          const body=resource==='projects'?cleanProject(req.body):resource==='services'?cleanService(req.body):resource==='blog'?cleanBlog(req.body):cleanTestimonial(req.body);
          const {data,error}=await adminDb.from(table).insert(body).select('id').single();if(error)throw error;return json(res,200,{id:data.id});
        }
        if(req.method==='PUT'&&id){
          const body=resource==='projects'?cleanProject(req.body):resource==='services'?cleanService(req.body):resource==='blog'?cleanBlog(req.body):cleanTestimonial(req.body);
          const {data,error}=await adminDb.from(table).update(body).eq('id',id).select('id').single();if(error)throw error;return json(res,200,{ok:!!data});
        }
        if(req.method==='DELETE'&&id){const {error}=await adminDb.from(table).delete().eq('id',id);if(error)throw error;return json(res,200,{ok:true});}
      }
    }
    return json(res,404,{error:'Not found'});
  }catch(error:any){
    console.error(error);
    return json(res,500,{error:error?.message||'Internal server error'});
  }
}

export default handler;
