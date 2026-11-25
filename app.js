(function(){
"use strict";
/* ---------- dates ---------- */
const DAY=864e5;
const sod=d=>{const x=new Date(d);x.setHours(0,0,0,0);return x;};
const TODAY=sod(new Date());
const add=(d,n)=>new Date(d.getTime()+n*DAY);
const dd=(a,b)=>Math.round((sod(a)-sod(b))/DAY);
const iso=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
const parse=s=>{const [y,m,x]=s.split("-").map(Number);return new Date(y,m-1,x);};
const fmt=d=>d.toLocaleDateString("en-IN",{day:"numeric",month:"short"});
const esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

function periodsFrom(lastAgo,lengths){let d=add(TODAY,-lastAgo);const a=[iso(d)];for(let i=lengths.length-1;i>=0;i--){d=add(d,-lengths[i]);a.unshift(iso(d));}return a;}

/* ---------- vocab ---------- */
const CONDITIONS=["PCOS","Anaemia","Endometriosis","Perimenopause","Menopause","Not sure yet"];
const SYMPTOMS=[
 ["fatigue","Tiredness"],["cramps","Painful periods"],["pelvic","Pelvic pain between periods"],["acne","Acne"],
 ["hair_extra","Extra facial or body hair"],["hair_loss","Hair thinning"],["bloating","Bloating"],["mood","Mood swings"],
 ["hot_flush","Hot flushes"],["night_sweat","Night sweats"],["sleep","Trouble sleeping"],["headache","Headaches"]];
const SYMNAME=Object.fromEntries(SYMPTOMS);
const FREQ=[["none","Not at all"],["some","Some days"],["often","Most days"]];
const TIER={now:"Act today",weeks:"Within a few weeks",check:"Keep an eye on it"};
const TIERORDER={now:0,weeks:1,check:2};
const DOCTOR="Dr. R. Kapoor";
const ACTIONS=[["reviewed","Reviewed"],["tests","Advised tests"],["consult","Booked consult"],["not_relevant","Not relevant"]];
const ACTMSG={
 reviewed:`${DOCTOR} has reviewed this.`,
 tests:`${DOCTOR} has advised blood tests for this. Please get them done this week.`,
 consult:`${DOCTOR} has booked a consultation with you to talk about this.`,
 not_relevant:`${DOCTOR} reviewed this and says no action is needed right now.`};
const GOALS=[["balanced","Balanced lifestyle"],["cycle","Cycle regularity"],["energy","Energy and iron"],["pain","Pain relief"],["sleep","Sleep and stress"]];
const MEDS=[["none","None"],["iron","Iron supplement"],["combined_ocp","Combined oral contraceptive pill"]];
const PCOS=[["not_assessed","Not assessed"],["suspected","Suspected"],["confirmed","Confirmed"],["ruled_out","Ruled out"]];

/* ---------- sample patients (fictional) ---------- */
function mk(o){return Object.assign({heavyToday:false,hb:null,sample:true,shared:true,actions:{},doctor:{pcos:"not_assessed",med:"none",goal:"balanced",ayurveda:false}},o);}
let patients=[
 mk({id:"ananya",name:"Ananya",age:24,conditions:["PCOS"],pill:false,blurb:"Long, irregular cycles with acne",
   periods:periodsFrom(18,[38,31,42,36,33,45]),symptoms:{acne:"often",hair_extra:"often",fatigue:"some",mood:"some"}}),
 mk({id:"meera",name:"Meera",age:31,conditions:["Anaemia"],pill:false,blurb:"Low haemoglobin and tired most days",hb:10.4,
   periods:periodsFrom(9,[28,27,29,28,30,28]),symptoms:{fatigue:"often",hair_loss:"some",headache:"some"}}),
 mk({id:"riya",name:"Riya",age:27,conditions:["Endometriosis"],pill:false,blurb:"Regular cycles but a lot of pain",
   periods:periodsFrom(4,[29,28,30,28,29,27]),symptoms:{cramps:"often",pelvic:"some",bloating:"often",fatigue:"some"}}),
 mk({id:"kavya",name:"Kavya",age:22,conditions:["Not sure yet"],pill:true,blurb:"On the combined pill",
   periods:periodsFrom(12,[28,28,28,28,28]),symptoms:{headache:"some"},doctor:{pcos:"not_assessed",med:"combined_ocp",goal:"balanced",ayurveda:false}}),
 mk({id:"sunita",name:"Sunita",age:46,conditions:["Perimenopause"],pill:false,blurb:"Hot flushes and changing cycles",
   periods:periodsFrom(15,[26,34,22,29,31,27]),symptoms:{hot_flush:"often",night_sweat:"some",sleep:"often",mood:"some"}})
];
const byId=id=>patients.find(p=>p.id===id);

/* ---------- CDSS: build the patient's picture ---------- */
const median=a=>{if(!a.length)return 0;const s=[...a].sort((x,y)=>x-y),m=Math.floor(s.length/2);return s.length%2?s[m]:(s[m-1]+s[m])/2;};
const pct=(a,q)=>{const s=[...a].sort((x,y)=>x-y);const i=(s.length-1)*q,lo=Math.floor(i),hi=Math.ceil(i);return s[lo]+(s[hi]-s[lo])*(i-lo);};
const sdev=a=>{if(a.length<2)return 0;const m=a.reduce((x,y)=>x+y,0)/a.length;return Math.sqrt(a.reduce((x,y)=>x+(y-m)**2,0)/(a.length-1));};

function buildState(p){
  const starts=p.periods.filter(Boolean).map(parse).filter(d=>d<=TODAY).sort((a,b)=>a-b);
  const all=[];for(let i=1;i<starts.length;i++)all.push(dd(starts[i],starts[i-1]));
  const med0=median(all);
  const cycles=all.map(l=>({len:l,missed:all.length>=3&&l>=1.8*med0&&l>50}));
  const lens=cycles.filter(c=>!c.missed).map(c=>c.len);
  const n=lens.length, mean=n?lens.reduce((a,b)=>a+b,0)/n:0;
  const pill=p.pill||p.doctor.med==="combined_ocp";
  const last=starts.length?starts[starts.length-1]:null;
  const recent6=lens.slice(-6);
  const s={starts,cycles,lens,n,mean,median:median(lens),sd:sdev(lens),recent6,longLast6:recent6.filter(l=>l>35).length,
    mode:pill?"pill":"natural",last,hb:p.hb,sym:p.symptoms||{},age:Number(p.age)||0,shrunk:n<3};
  if(last){
    const est=n>=3?s.median:Math.round((3*28+n*mean)/(3+n||1));
    s.estimate=est;
    let lo,hi;
    if(n>=3){lo=Math.round(pct(lens,.25));hi=Math.round(pct(lens,.75));if(lo===hi){lo--;hi++;}}
    else{lo=est-3;hi=est+3;}
    s.winStart=add(last,lo);s.winEnd=add(last,hi);
    s.ovulation=add(last,Math.round(est)-14);
    s.cycleDay=dd(TODAY,last)+1;
    if(s.cycleDay<=5)s.phase="Period";
    else if(TODAY>s.winEnd)s.phase="Period is later than expected";
    else if(Math.abs(dd(TODAY,s.ovulation))<=2)s.phase="Ovulation window";
    else if(TODAY<s.ovulation)s.phase="Follicular phase";
    else s.phase="Luteal phase";
    s.confidence=(n>=6&&s.sd<=3)?"High":(n>=3&&s.sd<=7)?"Medium":"Uncertain";
  }
  return s;
}

/* ---------- CDSS: doctor approved rules (samples for the demo) ---------- */
const RULES=[
 {id:"heavy_bleeding",name:"Very heavy bleeding today",v:1,tier:"now",
  when:(s,p)=>p.heavyToday,
  ev:()=>"Reported today: soaking a pad or tampon every hour, or feeling faint.",
  why:()=>"You said you are soaking through a pad or tampon every hour, or feeling faint.",
  pt:"This needs medical care today. Please contact your doctor now, or go to the nearest emergency department if you feel faint or very unwell.",
  dr:"Reports bleeding that soaks a pad hourly, or faintness, today. Urgent review."},
 {id:"very_low_hb",name:"Very low haemoglobin",v:1,tier:"now",
  when:s=>s.hb!=null&&s.hb<8,
  ev:s=>`Latest Hb ${s.hb} g/dL.`,
  why:s=>`Your haemoglobin was ${s.hb} g/dL. Below 8 is very low.`,
  pt:"Your haemoglobin is very low. Please speak to a doctor today.",
  dr:"Hb below 8 g/dL. Urgent review for severe anaemia."},
 {id:"long_cycles",name:"Long cycles",v:1,tier:"weeks",
  when:(s,p)=>s.mode==="natural"&&s.n>=3&&s.longLast6>=2&&!["confirmed","ruled_out"].includes(p.doctor.pcos),
  ev:s=>`${s.longLast6} of last ${s.recent6.length} cycles over 35 days. Lengths: ${s.recent6.join(", ")} days. Median ${s.median} days.`,
  why:s=>`${s.longLast6} of your last ${s.recent6.length} cycles were longer than 35 days (${s.recent6.join(", ")} days).`,
  pt:"Several of your recent cycles were longer than 35 days. Long cycles have many possible causes, and a gynaecologist can help find out why. We suggest booking a visit in the next few weeks.",
  dr:"2 or more of the last 6 cycles over 35 days. Consider evaluation for ovulatory dysfunction, including PCOS, as per guideline."},
 {id:"low_hb_fatigue",name:"Low haemoglobin with tiredness",v:1,tier:"weeks",
  when:(s,p)=>s.hb!=null&&s.hb>=8&&s.hb<12&&s.sym.fatigue==="often"&&p.doctor.med!=="iron",
  ev:s=>`Hb ${s.hb} g/dL. Fatigue on most of the last 30 days.`,
  why:s=>`Your haemoglobin was ${s.hb} g/dL (the usual lower limit for women is 12), and you felt tired on most days this month.`,
  pt:"Your haemoglobin is below the usual range and you have been tired most days. A doctor can check your iron levels and suggest the right treatment.",
  dr:"Hb below 12 g/dL with fatigue on most of the last 30 days. Consider CBC and ferritin."},
 {id:"low_hb",name:"Haemoglobin below range",v:1,tier:"check",
  when:(s,p)=>s.hb!=null&&s.hb>=8&&s.hb<12&&s.sym.fatigue!=="often"&&p.doctor.med!=="iron",
  ev:s=>`Hb ${s.hb} g/dL. Fatigue ${s.sym.fatigue==="some"?"on some days":"not reported"}.`,
  why:s=>`Your haemoglobin was ${s.hb} g/dL. The usual lower limit for women is 12.`,
  pt:"Your haemoglobin is a little below the usual range. Mention it at your next doctor visit, and add iron rich foods to your meals.",
  dr:"Hb mildly below 12 g/dL without marked fatigue. Review at next visit."},
 {id:"iron_followup",name:"Iron follow up",v:1,tier:"check",
  when:(s,p)=>p.doctor.med==="iron",
  ev:s=>`Iron started by doctor.${s.hb!=null?` Last Hb ${s.hb} g/dL.`:""}`,
  why:s=>`Your doctor started an iron supplement${s.hb!=null?`. Your last haemoglobin was ${s.hb} g/dL`:""}.`,
  pt:"Keep taking iron as your doctor advised. Valkryia will remind you to recheck your haemoglobin in about 8 weeks.",
  dr:"On iron. Recheck Hb in 8 weeks."},
 {id:"pain_pattern",name:"Pain pattern",v:1,tier:"weeks",
  when:s=>s.sym.cramps==="often"&&(s.sym.pelvic==="some"||s.sym.pelvic==="often"),
  ev:s=>`Painful periods most days of period. Pelvic pain between periods on ${s.sym.pelvic==="often"?"most":"some"} days.`,
  why:s=>`You had painful periods on most days of your period, and pelvic pain on ${s.sym.pelvic==="often"?"most":"some"} other days.`,
  pt:"Period pain that affects your day, along with pelvic pain at other times, is worth discussing with a gynaecologist. Keep logging your pain so your doctor can see the pattern.",
  dr:"Frequent dysmenorrhoea with non cyclical pelvic pain. Consider evaluation for endometriosis."},
 {id:"midlife_change",name:"Possible perimenopause symptoms",v:1,tier:"check",
  when:s=>s.age>=40&&(s.sym.hot_flush==="often"||s.sym.night_sweat==="often"),
  ev:s=>`Age ${s.age}. Hot flushes ${s.sym.hot_flush==="often"?"most days":s.sym.hot_flush==="some"?"some days":"none"}, night sweats ${s.sym.night_sweat==="often"?"most days":s.sym.night_sweat==="some"?"some days":"none"}.`,
  why:s=>`You are ${s.age} and had hot flushes or night sweats on most days this month.`,
  pt:"Hot flushes and night sweats are common around perimenopause. A doctor can talk you through what is happening and the options that help.",
  dr:"Age 40 or over with frequent vasomotor symptoms. Consider a perimenopause discussion."},
 {id:"pcos_followup",name:"PCOS care",v:1,tier:"check",
  when:(s,p)=>p.doctor.pcos==="confirmed",
  ev:()=>"PCOS status set to confirmed by doctor.",
  why:()=>"Your doctor has confirmed PCOS in your record.",
  pt:"Your plan now includes PCOS focused care. Keep logging your periods so your doctor can see how your cycles respond.",
  dr:"PCOS confirmed. Monitoring cycle length and symptoms."}
];

function evaluate(p){
  const s=buildState(p);
  const flags=RULES.filter(r=>r.when(s,p)).map(r=>({rule:r,tier:r.tier,why:r.why(s,p),ev:r.ev(s,p),status:p.actions[r.id]||null}))
    .sort((a,b)=>TIERORDER[a.tier]-TIERORDER[b.tier]);
  return {s,flags,plan:buildPlan(p,s,flags)};
}
const openFlags=f=>f.filter(x=>x.status!=="not_relevant");
const topTier=f=>{const o=openFlags(f);return o.length?o[0].tier:"ok";};

/* ---------- lifestyle plan ---------- */
const HABITS=["Step outside for ten minutes of morning sunlight.","Write down one thing that went well today.","Call a friend you have not spoken to this week.","Put your phone away thirty minutes before bed.","Take five slow breaths before each meal.","Stretch for five minutes when you wake up.","Drink a glass of water as soon as you wake up."];
function buildPlan(p,s,flags){
  const ids=flags.map(f=>f.rule.id), g=p.doctor.goal, items=[];
  if(s.hb!=null&&s.hb<12||g==="energy")items.push(["Food","Add one iron rich food to two meals today, such as spinach, rajma, chana or jaggery. Have it with lemon or amla, as vitamin C helps your body absorb iron."]);
  else if(g==="cycle"||p.doctor.pcos!=="not_assessed"&&p.doctor.pcos!=="ruled_out"||ids.includes("long_cycles"))items.push(["Food","Build a balanced plate: half vegetables, a quarter protein like dal, paneer or eggs, and a quarter whole grains like millets or brown rice."]);
  else if(ids.includes("midlife_change"))items.push(["Food","Add a calcium rich food today, such as curd, ragi or sesame seeds."]);
  else items.push(["Food","Eat a balanced plate and keep water with you through the day."]);
  if(g==="pain"||ids.includes("pain_pattern"))items.push(["Movement","Fifteen minutes of gentle stretching or yoga. A warm compress on your lower belly can ease cramps."]);
  else if(g==="cycle"||ids.includes("long_cycles")||p.doctor.pcos==="confirmed")items.push(["Movement","A thirty minute brisk walk. Regular movement helps keep cycles and blood sugar steady."]);
  else if(g==="sleep"||ids.includes("midlife_change"))items.push(["Movement","An easy evening walk, then a wind down routine with lights low an hour before bed."]);
  else items.push(["Movement","A twenty minute walk at a pace where you can still talk."]);
  const dayN=Math.floor(TODAY.getTime()/DAY);
  items.push(["Happy habit",HABITS[dayN%HABITS.length]]);
  if(p.doctor.ayurveda)items.push(["Wellness only","A cup of warm jeera or ginger water after meals may help with bloating. This is a wellness tip, not a treatment."]);
  return items;
}

/* ---------- cycle chart ---------- */
function chart(s){
  const cyc=s.cycles.slice(-8);
  if(!cyc.length)return `<p class="muted">Add at least two period dates to see your cycle chart.</p>`;
  const W=560,H=210,L=36,R=12,T=14,B=30,max=Math.max(50,...cyc.map(c=>c.len))+5;
  const y=v=>T+(H-T-B)*(1-v/max), bw=(W-L-R)/cyc.length;
  let g="";
  [0,20,40,max>=60?60:null,max>=80?80:null].filter(v=>v!=null&&v<=max).forEach(v=>{g+=`<line x1="${L}" x2="${W-R}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)" stroke-width="1"/><text x="${L-6}" y="${y(v)+4}" text-anchor="end" font-size="11" fill="var(--muted)">${v}</text>`;});
  g+=`<rect x="${L}" y="${y(35)}" width="${W-L-R}" height="${y(21)-y(35)}" fill="var(--teal-soft)" opacity=".8"/><text x="${W-R-4}" y="${y(35)+13}" text-anchor="end" font-size="11" fill="var(--teal)">usual range 21 to 35 days</text>`;
  cyc.forEach((c,i)=>{const x=L+i*bw+bw*.2,w=bw*.6,col=c.missed?"var(--line)":c.len>35?"var(--amber)":"var(--rose)";
    g+=`<rect x="${x}" y="${y(c.len)}" width="${w}" height="${y(0)-y(c.len)}" rx="4" fill="${col}"/><text x="${x+w/2}" y="${y(c.len)-5}" text-anchor="middle" font-size="11" fill="var(--fg)">${c.len}${c.missed?"?":""}</text><text x="${x+w/2}" y="${H-10}" text-anchor="middle" font-size="10" fill="var(--muted)">C${s.cycles.length-cyc.length+i+1}</text>`;});
  if(s.n>=1)g+=`<line x1="${L}" x2="${W-R}" y1="${y(s.median)}" y2="${y(s.median)}" stroke="var(--fg)" stroke-dasharray="4 4" stroke-width="1"/>`;
  const note=cyc.some(c=>c.missed)?`<p class="muted" style="font-size:.85rem">A cycle marked ? is about twice your usual length, so a period may not have been logged. Valkryia leaves it out of your averages.</p>`:"";
  return `<div class="chartbox"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Cycle lengths in days">${g}</svg></div><p class="muted" style="font-size:.85rem">Each bar is one cycle in days. Amber bars are longer than 35 days. The dashed line is your usual length.</p>${note}`;
}

/* ---------- app state ---------- */
const st={step:0,draft:null,view:null,err:"",sel:"ananya",changes:null};
const newDraft=()=>({name:"",age:"",conditions:[],pill:false,periods:[""],symptoms:{},heavyToday:false,hb:""});

/* ---------- views ---------- */
function home(){
  return `<section class="hero">
    <span class="mono muted">Seva First Innovation Challenge · Working demo</span>
    <h1>Let Saga take you across your <em>health journey</em></h1>
    <p class="lead">Valkryia helps women with PCOS, anaemia, endometriosis, perimenopause and menopause. At its centre is a clinical decision support system: it reads what a woman logs and what her doctor adds, checks it against rules written and approved by doctors, and shows both of them the same clear picture. Try it from either side.</p>
    <div class="doors">
      <button class="door" data-go="patient" type="button"><span class="mono muted">For women</span><span class="who">Join as a patient</span><span class="muted">Log your periods, symptoms and a report. See what Valkryia notices and what to do next.</span><span class="go">Start as a patient →</span></button>
      <button class="door doc" data-go="doctor" type="button"><span class="mono muted">For gynaecologists</span><span class="who">Join as a doctor</span><span class="muted">See your patients sorted by urgency, the evidence behind each alert, and how your input changes her app.</span><span class="go">Open the doctor view →</span></button>
    </div>
  </section>
  <section class="stack" style="margin-top:28px">
    <h2>One system, two sides</h2>
    <div class="flow">
      <div class="node"><span class="mono" style="color:var(--rose)">She shares</span><ul><li>Period dates</li><li>Symptoms and how often</li><li>Reports like haemoglobin</li></ul></div>
      <div class="arrow" aria-hidden="true">→</div>
      <div class="node core"><span class="mono" style="color:var(--teal)">Valkryia checks</span><b style="font-family:var(--f-display);font-size:1.15rem">Rules approved by doctors</b><span class="muted" style="font-size:.93rem">Same inputs, same answer, every time. It never guesses a diagnosis.</span></div>
      <div class="arrow" aria-hidden="true">→</div>
      <div class="node"><span class="mono" style="color:var(--rose)">Both sides see it</span><ul><li>She gets plain words and next steps</li><li>Her doctor gets the evidence and urgency</li><li>The doctor's input updates her app</li></ul></div>
    </div>
  </section>`;
}

function patientView(){
  if(st.view)return results(byId(st.view));
  const d=st.draft||(st.draft=newDraft());
  const bar=`<div class="steps" aria-hidden="true">${[1,2,3,4].map(i=>`<span class="${i<=st.step?"on":""}"></span>`).join("")}</div>`;
  const nav=(back,next,label)=>`<p class="err" role="alert">${esc(st.err)}</p><div class="row" style="justify-content:space-between">${back?`<button class="btn btn-ghost" data-act="back" type="button">Back</button>`:"<span></span>"}<button class="btn btn-rose" data-act="${next}" type="button">${label}</button></div>`;
  if(st.step===0)return `<div class="narrow stack" style="padding-top:12px">
    <span class="mono muted">Patient side</span><h1 style="font-size:clamp(1.8rem,4.5vw,2.6rem)">Let's build your health picture</h1>
    <p class="muted">Answer four short screens, about two minutes. Use made up details, this is a demo.</p>
    <div><button class="btn btn-rose" data-act="start" type="button">Start with my own answers</button></div>
    <div class="stack" style="margin-top:12px"><h3>Or open a sample patient's app</h3>
    <div class="samples">${patients.filter(p=>p.sample).map(p=>`<button class="sample" data-open="${p.id}" type="button"><b>${esc(p.name)}, ${p.age}</b><span class="muted" style="font-size:.9rem">${esc(p.blurb)}</span></button>`).join("")}</div></div></div>`;
  if(st.step===1)return `<div class="narrow card stack">${bar}<span class="mono muted">Step 1 of 4</span><h2>About you</h2>
    <div><label class="lbl" for="f-name">First name</label><input class="inp" id="f-name" data-f="name" value="${esc(d.name)}" placeholder="Any made up name" autocomplete="off"></div>
    <div><label class="lbl" for="f-age">Age</label><input class="inp" id="f-age" data-f="age" type="number" min="18" max="70" inputmode="numeric" value="${esc(d.age)}" style="max-width:140px"></div>
    <div><span class="lbl" id="l-cond">What would you like support with?</span><div class="chips" role="group" aria-labelledby="l-cond">${CONDITIONS.map(c=>`<button class="chip" type="button" data-cond="${c}" aria-pressed="${d.conditions.includes(c)}">${c}</button>`).join("")}</div></div>
    <div><span class="lbl" id="l-pill">Are you taking the combined birth control pill?</span><div class="seg" role="group" aria-labelledby="l-pill"><button type="button" data-pill="0" aria-pressed="${!d.pill}">No</button><button type="button" data-pill="1" aria-pressed="${d.pill}">Yes</button></div></div>
    ${nav(true,"next","Next")}</div>`;
  if(st.step===2)return `<div class="narrow card stack">${bar}<span class="mono muted">Step 2 of 4</span><h2>Your periods</h2>
    <p class="muted">When did your last few periods start? Add at least four dates so Valkryia can learn your own pattern. With fewer, it blends your dates with a typical 28 day cycle.</p>
    <div class="stack" style="gap:8px">${d.periods.map((v,i)=>`<div class="daterow"><label class="sr" for="pd${i}" style="position:absolute;left:-9999px">Period start ${i+1}</label><input class="inp" type="date" id="pd${i}" data-pd="${i}" value="${esc(v)}" max="${iso(TODAY)}"><button class="x" type="button" data-rm="${i}" aria-label="Remove date ${i+1}">✕</button></div>`).join("")}</div>
    <div class="row"><button class="btn btn-ghost btn-sm" data-act="addDate" type="button">Add another date</button><button class="btn btn-ghost btn-sm" data-act="example" type="button">Fill with example dates</button></div>
    ${nav(true,"next","Next")}</div>`;
  if(st.step===3)return `<div class="narrow card stack">${bar}<span class="mono muted">Step 3 of 4</span><h2>How have you felt this month?</h2>
    <p class="muted">Tap how often you had each one in the last 30 days.</p>
    <div>${SYMPTOMS.map(([id,l])=>`<div class="symrow"><span id="s-${id}">${l}</span><div class="seg" role="group" aria-labelledby="s-${id}">${FREQ.map(([f,fl])=>`<button type="button" data-sym="${id}" data-fq="${f}" aria-pressed="${(d.symptoms[id]||"none")===f}">${fl}</button>`).join("")}</div></div>`).join("")}</div>
    <div class="alert stack" style="gap:8px"><span class="lbl" id="l-heavy" style="margin:0">Right now, are you soaking through a pad or tampon every hour, or feeling faint?</span><div class="seg" role="group" aria-labelledby="l-heavy"><button type="button" data-heavy="0" aria-pressed="${!d.heavyToday}">No</button><button type="button" data-heavy="1" aria-pressed="${d.heavyToday}">Yes</button></div></div>
    ${nav(true,"next","Next")}</div>`;
  return `<div class="narrow card stack">${bar}<span class="mono muted">Step 4 of 4</span><h2>Any recent reports?</h2>
    <p class="muted">Optional. In the app you can upload a report and Valkryia reads it. Here, type the value.</p>
    <div><label class="lbl" for="f-hb">Haemoglobin (g/dL)</label><input class="inp" id="f-hb" data-f="hb" type="number" step="0.1" min="3" max="20" inputmode="decimal" value="${esc(d.hb)}" placeholder="For example 11.2" style="max-width:200px"></div>
    ${nav(true,"finish","See my health picture")}</div>`;
}

function results(p){
  const {s,flags,plan}=evaluate(p), me=!p.sample, open=openFlags(flags);
  const nSym=Object.values(p.symptoms).filter(v=>v&&v!=="none").length;
  const shared=[`${s.starts.length} period date${s.starts.length===1?"":"s"}`,`${nSym} symptom${nSym===1?"":"s"}`];
  if(p.hb!=null)shared.push("1 report");
  const counts={now:0,weeks:0,check:0};open.forEach(f=>counts[f.tier]++);
  const outcome=open.length?Object.entries(counts).filter(([,v])=>v).map(([k,v])=>`${v} ${TIER[k].toLowerCase()}`).join(", "):"Nothing needs action";
  const pillNote=`<div class="soft" style="font-size:.95rem">You are on the combined pill, so the bleeds you get are withdrawal bleeds, not natural periods. Valkryia pauses period predictions and phase tracking, and skips the rules about natural cycles.</div>`;
  const todayCard=s.mode==="pill"?pillNote:!s.last?`<p class="muted">Add period dates to see predictions.</p>`:
   `<div class="today">
     <div><div class="k">Next period expected</div><div class="v">${fmt(s.winStart)} to ${fmt(s.winEnd)}</div></div>
     <div><div class="k">Cycle day and phase</div><div class="v">Day ${s.cycleDay} · ${s.phase}</div></div>
     <div><div class="k">How sure we are</div><div class="v">${s.confidence}</div></div>
   </div>
   <p class="muted" style="font-size:.88rem">${s.shrunk?`You have shared fewer than three full cycles, so this prediction is blended with a typical 28 day cycle. It gets more personal as you log more.`:`Based on your own last ${s.n} cycles. Your usual cycle is ${s.median} days.`}</p>`;
  const flagHtml=flags.length?flags.map(f=>`<article class="flag ${f.tier} ${f.status==="not_relevant"?"closed":""}">
     <div class="row" style="justify-content:space-between"><h3>${f.rule.name}</h3><span class="tier ${f.tier}">${TIER[f.tier]}</span></div>
     <p>${f.rule.pt}</p>
     ${f.status?`<div class="drnote">${ACTMSG[f.status]}</div>`:""}
     <details><summary>Why am I seeing this?</summary><div class="why"><span>${esc(f.why)}</span><span class="muted">Rule: ${f.rule.name} · version ${f.rule.v} · sample rule awaiting clinical approval</span></div></details>
   </article>`).join(""):`<div class="flag" style="border-left-color:var(--green)"><div class="row" style="justify-content:space-between"><h3>Nothing to act on</h3><span class="tier ok">All clear</span></div><p>Nothing you shared matched a rule that needs attention. Keep logging, Valkryia checks again every time you do.</p></div>`;
  return `<div class="narrow stack" style="padding-top:8px">
    <div class="row" style="justify-content:space-between"><span class="mono muted">${me?"Your app":`${esc(p.name)}'s app · sample patient`}</span><button class="btn btn-ghost btn-sm" data-act="restart" type="button">${me?"Edit my answers":"Back to patient start"}</button></div>
    <h1 style="font-size:clamp(1.8rem,4.5vw,2.6rem)">${p.name==="You"?"Hi":"Hi "+esc(p.name)}, here is your health picture</h1>
    <section class="card stack" aria-label="How Valkryia worked this out">
      <span class="mono muted">How Valkryia worked this out</span>
      <div class="how3"><div class="h"><b>You shared</b>${shared.join(", ")}</div><div class="ar" aria-hidden="true">→</div><div class="h"><b>Valkryia checked</b>${RULES.length} rules approved by doctors</div><div class="ar" aria-hidden="true">→</div><div class="h"><b>Result</b>${outcome}</div></div>
    </section>
    <section class="card stack"><h2>Your cycle today</h2>${todayCard}</section>
    <section class="stack"><h2>What Valkryia noticed</h2>${flagHtml}</section>
    <section class="card stack"><h2>Your cycle pattern</h2>${s.mode==="pill"?`<p class="muted">Paused while you are on the pill.</p>`:chart(s)}</section>
    <section class="card stack"><h2>Your plan for today</h2><p class="muted" style="font-size:.92rem">Built from ${p.doctor.goal!=="balanced"?`your doctor's goal (${GOALS.find(g=>g[0]===p.doctor.goal)[1].toLowerCase()}) and `:""}what you shared.</p>
      <div class="plan">${plan.map(([t,b],i)=>`<label class="pitem"><input type="checkbox" data-done="${i}"><span><span class="t">${t}</span><br><span class="body">${b}</span></span></label>`).join("")}</div></section>
    ${me?`<section class="card stack" style="border-color:var(--teal)"><h2>Share with a doctor</h2><p class="muted">${p.shared?`Shared with ${DOCTOR} (sample). See what your doctor sees.`:`Give consent to share this picture with ${DOCTOR} (sample) and see it from the doctor's side.`}</p><div><button class="btn btn-teal" data-act="share" type="button">${p.shared?"Open the doctor view":"Share and open the doctor view"}</button></div></section>`
       :`<div><button class="btn btn-teal" data-docopen="${p.id}" type="button">See ${esc(p.name)} from the doctor's side</button></div>`}
  </div>`;
}

function doctorView(){
  const list=patients.filter(p=>p.shared).map(p=>({p,r:evaluate(p)}))
    .sort((a,b)=>{const ta=topTier(a.r.flags),tb=topTier(b.r.flags);const o={now:0,weeks:1,check:2,ok:3};return o[ta]-o[tb]||openFlags(b.r.flags).length-openFlags(a.r.flags).length;});
  if(!byId(st.sel)||!byId(st.sel).shared)st.sel=list[0].p.id;
  const rows=list.map(({p,r})=>{const t=topTier(r.flags),o=openFlags(r.flags).length;return `<button class="prow" type="button" data-sel="${p.id}" aria-current="${p.id===st.sel}">
    <span class="nm"><span>${esc(p.name)}, ${esc(p.age||"?")} ${p.sample?"":`<span class="newb">You</span>`}</span><span class="tier ${t}">${t==="ok"?"All clear":TIER[t]}</span></span>
    <span class="sub">${esc(p.conditions.join(", ")||"No conditions chosen")} · ${o} open alert${o===1?"":"s"}</span></button>`;}).join("");
  return `<div class="stack">
    <div class="row" style="justify-content:space-between"><div><span class="mono muted">Doctor side</span><h1 style="font-size:clamp(1.6rem,4vw,2.3rem)">${DOCTOR} (sample) · Gynaecologist</h1></div></div>
    <p class="muted" style="max-width:70ch">These patients gave consent to share with you. The most urgent are at the top. Pick one to see the evidence, act on an alert, or add your clinical input.</p>
    <div class="dgrid"><div class="plist" aria-label="Patients">${rows}</div><div>${docDetail(byId(st.sel))}</div></div></div>`;
}

function docDetail(p){
  const {s,flags}=evaluate(p);
  const ch=st.changes&&st.changes.id===p.id?st.changes:null;
  const sel=(id,opts,val,label)=>`<div><label class="lbl" for="${id}">${label}</label><select class="inp" id="${id}">${opts.map(([v,l])=>`<option value="${v}" ${v===val?"selected":""}>${l}</option>`).join("")}</select></div>`;
  return `<div class="stack">
   <section class="card stack"><div class="row" style="justify-content:space-between"><h2>${esc(p.name)}, ${esc(p.age||"?")}</h2><span class="muted" style="font-size:.9rem">${esc(p.conditions.join(", "))}</span></div>
    <div class="stats">
      <div class="stat"><div class="k">Cycles logged</div><div class="v">${s.n}</div></div>
      <div class="stat"><div class="k">Usual cycle</div><div class="v">${s.n?s.median+" d":"none"}</div></div>
      <div class="stat"><div class="k">Variation</div><div class="v">${s.n>1?"± "+s.sd.toFixed(1)+" d":"none"}</div></div>
      <div class="stat"><div class="k">Latest Hb</div><div class="v">${s.hb!=null?s.hb+" g/dL":"none"}</div></div>
      <div class="stat"><div class="k">Cycle mode</div><div class="v">${s.mode==="pill"?"On pill":"Natural"}</div></div>
    </div>
    ${s.mode==="pill"?`<p class="muted">On the combined pill. Natural cycle rules are skipped.</p>`:chart(s)}
   </section>
   <section class="stack"><h2>Alerts</h2>${flags.length?flags.map(f=>`<article class="flag ${f.tier} ${f.status==="not_relevant"?"closed":""}">
     <div class="row" style="justify-content:space-between"><h3>${f.rule.name}</h3><span class="tier ${f.tier}">${TIER[f.tier]}</span></div>
     <p>${f.rule.dr}</p>
     <div class="ev"><span><span class="mono muted">Evidence</span> ${esc(f.ev)}</span><span class="muted">Rule ${f.rule.id} · version ${f.rule.v} · sample, awaiting clinical approval</span></div>
     <div class="actions" role="group" aria-label="Action on ${f.rule.name}">${ACTIONS.map(([a,l])=>`<button class="btn btn-ghost btn-sm" type="button" data-flag="${f.rule.id}" data-a="${a}" aria-pressed="${f.status===a}">${l}</button>`).join("")}</div>
     ${f.status?`<p class="muted" style="font-size:.88rem">Sent to her app: "${ACTMSG[f.status]}"</p>`:""}
   </article>`).join(""):`<div class="card"><p>No alerts. Nothing she shared matched a rule.</p></div>`}</section>
   <section class="card stack"><h2>Your clinical input</h2><p class="muted" style="font-size:.93rem">Valkryia uses this straight away. Save to see exactly what changes in her app.</p>
    <div class="form">${sel("d-pcos",PCOS,p.doctor.pcos,"PCOS status")}${sel("d-med",MEDS,p.doctor.med,"Medication")}${sel("d-goal",GOALS,p.doctor.goal,"Lifestyle goal")}${sel("d-ayu",[["no","No"],["yes","Yes, as wellness only"]],p.doctor.ayurveda?"yes":"no","Show Ayurveda tips")}</div>
    <div><button class="btn btn-teal" data-act="saveInput" type="button">Save input</button></div>
    ${ch?`<div class="changes" role="status"><h3>What changed in ${esc(p.name)}'s app</h3><ul>${ch.lines.map(l=>`<li>${esc(l)}</li>`).join("")}</ul><div><button class="btn btn-rose btn-sm" data-ptopen="${p.id}" type="button">Open ${esc(p.name)}'s app</button></div></div>`:""}
   </section></div>`;
}

function snapshot(p){const r=evaluate(p);return {mode:r.s.mode,flags:Object.fromEntries(r.flags.map(f=>[f.rule.id,f])),plan:r.plan};}
function diff(a,b){
  const L=[];
  if(a.mode!==b.mode)L.push(b.mode==="pill"?"Pill mode is on. Period predictions and phase tracking are paused, and natural cycle rules are skipped.":"Pill mode is off. Period predictions and phase tracking are back.");
  for(const id in a.flags)if(!b.flags[id])L.push(`Alert removed: "${a.flags[id].rule.name}".`);
  for(const id in b.flags)if(!a.flags[id])L.push(`New alert: "${b.flags[id].rule.name}" (${TIER[b.flags[id].tier].toLowerCase()}). She sees: ${b.flags[id].rule.pt}`);
  const pa=Object.fromEntries(a.plan),pb=Object.fromEntries(b.plan);
  for(const k in pb)if(pa[k]!==pb[k]&&k!=="Happy habit")L.push(k==="Wellness only"?"An Ayurveda wellness tip now shows in her plan, labelled wellness only.":`Her ${k.toLowerCase()} plan now says: ${pb[k]}`);
  if(pa["Wellness only"]&&!pb["Wellness only"])L.push("The Ayurveda wellness tip is hidden from her plan.");
  if(!L.length)L.push("Nothing visible changed in her app. Your input is saved in her record.");
  return L;
}

function how(){
  const rows=RULES.map(r=>`<tr><td><b>${r.name}</b></td><td><span class="tier ${r.tier}">${TIER[r.tier]}</span></td><td>${r.pt}</td><td>${r.dr}</td></tr>`).join("");
  return `<div class="stack" style="max-width:900px">
    <span class="mono muted">How it works</span><h1 style="font-size:clamp(1.8rem,4.5vw,2.6rem)">How Valkryia's decision support works</h1>
    <div class="stack" style="gap:12px">
    ${[["She logs","Period dates, symptoms and how often they happen, and reports like haemoglobin. All by tapping, in under a minute a day."],
       ["Valkryia builds her picture","Her own usual cycle length, how much it varies, when her next period is likely, which phase she is in and how sure it is, and which symptoms keep coming back. With little data it starts from a typical 28 day cycle and becomes more personal as she logs."],
       ["Rules check the picture","Every rule is written and approved by doctors. Each one has a version, so a doctor can always see exactly which rule raised an alert. The same picture always gives the same result."],
       ["Alerts are sorted by urgency","Act today, within a few weeks, or keep an eye on it. Urgent safety rules are checked first."],
       ["Both sides see it","She sees plain words and what to do next. Her doctor sees the evidence, the rule and the urgency, and only for patients who gave consent."],
       ["The doctor closes the loop","When a doctor reviews an alert, advises tests, or adds input like starting iron or confirming PCOS, her app updates straight away."]]
     .map(([t,b],i)=>`<div class="card row" style="align-items:flex-start;flex-wrap:nowrap"><span class="mono" style="color:var(--rose);flex:none;padding-top:3px">${i+1}</span><div class="stack" style="gap:4px"><h3>${t}</h3><p class="muted">${b}</p></div></div>`).join("")}
    </div>
    <h2 style="margin-top:12px">The sample rules in this demo</h2>
    <p class="muted">Thresholds are placeholders until our consultant gynaecologist approves them.</p>
    <div class="rtable card" style="padding:8px"><table><thead><tr><th>Rule</th><th>Urgency</th><th>She sees</th><th>Her doctor sees</th></tr></thead><tbody>${rows}</tbody></table></div>
    <div class="soft stack" style="gap:6px"><h3>What Valkryia does not do</h3><p class="muted">It does not diagnose, prescribe, or replace a doctor. It points out patterns, explains them in plain words, and makes sure the right doctor sees them at the right time.</p></div>
    <div class="row"><a class="btn btn-rose" href="#patient">Try it as a patient</a><a class="btn btn-ghost" href="#doctor">Try it as a doctor</a></div>
  </div>`;
}

/* ---------- render and routing ---------- */
const app=document.getElementById("app");
function route(){const h=(location.hash||"#home").slice(1);return ["home","patient","doctor","how"].includes(h)?h:"home";}
function render(){
  const r=route();
  document.querySelectorAll("nav a").forEach(a=>a.setAttribute("aria-current",a.dataset.r===r?"page":"false"));
  app.innerHTML=r==="patient"?patientView():r==="doctor"?doctorView():r==="how"?how():home();
}
function go(r){if(location.hash==="#"+r)render();else location.hash=r;window.scrollTo(0,0);}
window.addEventListener("hashchange",()=>{if(route()==="patient"&&!st.keep){st.view=byId("me")?"me":null;if(!st.view)st.step=0;}st.keep=false;render();window.scrollTo(0,0);});

function validate(){
  const d=st.draft;
  if(st.step===1){if(!d.age||d.age<18||d.age>70)return "Please enter an age between 18 and 70. This demo is for adults.";}
  if(st.step===2){const v=d.periods.filter(Boolean);if(v.length<1)return "Add at least one period start date.";if(v.some(x=>parse(x)>TODAY))return "Dates cannot be in the future.";if(new Set(v).size!==v.length)return "Two dates are the same. Please remove one.";}
  if(st.step===4&&d.hb!==""&&(isNaN(+d.hb)||+d.hb<3||+d.hb>20))return "Haemoglobin should be a number between 3 and 20.";
  return "";
}

app.addEventListener("input",e=>{
  const t=e.target,d=st.draft;
  if(t.dataset.f&&d)d[t.dataset.f]=t.value;
  if(t.dataset.pd!=null&&d)d.periods[+t.dataset.pd]=t.value;
});
app.addEventListener("change",e=>{
  const t=e.target;
  if(t.dataset.done!=null)t.closest(".pitem").classList.toggle("done",t.checked);
});
app.addEventListener("click",e=>{
  const b=e.target.closest("button");if(!b)return;
  const d=st.draft,ds=b.dataset;
  if(ds.go){go(ds.go);return;}
  if(ds.cond){const i=d.conditions.indexOf(ds.cond);i<0?d.conditions.push(ds.cond):d.conditions.splice(i,1);render();return;}
  if(ds.pill){d.pill=ds.pill==="1";render();return;}
  if(ds.heavy){d.heavyToday=ds.heavy==="1";render();return;}
  if(ds.sym){d.symptoms[ds.sym]=ds.fq;render();return;}
  if(ds.rm!=null){d.periods.splice(+ds.rm,1);if(!d.periods.length)d.periods.push("");render();return;}
  if(ds.open){st.view=ds.open;render();window.scrollTo(0,0);return;}
  if(ds.docopen){st.sel=ds.docopen;st.changes=null;go("doctor");return;}
  if(ds.ptopen){st.view=ds.ptopen;st.keep=true;go("patient");return;}
  if(ds.sel){st.sel=ds.sel;st.changes=null;render();return;}
  if(ds.flag){const p=byId(st.sel);p.actions[ds.flag]=p.actions[ds.flag]===ds.a?undefined:ds.a;if(!p.actions[ds.flag])delete p.actions[ds.flag];render();return;}
  switch(ds.act){
    case "start":st.draft=newDraft();st.step=1;st.err="";render();break;
    case "back":st.err="";st.step--;render();break;
    case "next":st.err=validate();if(!st.err)st.step++;render();if(!st.err)window.scrollTo(0,0);break;
    case "addDate":d.periods.push("");render();break;
    case "example":d.periods=periodsFrom(16,[33,37,30,41,36]);render();break;
    case "finish":{
      st.err=validate();if(st.err){render();break;}
      const prev=byId("me");
      const sym={};for(const k in d.symptoms)if(d.symptoms[k]!=="none")sym[k]=d.symptoms[k];
      const p={id:"me",sample:false,shared:prev?prev.shared:false,actions:prev?prev.actions:{},name:d.name.trim()||"there",age:+d.age,conditions:[...d.conditions],pill:d.pill,
        periods:d.periods.filter(Boolean),symptoms:sym,heavyToday:d.heavyToday,hb:d.hb===""?null:Math.round(+d.hb*10)/10,
        doctor:prev?prev.doctor:{pcos:"not_assessed",med:d.pill?"combined_ocp":"none",goal:"balanced",ayurveda:false}};
      if(p.name==="there")p.name="You";
      patients=patients.filter(x=>x.id!=="me");patients.unshift(p);
      st.view="me";render();window.scrollTo(0,0);break;}
    case "restart":
      if(st.view==="me"){st.view=null;st.step=1;}else{st.view=null;st.step=0;}
      st.err="";render();window.scrollTo(0,0);break;
    case "share":{const p=byId("me");p.shared=true;st.sel="me";st.changes=null;go("doctor");break;}
    case "saveInput":{
      const p=byId(st.sel),before=snapshot(p);
      p.doctor={pcos:document.getElementById("d-pcos").value,med:document.getElementById("d-med").value,goal:document.getElementById("d-goal").value,ayurveda:document.getElementById("d-ayu").value==="yes"};
      st.changes={id:p.id,lines:diff(before,snapshot(p))};render();
      const c=app.querySelector(".changes");if(c)c.scrollIntoView({behavior:"smooth",block:"nearest"});break;}
  }
});

/* theme toggle */
const tb=document.getElementById("themeBtn");
const isDark=()=>{const t=document.documentElement.dataset.theme;return t?t==="dark":matchMedia("(prefers-color-scheme: dark)").matches;};
const label=()=>{tb.textContent=isDark()?"Light":"Dark";};
try{const saved=localStorage.getItem("valk-theme");if(saved)document.documentElement.dataset.theme=saved;}catch(e){}
tb.addEventListener("click",()=>{const n=isDark()?"light":"dark";document.documentElement.dataset.theme=n;try{localStorage.setItem("valk-theme",n);}catch(e){}label();});
label();
render();
})();
