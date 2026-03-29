import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { supabase } from "./supabaseClient";
import Auth from "./Auth";

/* ═══ DEFAULT DATA ═══ */
const DEFAULT_SYSTEMS = {
  solid: { id:"solid", name:"Solid Color Epoxy", description:"Single-color high-build coating. Residential garages and workshops.", retailPerSqft:4.25, coveMatCostPerLf:2.50,
    materials:[
      {id:"s1",name:"Epoxy Primer",unit:"gal",kitSize:1,kitPrice:38,coveragePerUnit:250},
      {id:"s2",name:"Pigmented Epoxy Base Coat",unit:"gal",kitSize:3,kitPrice:186,coveragePerUnit:160},
      {id:"s3",name:"Polyurethane Topcoat",unit:"gal",kitSize:3,kitPrice:255,coveragePerUnit:300},
      {id:"s4",name:"Non-Slip Additive",unit:"lb",kitSize:1,kitPrice:12,coveragePerUnit:500}
    ]},
  metallic: { id:"metallic", name:"Metallic Epoxy", description:"Premium pearlescent metallic finish. Three-dimensional effects.", retailPerSqft:8.5, coveMatCostPerLf:3.00,
    materials:[
      {id:"m1",name:"Epoxy Primer",unit:"gal",kitSize:1,kitPrice:38,coveragePerUnit:250},
      {id:"m2",name:"Metallic Epoxy Base",unit:"gal",kitSize:3,kitPrice:285,coveragePerUnit:120},
      {id:"m3",name:"Metallic Pigment Powder",unit:"oz",kitSize:4,kitPrice:72,coveragePerUnit:80},
      {id:"m4",name:"High-Gloss Clear Topcoat",unit:"gal",kitSize:3,kitPrice:330,coveragePerUnit:250}
    ]},
  flake: { id:"flake", name:"Flake / Chip Epoxy", description:"Decorative vinyl flake broadcast system. Garages and commercial.", retailPerSqft:5.75, coveMatCostPerLf:2.50,
    materials:[
      {id:"f1",name:"Epoxy Primer",unit:"gal",kitSize:1,kitPrice:38,coveragePerUnit:250},
      {id:"f2",name:"Epoxy Base Coat",unit:"gal",kitSize:3,kitPrice:174,coveragePerUnit:160},
      {id:"f3",name:"Vinyl Flakes",unit:"lb",kitSize:25,kitPrice:162.50,coveragePerUnit:20},
      {id:"f4",name:"Polyaspartic Topcoat",unit:"gal",kitSize:3,kitPrice:360,coveragePerUnit:250}
    ]},
  quartz: { id:"quartz", name:"Quartz Broadcast Epoxy", description:"Commercial-grade quartz aggregate. Maximum durability.", retailPerSqft:7.5, coveMatCostPerLf:3.50,
    materials:[
      {id:"q1",name:"Epoxy Primer",unit:"gal",kitSize:1,kitPrice:38,coveragePerUnit:250},
      {id:"q2",name:"Epoxy Binder Coat",unit:"gal",kitSize:3,kitPrice:195,coveragePerUnit:140},
      {id:"q3",name:"Colored Quartz Aggregate",unit:"lb",kitSize:50,kitPrice:212.50,coveragePerUnit:8},
      {id:"q4",name:"Epoxy Grout Coat",unit:"gal",kitSize:3,kitPrice:174,coveragePerUnit:200},
      {id:"q5",name:"Urethane Topcoat",unit:"gal",kitSize:3,kitPrice:276,coveragePerUnit:300}
    ]},
  selflevel: { id:"selflevel", name:"Self-Leveling Epoxy", description:"Smooth seamless poured floor. Commercial and industrial.", retailPerSqft:5.0, coveMatCostPerLf:2.50,
    materials:[
      {id:"sl1",name:"Epoxy Primer",unit:"gal",kitSize:1,kitPrice:38,coveragePerUnit:250},
      {id:"sl2",name:"Self-Leveling Epoxy",unit:"gal",kitSize:3,kitPrice:162,coveragePerUnit:100},
      {id:"sl3",name:"Polyurethane Topcoat",unit:"gal",kitSize:3,kitPrice:255,coveragePerUnit:300}
    ]}
};

const DEFAULT_SETTINGS = {
  selectedId:"flake", sqft:600, wastePercent:10, salesTaxRate:5.3, incomeTaxRate:25,
  retailOverrides:{}, coverageOverrides:{}, excludedMats:{},
  technicians:[{id:"t1",name:"Lead Tech",hourlyRate:35,manHours:8,enabled:true},{id:"t2",name:"Helper",hourlyRate:20,manHours:8,enabled:true}],
  sundries:"", crackFiller:"", misc:"",
  excludeSundries:false, excludeCrackFiller:false, excludeMisc:false,
  coveEnabled:false, coveLinearFt:0, covePricePerLf:0,
  extraCharges:[],
  theme:"dark"
};

const uid = () => Math.random().toString(36).slice(2, 10);
const fmt = (n) => (n == null || isNaN(n) ? 0 : n).toLocaleString("en-US",{style:"currency",currency:"USD"});
const fmtPct = (n) => ((n == null || isNaN(n) ? 0 : n)*100).toFixed(1)+"%";

/* ═══ THEME ═══ */
const DARK = { bg:"#0f1117",card:"#181b24",cardBorder:"#25282f",surface:"#1e212c",surfaceBorder:"#2a2d38",text:"#e2e4e9",textBright:"#f5f5f7",textMuted:"#a0a3b1",textDim:"#6b7084",textFaint:"#4a4d5a",amber:"#f59e0b",amberDark:"#d97706",green:"#10b981",red:"#ef4444",blue:"#3b82f6",scrollThumb:"#2a2d38",headerBg:"linear-gradient(135deg,#14161d,#1a1d28)" };
const LIGHT = { bg:"#f0f1f3",card:"#ffffff",cardBorder:"#e0e2e7",surface:"#f5f6f8",surfaceBorder:"#dcdee4",text:"#2d3040",textBright:"#1a1c28",textMuted:"#5a5e72",textDim:"#8a8ea0",textFaint:"#b0b3c0",amber:"#d97706",amberDark:"#b45309",green:"#059669",red:"#dc2626",blue:"#2563eb",scrollThumb:"#cdd0d8",headerBg:"linear-gradient(135deg,#ffffff,#f5f6f8)" };
const getTheme = (t) => t === "light" ? LIGHT : DARK;

/* ═══ STYLES (dynamic) ═══ */
const mkStyles = (S) => ({
  card: { background:S.card, border:`1px solid ${S.cardBorder}`, borderRadius:14, padding:22 },
  label: { fontSize:11, fontWeight:600, textTransform:"uppercase", letterSpacing:"1.2px", color:S.textDim, marginBottom:14 },
  inputWrap: { display:"flex", alignItems:"center", background:S.surface, border:`1px solid ${S.surfaceBorder}`, borderRadius:8, padding:"8px 12px" },
  inputField: { fontFamily:"'JetBrains Mono'", fontSize:14, fontWeight:500, background:"transparent", border:"none", color:S.text, width:"100%", outline:"none" },
  textInput: { fontFamily:"'DM Sans'", fontSize:14, fontWeight:500, background:"transparent", border:"none", color:S.text, width:"100%", outline:"none" },
  btn: { border:"none", borderRadius:8, cursor:"pointer", fontFamily:"'DM Sans'", fontWeight:600, display:"flex", alignItems:"center", justifyContent:"center", gap:6, transition:"all 0.15s ease" }
});

/* ═══ ICONS ═══ */
const Icon = ({d,size=16,color="currentColor"}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d={d}/></svg>;
const PlusIcon = p=><Icon {...p} d="M12 5v14M5 12h14"/>;
const TrashIcon = p=><Icon {...p} d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>;
const BackIcon = p=><Icon {...p} d="M15 18l-6-6 6-6"/>;
const ChevIcon = p=><Icon {...p} d="M9 18l6-6-6-6"/>;
const CopyIcon = p=><Icon {...p} d="M8 4v12a2 2 0 002 2h8a2 2 0 002-2V8.342a2 2 0 00-.602-1.43l-4.44-4.342A2 2 0 0013.56 2H10a2 2 0 00-2 2zM16 18v2a2 2 0 01-2 2H6a2 2 0 01-2-2V9a2 2 0 012-2h2"/>;
const ResetIcon = p=><Icon {...p} d="M1 4v6h6M23 20v-6h-6M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15"/>;
const SaveIcon = p=><Icon {...p} d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2zM17 21v-8H7v8M7 3v5h8"/>;
const SunIcon = p=><Icon {...p} d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42M12 6a6 6 0 100 12 6 6 0 000-12z"/>;
const MoonIcon = p=><Icon {...p} d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>;
const FolderIcon = p=><Icon {...p} d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>;
const ListIcon = p=><Icon {...p} d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>;

const Checkbox = ({checked,onChange,color,S:th}) => {
  const c = color||th.amber;
  return <div onClick={onChange} style={{width:18,height:18,borderRadius:4,cursor:"pointer",border:checked?`1.5px solid ${c}`:`1.5px solid ${th.surfaceBorder}`,background:checked?`${c}22`:"transparent",display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.15s ease",flexShrink:0}}>{checked&&<svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}</div>;
};

function Field({label,value,onChange,prefix,suffix,step,placeholder,type="number",wide,highlight,S:th}) {
  const st = mkStyles(th);
  const isH = highlight && value !== "" && value !== undefined;
  return <div style={{flex:wide?2:1}}>
    {label&&<div style={{fontSize:10,fontWeight:600,color:isH?th.amber:th.textDim,textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:6}}>{label}{isH?" ●":""}</div>}
    <div style={{...st.inputWrap,border:isH?`1.5px solid ${th.amber}`:`1px solid ${th.surfaceBorder}`,background:isH?`${th.amber}0c`:th.surface}}>
      {prefix&&<span style={{color:isH?th.amber:th.textFaint,fontSize:13,marginRight:4}}>{prefix}</span>}
      <input type={type} value={value} placeholder={placeholder} onChange={e=>type==="text"?onChange(e.target.value):onChange(e.target.value===""?"":parseFloat(e.target.value)||0)} step={step} style={{...(type==="text"?st.textInput:st.inputField),color:isH?th.amber:th.text}} />
      {suffix&&<span style={{color:isH?`${th.amber}99`:th.textFaint,fontSize:10,whiteSpace:"nowrap",marginLeft:4}}>{suffix}</span>}
    </div>
  </div>;
}

function CostRow({label,value,onChangeVal,excluded,onToggle,colSpan,S:th}) {
  const st = mkStyles(th);
  return <tr style={{borderBottom:`1px solid ${th.surface}`,opacity:excluded?0.35:1,transition:"opacity 0.2s"}}>
    <td style={{padding:"11px 4px",textAlign:"center"}}><Checkbox checked={!excluded} onChange={onToggle} S={th}/></td>
    <td style={{padding:"11px 6px",fontSize:13,fontWeight:500,color:excluded?th.textFaint:th.textMuted,textDecoration:excluded?"line-through":"none"}}>{label}</td>
    <td colSpan={colSpan||4} style={{padding:"5px 6px",textAlign:"right"}}>
      <div style={{display:"inline-flex",alignItems:"center",background:th.surface,border:`1px solid ${th.surfaceBorder}`,borderRadius:6,padding:"4px 8px",maxWidth:130}}>
        <span style={{color:th.textFaint,fontSize:12,marginRight:3}}>$</span>
        <input type="number" value={value} onChange={e=>onChangeVal(e.target.value)} style={{...st.inputField,fontSize:13,width:70,textAlign:"right"}} step={5} placeholder="0"/>
      </div>
    </td>
    <td style={{padding:"11px 6px",textAlign:"right",fontFamily:"'JetBrains Mono'",fontSize:13,fontWeight:600,color:excluded?th.textFaint:th.textBright}}>{excluded?"—":fmt(parseFloat(value)||0)}</td>
  </tr>;
}

/* ═══ DEBOUNCED SAVE HOOK ═══ */
function useDebouncedSave(table,userId,data,ready,delay=1200) {
  const timer=useRef(null); const [s,setS]=useState("saved");
  useEffect(()=>{if(!ready||!userId)return;setS("saving");if(timer.current)clearTimeout(timer.current);timer.current=setTimeout(async()=>{try{const{error}=await supabase.from(table).upsert({user_id:userId,data},{onConflict:"user_id"});if(error)throw error;setS("saved");}catch(e){console.error(`Save ${table}:`,e);setS("error");}},delay);return()=>{if(timer.current)clearTimeout(timer.current);};},[data,userId,ready,table,delay]);
  return s;
}
function SyncDot({status,S:th}){const c=status==="saved"?th.green:status==="saving"?th.amber:th.red;const l=status==="saved"?"Saved":status==="saving"?"Saving...":"Error";return<div style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:th.textDim}}><div style={{width:6,height:6,borderRadius:3,background:c,transition:"background 0.3s"}}/>{l}</div>;}

/* ═══ SYSTEM EDITOR ═══ */
function SystemEditor({system,allSystems,onSave,onCancel,onDelete,isNew,S:th}) {
  const st=mkStyles(th);
  const[form,setForm]=useState(()=>JSON.parse(JSON.stringify(system)));
  const[showPicker,setShowPicker]=useState(false);
  const[pickerSearch,setPickerSearch]=useState("");
  const up=(k,v)=>setForm(f=>({...f,[k]:v}));
  const upMat=(i,k,v)=>setForm(f=>{const m=[...f.materials];m[i]={...m[i],[k]:v};return{...f,materials:m};});
  const addMat=(template)=>{
    const newMat=template?{...template,id:uid()}:{id:uid(),name:"",unit:"gal",kitSize:1,kitPrice:0,coveragePerUnit:200};
    setForm(f=>({...f,materials:[...f.materials,newMat]}));
    setShowPicker(false);setPickerSearch("");
  };
  const rmMat=i=>setForm(f=>({...f,materials:f.materials.filter((_,j)=>j!==i)}));

  // Build catalog from all materials across all systems (deduped by name)
  const catalog=useMemo(()=>{
    const seen=new Map();
    Object.values(allSystems||{}).forEach(sys=>{
      (sys.materials||[]).forEach(m=>{
        if(m.name&&!seen.has(m.name.toLowerCase())){
          seen.set(m.name.toLowerCase(),{name:m.name,unit:m.unit,kitSize:m.kitSize||1,kitPrice:m.kitPrice||0,coveragePerUnit:m.coveragePerUnit||200});
        }
      });
    });
    // Also include materials from the form being edited
    (form.materials||[]).forEach(m=>{
      if(m.name&&!seen.has(m.name.toLowerCase())){
        seen.set(m.name.toLowerCase(),{name:m.name,unit:m.unit,kitSize:m.kitSize||1,kitPrice:m.kitPrice||0,coveragePerUnit:m.coveragePerUnit||200});
      }
    });
    return Array.from(seen.values()).sort((a,b)=>a.name.localeCompare(b.name));
  },[allSystems,form.materials]);

  const filteredCatalog=pickerSearch?catalog.filter(m=>m.name.toLowerCase().includes(pickerSearch.toLowerCase())):catalog;

  return <div style={{animation:"fadeIn 0.2s ease"}}>
    <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:24,flexWrap:"wrap"}}>
      <button onClick={onCancel} style={{...st.btn,background:th.surface,color:th.textMuted,padding:"8px 14px",fontSize:13}}><BackIcon size={14}/> Back</button>
      <h2 style={{fontSize:18,fontWeight:700,color:th.textBright,flex:1,minWidth:150}}>{isNew?"New Epoxy System":`Edit: ${system.name}`}</h2>
      {!isNew&&<button onClick={()=>{if(confirm("Delete?"))onDelete(form.id);}} style={{...st.btn,background:`${th.red}15`,color:th.red,padding:"8px 14px",fontSize:12,border:`1px solid ${th.red}40`}}><TrashIcon size={13}/> Delete</button>}
    </div>
    <div style={{...st.card,marginBottom:16}}>
      <div style={st.label}>System Details</div>
      <div className="grid-2col-fields" style={{marginBottom:14}}><Field label="System Name" value={form.name} onChange={v=>up("name",v)} type="text" wide S={th}/><Field label="Retail Price" value={form.retailPerSqft} onChange={v=>up("retailPerSqft",v)} prefix="$" suffix="/sqft" step={0.25} S={th}/></div>
      <Field label="Description" value={form.description} onChange={v=>up("description",v)} type="text" S={th}/>
      <div style={{marginTop:14}}><Field label="Cove Base Material Cost" value={form.coveMatCostPerLf||0} onChange={v=>up("coveMatCostPerLf",v)} prefix="$" suffix="/ lin ft" step={0.25} S={th}/></div>
    </div>
    <div style={st.card}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:8}}>
        <div style={{...st.label,marginBottom:0}}>Materials ({form.materials.length})</div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={()=>setShowPicker(true)} style={{...st.btn,background:`${th.blue}15`,color:th.blue,padding:"6px 14px",fontSize:12,border:`1px solid ${th.blue}40`}}><PlusIcon size={13}/> Add Material</button>
        </div>
      </div>

      {/* Material Picker Modal */}
      {showPicker&&<div style={{background:th.surface,border:`1px solid ${th.amber}44`,borderRadius:12,padding:16,marginBottom:16,animation:"fadeIn 0.15s ease"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <div style={{fontSize:13,fontWeight:600,color:th.textBright}}>Choose a material or create new</div>
          <button onClick={()=>{setShowPicker(false);setPickerSearch("");}} style={{...st.btn,background:"transparent",color:th.textDim,padding:4,fontSize:18,lineHeight:1}}>×</button>
        </div>
        <div style={{...st.inputWrap,marginBottom:12}}>
          <input type="text" value={pickerSearch} onChange={e=>setPickerSearch(e.target.value)} placeholder="Search materials..." style={{...st.textInput,fontSize:13}} autoFocus/>
        </div>
        <div style={{maxHeight:240,overflowY:"auto",marginBottom:12}}>
          {filteredCatalog.length===0&&pickerSearch&&<div style={{padding:"12px 0",fontSize:12,color:th.textDim,textAlign:"center"}}>No matches found</div>}
          {filteredCatalog.map((m,i)=><div key={i} onClick={()=>addMat(m)} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 12px",borderRadius:8,cursor:"pointer",marginBottom:2,transition:"background 0.1s",background:"transparent"}} onMouseEnter={e=>e.currentTarget.style.background=`${th.amber}12`} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
            <div>
              <div style={{fontSize:13,fontWeight:500,color:th.textBright}}>{m.name}</div>
              <div style={{fontSize:10,color:th.textDim,marginTop:2}}>{m.kitSize} {m.unit} kit @ {fmt(m.kitPrice)} · {m.coveragePerUnit} sqft/unit</div>
            </div>
            <div style={{fontSize:11,color:th.amber,fontWeight:600,flexShrink:0}}>+ Add</div>
          </div>)}
        </div>
        <button onClick={()=>addMat(pickerSearch?{name:pickerSearch,unit:"gal",kitSize:1,kitPrice:0,coveragePerUnit:200}:null)} style={{...st.btn,background:`${th.amber}15`,color:th.amber,padding:"10px 16px",fontSize:12,border:`1px solid ${th.amber}40`,width:"100%"}}>
          <PlusIcon size={13}/> {pickerSearch?`Create "${pickerSearch}" as new material`:"Create blank material"}
        </button>
      </div>}

      {form.materials.length===0&&!showPicker&&<div style={{textAlign:"center",padding:32,color:th.textDim,fontSize:13}}>No materials yet. Click "Add Material" to begin.</div>}
      {form.materials.map((mat,idx)=>
        <div key={mat.id} style={{background:th.surface,border:`1px solid ${th.surfaceBorder}`,borderRadius:10,padding:16,marginBottom:10}}>
          <div className="mat-editor-row" style={{display:"flex",gap:12,alignItems:"flex-end",flexWrap:"wrap"}}>
            <div style={{flex:"2 1 180px"}}><Field label="Product Name" value={mat.name} onChange={v=>upMat(idx,"name",v)} type="text" S={th}/></div>
            <div style={{flex:"0 1 80px"}}>
              <div style={{fontSize:10,fontWeight:600,color:th.textDim,textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:6}}>Unit</div>
              <select value={mat.unit} onChange={e=>upMat(idx,"unit",e.target.value)} style={{...st.inputWrap,...st.inputField,padding:"8px 12px",width:"100%",appearance:"none",cursor:"pointer",fontSize:13}}>
                {["gal","lb","oz","qt","each","bag","box","tube","roll","sq ft"].map(u=><option key={u} value={u} style={{background:th.card}}>{u}</option>)}
              </select>
            </div>
            <div style={{flex:"1 1 90px"}}><Field label="Kit Size" value={mat.kitSize} onChange={v=>upMat(idx,"kitSize",v)} suffix={mat.unit} step={1} S={th}/></div>
            <div style={{flex:"1 1 100px"}}><Field label="Kit Price" value={mat.kitPrice} onChange={v=>upMat(idx,"kitPrice",v)} prefix="$" step={5} S={th}/></div>
            <div style={{flex:"1 1 100px"}}><Field label="Coverage/Unit" value={mat.coveragePerUnit} onChange={v=>upMat(idx,"coveragePerUnit",v)} suffix="sqft" step={10} S={th}/></div>
            <button onClick={()=>rmMat(idx)} style={{...st.btn,background:`${th.red}12`,color:"#f87171",padding:8,border:`1px solid ${th.red}25`,flexShrink:0,marginBottom:1}}><TrashIcon size={14}/></button>
          </div>
          <div style={{fontSize:11,color:th.textDim,marginTop:8}}>Unit cost: {fmt(mat.kitSize>0?mat.kitPrice/mat.kitSize:0)} / {mat.unit}</div>
        </div>
      )}
    </div>
    <div style={{display:"flex",justifyContent:"flex-end",gap:10,marginTop:20,flexWrap:"wrap"}}>
      <button onClick={onCancel} style={{...st.btn,background:th.surface,color:th.textMuted,padding:"12px 24px",fontSize:14,border:`1px solid ${th.surfaceBorder}`}}>Cancel</button>
      <button onClick={()=>{if(form.name.trim())onSave(form);}} disabled={!form.name.trim()} style={{...st.btn,background:`linear-gradient(135deg,${th.amber},${th.amberDark})`,color:th.bg,padding:"12px 28px",fontSize:14,opacity:form.name.trim()?1:0.4}}>{isNew?"Create System":"Save Changes"}</button>
    </div>
  </div>;
}

/* ═══ SYSTEM MANAGER ═══ */
function SystemManager({systems,setSystems,S:th}) {
  const st=mkStyles(th);
  const[editing,setEditing]=useState(null);const[isNew,setIsNew]=useState(false);
  const sysList=Object.values(systems);
  const handleSave=f=>{setSystems(p=>({...p,[f.id]:f}));setEditing(null);setIsNew(false);};
  const handleDelete=id=>{setSystems(p=>{const n={...p};delete n[id];return n;});setEditing(null);};
  const handleNew=()=>{setEditing({id:uid(),name:"",description:"",retailPerSqft:5,coveMatCostPerLf:2.5,materials:[]});setIsNew(true);};
  const handleDup=sys=>{const d={...JSON.parse(JSON.stringify(sys)),id:uid(),name:sys.name+" (Copy)",materials:sys.materials.map(m=>({...m,id:uid()}))};setSystems(p=>({...p,[d.id]:d}));};
  const handleReset=()=>{if(confirm("Reset all systems to defaults?"))setSystems(DEFAULT_SYSTEMS);};
  if(editing)return<SystemEditor system={editing} allSystems={systems} onSave={handleSave} onCancel={()=>{setEditing(null);setIsNew(false);}} onDelete={handleDelete} isNew={isNew} S={th}/>;
  return <div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20,flexWrap:"wrap",gap:10}}>
      <div><h2 style={{fontSize:18,fontWeight:700,color:th.textBright}}>Epoxy Systems</h2><p style={{fontSize:12,color:th.textDim,marginTop:4}}>{sysList.length} system{sysList.length!==1?"s":""} — edit materials, pricing, kit sizes</p></div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        <button onClick={handleReset} style={{...st.btn,background:th.surface,color:th.textDim,padding:"10px 16px",fontSize:12,border:`1px solid ${th.surfaceBorder}`}}><ResetIcon size={13}/> Reset</button>
        <button onClick={handleNew} style={{...st.btn,background:`linear-gradient(135deg,${th.amber},${th.amberDark})`,color:th.bg,padding:"10px 20px",fontSize:13}}><PlusIcon size={14}/> New System</button>
      </div>
    </div>
    {sysList.map(sys=><div key={sys.id} onClick={()=>{setEditing(sys);setIsNew(false);}} style={{...st.card,marginBottom:12,display:"flex",alignItems:"center",gap:16,cursor:"pointer",transition:"border-color 0.15s"}} onMouseEnter={e=>e.currentTarget.style.borderColor=th.amber} onMouseLeave={e=>e.currentTarget.style.borderColor=th.cardBorder}>
      <div style={{width:44,height:44,borderRadius:10,background:`${th.amber}18`,border:`1px solid ${th.amber}33`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,fontWeight:700,color:th.amber,flexShrink:0}}>{sys.name.charAt(0)}</div>
      <div style={{flex:1,minWidth:0}}><div style={{fontSize:15,fontWeight:600,color:th.textBright}}>{sys.name}</div><div style={{fontSize:12,color:th.textDim,marginTop:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{sys.description||"No description"}</div></div>
      <div style={{textAlign:"right",flexShrink:0}}><div style={{fontFamily:"'JetBrains Mono'",fontSize:15,fontWeight:600,color:th.textBright}}>{fmt(sys.retailPerSqft)}<span style={{fontSize:10,color:th.textDim}}>/sqft</span></div><div style={{fontSize:11,color:th.textDim,marginTop:2}}>{sys.materials.length} materials</div></div>
      <div style={{display:"flex",gap:6,flexShrink:0}}>
        <button onClick={e=>{e.stopPropagation();handleDup(sys);}} title="Duplicate" style={{...st.btn,background:th.surface,color:th.textDim,padding:8,border:`1px solid ${th.surfaceBorder}`}}><CopyIcon size={14}/></button>
        <div style={{color:th.textFaint,display:"flex",alignItems:"center"}}><ChevIcon size={16}/></div>
      </div>
    </div>)}
  </div>;
}

/* ═══ SAVED ESTIMATES ═══ */
function SavedEstimates({userId,onLoad,S:th}) {
  const st=mkStyles(th);
  const[estimates,setEstimates]=useState([]);const[loading,setLoading]=useState(true);
  const load=useCallback(async()=>{if(!userId)return;const{data}=await supabase.from("saved_estimates").select("*").eq("user_id",userId).order("created_at",{ascending:false});if(data)setEstimates(data);setLoading(false);},[userId]);
  useEffect(()=>{load();},[load]);
  const handleDelete=async(id)=>{if(!confirm("Delete this saved estimate?"))return;await supabase.from("saved_estimates").delete().eq("id",id);load();};
  return <div>
    <div style={st.label}>Saved Estimates ({estimates.length})</div>
    {loading&&<div style={{color:th.textDim,fontSize:13,padding:20,textAlign:"center"}}>Loading...</div>}
    {!loading&&estimates.length===0&&<div style={{...st.card,textAlign:"center",padding:32,color:th.textDim,fontSize:13}}>No saved estimates yet. Save one from the Estimator tab.</div>}
    {estimates.map(est=><div key={est.id} style={{...st.card,marginBottom:10,display:"flex",alignItems:"center",gap:14,flexWrap:"wrap"}}>
      <div style={{flex:1,minWidth:150}}>
        <div style={{fontSize:14,fontWeight:600,color:th.textBright}}>{est.name}</div>
        {est.customer_name&&<div style={{fontSize:12,color:th.textDim,marginTop:2}}>{est.customer_name}</div>}
        <div style={{fontSize:11,color:th.textFaint,marginTop:4}}>{new Date(est.created_at).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric",hour:"numeric",minute:"2-digit"})}</div>
      </div>
      <div style={{display:"flex",gap:8}}>
        <button onClick={()=>onLoad(est)} style={{...st.btn,background:`${th.blue}15`,color:th.blue,padding:"8px 16px",fontSize:12,border:`1px solid ${th.blue}40`}}><FolderIcon size={13}/> Load</button>
        <button onClick={()=>handleDelete(est.id)} style={{...st.btn,background:`${th.red}12`,color:th.red,padding:"8px 12px",fontSize:12,border:`1px solid ${th.red}30`}}><TrashIcon size={13}/></button>
      </div>
    </div>)}
  </div>;
}

/* ═══ FINANCIAL FORECAST ═══ */
function FinancialForecast({userId,S:th}) {
  const st=mkStyles(th);
  const[estimates,setEstimates]=useState([]);const[loading,setLoading]=useState(true);
  const[selected,setSelected]=useState({});
  useEffect(()=>{if(!userId)return;(async()=>{const{data}=await supabase.from("saved_estimates").select("*").eq("user_id",userId).order("created_at",{ascending:false});if(data)setEstimates(data);setLoading(false);})();},[userId]);

  const toggleEst=(id)=>setSelected(p=>({...p,[id]:!p[id]}));
  const selectAll=()=>{const allOn=estimates.every(e=>selected[e.id]);const next={};estimates.forEach(e=>{next[e.id]=!allOn;});setSelected(next);};

  // Calculate net profit for each estimate from its saved settings
  const getNetProfit=(est)=>{
    try{
      const s=est.settings_data||{};const sys=(est.systems_data||{})[s.selectedId];
      if(!sys)return 0;
      const wm=1+(s.wastePercent||0)/100;
      const matCost=sys.materials.reduce((sum,m)=>{
        const key=`${s.selectedId}::${m.id}`;
        if(s.excludedMats?.[key])return sum;
        const cov=(s.coverageOverrides||{})[key];
        const effCov=(cov&&parseFloat(cov)>0)?parseFloat(cov):(m.coveragePerUnit||200);
        const ks=m.kitSize||1;const kp=m.kitPrice||(m.costPerUnit?m.costPerUnit*ks:0);
        const uc=ks>0?kp/ks:(m.costPerUnit||0);
        return sum+((s.sqft||0)/effCov)*wm*uc;
      },0);
      const extras=(parseFloat(s.sundries)||0)+(parseFloat(s.crackFiller)||0)+(parseFloat(s.misc)||0);
      const coveMat=s.coveEnabled?(parseFloat(s.coveLinearFt)||0)*(sys.coveMatCostPerLf||0):0;
      const totalMat=matCost+extras+coveMat;
      const labor=(s.technicians||[]).reduce((sum,t)=>sum+(t.enabled?t.hourlyRate*t.manHours:0),0);
      const totalCost=totalMat+labor;
      const ro=s.retailOverrides?.[s.selectedId];
      const er=(ro!==""&&ro!==undefined)?parseFloat(ro):sys.retailPerSqft;
      const floorRev=(s.sqft||0)*(er||0);
      const coveRev=s.coveEnabled?(parseFloat(s.coveLinearFt)||0)*(parseFloat(s.covePricePerLf)||0):0;
      const ecRev=(s.extraCharges||[]).reduce((sum,c)=>sum+(c.enabled?(parseFloat(c.amount)||0):0),0);
      const totalRev=floorRev+coveRev+ecRev;
      const gp=totalRev-totalCost;
      const tax=gp>0?gp*((s.incomeTaxRate||0)/100):0;
      return gp-tax;
    }catch{return 0;}
  };

  const selectedEstimates=estimates.filter(e=>selected[e.id]);
  const totalNetProfit=selectedEstimates.reduce((s,e)=>s+getNetProfit(e),0);
  const totalRevenue=selectedEstimates.reduce((s,e)=>{
    try{const st=e.settings_data||{};const sys=(e.systems_data||{})[st.selectedId];if(!sys)return s;const ro=st.retailOverrides?.[st.selectedId];const er=(ro!==""&&ro!==undefined)?parseFloat(ro):sys.retailPerSqft;const fr=(st.sqft||0)*(er||0);const cr=st.coveEnabled?(parseFloat(st.coveLinearFt)||0)*(parseFloat(st.covePricePerLf)||0):0;const ec=(st.extraCharges||[]).reduce((a,c)=>a+(c.enabled?(parseFloat(c.amount)||0):0),0);return s+fr+cr+ec;}catch{return s;}
  },0);

  return <div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20,flexWrap:"wrap",gap:10}}>
      <div><h2 style={{fontSize:18,fontWeight:700,color:th.textBright}}>Financial Forecast</h2><p style={{fontSize:12,color:th.textDim,marginTop:4}}>Select estimates to forecast profitability</p></div>
      <button onClick={selectAll} style={{...st.btn,background:th.surface,color:th.textMuted,padding:"8px 16px",fontSize:12,border:`1px solid ${th.surfaceBorder}`}}>{estimates.every(e=>selected[e.id])&&estimates.length>0?"Deselect All":"Select All"}</button>
    </div>

    {/* Summary cards */}
    <div className="grid-2col" style={{marginBottom:24}}>
      <div style={{...st.card,background:`${th.green}0a`,border:`1px solid ${th.green}33`}}>
        <div style={{fontSize:10,fontWeight:600,color:th.green,textTransform:"uppercase",letterSpacing:"1px",marginBottom:8}}>Forecasted Net Profit</div>
        <div style={{fontFamily:"'JetBrains Mono'",fontSize:32,fontWeight:800,color:totalNetProfit>=0?th.green:th.red}}>{fmt(totalNetProfit)}</div>
        <div style={{fontSize:12,color:th.textDim,marginTop:6}}>{selectedEstimates.length} of {estimates.length} estimate{estimates.length!==1?"s":""} selected</div>
      </div>
      <div style={st.card}>
        <div style={{fontSize:10,fontWeight:600,color:th.textDim,textTransform:"uppercase",letterSpacing:"1px",marginBottom:8}}>Forecasted Revenue</div>
        <div style={{fontFamily:"'JetBrains Mono'",fontSize:32,fontWeight:800,color:th.textBright}}>{fmt(totalRevenue)}</div>
        <div style={{fontSize:12,color:th.textDim,marginTop:6}}>Avg per job: {fmt(selectedEstimates.length>0?totalNetProfit/selectedEstimates.length:0)}</div>
      </div>
    </div>

    {/* Estimate list */}
    {loading&&<div style={{color:th.textDim,fontSize:13,padding:20,textAlign:"center"}}>Loading...</div>}
    {!loading&&estimates.length===0&&<div style={{...st.card,textAlign:"center",padding:32,color:th.textDim,fontSize:13}}>No saved estimates yet. Save one from the Estimator tab.</div>}
    {estimates.map(est=>{
      const np=getNetProfit(est);const on=!!selected[est.id];
      const sqft=est.settings_data?.sqft||0;
      const sysName=(est.systems_data||{})[est.settings_data?.selectedId]?.name||"—";
      return<div key={est.id} onClick={()=>toggleEst(est.id)} style={{...st.card,marginBottom:8,display:"flex",alignItems:"center",gap:14,cursor:"pointer",border:`1px solid ${on?th.green+"66":th.cardBorder}`,background:on?`${th.green}08`:th.card,transition:"all 0.15s",flexWrap:"wrap"}}>
        <Checkbox checked={on} onChange={()=>toggleEst(est.id)} color={th.green} S={th}/>
        <div style={{flex:1,minWidth:140}}>
          <div style={{fontSize:14,fontWeight:600,color:th.textBright}}>{est.name}</div>
          <div style={{fontSize:11,color:th.textDim,marginTop:2}}>{est.customer_name?`${est.customer_name} · `:""}{sysName} · {sqft.toLocaleString()} sqft</div>
          <div style={{fontSize:11,color:th.textFaint,marginTop:2}}>{new Date(est.created_at).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}</div>
        </div>
        <div style={{textAlign:"right",flexShrink:0}}>
          <div style={{fontSize:10,fontWeight:600,color:th.textDim,textTransform:"uppercase",marginBottom:2}}>Net Profit</div>
          <div style={{fontFamily:"'JetBrains Mono'",fontSize:18,fontWeight:700,color:np>=0?th.green:th.red}}>{fmt(np)}</div>
        </div>
      </div>;
    })}
  </div>;
}

/* ═══ ESTIMATOR ═══ */
function Estimator({systems,settings,set,S:th,userId}) {
  const st=mkStyles(th);
  const sysList=Object.values(systems);
  const[saveName,setSaveName]=useState("");const[custName,setCustName]=useState("");const[saveMsg,setSaveMsg]=useState("");
  const handleQuickSave=async()=>{if(!saveName.trim()||!userId)return;await supabase.from("saved_estimates").insert({user_id:userId,name:saveName.trim(),customer_name:custName.trim(),settings_data:settings,systems_data:systems});setSaveName("");setCustName("");setSaveMsg("Saved!");setTimeout(()=>setSaveMsg(""),2000);};
  const{selectedId,sqft,wastePercent,salesTaxRate,incomeTaxRate,retailOverrides,coverageOverrides,excludedMats,technicians,sundries,crackFiller,misc,excludeSundries,excludeCrackFiller,excludeMisc,coveEnabled,coveLinearFt,covePricePerLf,extraCharges}=settings;
  useEffect(()=>{if(!systems[selectedId]&&sysList.length>0)set({selectedId:sysList[0].id});},[systems,selectedId,sysList,set]);
  const system=systems[selectedId];
  const ro=retailOverrides?.[selectedId]??"";const hasRO=ro!==""&&ro!==undefined;
  const setRO=v=>set(p=>({...p,retailOverrides:{...p.retailOverrides,[selectedId]:v}}));
  const getCov=mid=>(coverageOverrides||{})[`${selectedId}::${mid}`]??"";
  const setCov=(mid,v)=>set(p=>({...p,coverageOverrides:{...(p.coverageOverrides||{}),[`${selectedId}::${mid}`]:v}}));
  const toggleMat=mid=>{const k=`${selectedId}::${mid}`;set(p=>({...p,excludedMats:{...p.excludedMats,[k]:!p.excludedMats[k]}}));};
  const isME=mid=>!!excludedMats[`${selectedId}::${mid}`];
  const upT=(id,k,v)=>set(p=>({...p,technicians:p.technicians.map(t=>t.id===id?{...t,[k]:v}:t)}));
  const addT=()=>set(p=>({...p,technicians:[...p.technicians,{id:uid(),name:`Tech ${p.technicians.length+1}`,hourlyRate:20,manHours:8,enabled:true}]}));
  const rmT=id=>set(p=>({...p,technicians:p.technicians.filter(t=>t.id!==id)}));
  const addEC=()=>set(p=>({...p,extraCharges:[...(p.extraCharges||[]),{id:uid(),name:"",amount:"",enabled:true}]}));
  const upEC=(id,k,v)=>set(p=>({...p,extraCharges:(p.extraCharges||[]).map(c=>c.id===id?{...c,[k]:v}:c)}));
  const rmEC=id=>set(p=>({...p,extraCharges:(p.extraCharges||[]).filter(c=>c.id!==id)}));

  const calc=useMemo(()=>{
    if(!system)return null;
    const wm=1+wastePercent/100;
    const ml=system.materials.map(m=>{
      const ex=isME(m.id);const covO=getCov(m.id);
      const effCov=(covO!==""&&parseFloat(covO)>0)?parseFloat(covO):(m.coveragePerUnit||200);
      const hasCO=covO!==""&&parseFloat(covO)>0&&parseFloat(covO)!==(m.coveragePerUnit||200);
      const rawQty=(sqft/(effCov||200))*wm;const qty=Math.ceil(rawQty*10)/10;
      const ks=m.kitSize||1; const kp=m.kitPrice||(m.costPerUnit?m.costPerUnit*ks:0);
      const unitCost=ks>0?kp/ks:(m.costPerUnit||0);
      const cost=ex?0:qty*unitCost;
      const kitsNeeded=ex?0:Math.ceil(rawQty/ks);
      const orderCost=kitsNeeded*kp;
      return{...m,qty:parseFloat(qty.toFixed(1)),cost,excluded:ex,effCov,hasCO,unitCost,kitsNeeded,orderCost,kitSize:ks,kitPrice:kp};
    });
    const bmc=ml.filter(l=>!l.excluded).reduce((s,l)=>s+l.cost,0);
    const sc=excludeSundries?0:(parseFloat(sundries)||0),cc=excludeCrackFiller?0:(parseFloat(crackFiller)||0),mc2=excludeMisc?0:(parseFloat(misc)||0);
    // Cove base
    const coveLf=coveEnabled?(parseFloat(coveLinearFt)||0):0;
    const coveMatCost=coveLf*(system.coveMatCostPerLf||0);
    const coveRevenue=coveLf*(parseFloat(covePricePerLf)||0);
    // Extra charges
    const ecList=(extraCharges||[]).map(c=>({...c,total:c.enabled?(parseFloat(c.amount)||0):0}));
    const ecTotal=ecList.reduce((s,c)=>s+c.total,0);
    const tmc=bmc+sc+cc+mc2+coveMatCost;
    const tl=technicians.map(t=>({...t,totalCost:t.enabled?t.hourlyRate*t.manHours:0}));
    const lc=tl.reduce((s,t)=>s+t.totalCost,0),tc=tmc+lc;
    const sta=tmc*(salesTaxRate/100);
    const er=hasRO?parseFloat(ro):system.retailPerSqft,rt=sqft*(er||0);
    const totalRevenue=rt+coveRevenue+ecTotal;
    const ct=totalRevenue+sta;
    const gp=totalRevenue-tc,gm=totalRevenue>0?gp/totalRevenue:0;
    const eit=gp>0?gp*(incomeTaxRate/100):0,np=gp-eit,nm=totalRevenue>0?np/totalRevenue:0;
    const cps=sqft>0?tc/sqft:0;
    const orderTotal=ml.filter(l=>!l.excluded).reduce((s,l)=>s+l.orderCost,0);
    return{materialLines:ml,totalMaterialCost:tmc,techLines:tl,laborCost:lc,totalCost:tc,salesTaxAmount:sta,effectiveRetail:er,retailTotal:rt,coveMatCost,coveRevenue,coveLf,ecList,ecTotal,totalRevenue,customerTotal:ct,grossProfit:gp,grossMargin:gm,estimatedIncomeTax:eit,netProfit:np,netMargin:nm,costPerSqft:cps,orderTotal};
  },[sqft,selectedId,salesTaxRate,incomeTaxRate,wastePercent,ro,hasRO,excludedMats,coverageOverrides,technicians,sundries,crackFiller,misc,excludeSundries,excludeCrackFiller,excludeMisc,coveEnabled,coveLinearFt,covePricePerLf,extraCharges,system]);

  if(!system||!calc)return<div style={{...st.card,textAlign:"center",padding:48}}><div style={{fontSize:14,color:th.textDim}}>No systems configured.</div></div>;
  const mc=calc.grossMargin>=0.4?th.green:calc.grossMargin>=0.2?th.amber:th.red;
  const nc=calc.netProfit>=0?th.green:th.red;

  return <div>
    {/* QUICK SAVE BAR */}
    <div style={{...st.card,marginBottom:20,display:"flex",alignItems:"flex-end",gap:12,flexWrap:"wrap",padding:"16px 22px"}}>
      <div style={{flex:"2 1 160px"}}><div style={{fontSize:10,fontWeight:600,color:th.textDim,textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:5}}>Estimate Name</div><div style={st.inputWrap}><input type="text" value={saveName} onChange={e=>setSaveName(e.target.value)} style={{...st.textInput,fontSize:13}} placeholder="e.g. Smith Garage 2-Car"/></div></div>
      <div style={{flex:"1 1 140px"}}><div style={{fontSize:10,fontWeight:600,color:th.textDim,textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:5}}>Customer</div><div style={st.inputWrap}><input type="text" value={custName} onChange={e=>setCustName(e.target.value)} style={{...st.textInput,fontSize:13}} placeholder="e.g. John Smith"/></div></div>
      <button onClick={handleQuickSave} disabled={!saveName.trim()} style={{...st.btn,background:saveName.trim()?`linear-gradient(135deg,${th.green},${th.green}dd)`:`${th.surface}`,color:saveName.trim()?"#fff":th.textFaint,padding:"10px 20px",fontSize:13,flexShrink:0,opacity:saveName.trim()?1:0.5}}><SaveIcon size={14}/> Save Estimate</button>
      {saveMsg&&<span style={{fontSize:12,color:th.green,fontWeight:600}}>{saveMsg}</span>}
    </div>

    {/* TOP INPUTS */}
    <div className="grid-2col" style={{marginBottom:24}}>
      <div style={st.card}><div style={st.label}>Epoxy System</div>
        <div style={{display:"flex",flexDirection:"column",gap:7}}>{sysList.map(sys=><button key={sys.id} onClick={()=>set({selectedId:sys.id})} style={{background:selectedId===sys.id?`${th.amber}18`:th.surface,border:selectedId===sys.id?`1.5px solid ${th.amber}`:`1.5px solid ${th.surfaceBorder}`,borderRadius:10,padding:"11px 14px",textAlign:"left",cursor:"pointer",transition:"all 0.15s"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><div style={{fontSize:13,fontWeight:600,color:selectedId===sys.id?th.textBright:th.textMuted}}>{sys.name}</div><div style={{fontFamily:"'JetBrains Mono'",fontSize:11,color:th.textDim}}>{fmt(sys.retailPerSqft)}/sqft</div></div>
          <div style={{fontSize:10,color:th.textDim,marginTop:2,lineHeight:1.3}}>{sys.description}</div>
        </button>)}</div>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:16}}>
        <div style={st.card}><div style={st.label}>Project Size</div>
          <div style={{display:"flex",alignItems:"baseline",gap:8}}><input type="number" value={sqft} onChange={e=>set({sqft:Math.max(0,parseInt(e.target.value)||0)})} style={{fontFamily:"'JetBrains Mono'",fontSize:34,fontWeight:600,background:"transparent",border:"none",color:th.textBright,width:170,outline:"none"}}/><span style={{fontSize:15,color:th.textDim,fontWeight:500}}>sq ft</span></div>
          <input type="range" min={50} max={10000} step={50} value={sqft} onChange={e=>set({sqft:parseInt(e.target.value)})} style={{width:"100%",marginTop:10,accentColor:th.amber,height:4}}/>
        </div>
        <div style={st.card}><div className="grid-2col-fields">
          <Field label="Waste Factor" value={wastePercent} onChange={v=>set({wastePercent:v})} suffix="%" step={1} S={th}/>
          <Field label="Mat. Sales Tax" value={salesTaxRate} onChange={v=>set({salesTaxRate:v})} suffix="%" step={0.1} S={th}/>
          <Field label="Income Tax Rate" value={incomeTaxRate} onChange={v=>set({incomeTaxRate:v})} suffix="%" step={1} S={th}/>
          <Field label="Retail Price Override" value={ro} onChange={setRO} prefix="$" suffix="/sqft" step={0.25} placeholder={system.retailPerSqft.toFixed(2)} highlight S={th}/>
        </div></div>
      </div>
    </div>

    {/* MAIN RESULTS */}
    <div className="grid-3col">
      {/* MATERIALS + ORDER LIST */}
      <div style={{display:"flex",flexDirection:"column",gap:16}}>
        <div style={st.card}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",...st.label}}><span>Materials Breakdown</span>{calc.materialLines.some(m=>m.excluded)&&<span style={{fontSize:10,fontWeight:500,color:th.amber,textTransform:"none",letterSpacing:"0"}}>{calc.materialLines.filter(m=>m.excluded).length} excluded</span>}</div>
          <div className="table-scroll">
          <table style={{width:"100%",borderCollapse:"collapse",minWidth:520}}><thead><tr style={{borderBottom:`1px solid ${th.cardBorder}`}}><th style={{width:30,padding:"8px 4px"}}></th>{["Material","Cov/Unit","Qty","Unit","$/Unit","Total"].map(h=><th key={h} style={{textAlign:h==="Material"?"left":"right",fontSize:9,fontWeight:600,color:th.textFaint,textTransform:"uppercase",letterSpacing:"0.6px",padding:"8px 4px"}}>{h}</th>)}</tr></thead>
          <tbody>
            {calc.materialLines.map(m=>{const cv=getCov(m.id);return<tr key={m.id} style={{borderBottom:`1px solid ${th.surface}`,opacity:m.excluded?0.35:1}}>
              <td style={{padding:"10px 4px",textAlign:"center"}}><Checkbox checked={!m.excluded} onChange={()=>toggleMat(m.id)} S={th}/></td>
              <td style={{padding:"10px 4px",fontSize:12,fontWeight:500,color:m.excluded?th.textFaint:th.textMuted,textDecoration:m.excluded?"line-through":"none"}}>{m.name}</td>
              <td style={{padding:"4px",textAlign:"right"}}><div style={{display:"inline-flex",alignItems:"center",background:m.hasCO?`${th.amber}0c`:th.surface,border:m.hasCO?`1.5px solid ${th.amber}`:`1px solid ${th.surfaceBorder}`,borderRadius:5,padding:"2px 5px",maxWidth:85}}><input type="number" value={cv} onChange={e=>setCov(m.id,e.target.value)} style={{...st.inputField,fontSize:11,width:40,textAlign:"right",color:m.hasCO?th.amber:th.text}} step={10} placeholder={String(m.coveragePerUnit)}/><span style={{color:th.textFaint,fontSize:7,marginLeft:2}}>sqft</span></div></td>
              <td style={{padding:"10px 4px",textAlign:"right",fontFamily:"'JetBrains Mono'",fontSize:12,color:m.excluded?th.textFaint:th.text}}>{m.excluded?"—":m.qty.toFixed(1)}</td>
              <td style={{padding:"10px 4px",textAlign:"right",fontSize:10,color:th.textDim}}>{m.unit}</td>
              <td style={{padding:"10px 4px",textAlign:"right",fontFamily:"'JetBrains Mono'",fontSize:12,color:m.excluded?th.textFaint:th.textMuted}}>{fmt(m.unitCost)}</td>
              <td style={{padding:"10px 4px",textAlign:"right",fontFamily:"'JetBrains Mono'",fontSize:12,fontWeight:600,color:m.excluded?th.textFaint:th.textBright}}>{m.excluded?"—":fmt(m.cost)}</td>
            </tr>;})}
            <tr><td colSpan={8} style={{padding:"4px 0",borderBottom:`1px dashed ${th.surfaceBorder}`}}></td></tr>
            <CostRow label="Crack Filler" value={crackFiller} onChangeVal={v=>set({crackFiller:v})} excluded={excludeCrackFiller} onToggle={()=>set(p=>({...p,excludeCrackFiller:!p.excludeCrackFiller}))} colSpan={5} S={th}/>
            <CostRow label="Sundries" value={sundries} onChangeVal={v=>set({sundries:v})} excluded={excludeSundries} onToggle={()=>set(p=>({...p,excludeSundries:!p.excludeSundries}))} colSpan={5} S={th}/>
            <CostRow label="Misc" value={misc} onChangeVal={v=>set({misc:v})} excluded={excludeMisc} onToggle={()=>set(p=>({...p,excludeMisc:!p.excludeMisc}))} colSpan={5} S={th}/>
            {coveEnabled&&calc.coveLf>0&&<tr style={{borderBottom:`1px solid ${th.surface}`}}><td></td><td style={{padding:"10px 4px",fontSize:12,color:th.textMuted}}>Cove Base ({calc.coveLf} LF)</td><td colSpan={5} style={{padding:"10px 4px",textAlign:"right",fontFamily:"'JetBrains Mono'",fontSize:12,fontWeight:600,color:th.textBright}}>{fmt(calc.coveMatCost)}</td></tr>}
          </tbody>
          <tfoot><tr style={{borderTop:`2px solid ${th.surfaceBorder}`}}><td colSpan={7} style={{padding:"12px 4px",fontSize:13,fontWeight:700,color:th.textBright}}>Total Materials</td><td style={{padding:"12px 4px",textAlign:"right",fontFamily:"'JetBrains Mono'",fontSize:16,fontWeight:700,color:th.amber}}>{fmt(calc.totalMaterialCost)}</td></tr></tfoot>
          </table></div>
        </div>

        {/* ORDER LIST */}
        <div style={st.card}>
          <div style={{...st.label,display:"flex",alignItems:"center",gap:6}}><ListIcon size={13}/> Material Order List</div>
          <div className="table-scroll">
          <table style={{width:"100%",borderCollapse:"collapse",minWidth:400}}><thead><tr style={{borderBottom:`1px solid ${th.cardBorder}`}}>{["Material","Need","Kit","Kits to Order","Order Cost"].map(h=><th key={h} style={{textAlign:h==="Material"?"left":"right",fontSize:9,fontWeight:600,color:th.textFaint,textTransform:"uppercase",padding:"8px 6px"}}>{h}</th>)}</tr></thead>
          <tbody>{calc.materialLines.filter(m=>!m.excluded).map(m=><tr key={m.id} style={{borderBottom:`1px solid ${th.surface}`}}>
            <td style={{padding:"10px 6px",fontSize:12,color:th.textMuted}}>{m.name}</td>
            <td style={{padding:"10px 6px",textAlign:"right",fontFamily:"'JetBrains Mono'",fontSize:12,color:th.text}}>{m.qty.toFixed(1)} {m.unit}</td>
            <td style={{padding:"10px 6px",textAlign:"right",fontSize:11,color:th.textDim}}>{m.kitSize} {m.unit} @ {fmt(m.kitPrice)}</td>
            <td style={{padding:"10px 6px",textAlign:"right",fontFamily:"'JetBrains Mono'",fontSize:14,fontWeight:700,color:th.amber}}>{m.kitsNeeded}</td>
            <td style={{padding:"10px 6px",textAlign:"right",fontFamily:"'JetBrains Mono'",fontSize:12,fontWeight:600,color:th.textBright}}>{fmt(m.orderCost)}</td>
          </tr>)}</tbody>
          <tfoot><tr style={{borderTop:`2px solid ${th.surfaceBorder}`}}><td colSpan={3} style={{padding:"12px 6px",fontSize:13,fontWeight:700,color:th.textBright}}>Total Order Cost</td><td></td><td style={{padding:"12px 6px",textAlign:"right",fontFamily:"'JetBrains Mono'",fontSize:16,fontWeight:700,color:th.amber}}>{fmt(calc.orderTotal)}</td></tr></tfoot>
          </table></div>
        </div>
      </div>

      {/* LABOR + COVE + EXTRAS */}
      <div style={{display:"flex",flexDirection:"column",gap:16}}>
        <div style={st.card}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",...st.label}}><span>Labor / Technicians</span><button onClick={addT} style={{...st.btn,background:`${th.blue}15`,color:th.blue,padding:"4px 10px",fontSize:11,border:`1px solid ${th.blue}40`}}><PlusIcon size={12}/> Add</button></div>
          {technicians.map(tech=><div key={tech.id} style={{background:th.surface,border:`1px solid ${th.surfaceBorder}`,borderRadius:10,padding:"12px 14px",marginBottom:8,opacity:tech.enabled?1:0.35,transition:"opacity 0.2s"}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}><Checkbox checked={tech.enabled} onChange={()=>upT(tech.id,"enabled",!tech.enabled)} color={th.blue} S={th}/><input type="text" value={tech.name} onChange={e=>upT(tech.id,"name",e.target.value)} style={{...st.textInput,fontSize:13,fontWeight:600,flex:1}} placeholder="Name"/><button onClick={()=>rmT(tech.id)} style={{...st.btn,background:`${th.red}12`,color:"#f87171",padding:5,border:`1px solid ${th.red}25`,flexShrink:0}}><TrashIcon size={12}/></button></div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              <div><div style={{fontSize:9,fontWeight:600,color:th.textFaint,textTransform:"uppercase",marginBottom:4}}>Hourly Rate</div><div style={{...st.inputWrap,padding:"5px 8px"}}><span style={{color:th.textFaint,fontSize:11,marginRight:2}}>$</span><input type="number" value={tech.hourlyRate} onChange={e=>upT(tech.id,"hourlyRate",parseFloat(e.target.value)||0)} style={{...st.inputField,fontSize:13}} step={1}/><span style={{color:th.textFaint,fontSize:9}}>/hr</span></div></div>
              <div><div style={{fontSize:9,fontWeight:600,color:th.textFaint,textTransform:"uppercase",marginBottom:4}}>Man Hours</div><div style={{...st.inputWrap,padding:"5px 8px"}}><input type="number" value={tech.manHours} onChange={e=>upT(tech.id,"manHours",parseFloat(e.target.value)||0)} style={{...st.inputField,fontSize:13}} step={0.5}/><span style={{color:th.textFaint,fontSize:9}}>hrs</span></div></div>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",marginTop:8,paddingTop:8,borderTop:`1px solid ${th.surfaceBorder}`}}><span style={{fontSize:11,color:th.textDim}}>Subtotal</span><span style={{fontFamily:"'JetBrains Mono'",fontSize:13,fontWeight:600,color:tech.enabled?th.textBright:th.textFaint}}>{tech.enabled?fmt(tech.hourlyRate*tech.manHours):"—"}</span></div>
          </div>)}
          <div style={{display:"flex",justifyContent:"space-between",padding:"12px 0 0",borderTop:`2px solid ${th.surfaceBorder}`,marginTop:4}}><span style={{fontSize:13,fontWeight:700,color:th.textBright}}>Total Labor</span><span style={{fontFamily:"'JetBrains Mono'",fontSize:16,fontWeight:700,color:th.blue}}>{fmt(calc.laborCost)}</span></div>
        </div>

        {/* COVE BASE */}
        <div style={st.card}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
            <Checkbox checked={coveEnabled} onChange={()=>set(p=>({...p,coveEnabled:!p.coveEnabled}))} S={th}/>
            <div style={{...st.label,marginBottom:0}}>Cove Base</div>
          </div>
          {coveEnabled&&<div className="grid-2col-fields">
            <Field label="Linear Feet" value={coveLinearFt} onChange={v=>set({coveLinearFt:v})} suffix="LF" step={1} S={th}/>
            <Field label="Charge Customer" value={covePricePerLf} onChange={v=>set({covePricePerLf:v})} prefix="$" suffix="/LF" step={0.5} S={th}/>
          </div>}
          {coveEnabled&&calc.coveLf>0&&<div style={{marginTop:10,display:"flex",justifyContent:"space-between",fontSize:12,color:th.textDim}}><span>Mat. cost: {fmt(calc.coveMatCost)}</span><span>Revenue: {fmt(calc.coveRevenue)}</span></div>}
        </div>

        {/* EXTRA CHARGES */}
        <div style={st.card}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",...st.label}}><span>Extra Charges</span><button onClick={addEC} style={{...st.btn,background:`${th.blue}15`,color:th.blue,padding:"4px 10px",fontSize:11,border:`1px solid ${th.blue}40`}}><PlusIcon size={12}/> Add</button></div>
          {(extraCharges||[]).length===0&&<div style={{fontSize:12,color:th.textDim,padding:"8px 0"}}>No extra charges. Add for prep work, coating removal, etc.</div>}
          {(extraCharges||[]).map(ec=><div key={ec.id} style={{display:"flex",alignItems:"center",gap:8,marginBottom:8,opacity:ec.enabled?1:0.35}}>
            <Checkbox checked={ec.enabled} onChange={()=>upEC(ec.id,"enabled",!ec.enabled)} S={th}/>
            <div style={{...st.inputWrap,flex:1,padding:"6px 10px"}}><input type="text" value={ec.name} onChange={e=>upEC(ec.id,"name",e.target.value)} style={{...st.textInput,fontSize:12}} placeholder="Description"/></div>
            <div style={{...st.inputWrap,width:110,padding:"6px 8px"}}><span style={{color:th.textFaint,fontSize:11,marginRight:2}}>$</span><input type="number" value={ec.amount} onChange={e=>upEC(ec.id,"amount",e.target.value)} style={{...st.inputField,fontSize:12,textAlign:"right"}} step={25} placeholder="0"/></div>
            <button onClick={()=>rmEC(ec.id)} style={{...st.btn,background:`${th.red}12`,color:"#f87171",padding:5,border:`1px solid ${th.red}25`}}><TrashIcon size={12}/></button>
          </div>)}
          {(extraCharges||[]).some(c=>c.enabled&&parseFloat(c.amount)>0)&&<div style={{display:"flex",justifyContent:"space-between",paddingTop:8,borderTop:`1px solid ${th.surfaceBorder}`,marginTop:4}}><span style={{fontSize:12,fontWeight:600,color:th.textBright}}>Extra Charges Total</span><span style={{fontFamily:"'JetBrains Mono'",fontSize:14,fontWeight:700,color:th.textBright}}>{fmt(calc.ecTotal)}</span></div>}
        </div>

        {/* COMBINED TOTAL */}
        <div style={{...st.card,background:`${th.amber}0a`,border:`1px solid ${th.amber}33`}}>
          {[{l:"Materials",v:calc.totalMaterialCost},{l:"Labor",v:calc.laborCost}].map((r,i)=><div key={i} style={{display:"flex",justifyContent:"space-between",marginBottom:8}}><span style={{fontSize:12,color:th.textMuted}}>{r.l}</span><span style={{fontFamily:"'JetBrains Mono'",fontSize:13,color:th.text}}>{fmt(r.v)}</span></div>)}
          <div style={{display:"flex",justifyContent:"space-between",paddingTop:10,borderTop:`2px solid ${th.amber}33`}}><span style={{fontSize:14,fontWeight:700,color:th.textBright}}>Total Project Cost</span><span style={{fontFamily:"'JetBrains Mono'",fontSize:18,fontWeight:700,color:th.amber}}>{fmt(calc.totalCost)}</span></div>
          <div style={{fontSize:11,color:th.textDim,textAlign:"right",marginTop:4,fontFamily:"'JetBrains Mono'"}}>{fmt(calc.costPerSqft)} / sq ft</div>
        </div>
      </div>

      {/* INVOICE + PROFIT */}
      <div style={{display:"flex",flexDirection:"column",gap:16}}>
        <div style={st.card}>
          <div style={st.label}>Customer Invoice</div>
          {[{l:`Floor (${fmt(calc.effectiveRetail)}/sqft × ${sqft})`,v:calc.retailTotal},...(coveEnabled&&calc.coveLf>0?[{l:`Cove Base (${calc.coveLf} LF × ${fmt(parseFloat(covePricePerLf)||0)})`,v:calc.coveRevenue}]:[]),...(calc.ecTotal>0?[{l:"Extra Charges",v:calc.ecTotal}]:[]),{l:`Sales Tax on Materials (${salesTaxRate}%)`,v:calc.salesTaxAmount}].map((r,i)=><div key={i} style={{display:"flex",justifyContent:"space-between",padding:"10px 0",borderBottom:`1px solid ${th.surface}`}}><span style={{fontSize:13,color:th.textMuted}}>{r.l}</span><span style={{fontFamily:"'JetBrains Mono'",fontSize:14,color:th.text,fontWeight:500}}>{fmt(r.v)}</span></div>)}
          {hasRO&&<div style={{fontSize:10,color:th.amber,marginTop:6}}>● Retail override active</div>}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",paddingTop:14,marginTop:4}}><span style={{fontSize:14,fontWeight:700,color:th.textBright}}>Customer Total</span><span style={{fontFamily:"'JetBrains Mono'",fontSize:22,fontWeight:700,color:th.textBright}}>{fmt(calc.customerTotal)}</span></div>
        </div>

        <div style={{background:`${th.green}0a`,border:`1px solid ${th.green}33`,borderRadius:14,padding:22}}>
          <div style={{...st.label,color:th.green}}>Profit Analysis</div>
          {[{l:"Revenue",v:calc.totalRevenue,c:th.text},{l:"Total Cost",v:-calc.totalCost,c:th.red}].map((r,i)=><div key={i} style={{display:"flex",justifyContent:"space-between",padding:"7px 0"}}><span style={{fontSize:13,color:th.textMuted}}>{r.l}</span><span style={{fontFamily:"'JetBrains Mono'",fontSize:14,color:r.c,fontWeight:500}}>{r.v<0?`(${fmt(Math.abs(r.v))})`:fmt(r.v)}</span></div>)}
          <div style={{borderTop:`2px solid ${th.green}33`,marginTop:8,paddingTop:12,display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontSize:12,fontWeight:600,color:th.textDim}}>Gross Profit</span><span style={{fontFamily:"'JetBrains Mono'",fontSize:16,fontWeight:600,color:calc.grossProfit>=0?th.textMuted:th.red}}>{fmt(calc.grossProfit)}</span></div>
          <div style={{marginTop:8}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}><span style={{fontSize:10,color:th.textDim,fontWeight:600,textTransform:"uppercase"}}>Gross Margin</span><span style={{fontFamily:"'JetBrains Mono'",fontSize:12,fontWeight:600,color:mc}}>{fmtPct(calc.grossMargin)}</span></div><div style={{height:5,borderRadius:3,background:th.surface,overflow:"hidden"}}><div style={{height:"100%",borderRadius:3,width:`${Math.max(0,Math.min(100,calc.grossMargin*100))}%`,background:`linear-gradient(90deg,${mc},${mc}cc)`,transition:"width 0.4s"}}/></div></div>
          <div style={{borderTop:`1px solid ${th.green}22`,marginTop:14,paddingTop:10}}><div style={{display:"flex",justifyContent:"space-between",padding:"7px 0"}}><span style={{fontSize:13,color:th.textMuted}}>Est. Income Tax ({incomeTaxRate}%)</span><span style={{fontFamily:"'JetBrains Mono'",fontSize:14,color:"#f87171",fontWeight:500}}>({fmt(calc.estimatedIncomeTax)})</span></div></div>
          <div style={{borderTop:`3px solid ${th.amber}`,marginTop:6,paddingTop:14,display:"flex",justifyContent:"space-between",alignItems:"center",background:`${th.amber}08`,margin:"0 -22px",padding:"14px 22px",borderRadius:"0 0 14px 14px"}}><div><div style={{fontSize:16,fontWeight:800,color:th.textBright,letterSpacing:"-0.3px"}}>Net Profit</div><div style={{fontSize:10,color:th.textDim,marginTop:2}}>after est. income tax</div></div><span style={{fontFamily:"'JetBrains Mono'",fontSize:26,fontWeight:800,color:nc}}>{fmt(calc.netProfit)}</span></div>
          <div style={{marginTop:10}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}><span style={{fontSize:10,color:th.textDim,fontWeight:600,textTransform:"uppercase"}}>Net Margin</span><span style={{fontFamily:"'JetBrains Mono'",fontSize:13,fontWeight:700,color:nc}}>{fmtPct(calc.netMargin)}</span></div><div style={{height:7,borderRadius:4,background:th.surface,overflow:"hidden"}}><div style={{height:"100%",borderRadius:4,width:`${Math.max(0,Math.min(100,calc.netMargin*100))}%`,background:`linear-gradient(90deg,${nc},${nc}cc)`,transition:"width 0.4s"}}/></div></div>
        </div>

        <div className="grid-2col-fields">
          {[{l:"Material Cost",v:fmt(calc.totalMaterialCost),s:`${fmt(sqft>0?calc.totalMaterialCost/sqft:0)}/sqft`},{l:"Labor Cost",v:fmt(calc.laborCost),s:`${technicians.filter(t=>t.enabled).length} techs`},{l:"Net Profit/sqft",v:fmt(sqft>0?calc.netProfit/sqft:0),s:"after tax"},{l:"Tax Collected",v:fmt(calc.salesTaxAmount),s:"on materials"}].map((s,i)=><div key={i} style={{background:th.card,border:`1px solid ${th.cardBorder}`,borderRadius:10,padding:"13px 14px"}}><div style={{fontSize:9,fontWeight:600,color:th.textFaint,textTransform:"uppercase"}}>{s.l}</div><div style={{fontFamily:"'JetBrains Mono'",fontSize:15,fontWeight:700,color:th.text,marginTop:4}}>{s.v}</div><div style={{fontSize:10,color:th.textDim,marginTop:2}}>{s.s}</div></div>)}
        </div>
      </div>
    </div>
  </div>;
}

/* ═══ MAIN APP ═══ */
export default function App() {
  const[session,setSession]=useState(null);const[loading,setLoading]=useState(true);
  const[systems,setSystems]=useState(DEFAULT_SYSTEMS);const[settings,setSettingsRaw]=useState(DEFAULT_SETTINGS);
  const[dataLoaded,setDataLoaded]=useState(false);const[tab,setTab]=useState("estimate");
  const theme=settings.theme||"dark"; const th=getTheme(theme);const st=mkStyles(th);

  useEffect(()=>{supabase.auth.getSession().then(({data:{session}})=>{setSession(session);setLoading(false);});const{data:{subscription}}=supabase.auth.onAuthStateChange((_e,session)=>{setSession(session);if(!session){setDataLoaded(false);setSystems(DEFAULT_SYSTEMS);setSettingsRaw(DEFAULT_SETTINGS);}});return()=>subscription.unsubscribe();},[]);
  useEffect(()=>{if(!session?.user?.id)return;const load=async()=>{try{const[sR,stR]=await Promise.all([supabase.from("user_systems").select("data").eq("user_id",session.user.id).maybeSingle(),supabase.from("user_settings").select("data").eq("user_id",session.user.id).maybeSingle()]);if(sR.data?.data)setSystems(sR.data.data);if(stR.data?.data)setSettingsRaw(p=>({...DEFAULT_SETTINGS,...stR.data.data}));}catch(e){console.error(e);}setDataLoaded(true);};load();},[session?.user?.id]);
  const set=useCallback(patch=>{setSettingsRaw(prev=>typeof patch==="function"?patch(prev):{...prev,...patch});},[]);
  const sysSync=useDebouncedSave("user_systems",session?.user?.id,systems,dataLoaded);
  const setSync=useDebouncedSave("user_settings",session?.user?.id,settings,dataLoaded);
  const sync=sysSync==="error"||setSync==="error"?"error":sysSync==="saving"||setSync==="saving"?"saving":"saved";
  const toggleTheme=()=>set({theme:theme==="dark"?"light":"dark"});
  const handleLoadEstimate=(est)=>{if(est.settings_data)setSettingsRaw(p=>({...DEFAULT_SETTINGS,...est.settings_data,theme:p.theme}));if(est.systems_data)setSystems(est.systems_data);setTab("estimate");};

  if(loading)return<div style={{minHeight:"100vh",background:th.bg,display:"flex",alignItems:"center",justifyContent:"center",color:th.textDim,fontFamily:"'DM Sans'"}}>Loading...</div>;
  if(!session)return<Auth/>;

  return <div style={{fontFamily:"'DM Sans','Segoe UI',sans-serif",background:th.bg,color:th.text,minHeight:"100vh",transition:"background 0.3s, color 0.3s"}}>
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
      *{box-sizing:border-box;margin:0;padding:0}
      input[type="number"]{-moz-appearance:textfield}input::-webkit-outer-spin-button,input::-webkit-inner-spin-button{-webkit-appearance:none}select{-moz-appearance:none}
      ::-webkit-scrollbar{width:6px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:${th.scrollThumb};border-radius:3px}
      @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
      .grid-2col{display:grid;grid-template-columns:1fr 1fr;gap:20px}
      .grid-3col{display:grid;grid-template-columns:1.3fr 0.9fr 1fr;gap:20px}
      .grid-2col-fields{display:grid;grid-template-columns:1fr 1fr;gap:14px}
      .header-bar{padding:0 32px}.content-area{padding:24px 32px;max-width:1400px;margin:0 auto;overflow-x:hidden}
      .table-scroll{overflow-x:auto;-webkit-overflow-scrolling:touch}
      .mat-editor-row{display:flex;gap:12px;align-items:flex-end;flex-wrap:wrap}
      .header-top{display:flex;align-items:center;gap:14px;padding-top:20px;padding-bottom:8px}
      .header-controls{display:flex;align-items:center;gap:12px}
      .header-email{font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:180px}
      @media(max-width:900px){
        .grid-2col,.grid-3col{grid-template-columns:1fr}
        .grid-2col>*,.grid-3col>*{min-width:0;width:100%}
        .header-bar{padding:0 16px}
        .content-area{padding:16px}
      }
      @media(max-width:600px){
        .grid-2col-fields{grid-template-columns:1fr}
        .content-area{padding:10px}
        .content-area *{max-width:100%}
        .header-bar{padding:0 10px}
        .header-top{flex-wrap:wrap}
        .header-controls{width:100%;justify-content:space-between;padding:8px 0 4px;border-top:1px solid ${th.surfaceBorder};margin-top:4px}
        .header-email{display:none}
        .mat-editor-row{flex-direction:column;align-items:stretch}
        .mat-editor-row>div,.mat-editor-row>button{flex:1 1 100%!important}
      }
    `}</style>
    <div className="header-bar" style={{background:th.headerBg,borderBottom:`1px solid ${th.cardBorder}`}}>
      <div className="header-top">
        <div style={{width:38,height:38,borderRadius:10,background:`linear-gradient(135deg,${th.amber},${th.amberDark})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,fontWeight:700,color:"#0f1117",flexShrink:0}}>E</div>
        <div style={{flex:1,minWidth:0}}><div style={{fontWeight:700,fontSize:17,color:th.textBright,letterSpacing:"-0.5px"}}>Epoxy Floor Estimator</div></div>
        <div className="header-controls">
          <SyncDot status={sync} S={th}/>
          <button onClick={toggleTheme} style={{...st.btn,background:th.surface,color:th.textMuted,padding:8,border:`1px solid ${th.surfaceBorder}`}} title="Toggle theme">{theme==="dark"?<SunIcon size={14}/>:<MoonIcon size={14}/>}</button>
          <div className="header-email" style={{color:th.textDim}}>{session.user.email}</div>
          <button onClick={async()=>{await supabase.auth.signOut();}} style={{...st.btn,background:th.surface,color:th.textMuted,padding:"6px 12px",fontSize:11,border:`1px solid ${th.surfaceBorder}`,flexShrink:0}}>Sign Out</button>
        </div>
      </div>
      <div style={{display:"flex",gap:0,marginTop:8,overflowX:"auto"}}>{[{id:"estimate",label:"Estimator"},{id:"manage",label:"Manage Systems"},{id:"saved",label:"Saved Estimates"},{id:"forecast",label:"Financial Forecast"}].map(t=><button key={t.id} onClick={()=>setTab(t.id)} style={{...st.btn,background:"transparent",color:tab===t.id?th.amber:th.textDim,padding:"10px 20px",fontSize:13,borderRadius:0,borderBottom:tab===t.id?`2px solid ${th.amber}`:"2px solid transparent",whiteSpace:"nowrap"}}>{t.label}</button>)}</div>
    </div>
    <div className="content-area">
      {tab==="estimate"?<Estimator systems={systems} settings={settings} set={set} S={th} userId={session.user.id}/>:tab==="manage"?<SystemManager systems={systems} setSystems={setSystems} S={th}/>:tab==="saved"?<SavedEstimates userId={session.user.id} onLoad={handleLoadEstimate} S={th}/>:<FinancialForecast userId={session.user.id} S={th}/>}
    </div>
  </div>;
}
