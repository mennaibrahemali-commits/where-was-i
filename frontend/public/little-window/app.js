import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm";

const PAL={
  butter:{bg:"#FFF4C7",card:"#FFFBEA",ink:"#4A3B1F",soft:"#8C7A52",accent:"#E9BC4E",doodle:"#F28C7A"},
  lavender:{bg:"#ECE5FF",card:"#F8F5FF",ink:"#3B3160",soft:"#6F64A0",accent:"#B3A6F7",doodle:"#3FB386"},
  mint:{bg:"#DDF4E8",card:"#F2FBF6",ink:"#1F4636",soft:"#557A69",accent:"#8FD8B6",doodle:"#8E7CF0"},
  coral:{bg:"#FFE3DA",card:"#FFF5F1",ink:"#5A2A22",soft:"#8E5A50",accent:"#F7A28F",doodle:"#E0A92E"}
};
const THEME_NAME={butter:["زبدة","Butter"],lavender:["لافندر","Lavender"],mint:["نعناع","Mint"],coral:["مرجان","Coral"]};
const INKS=["#3B2F2F","#F2715A","#8E7CF0","#3FB386","#E0A92E"];
const WIDTHS=[10,18,30];
const DIALECTS=[["eg","مصري"],["sd","سوداني"],["en","English"]];
const IDX={eg:0,sd:1,en:2};
const LOCALE={eg:"ar-EG",sd:"ar-SD",en:"en-US"};
// [Egyptian, Sudanese, English]
const S={
 appName:["شباك صغير","شباك صغير","Little Window"],
 live:["مباشر","مباشر","Live"],
 noMsgs:["لسه مفيش رسايل. ابعتوا أول واحدة ✦","لسه ما في رسائل. رسّلوا أول واحدة ✦","No notes yet. Send the first one ✦"],
 newMessage:["رسالة جديدة","رسالة جديدة","New message"],
 earlier:["اللي فات","الرسائل القديمة","Earlier"],
 me:["أنا","أنا","Me"],
 from:["من","من","From"],
 textTab:["كلام","كلام","Text"], doodleTab:["شخبطة","شخبطة","Doodle"],
 msgPh:["رسالتك…","رسالتك…","Your message…"],
 send:["إرسال","إرسال","Send"], sending:["بيتبعت…","بيترسل…","Sending…"], cancel:["إلغاء","إلغاء","Cancel"], done:["تمام","تمام","Done"],
 next:["التالي","التالي","Next"], start:["يلا نبدأ","يلا نبدأ","Let's start"],
 quick:["رسايل جاهزة","رسائل جاهزة","Quick messages"],
 settings:["الإعدادات","الإعدادات","Settings"],
 language:["لغة التطبيق","لغة التطبيق","App language"],
 langHint:["اللغة والألوان على الموبايل ده بس، ومش بتغيّر حاجة عند شريكك.","اللغة والألوان في الموبايل دا بس، وما بتغيّر حاجة عند شريكك.","Language and colors stay on this phone and don't change anything for your partner."],
 partnerIs:["الرسايل الجاهزة بتكلّم:","الرسائل الجاهزة بتخاطب:",""],
 he:["هو","هو","Him"], she:["هي","هي","Her"],
 colors:["الألوان","الألوان","Colors"],
 // setup
 step:["خطوة","خطوة","Step"],
 nameT:["اسمك إيه؟","اسمك شنو؟","What's your name?"],
 nameB:["ده الاسم اللي هيظهر عند شريكك على رسايلك. هو يقدر يغيّره عنده لأي اسم يحبه.","دا الاسم البيظهر عند شريكك في رسائلك. هو بقدر يغيّرو عندو لأي اسم بريدو.","This is the name your partner sees on your notes. They can change it on their side to anything they like."],
 namePh:["اسمك","اسمك","Your name"],
 connectT:["وصّلوا الشباك","وصّلوا الشباك","Connect your window"],
 connectB:["واحد فيكم يعمل كود ويبعته، والتاني يكتبه هنا.","واحد فيكم يعمل كود ويرسلو، والتاني يكتبو هنا.","One of you makes a code and sends it, the other types it here."],
 createCode:["اعمل كود","اعمل كود","Make a code"],
 yourCode:["ده الكود. ابعته لشريكك يكتبه عنده:","دا الكود. رسّلو لي شريكك يكتبو عندو:","Here's the code. Send it to your partner to type in:"],
 copy:["نسخ الكود","نسخ الكود","Copy code"], copied:["اتنسخ ✓","اتنسخ ✓","Copied ✓"],
 waitingFor:["مستنيين شريكك يكتب الكود…","منتظرين شريكك يكتب الكود…","Waiting for your partner to enter the code…"],
 haveCode:["معايا كود","عندي كود","I have a code"],
 joinCodeT:["{name} عمل كود. اكتبه هنا:","{name} عمل كود. اكتبو هنا:","{name} made a code. Type it here:"],
 codePh:["الكود","الكود","Code"],
 join:["توصيل","توصيل","Connect"],
 badCode:["الكود ده مش صح. اتأكد منه وجرّب تاني.","الكود دا ما صاح. اتأكد منو وجرّب تاني.","That code doesn't match. Check it and try again."],
 ownCode:["ده الكود بتاعك 🙂 شريكك هو اللي يكتبه.","دا الكود حقك 🙂 شريكك هو اليكتبو.","That's your own code 🙂 Your partner types it."],
 fullT:["الشباك ده متوصّل خلاص","الشباك دا متوصّل خلاص","This window is already connected"],
 fullB:["فيه اتنين متوصلين بالصفحة دي. لو ده غلط، صاحب الصفحة يقدر يفك الربط من الإعدادات.","في اتنين متوصلين بالصفحة دي. لو دا غلط، صاحب الصفحة بقدر يفك الربط من الإعدادات.","Two people are already connected here. If that's a mistake, the page owner can disconnect from Settings."],
 nickT:["بتسمّي شريكك إيه؟","بتسمّي شريكك شنو؟","What do you call your partner?"],
 nickB:["الاسم ده هيظهر عندك إنت بس على رسايله.","الاسم دا بيظهر عندك إنت بس في رسائلو.","Only you see this name on their notes."],
 connectedTo:["متوصّل مع","متوصّل مع","Connected with"],
 yourNameS:["اسمك عند شريكك","اسمك عند شريكك","Your name for your partner"],
 nickS:["اسم شريكك عندك","اسم شريكك عندك","Your name for your partner"],
 unpair:["فك الربط","فك الربط","Disconnect"],
 unpairQ:["متأكد؟ ده هيفك الربط عند الاتنين. الرسايل مش هتتمسح.","متأكد؟ دا بيفك الربط عند الاتنين. الرسائل ما بتتمسح.","Sure? This disconnects you both. Notes are kept."],
 yes:["أيوه، فك الربط","أيوه، فك الربط","Yes, disconnect"],
 homeTitle:["زي التطبيق على الشاشة الرئيسية","زي التطبيق في الشاشة الرئيسية","Put it on your Home Screen"],
 home1:["افتح اللينك في Safari.","افتح اللينك في Safari.","Open this link in Safari."],
 home2:["زرار المشاركة ⬆︎ تحت.","زر المشاركة ⬆︎ تحت.","Tap the Share button ⬆︎."],
 home3:["«إضافة إلى الشاشة الرئيسية».","«إضافة إلى الشاشة الرئيسية».","Add to Home Screen."],
 homeNote:["ده اختصار للصفحة، مش ويدجت. الويدجت الحقيقي في نسخة الآيفون.","دا اختصار للصفحة، ما ويدجت. الويدجت الحقيقي في نسخة الآيفون.","This is a shortcut, not a widget. The real widget comes with the iPhone app."],
 noAccessT:["مش قادرين نوصل للرسايل","ما قدرنا نوصل للرسائل","Can't reach the messages"],
 noAccess:["لازم تكون داخل بحساب Claude، والصفحة متشاركة معاك. لو المشكلة فضلت، اقفل الصفحة وافتحها تاني.","لازم تكون داخل بحساب Claude، والصفحة متشاركة معاك. لو المشكلة قعدت، اقفل الصفحة وافتحها تاني.","Sign in to Claude with the account this page was shared with. If it keeps happening, close the page and open it again."],
 readOnlyT:["الصفحة مفتوحة للقراية بس","الصفحة مفتوحة للقراية بس","This page is view-only for you"],
 readOnly:["الإرسال محتاج إن صاحب الصفحة يضيفك بصلاحية Editor من زرار Share.","الإرسال محتاج صاحب الصفحة يضيفك بصلاحية Editor من زر Share.","To send, the page owner needs to add you as an Editor from the Share button."],
 sendFail:["الرسالة متبعتتش. جرّب تاني.","الرسالة ما اترسلت. جرّب تاني.","That note didn't send. Try again."],
 saveFail:["محصلش حفظ. جرّب تاني.","ما اتحفظ. جرّب تاني.","Couldn't save. Try again."],
 full:["المساحة اتملت. امسح رسايل قديمة.","المساحة اتملت. امسح رسائل قديمة.","Storage is full. Delete some old notes."],
 loading:["بنفتح الشباك…","بنفتح الشباك…","Opening the window…"],
 partner:["شريكي","شريكي","My partner"],
 undo:["رجوع","رجوع","Undo"], clear:["مسح","مسح","Clear"], size:["سُمك القلم","سُمك القلم","Pen size"]
};
const CATS={affection:["حب","حب","Love"],missing:["شوق","شوق","Missing you"],greetings:["صباح ومسا","سلامات","Hello"],teasing:["هزار","هزار","Teasing"],justUs:["بيننا","بيننا","Just us"]};
const P=(c,m,f)=>({c,m,f:f||m});
const PRESETS={
 eg:[P("affection","بحبك ❤️"),P("affection","إنت أحلى حاجة في يومي","إنتي أحلى حاجة في يومي"),P("affection","بفكر فيك","بفكر فيكي"),P("affection","ربنا يخليك ليا","ربنا يخليكي ليا"),P("affection","قلبي معاك","قلبي معاكي"),
  P("missing","وحشتني","وحشتيني"),P("missing","وحشتني أوي النهارده","وحشتيني أوي النهارده"),P("missing","نفسي أشوفك"),P("missing","إمتى نتقابل؟"),P("missing","اليوم طويل من غيرك"),
  P("greetings","صباح الفل ☀️"),P("greetings","صباحك عسل"),P("greetings","عامل إيه النهارده؟","عاملة إيه النهارده؟"),P("greetings","أكلت؟","أكلتي؟"),P("greetings","تصبح على خير 🌙","تصبحي على خير 🌙"),
  P("teasing","فينك؟ مختفي ليه؟ 👀","فينك؟ مختفية ليه؟ 👀"),P("teasing","رد بقى 😤","ردي بقى 😤"),P("teasing","إنت مش سهل على فكرة","إنتي مش سهلة على فكرة"),P("teasing","خصام… خمس دقايق بس 😒"),P("teasing","فاكر نفسك مين؟ 😏","فاكرة نفسك مين؟ 😏"),
  P("justUs","فاكر الموقف إياه؟ 😂","فاكرة الموقف إياه؟ 😂"),P("justUs","لسه بضحك على إمبارح"),P("justUs","أنا وإنت ضد العالم","أنا وإنتي ضد العالم"),P("justUs","شاي؟ ☕"),P("justUs","الكلمة السر: 🍟")],
 sd:[P("affection","بريدك ❤️"),P("affection","بريدك شديد"),P("affection","إنت أحلى حاجة في يومي","إنتي أحلى حاجة في يومي"),P("affection","الله يخليك لي","الله يخليكي لي"),P("affection","قلبي معاك","قلبي معاكي"),
  P("missing","يا حليلك"),P("missing","اشتقت ليك شديد","اشتقت ليكي شديد"),P("missing","متين نتلاقى؟"),P("missing","الدنيا ما حلوة من غيرك"),P("missing","نفسي أشوفك الليلة"),
  P("greetings","صباح الخير يا الغالي ☀️","صباح الخير يا الغالية ☀️"),P("greetings","أصبحت كيف؟","أصبحتي كيف؟"),P("greetings","كيفنك الليلة؟"),P("greetings","أكلت؟","أكلتي؟"),P("greetings","تصبح على خير 🌙","تصبحي على خير 🌙"),
  P("teasing","إنت وين يا زول؟ 👀","إنتي وين يا زولة؟ 👀"),P("teasing","رد علي ياخ 😤","ردي علي ياخ 😤"),P("teasing","إنت ما ساهل","إنتي ما ساهلة"),P("teasing","زعلان مني ولا شنو؟","زعلانة مني ولا شنو؟"),P("teasing","كلامك دا ما بدخل راسي 😏"),
  P("justUs","فاكر الحصل داك؟ 😂","فاكرة الحصل داك؟ 😂"),P("justUs","لسه بضحك من أمس"),P("justUs","أنا وإنت ضد الدنيا كلها","أنا وإنتي ضد الدنيا كلها"),P("justUs","جبنة؟ ☕"),P("justUs","الكلمة السر: 🍟")],
 en:[P("affection","Love you ❤️"),P("affection","You're my favorite person"),P("affection","Thinking of you"),P("affection","So lucky it's you"),P("affection","Proud of you"),
  P("missing","Miss you"),P("missing","Missing you a lot today"),P("missing","Wish you were here"),P("missing","When can I see you?"),P("missing","Long day without you"),
  P("greetings","Good morning ☀️"),P("greetings","How's your day going?"),P("greetings","Did you eat?"),P("greetings","Home safe?"),P("greetings","Sleep well 🌙"),
  P("teasing","Where did you disappear to? 👀"),P("teasing","Reply already 😤"),P("teasing","You're trouble, you know that"),P("teasing","Mad at you. For five minutes 😒"),P("teasing","Who do you think you are 😏"),
  P("justUs","Remember that thing? 😂"),P("justUs","Still laughing about yesterday"),P("justUs","You and me vs the world"),P("justUs","Tea? ☕"),P("justUs","Password: 🍟")]
};


/* ================= extra strings for the website ================= */
Object.assign(S,{
 authT:["أهلاً 👋","مرحب 👋","Hi 👋"],
 authB:["اعمل حساب مرة واحدة، وبعدها افتح الشباك من أي موبايل أو لابتوب بنفس الإيميل.","اعمل حساب مرة واحدة، وبعداك افتح الشباك من أي موبايل أو لابتوب بنفس الإيميل.","Make an account once, then open your window from any phone or laptop with the same email."],
 signupTab:["حساب جديد","حساب جديد","New account"], loginTab:["عندي حساب","عندي حساب","I have an account"],
 email:["الإيميل","الإيميل","Email"], password:["كلمة السر (٦ حروف على الأقل)","كلمة السر (٦ حروف على الأقل)","Password (at least 6 characters)"],
 signupBtn:["اعمل الحساب","اعمل الحساب","Create account"], loginBtn:["دخول","دخول","Sign in"],
 errExists:["الإيميل ده عليه حساب بالفعل. ادخل من «عندي حساب».","الإيميل دا عندو حساب. ادخل من «عندي حساب».","That email already has an account. Use “I have an account”."],
 errLogin:["الإيميل أو كلمة السر مش صح.","الإيميل أو كلمة السر ما صاح.","Wrong email or password."],
 errEmail:["اكتب إيميل صحيح.","اكتب إيميل صاح.","Enter a valid email."],
 errPass:["كلمة السر لازم تكون ٦ حروف على الأقل.","كلمة السر لازم تكون ٦ حروف على الأقل.","Password needs at least 6 characters."],
 errNet:["مفيش اتصال. جرّب تاني.","ما في اتصال. جرّب تاني.","No connection. Try again."],
 logout:["خروج من الحساب","خروج من الحساب","Sign out"],
 newCode:["كود جديد","كود جديد","New code"],
 codeFrom:["الكود ده من {name} ✓","الكود دا من {name} ✓","This code is from {name} ✓"],
 errPairFull:["الشباك ده متوصّل خلاص.","الشباك دا متوصّل خلاص.","That window is already connected."],
 errAlready:["إنتو متوصّلين خلاص.","إنتو متوصّلين خلاص.","You're already connected."],
 unpairQ:["متأكد؟ ده هيفك الربط عند الاتنين، والرسايل القديمة هتختفي.","متأكد؟ دا بيفك الربط عند الاتنين، والرسائل القديمة بتختفي.","Sure? This disconnects you both and hides your old notes."],
 homeNote:["ده مش ويدجت، بس هيفتح زي التطبيق بالظبط. الويدجت الحقيقي في نسخة الآيفون.","دا ما ويدجت، بس بيفتح زي التطبيق بالضبط. الويدجت الحقيقي في نسخة الآيفون.","This isn't a widget, but it opens just like an app. The real widget comes with the iPhone app."],
 home2:["زرار المشاركة ⬆︎ (في الماك: File ← Add to Dock).","زر المشاركة ⬆︎ (في الماك: File ← Add to Dock).","Tap Share ⬆︎ (on a Mac: File → Add to Dock)."]
});

/* ================= backend ================= */
const SUPABASE_URL="https://kmarajhtpwdofwvpzwrw.supabase.co";
// Public "anon" key: safe in the browser. Row-level security decides what each person can see.
const SUPABASE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttYXJhamh0cHdkb2Z3dnB6d3J3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIyNDA0NjYsImV4cCI6MjEwNzgxNjQ2Nn0.Co8PtEwcnY53GnpLWYi_u9qtpKJJ3CmhbcLZam1agio";
const sb=createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});

/* ================= local, per-device settings ================= */
const PKEY="lw-web-settings";
let prefs={dialect:"eg",gender:"m",theme:"butter",nick:{},nickDone:{}};
try{Object.assign(prefs,JSON.parse(localStorage.getItem(PKEY)||"{}"))}catch(e){}
prefs.nick=prefs.nick&&typeof prefs.nick==="object"?prefs.nick:{};
prefs.nickDone=prefs.nickDone&&typeof prefs.nickDone==="object"?prefs.nickDone:{};
function savePrefs(){try{localStorage.setItem(PKEY,JSON.stringify(prefs))}catch(e){}}

/* ================= state ================= */
let session=null,myId=null;
let booted=false,online=true;
let status={state:"unknown"};     // from my_status(): unpaired | waiting | paired
let myName="",partnerId=null,partnerName="";
let msgs=[];                       // newest first
let lastPartnerMsgId=null,fresh=false;
let channel=null;
let sheet=null,confirmUnpair=false;
let auth={mode:"signup",email:"",password:"",busy:false,err:""};
let setup={nameDraft:null,codeDraft:"",codeOwner:"",err:"",busy:false,copied:false,nickDraft:undefined};
let compose={mode:"text",text:"",cat:"affection",strokes:[],ink:INKS[0],w:18,busy:false,err:""};

const t=k=>(S[k]||["","",""])[IDX[prefs.dialect]];
const isAr=()=>prefs.dialect!=="en";
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const paired=()=>status.state==="paired";
const nickFor=id=>(id&&prefs.nick[id])||"";
const partnerLabel=()=>nickFor(partnerId).trim()||partnerName||t("partner");
function when(ts){
  const d=new Date(ts),today=new Date().toDateString()===d.toDateString();
  const o=today?{hour:"numeric",minute:"2-digit"}:{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"};
  try{return new Intl.DateTimeFormat(LOCALE[prefs.dialect],o).format(d)}catch(e){return d.toLocaleString()}
}
const heart=c=>`<svg width="16" height="14" viewBox="0 0 100 90" aria-hidden="true"><path d="M50 84C26 64 4 50 4 30 4 6 34 -2 50 20 66 -2 96 6 96 30 96 50 74 64 50 84Z" fill="none" stroke="${c}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

/* doodles are stored as {v:1, s:[{c,w,p:[x,y,…]}]} in a 0–1000 square (same format as the iPhone app) */
function cleanStroke(s){
  const p=Array.isArray(s&&s.p)?s.p.filter(n=>typeof n==="number"&&isFinite(n)):[];
  return {p:p.length%2?p.slice(0,-1):p,c:/^#[0-9A-Fa-f]{6}$/.test(s&&s.c)?s.c:"#3B2F2F",w:Math.min(40,Math.max(4,Number(s&&s.w)||18))};
}
function pathD(p){
  if(p.length<2)return "";
  if(p.length<=4)return `M${p[0]} ${p[1]}L${p.length>2?p[2]:p[0]+0.5} ${p.length>2?p[3]:p[1]}`;
  let d=`M${p[0]} ${p[1]}`;
  for(let i=2;i<p.length-2;i+=2){const mx=(p[i]+p[i+2])/2,my=(p[i+1]+p[i+3])/2;d+=`Q${p[i]} ${p[i+1]} ${mx} ${my}`}
  return d+`L${p[p.length-2]} ${p[p.length-1]}`;
}
function doodleSVG(doodle){
  const strokes=Array.isArray(doodle&&doodle.s)?doodle.s:[];
  const paths=strokes.map(cleanStroke).filter(s=>s.p.length)
    .map(s=>`<path d="${pathD(s.p)}" fill="none" stroke="${s.c}" stroke-width="${s.w}" stroke-linecap="round" stroke-linejoin="round"/>`).join("");
  return `<svg viewBox="0 0 1000 1000" role="img" aria-label="doodle">${paths}</svg>`;
}
function drawOnCanvas(ctx,size,strokes){
  ctx.clearRect(0,0,size,size);
  const k=size/1000;
  for(const raw of strokes){
    const s=cleanStroke(raw),p=s.p;if(!p.length)continue;
    ctx.strokeStyle=s.c;ctx.lineWidth=s.w*k;ctx.lineCap="round";ctx.lineJoin="round";
    ctx.beginPath();ctx.moveTo(p[0]*k,p[1]*k);
    if(p.length<=4){ctx.lineTo((p.length>2?p[2]:p[0]+0.5)*k,(p.length>2?p[3]:p[1])*k)}
    else{for(let i=2;i<p.length-2;i+=2){ctx.quadraticCurveTo(p[i]*k,p[i+1]*k,(p[i]+p[i+2])/2*k,(p[i+1]+p[i+3])/2*k)}ctx.lineTo(p[p.length-2]*k,p[p.length-1]*k)}
    ctx.stroke();
  }
}
const content=m=>m.kind==="doodle"?doodleSVG(m.doodle):esc(m.body);

function applyTheme(){
  const c=PAL[prefs.theme]||PAL.butter,r=document.documentElement.style;
  for(const k of ["bg","card","ink","soft","accent","doodle"])r.setProperty("--"+k,c[k]);
  document.documentElement.lang=isAr()?"ar":"en";
  document.documentElement.dir=isAr()?"rtl":"ltr";
  const meta=document.querySelector('meta[name="theme-color"]');if(meta)meta.setAttribute("content",c.bg);
}
function errCode(e){const m=(e&&(e.message||e.error_description||""))||"";
  for(const k of ["invalid_code","pair_full","own_code","already_paired","not_signed_in"])if(m.includes(k))return k;
  return /fetch|network|Failed/i.test(m)?"network":"other"}

/* ================= data ================= */
async function loadAll(){
  if(!myId)return;
  try{
    const [st,prof,mem]=await Promise.all([
      sb.rpc("my_status"),
      sb.from("profiles").select("user_id,display_name"),
      sb.from("pair_members").select("user_id")
    ]);
    if(st.error)throw st.error;
    online=true;
    status=st.data||{state:"unpaired"};
    const profs=prof.data||[];
    myName=(profs.find(p=>p.user_id===myId)||{}).display_name||"";
    partnerId=((mem.data||[]).find(m=>m.user_id!==myId)||{}).user_id||null;
    partnerName=(profs.find(p=>p.user_id===partnerId)||{}).display_name||"";
    if(paired()){
      const r=await sb.from("messages").select("id,sender_id,kind,body,doodle,created_at").order("created_at",{ascending:false}).limit(150);
      if(!r.error)setMessages(r.data||[]);
    }else{msgs=[];lastPartnerMsgId=null}
  }catch(e){online=false}
  booted=true;render();
}
function setMessages(list){
  msgs=list;
  const latest=msgs.find(m=>m.sender_id===partnerId);
  if(lastPartnerMsgId!==null&&latest&&latest.id!==lastPartnerMsgId)fresh=true;
  lastPartnerMsgId=latest?latest.id:(lastPartnerMsgId===null?"":lastPartnerMsgId);
}
function subscribe(){
  if(channel)sb.removeChannel(channel);
  channel=sb.channel("lw-"+myId)
    .on("postgres_changes",{event:"INSERT",schema:"public",table:"messages"},payload=>{
      const m=payload.new;if(!m||msgs.some(x=>x.id===m.id))return;
      setMessages([m,...msgs]);render();
    })
    .on("postgres_changes",{event:"*",schema:"public",table:"pair_members"},()=>loadAll())
    .subscribe(s=>{online=(s==="SUBSCRIBED")||online;if(s==="SUBSCRIBED")render()});
}
// safety net: refresh when the app comes back to the screen, and every 20 s while open
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")loadAll()});
setInterval(()=>{if(document.visibilityState==="visible"&&myId)loadAll()},20000);

/* ================= screens ================= */
function topBar(){
  return `<div class="top"><h1 class="brand">${heart(PAL[prefs.theme].doodle)}${t("appName")}</h1>
    <div class="row">${myId?`<span class="live ${online?"":"off"}"><i></i>${t("live")}</span>`:""}
    <button class="icon" data-act="settings" aria-label="${t("settings")}">⚙︎</button></div></div>`;
}
function langChips(){return `<div class="chips">${DIALECTS.map(([k,n])=>`<button class="chip ${prefs.dialect===k?"on":""}" data-dialect="${k}">${n}</button>`).join("")}</div>`}

function render(){
  applyTheme();
  const app=document.getElementById("app");
  const active=document.activeElement&&document.activeElement.id;
  let html;
  if(!booted)html=topBar()+`<div class="notice">${t("loading")}</div>`;
  else if(!session)html=topBar()+authHTML();
  else{
    const step=!myName?"name":!paired()?"connect":!prefs.nickDone[partnerId]?"nick":null;
    html=topBar()+(step?setupHTML(step):homeHTML());
  }
  app.innerHTML=html;
  if(active){const el=document.getElementById(active);if(el&&el.tagName==="INPUT"){el.focus();try{const n=el.value.length;el.setSelectionRange(n,n)}catch(_){}}}
  fresh=false;
}

function authHTML(){
  const su=auth.mode==="signup";
  return `<div class="wiz">${langChips()}
    <h2 class="wiz-t">${t("authT")}</h2><p class="wiz-b">${t("authB")}</p>
    <div class="seg"><button class="${su?"on":""}" data-auth="signup">${t("signupTab")}</button><button class="${su?"":"on"}" data-auth="login">${t("loginTab")}</button></div>
    <form id="lw-authform" class="wiz" style="padding:0;background:none" novalidate>
      <label class="lbl" for="lw-email">${t("email")}</label>
      <input class="field ltr" id="lw-email" type="email" autocomplete="email" inputmode="email" value="${esc(auth.email)}">
      <label class="lbl" for="lw-pass">${t("password")}</label>
      <input class="field ltr" id="lw-pass" type="password" autocomplete="${su?"new-password":"current-password"}" value="${esc(auth.password)}">
      ${auth.err?`<span class="err">${auth.err}</span>`:""}
      <button class="btn" type="submit" ${auth.busy?"disabled":""}>${su?t("signupBtn"):t("loginBtn")}</button>
    </form></div>`;
}

function setupHTML(step){
  const n={name:1,connect:2,nick:3}[step];
  const head=`<span class="lbl">${t("step")} ${n} / 3</span>`;
  const err=setup.err?`<span class="err">${setup.err}</span>`:"";
  if(step==="name"){
    const v=setup.nameDraft??"";
    return `<div class="wiz">${head}${langChips()}
      <h2 class="wiz-t">${t("nameT")}</h2><p class="wiz-b">${t("nameB")}</p>
      <input class="field big" id="lw-myname" maxlength="24" autocomplete="nickname" placeholder="${t("namePh")}" value="${esc(v)}">
      ${err}<button class="btn" data-act="saveName" ${v.trim()&&!setup.busy?"":"disabled"}>${t("next")}</button></div>`;
  }
  if(step==="connect"){
    let body;
    if(status.state==="waiting"&&status.invite_code){
      body=`<div class="codecard"><span class="wiz-b">${t("yourCode")}</span><div class="code" id="lw-code">${esc(status.invite_code)}</div>
        <button class="btn sm" data-act="copyCode">${setup.copied?t("copied"):t("copy")}</button>
        <span class="small">⏳ ${t("waitingFor")}</span>
        <button class="link" data-act="makeCode">${t("newCode")}</button></div>
        <div class="dots"><i></i><i></i><i></i></div>
        <p class="wiz-b"><b>${t("haveCode")}</b></p>${codeInput()}`;
    }else{
      body=`<button class="btn" data-act="makeCode" ${setup.busy?"disabled":""}>${t("createCode")}</button>
        <div class="dots"><i></i><i></i><i></i></div>
        <p class="wiz-b"><b>${t("haveCode")}</b></p>${codeInput()}`;
    }
    return `<div class="wiz">${head}<h2 class="wiz-t">${t("connectT")}</h2><p class="wiz-b">${t("connectB")}</p>${body}${err}</div>`;
  }
  const v=setup.nickDraft??(nickFor(partnerId)||partnerName);
  return `<div class="wiz">${head}<h2 class="wiz-t">${t("nickT")}</h2><p class="wiz-b">${t("nickB")}</p>
    <input class="field big" id="lw-nick" maxlength="24" placeholder="${esc(partnerName||t("partner"))}" value="${esc(v)}">
    <button class="btn" data-act="saveNick">${t("start")}</button></div>`;
}
function codeInput(){
  return `<div class="row"><input class="field codein" id="lw-codein" maxlength="6" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="${t("codePh")}" value="${esc(setup.codeDraft)}">
    <button class="btn sm" data-act="joinCode" ${setup.codeDraft.length===6&&!setup.busy?"":"disabled"}>${t("join")}</button></div>
    ${setup.codeOwner?`<span class="small" id="lw-codeowner">${esc(t("codeFrom").replace("{name}",setup.codeOwner))}</span>`:`<span class="small" id="lw-codeowner"></span>`}`;
}

function homeHTML(){
  const latest=msgs.find(m=>m.sender_id===partnerId);
  const label=partnerLabel();
  const hist=msgs.map(m=>{const mine=m.sender_id===myId;
    return `<div class="item ${mine?"mine":"theirs"}"><div class="bubble">${content(m)}</div><span class="small">${esc(mine?t("me"):label)} · ${when(m.created_at)}</span></div>`}).join("");
  return `<section class="window${fresh?" fresh":""}" aria-live="polite">
      <div class="row between"><span class="from">${heart(PAL[prefs.theme].doodle)}<span>${t("from")} ${esc(label)}</span></span><span class="small">${latest?when(latest.created_at):""}</span></div>
      <div class="msg">${latest?content(latest):`<span class="empty">${t("noMsgs")}</span>`}</div>
    </section>
    <button class="btn" data-act="compose">✎ ${t("newMessage")}</button>
    ${hist?`<span class="lbl">${t("earlier")}</span><div class="hist">${hist}</div>`:""}`;
}

/* ================= actions ================= */
async function doAuth(){
  const email=auth.email.trim().toLowerCase(),password=auth.password;
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){auth.err=t("errEmail");render();return}
  if(password.length<6){auth.err=t("errPass");render();return}
  auth.busy=true;auth.err="";render();
  try{
    if(auth.mode==="signup"){
      const r=await fetch(SUPABASE_URL+"/functions/v1/signup",{method:"POST",
        headers:{"Content-Type":"application/json",apikey:SUPABASE_KEY,Authorization:"Bearer "+SUPABASE_KEY},
        body:JSON.stringify({email,password})});
      if(r.status===409){auth.err=t("errExists");auth.mode="login";auth.busy=false;render();return}
      if(!r.ok){const j=await r.json().catch(()=>({}));auth.err=j.error==="email"?t("errEmail"):j.error==="password"?t("errPass"):t("saveFail");auth.busy=false;render();return}
    }
    const {error}=await sb.auth.signInWithPassword({email,password});
    if(error){auth.err=t("errLogin");auth.busy=false;render();return}
    auth={mode:"login",email:"",password:"",busy:false,err:""};
  }catch(e){auth.err=t("errNet");auth.busy=false;render()}
}
async function saveName(v){
  v=(v||"").trim().slice(0,24);if(!v)return false;
  setup.busy=true;setup.err="";render();
  const {error}=await sb.from("profiles").upsert({user_id:myId,display_name:v});
  setup.busy=false;
  if(error){setup.err=t("saveFail");render();return false}
  myName=v;setup.nameDraft=null;render();return true;
}
async function makeCode(){
  setup.busy=true;setup.err="";setup.copied=false;render();
  const {error}=await sb.rpc("create_invite");
  setup.busy=false;
  if(error){setup.err=errCode(error)==="already_paired"?t("errAlready"):t("saveFail")}
  await loadAll();
}
async function lookupCodeOwner(code){
  const {data}=await sb.rpc("invite_owner_name",{p_code:code});
  if(setup.codeDraft===code){setup.codeOwner=data||"";const el=document.getElementById("lw-codeowner");if(el)el.textContent=setup.codeOwner?t("codeFrom").replace("{name}",setup.codeOwner):""}
}
async function joinCode(){
  const code=setup.codeDraft;if(code.length!==6)return;
  setup.busy=true;setup.err="";render();
  const {error}=await sb.rpc("join_pair",{p_code:code});
  setup.busy=false;
  if(error){const c=errCode(error);
    setup.err=c==="invalid_code"?t("badCode"):c==="own_code"?t("ownCode"):c==="pair_full"?t("errPairFull"):c==="already_paired"?t("errAlready"):t("saveFail");
    render();return}
  setup.codeDraft="";setup.codeOwner="";
  await loadAll();
}
function saveNick(){
  const el=document.getElementById("lw-nick");const v=(el?el.value:"").trim().slice(0,24);
  if(partnerId){prefs.nick[partnerId]=v;prefs.nickDone[partnerId]=true;savePrefs()}
  setup.nickDraft=undefined;render();
}
async function unpair(){
  await sb.rpc("leave_pair");confirmUnpair=false;closeSheet();await loadAll();
}
async function send(){
  if(!canSend()||!paired())return;
  const row={pair_id:status.pair_id,kind:compose.mode};
  if(compose.mode==="text")row.body=compose.text.trim().slice(0,140);else row.doodle={v:1,s:compose.strokes.map(cleanStroke)};
  compose.busy=true;compose.err="";renderSheet();
  const {data,error}=await sb.from("messages").insert(row).select("id,sender_id,kind,body,doodle,created_at").single();
  compose.busy=false;
  if(error){compose.err=errCode(error)==="network"?t("errNet"):t("sendFail");renderSheet();return}
  if(data&&!msgs.some(x=>x.id===data.id))setMessages([data,...msgs]);
  compose={...compose,text:"",strokes:[],err:""};
  closeSheet();render();
}

/* ================= sheets ================= */
function openSheet(kind){sheet=kind;confirmUnpair=false;renderSheet()}
function closeSheet(){sheet=null;document.getElementById("sheetRoot").innerHTML=""}
function renderSheet(){
  const root=document.getElementById("sheetRoot");
  if(!sheet){root.innerHTML="";return}
  root.innerHTML=`<div class="scrim" data-act="scrim"><div class="sheet" role="dialog" aria-modal="true">${sheet==="compose"?composeHTML():settingsHTML()}</div></div>`;
  bindSheet(root);
}
function canSend(){return !compose.busy&&(compose.mode==="text"?compose.text.trim().length>0:compose.strokes.length>0)}
function composeHTML(){
  const g=prefs.gender==="m"?"m":"f",list=PRESETS[prefs.dialect].filter(x=>x.c===compose.cat);
  return `<div class="sheet-head"><button class="link" data-act="close">${t("cancel")}</button><b>${t("newMessage")}</b>
    <button class="link strong" data-act="send" ${canSend()?"":"disabled"}>${compose.busy?t("sending"):t("send")}</button></div>
  <div class="sheet-body">
    <div class="seg"><button class="${compose.mode==="text"?"on":""}" data-mode="text">${t("textTab")}</button><button class="${compose.mode==="doodle"?"on":""}" data-mode="doodle">${t("doodleTab")}</button></div>
    ${compose.err?`<span class="err">${compose.err}</span>`:""}
    ${compose.mode==="text"?`
      <div style="display:flex;flex-direction:column;gap:4px"><textarea id="lw-text" rows="3" maxlength="140" placeholder="${t("msgPh")}" aria-label="${t("msgPh")}">${esc(compose.text)}</textarea><span class="count" id="lw-count">${compose.text.length}/140</span></div>
      <span class="lbl">${t("quick")}</span>
      <div class="hscroll">${Object.keys(CATS).map(k=>`<button class="chip ${compose.cat===k?"on":""}" data-cat="${k}">${CATS[k][IDX[prefs.dialect]]}</button>`).join("")}</div>
      <div class="presets">${list.map(x=>`<button class="preset" data-preset="${esc(x[g])}">${esc(x[g])}</button>`).join("")}</div>`
    :`<canvas class="pad" id="lw-pad" aria-label="${t("doodleTab")}"></canvas>
      <div class="inks">${INKS.map(c=>`<button class="ink ${compose.ink===c?"on":""}" data-ink="${c}" style="background:${c}" aria-label="${c}"></button>`).join("")}</div>
      <div class="inks"><span class="small">${t("size")}</span>${WIDTHS.map(w=>`<button class="pen ${compose.w===w?"on":""}" data-w="${w}" aria-label="${w}"><i style="width:${Math.round(w/2.2)}px;height:${Math.round(w/2.2)}px;background:${compose.ink}"></i></button>`).join("")}
      <span style="flex:1"></span><button class="icon" data-act="undo" aria-label="${t("undo")}" ${compose.strokes.length?"":"disabled"}>↶</button><button class="icon" data-act="clear" aria-label="${t("clear")}" ${compose.strokes.length?"":"disabled"}>🗑</button></div>`}
  </div>`;
}
function settingsHTML(){
  return `<div class="sheet-head"><span style="width:50px"></span><b>${t("settings")}</b><button class="link strong" data-act="close">${t("done")}</button></div>
  <div class="sheet-body">
    <span class="lbl">${t("language")}</span>${langChips()}
    ${isAr()?`<span class="lbl">${t("partnerIs")}</span><div class="chips"><button class="chip ${prefs.gender==="m"?"on":""}" data-gender="m">${t("he")}</button><button class="chip ${prefs.gender==="f"?"on":""}" data-gender="f">${t("she")}</button></div>`:""}
    ${myId&&myName?`<label class="lbl" for="lw-set-myname">${t("yourNameS")}</label>
    <div class="row"><input class="field" id="lw-set-myname" maxlength="24" value="${esc(myName)}"><button class="btn sm" data-act="saveMyName">${t("done")}</button></div>`:""}
    ${partnerId?`<label class="lbl" for="lw-set-nick">${t("nickS")}</label>
    <input class="field" id="lw-set-nick" maxlength="24" placeholder="${esc(partnerName||t("partner"))}" value="${esc(nickFor(partnerId))}">`:""}
    <span class="lbl">${t("colors")}</span>
    <div class="swatches">${Object.keys(PAL).map(k=>`<button class="sw ${prefs.theme===k?"on":""}" data-theme-pick="${k}"><i style="background:${PAL[k].bg};--dot:${PAL[k].accent}"></i>${THEME_NAME[k][isAr()?0:1]}</button>`).join("")}</div>
    <span class="small">${t("langHint")}</span>
    <div class="notice"><b>${t("homeTitle")}</b><ol class="steps"><li>${t("home1")}</li><li>${t("home2")}</li><li>${t("home3")}</li></ol><span class="small">${t("homeNote")}</span></div>
    ${paired()?(confirmUnpair?`<div class="notice">${t("unpairQ")}<div class="row" style="margin-top:10px"><button class="btn sm danger" data-act="doUnpair">${t("yes")}</button><button class="link" data-act="noUnpair">${t("cancel")}</button></div></div>`
      :`<button class="link" data-act="askUnpair">${t("unpair")}</button>`):""}
    ${session?`<button class="link" data-act="logout">${t("logout")}</button>`:""}
  </div>`;
}
function bindSheet(root){
  root.querySelector(".scrim").onclick=e=>{if(e.target.dataset.act==="scrim")closeSheet()};
  root.querySelector(".sheet").onclick=async e=>{
    const b=e.target.closest("button");if(!b)return;const d=b.dataset;
    if(d.act==="close")closeSheet();
    else if(d.act==="send")send();
    else if(d.act==="undo"){compose.strokes.pop();renderSheet()}
    else if(d.act==="clear"){compose.strokes=[];renderSheet()}
    else if(d.act==="askUnpair"){confirmUnpair=true;renderSheet()}
    else if(d.act==="noUnpair"){confirmUnpair=false;renderSheet()}
    else if(d.act==="doUnpair")unpair();
    else if(d.act==="logout"){closeSheet();await sb.auth.signOut()}
    else if(d.act==="saveMyName"){if(await saveName(root.querySelector("#lw-set-myname").value))closeSheet()}
    else if(d.mode){compose.mode=d.mode;compose.err="";renderSheet()}
    else if(d.cat){compose.cat=d.cat;renderSheet()}
    else if(d.preset!==undefined){compose.text=d.preset;renderSheet()}
    else if(d.ink){compose.ink=d.ink;renderSheet()}
    else if(d.w){compose.w=Number(d.w);renderSheet()}
    else if(d.dialect){prefs.dialect=d.dialect;savePrefs();render();renderSheet()}
    else if(d.gender){prefs.gender=d.gender;savePrefs();render();renderSheet()}
    else if(d.themePick){prefs.theme=d.themePick;savePrefs();render();renderSheet()}
  };
  const ta=root.querySelector("#lw-text");
  if(ta)ta.oninput=()=>{compose.text=ta.value.slice(0,140);root.querySelector("#lw-count").textContent=compose.text.length+"/140";root.querySelector('[data-act="send"]').disabled=!canSend()};
  const nk=root.querySelector("#lw-set-nick");
  if(nk)nk.oninput=()=>{if(partnerId){prefs.nick[partnerId]=nk.value.slice(0,24);savePrefs();render()}};
  const cv=root.querySelector("#lw-pad");
  if(cv)bindCanvas(cv,root);
}

/* drawing: the canvas follows the finger; the page never scrolls while drawing */
function bindCanvas(cv,root){
  const ctx=cv.getContext("2d");
  let size=0,cur=null;
  const redraw=()=>drawOnCanvas(ctx,size,cur?[...compose.strokes,cur]:compose.strokes);
  const fit=()=>{const r=cv.getBoundingClientRect(),dpr=window.devicePixelRatio||1;size=r.width;cv.width=Math.round(r.width*dpr);cv.height=Math.round(r.width*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);redraw()};
  const total=()=>compose.strokes.reduce((a,s)=>a+s.p.length/2,0)+(cur?cur.p.length/2:0);
  const toPt=e=>{const r=cv.getBoundingClientRect();return[Math.round(Math.min(Math.max(e.clientX-r.left,0),r.width)/r.width*1000),Math.round(Math.min(Math.max(e.clientY-r.top,0),r.height)/r.height*1000)]};
  const add=e=>{if(total()>=1500)return;const [x,y]=toPt(e),n=cur.p.length;if(n>=2&&Math.abs(cur.p[n-2]-x)+Math.abs(cur.p[n-1]-y)<3)return;cur.p.push(x,y)};
  const stop=e=>e.preventDefault();
  cv.addEventListener("touchstart",stop,{passive:false});
  cv.addEventListener("touchmove",stop,{passive:false});
  cv.addEventListener("pointerdown",e=>{e.preventDefault();if(total()>=1500)return;try{cv.setPointerCapture(e.pointerId)}catch(_){}
    cur={c:compose.ink,w:compose.w,p:[]};add(e);redraw()});
  cv.addEventListener("pointermove",e=>{if(!cur)return;e.preventDefault();
    const list=(e.getCoalescedEvents&&e.getCoalescedEvents())||[];(list.length?list:[e]).forEach(add);redraw()});
  const end=()=>{if(!cur)return;if(cur.p.length)compose.strokes.push(cur);cur=null;
    const s=root.querySelector('[data-act="send"]');if(s)s.disabled=!canSend();
    root.querySelectorAll('[data-act="undo"],[data-act="clear"]').forEach(b=>b.disabled=!compose.strokes.length);redraw()};
  cv.addEventListener("pointerup",end);cv.addEventListener("pointercancel",end);cv.addEventListener("lostpointercapture",end);
  window.addEventListener("resize",fit);
  requestAnimationFrame(fit);
}

/* ================= main-view events ================= */
const app=document.getElementById("app");
app.addEventListener("click",e=>{
  const b=e.target.closest("button");if(!b)return;const d=b.dataset;
  if(d.act==="settings")openSheet("settings");
  else if(d.act==="compose")openSheet("compose");
  else if(d.act==="saveName")saveName(setup.nameDraft);
  else if(d.act==="makeCode")makeCode();
  else if(d.act==="joinCode")joinCode();
  else if(d.act==="saveNick")saveNick();
  else if(d.act==="copyCode"){const code=status.invite_code;if(!code)return;
    const ok=()=>{setup.copied=true;render()};
    try{navigator.clipboard.writeText(code).then(ok,selectCode)}catch(_){selectCode()}}
  else if(d.auth){auth.mode=d.auth;auth.err="";render()}
  else if(d.dialect){prefs.dialect=d.dialect;savePrefs();render()}
});
function selectCode(){const el=document.getElementById("lw-code");if(!el)return;const r=document.createRange();r.selectNodeContents(el);const s=getSelection();s.removeAllRanges();s.addRange(r)}
app.addEventListener("submit",e=>{if(e.target.id==="lw-authform"){e.preventDefault();doAuth()}});
app.addEventListener("input",e=>{
  const el=e.target;
  if(el.id==="lw-email")auth.email=el.value;
  else if(el.id==="lw-pass")auth.password=el.value;
  else if(el.id==="lw-myname"){setup.nameDraft=el.value;const b=app.querySelector('[data-act="saveName"]');if(b)b.disabled=!el.value.trim()}
  else if(el.id==="lw-codein"){el.value=el.value.toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,6);setup.codeDraft=el.value;setup.err="";setup.codeOwner="";
    const o=document.getElementById("lw-codeowner");if(o)o.textContent="";
    const b=app.querySelector('[data-act="joinCode"]');if(b)b.disabled=el.value.length!==6;
    if(el.value.length===6)lookupCodeOwner(el.value)}
  else if(el.id==="lw-nick")setup.nickDraft=el.value;
});
app.addEventListener("keydown",e=>{
  if(e.key!=="Enter")return;
  if(e.target.id==="lw-myname")saveName(setup.nameDraft);
  else if(e.target.id==="lw-codein"&&setup.codeDraft.length===6)joinCode();
  else if(e.target.id==="lw-nick")saveNick();
});

/* ================= start ================= */
render();
sb.auth.onAuthStateChange((event,s)=>{
  const was=myId;
  session=s;myId=s?s.user.id:null;
  if(!s){booted=true;msgs=[];status={state:"unknown"};myName="";partnerId=null;partnerName="";lastPartnerMsgId=null;
    if(channel){sb.removeChannel(channel);channel=null}render();return}
  if(myId!==was){lastPartnerMsgId=null;setTimeout(()=>{subscribe();loadAll()},0)}
});
