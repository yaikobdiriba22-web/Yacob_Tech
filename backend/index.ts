import { router, json, error, db, requireAuth, requireAdminEmailAllowlist } from '@appdeploy/sdk';

const ADMIN_EMAILS = ['yaikobdiriba22@gmail.com'];
const admin = [requireAuth(), requireAdminEmailAllowlist(ADMIN_EMAILS)];

const seedServices = [
  {number:'01',title:'Web Development',description:'Modern, responsive, high-performance websites and web platforms.'},
  {number:'02',title:'Mobile App Development',description:'Scalable Android and iOS applications designed for real users.'},
  {number:'03',title:'Custom Software',description:'Business systems and custom applications built around specific operational requirements.'},
  {number:'04',title:'UI/UX Design',description:'Simple, intuitive, accessible, and modern digital experiences.'},
  {number:'05',title:'IT & Network Solutions',description:'Network infrastructure, deployment, configuration, systems support, and technical services.'},
  {number:'06',title:'Software Maintenance',description:'Monitoring, optimization, security updates, troubleshooting, and long-term technical support.'}
];
const seedProjects = [
  {id:'albright-academy',title:'Albright Academy Platform',category:'Education',description:'A school-management concept for classes, attendance, assignments, marks, results, parents, and administration.',technologies:['React','Node.js','PostgreSQL'],status:'Concept / Demonstration Project'},
  {id:'careflow',title:'CareFlow Healthcare System',category:'Healthcare',description:'A healthcare-management concept covering clinical, pharmacy, laboratory, accounting, HR, and administrative workflows.',technologies:['React','TypeScript','PostgreSQL'],status:'Concept / Demonstration Project'},
  {id:'yacob-academy',title:'Yacob Tech Academy',category:'Education',description:'A digital learning platform concept for Computer Science, IT, ICT, and Software Engineering courses, mock exams, and practice resources.',technologies:['React','Web APIs','Database'],status:'Concept / Demonstration Project'},
  {id:'business-suite',title:'Business Operations Suite',category:'SMEs',description:'A configurable business-system concept for operational dashboards, workflows, reporting, and team productivity.',technologies:['React','Node.js','PostgreSQL'],status:'Concept / Demonstration Project'}
];
const seedBlog = [
  {title:'Building Digital Systems That Solve Real Business Problems',slug:'building-digital-systems',excerpt:'Why good software starts with operations, users, and measurable business goals.',content:'Technology should simplify work, not create another layer of complexity. At Yacob Tech, we begin by understanding the workflow, the people using it, and the outcome the organization needs.',category:'Engineering',published:true},
  {title:'What a Modern School Management System Should Include',slug:'modern-school-management-system',excerpt:'A practical look at attendance, assessment, parent access, reporting, and administration.',content:'A strong school platform connects academic and administrative workflows. The goal is one reliable source of truth for teachers, students, parents, and administrators.',category:'Education Technology',published:true},
  {title:'Designing Better Healthcare Workflows With Software',slug:'healthcare-workflows',excerpt:'How digital workflows can reduce repetitive work and improve operational visibility.',content:'Healthcare software should respect the complexity of clinical and administrative work. Good systems make the right information available at the right moment while keeping permissions clear.',category:'Health Technology',published:true}
];

async function ensureSeeds(){
  const s=await db.list('services',{limit:10}); if(!s.items.length) await db.add('services',seedServices);
  const p=await db.list('projects',{limit:10}); if(!p.items.length) await db.add('projects',seedProjects);
  const b=await db.list('blog',{limit:10}); if(!b.items.length) await db.add('blog',seedBlog);
}
async function listTable(table:string){await ensureSeeds();return db.list(table,{limit:50});}
async function sendEmail(inquiry:any){
  const key=process.env.RESEND_API_KEY;
  if(!key)return false;
  const body={from:'Yacob Tech <onboarding@resend.dev>',to:['yaikobdiriba22@gmail.com'],subject:'New Yacob Tech Project Inquiry: '+inquiry.projectType,html:'<h2>New Project Inquiry</h2><p><b>Name:</b> '+escapeHtml(inquiry.name)+'</p><p><b>Email:</b> '+escapeHtml(inquiry.email)+'</p><p><b>Phone:</b> '+escapeHtml(inquiry.phone||'')+'</p><p><b>Company:</b> '+escapeHtml(inquiry.company||'')+'</p><p><b>Project:</b> '+escapeHtml(inquiry.projectType)+'</p><p><b>Budget:</b> '+escapeHtml(inquiry.budget||'')+'</p><p><b>Message:</b><br/>'+escapeHtml(inquiry.message)+'</p>'};
  try{const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify(body)});return r.ok}catch{return false}
}
function escapeHtml(v:string){return v.replace(/[&<>'"]/g,(c)=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]||c));}

export const handler = router({
  'GET /api/_healthcheck':[async()=>json({ok:true,service:'Yacob Tech'})],
  'GET /api/services':[async()=>json({items:(await listTable('services')).items})],
  'GET /api/projects':[async()=>json({items:(await listTable('projects')).items})],
  'GET /api/blog':[async()=>json({items:(await listTable('blog')).items})],
  'GET /api/testimonials':[async()=>json({items:(await db.list('testimonials',{limit:50})).items})],
  'POST /api/inquiries':[async(ctx)=>{const x=ctx.body as Record<string,any>;if(!x.name||!x.email||!x.message)return error('Name, email and message are required',400);const id=(await db.add('inquiries',[{...x,status:'New',createdAt:new Date().toISOString()}]))[0];if(!id)return error('Could not save inquiry',500);const emailSent=await sendEmail(x);return json({ok:true,id,emailSent})}],
  'POST /api/analytics/event':[async(ctx)=>{const x=ctx.body as Record<string,any>;await db.add('analytics',[{type:x.type||'event',path:x.path||'',createdAt:new Date().toISOString()}]);return json({ok:true})}],
  'GET /api/admin/metrics':[...admin,async()=>{const [i,p,s,b,a]=await Promise.all([db.list('inquiries',{limit:1}),db.list('projects',{limit:1}),db.list('services',{limit:1}),db.list('blog',{limit:1}),db.list('analytics',{limit:1})]);const count=async(t:string)=>{const r=await db.list(t,{limit:500});return r.items.length};return json({inquiries:await count('inquiries'),projects:await count('projects'),services:await count('services'),blog:await count('blog'),views:await count('analytics')})}],
  'GET /api/admin/inquiries':[...admin,async()=>json({items:(await db.list('inquiries',{limit:100})).items})],
  'POST /api/admin/projects':[...admin,async(ctx)=>{const id=(await db.add('projects',[ctx.body as Record<string,unknown>]))[0];return json({id})}],
  'PUT /api/admin/projects/:id':[...admin,async(ctx)=>{const [old]=await db.get<Record<string,unknown>>('projects',[ctx.params.id]);if(!old)return error('Not found',404);const ok=(await db.update('projects',[{id:ctx.params.id,record:{...old,...(ctx.body as Record<string,unknown>)} }]))[0];return json({ok})}],
  'DELETE /api/admin/projects/:id':[...admin,async(ctx)=>json({ok:(await db.delete('projects',[ctx.params.id]))[0]})],
  'POST /api/admin/services':[...admin,async(ctx)=>json({id:(await db.add('services',[ctx.body as Record<string,unknown>]))[0]})],
  'PUT /api/admin/services/:id':[...admin,async(ctx)=>{const [old]=await db.get<Record<string,unknown>>('services',[ctx.params.id]);if(!old)return error('Not found',404);return json({ok:(await db.update('services',[{id:ctx.params.id,record:{...old,...(ctx.body as Record<string,unknown>)} }]))[0]})}],
  'DELETE /api/admin/services/:id':[...admin,async(ctx)=>json({ok:(await db.delete('services',[ctx.params.id]))[0]})],
  'POST /api/admin/blog':[...admin,async(ctx)=>json({id:(await db.add('blog',[{...(ctx.body as Record<string,unknown>),published:true}]))[0]})],
  'PUT /api/admin/blog/:id':[...admin,async(ctx)=>{const [old]=await db.get<Record<string,unknown>>('blog',[ctx.params.id]);if(!old)return error('Not found',404);return json({ok:(await db.update('blog',[{id:ctx.params.id,record:{...old,...(ctx.body as Record<string,unknown>)} }]))[0]})}],
  'DELETE /api/admin/blog/:id':[...admin,async(ctx)=>json({ok:(await db.delete('blog',[ctx.params.id]))[0]})],
  'POST /api/admin/testimonials':[...admin,async(ctx)=>json({id:(await db.add('testimonials',[ctx.body as Record<string,unknown>]))[0]})],
  'PUT /api/admin/testimonials/:id':[...admin,async(ctx)=>{const [old]=await db.get<Record<string,unknown>>('testimonials',[ctx.params.id]);if(!old)return error('Not found',404);return json({ok:(await db.update('testimonials',[{id:ctx.params.id,record:{...old,...(ctx.body as Record<string,unknown>)} }]))[0]})}],
  'DELETE /api/admin/testimonials/:id':[...admin,async(ctx)=>json({ok:(await db.delete('testimonials',[ctx.params.id]))[0]})]
});