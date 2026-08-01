// Uji mesin klasifikasi terhadap contoh terhitung di docs/07 §4.2.
import pg from 'pg';
const c = new pg.Client({ connectionString: 'postgres://postgres:dev@localhost:55433/agrovision' });
await c.connect();
const crit = async (code) => (await c.query(
  `SELECT lsc.char_code "charCode", lsc.symbol, lsc.is_numeric "isNumeric", lsc.bands
     FROM app.land_suit_criteria lsc JOIN app.crops cr ON cr.id=lsc.crop_id WHERE cr.code=$1
     ORDER BY lsc.sort_order`, [code])).rows;

const ORDER = ['S1','S2','S3','N'], RANK={S1:0,S2:1,S3:2,N:3};
function matchClass(bands, isNum, v){
  if(v===null||v==='')return null;
  for(const cls of ORDER) for(const b of bands){
    if(b.cls!==cls)continue;
    if(b.set){ if(typeof v==='string'&&b.set.includes(v))return cls; }
    else { const n=Number(v); if(Number.isNaN(n))continue;
      if((b.min===null||n>=b.min)&&(b.max===null||n<=b.max))return cls; }
  }
  return 'N';
}
function classify(criteria, params){
  const per=criteria.map(k=>({sym:k.symbol,code:k.charCode,cls:matchClass(k.bands,k.isNumeric,params[k.charCode]??null)}));
  const ass=per.filter(p=>p.cls);
  if(!ass.length)return{overall:null,limiting:[]};
  const worst=ass.reduce((w,p)=>RANK[p.cls]>RANK[w]?p.cls:w,'S1');
  const lim=[...new Set(ass.filter(p=>p.cls===worst).map(p=>p.sym))].sort();
  return{overall:worst,limiting:lim,per:ass.map(p=>`${p.code}=${p.cls}`)};
}

// Contoh §4.2 (durian): subset yang ada di Versi A kami.
const durian = await crit('DURIAN');
const r = classify(durian, {
  temperatur: 27,        // S1 (22-28)
  curah_hujan: 2752,     // S2 (2000-3000)
  drainase: 'agak terhambat', // S2
  tekstur: 'sedang',     // S1
  ktk: 23.75,            // S1 (>16)
  kejenuhan_basa: 43.11, // S1 (>35)
  ph: 6.10,              // S2 (6.0-7.5)
  lereng: 5,             // S1
  batuan_permukaan: 2,   // S1 (rendah)
});
console.log('Hasil durian:', r.overall, '· pembatas:', r.limiting.join(','));
const pass1 = r.overall === 'S2';
const pass2 = r.limiting.includes('wa') && r.limiting.includes('nr') && r.limiting.includes('oa');
console.log(pass1 ? '  PASS kelas = S2 (sesuai dokumen §4.2)' : '  FAIL kelas '+r.overall);
console.log(pass2 ? '  PASS pembatas mencakup wa (hujan), oa (drainase), nr (pH)' : '  FAIL pembatas: '+r.limiting.join(','));

// Uji tambahan: kelapa optimum → S1
const coconut = await crit('COCONUT');
const rc = classify(coconut, {temperatur:26,curah_hujan:2500,drainase:'baik',tekstur:'sedang',
  bahan_kasar:5,kedalaman_tanah:120,ktk:30,ph:6.0,c_organik:1.2,lereng:3,batuan_permukaan:2});
console.log('Hasil kelapa optimum:', rc.overall, rc.overall==='S1'?'  PASS':'  FAIL');

// Uji: nilai ekstrem → N
const rn = classify(coconut, {temperatur:40,curah_hujan:500,lereng:45});
console.log('Hasil kelapa ekstrem:', rn.overall, '· pembatas:', rn.limiting.join(','), rn.overall==='N'?'  PASS':'  FAIL');
await c.end();
