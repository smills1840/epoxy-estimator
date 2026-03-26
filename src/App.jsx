import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { supabase } from "./supabaseClient";
import Auth from "./Auth";

const DEFAULT_SYSTEMS = { solid: { id: "solid", name: "Solid Color Epoxy", description: "Single-color high-build coating. Ideal for residential garages and workshops.", retailPerSqft: 4.25, materials: [ { id: "s1", name: "Epoxy Primer", unit: "gal", coveragePerUnit: 250, costPerUnit: 38.0 }, { id: "s2", name: "Pigmented Epoxy Base Coat", unit: "gal", coveragePerUnit: 160, costPerUnit: 62.0 }, { id: "s3", name: "Polyurethane Topcoat", unit: "gal", coveragePerUnit: 300, costPerUnit: 85.0 }, { id: "s4", name: "Non-Slip Additive", unit: "lb", coveragePerUnit: 500, costPerUnit: 12.0 } ] }, metallic: { id: "metallic", name: "Metallic Epoxy", description: "Premium pearlescent metallic finish. Stunning three-dimensional effects.", retailPerSqft: 8.5, materials: [ { id: "m1", name: "Epoxy Primer", unit: "gal", coveragePerUnit: 250, costPerUnit: 38.0 }, { id: "m2", name: "Metallic Epoxy Base", unit: "gal", coveragePerUnit: 120, costPerUnit: 95.0 }, { id: "m3", name: "Metallic Pigment Powder", unit: "oz", coveragePerUnit: 80, costPerUnit: 18.0 }, { id: "m4", name: "High-Gloss Clear Topcoat", unit: "gal", coveragePerUnit: 250, costPerUnit: 110.0 } ] }, flake: { id: "flake", name: "Flake / Chip Epoxy", description: "Decorative vinyl flake broadcast system. Great for garages and commercial.", retailPerSqft: 5.75, materials: [ { id: "f1", name: "Epoxy Primer", unit: "gal", coveragePerUnit: 250, costPerUnit: 38.0 }, { id: "f2", name: "Epoxy Base Coat", unit: "gal", coveragePerUnit: 160, costPerUnit: 58.0 }, { id: "f3", name: "Vinyl Flakes", unit: "lb", coveragePerUnit: 20, costPerUnit: 6.5 }, { id: "f4", name: "Polyaspartic Topcoat", unit: "gal", coveragePerUnit: 250, costPerUnit: 120.0 } ] }, quartz: { id: "quartz", name: "Quartz Broadcast Epoxy", description: "Commercial-grade quartz aggregate system. Maximum durability and texture.", retailPerSqft: 7.5, materials: [ { id: "q1", name: "Epoxy Primer", unit: "gal", coveragePerUnit: 250, costPerUnit: 38.0 }, { id: "q2", name: "Epoxy Binder Coat", unit: "gal", coveragePerUnit: 140, costPerUnit: 65.0 }, { id: "q3", name: "Colored Quartz Aggregate", unit: "lb", coveragePerUnit: 8, costPerUnit: 4.25 }, { id: "q4", name: "Epoxy Grout Coat", unit: "gal", coveragePerUnit: 200, costPerUnit: 58.0 }, { id: "q5", name: "Urethane Topcoat", unit: "gal", coveragePerUnit: 300, costPerUnit: 92.0 } ] }, selflevel: { id: "selflevel", name: "Self-Leveling Epoxy", description: "Smooth, seamless poured floor. Perfect for commercial and industrial spaces.", retailPerSqft: 5.0, materials: [ { id: "sl1", name: "Epoxy Primer", unit: "gal", coveragePerUnit: 250, costPerUnit: 38.0 }, { id: "sl2", name: "Self-Leveling Epoxy", unit: "gal", coveragePerUnit: 100, costPerUnit: 54.0 }, { id: "sl3", name: "Polyurethane Topcoat", unit: "gal", coveragePerUnit: 300, costPerUnit: 85.0 } ] } };
const DEFAULT_SETTINGS = { selectedId: "flake", sqft: 600, wastePercent: 10, salesTaxRate: 5.3, incomeTaxRate: 25, retailOverrides: {}, coverageOverrides: {}, excludedMats: {}, technicians: [ { id: "t1", name: "Lead Tech", hourlyRate: 35, manHours: 8, enabled: true }, { id: "t2", name: "Helper", hourlyRate: 20, manHours: 8, enabled: true } ], sundries: "", crackFiller: "", misc: "", excludeSundries: false, excludeCrackFiller: false, excludeMisc: false };
const uid = () => Math.random().toString(36).slice(2, 10);
const fmt = (n) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });
const fmtPct = (n) => (n * 100).toFixed(1) + "%";
const S = { bg: "#0f1117", card: "#181b24", cardBorder: "#25282f", surface: "#1e212c", surfaceBorder: "#2a2d38", text: "#e2e4e9", textBright: "#f5f5f7", textMuted: "#a0a3b1", textDim: "#6b7084", textFaint: "#4a4d5a", amber: "#f59e0b", amberDark: "#d97706", green: "#10b981", red: "#ef4444", blue: "#3b82f6" };
const cardStyle = { background: S.card, border: `1px solid ${S.cardBorder}`, borderRadius: 14, padding: 22 };
const labelStyle = { fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "1.2px", color: S.textDim, marginBottom: 14 };
const inputWrap = { display: "flex", alignItems: "center", background: S.surface, border: `1px solid ${S.surfaceBorder}`, borderRadius: 8, padding: "8px 12px" };
const inputField = { fontFamily: "'JetBrains Mono'", fontSize: 14, fontWeight: 500, background: "transparent", border: "none", color: S.text, width: "100%", outline: "none" };
const textInputStyle = { ...inputField, fontFamily: "'DM Sans'", fontSize: 14 };
const btnBase = { border: "none", borderRadius: 8, cursor: "pointer", fontFamily: "'DM Sans'", fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, transition: "all 0.15s ease" };

const Icon = ({ d, size = 16, color = "currentColor" }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>);
const PlusIcon = (p) => <Icon {...p} d="M12 5v14M5 12h14" />;
const TrashIcon = (p) => <Icon {...p} d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />;
const ChevIcon = (p) => <Icon {...p} d="M9 18l6-6-6-6" />;
const BackIcon = (p) => <Icon {...p} d="M15 18l-6-6 6-6" />;
const CopyIcon = (p) => <Icon {...p} d="M8 4v12a2 2 0 002 2h8a2 2 0 002-2V8.342a2 2 0 00-.602-1.43l-4.44-4.342A2 2 0 0013.56 2H10a2 2 0 00-2 2zM16 18v2a2 2 0 01-2 2H6a2 2 0 01-2-2V9a2 2 0 012-2h2" />;
const ResetIcon = (p) => <Icon {...p} d="M1 4v6h6M23 20v-6h-6M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15" />;

const Checkbox = ({ checked, onChange, color = S.amber }) => (<div onClick={onChange} style={{ width: 18, height: 18, borderRadius: 4, cursor: "pointer", border: checked ? `1.5px solid ${color}` : `1.5px solid ${S.surfaceBorder}`, background: checked ? `${color}22` : "transparent", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s ease", flexShrink: 0 }}>{checked && (<svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>)}</div>);

function Field({ label, value, onChange, prefix, suffix, step, placeholder, type = "number", wide, highlight, style: extraStyle }) {
  const isH = highlight && value !== "" && value !== undefined;
  return (<div style={{ flex: wide ? 2 : 1, ...extraStyle }}>
    {label && <div style={{ fontSize: 10, fontWeight: 600, color: isH ? S.amber : S.textDim, textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 6 }}>{label}{isH ? " ●" : ""}</div>}
    <div style={{ ...inputWrap, border: isH ? `1.5px solid ${S.amber}` : `1px solid ${S.surfaceBorder}`, background: isH ? `${S.amber}0c` : S.surface }}>
      {prefix && <span style={{ color: isH ? S.amber : S.textFaint, fontSize: 13, marginRight: 4 }}>{prefix}</span>}
      <input type={type} value={value} placeholder={placeholder} onChange={(e) => type === "text" ? onChange(e.target.value) : onChange(e.target.value === "" ? "" : parseFloat(e.target.value) || 0)} step={step} style={{ ...(type === "text" ? textInputStyle : inputField), color: isH ? S.amber : S.text }} />
      {suffix && <span style={{ color: isH ? `${S.amber}99` : S.textFaint, fontSize: 10, whiteSpace: "nowrap", marginLeft: 4 }}>{suffix}</span>}
    </div>
  </div>);
}

function useDebouncedSave(table, userId, data, ready, delay = 1200) {
  const timer = useRef(null);
  const [syncStatus, setSyncStatus] = useState("saved");
  useEffect(() => {
    if (!ready || !userId) return;
    setSyncStatus("saving");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try {
        const { error } = await supabase.from(table).upsert({ user_id: userId, data }, { onConflict: "user_id" });
        if (error) throw error;
        setSyncStatus("saved");
      } catch (e) { console.error(`Save to ${table} failed:`, e); setSyncStatus("error"); }
    }, delay);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [data, userId, ready, table, delay]);
  return syncStatus;
}

function SystemEditor({ system, onSave, onCancel, onDelete, isNew }) {
  const [form, setForm] = useState(() => JSON.parse(JSON.stringify(system)));
  const up = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const upMat = (i, k, v) => setForm((f) => { const m = [...f.materials]; m[i] = { ...m[i], [k]: v }; return { ...f, materials: m }; });
  const addMat = () => setForm((f) => ({ ...f, materials: [...f.materials, { id: uid(), name: "", unit: "gal", coveragePerUnit: 200, costPerUnit: 0 }] }));
  const rmMat = (i) => setForm((f) => ({ ...f, materials: f.materials.filter((_, j) => j !== i) }));
  return (
    <div style={{ animation: "fadeIn 0.2s ease" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <button onClick={onCancel} style={{ ...btnBase, background: S.surface, color: S.textMuted, padding: "8px 14px", fontSize: 13 }}><BackIcon size={14} /> Back</button>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: S.textBright, flex: 1 }}>{isNew ? "New Epoxy System" : `Edit: ${system.name}`}</h2>
        {!isNew && <button onClick={() => { if (confirm("Delete this system?")) onDelete(form.id); }} style={{ ...btnBase, background: "rgba(239,68,68,0.1)", color: S.red, padding: "8px 14px", fontSize: 12, border: `1px solid rgba(239,68,68,0.25)` }}><TrashIcon size={13} /> Delete System</button>}
      </div>
      <div style={{ ...cardStyle, marginBottom: 16 }}>
        <div style={labelStyle}>System Details</div>
        <div style={{ display: "flex", gap: 14, marginBottom: 14 }}><Field label="System Name" value={form.name} onChange={(v) => up("name", v)} type="text" wide /><Field label="Retail Price" value={form.retailPerSqft} onChange={(v) => up("retailPerSqft", v)} prefix="$" suffix="/ sq ft" step={0.25} /></div>
        <Field label="Description" value={form.description} onChange={(v) => up("description", v)} type="text" />
      </div>
      <div style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ ...labelStyle, marginBottom: 0 }}>Materials ({form.materials.length})</div>
          <button onClick={addMat} style={{ ...btnBase, background: "rgba(59,130,246,0.1)", color: S.blue, padding: "6px 14px", fontSize: 12, border: `1px solid rgba(59,130,246,0.25)` }}><PlusIcon size={13} /> Add Material</button>
        </div>
        {form.materials.length === 0 && <div style={{ textAlign: "center", padding: 32, color: S.textDim, fontSize: 13 }}>No materials yet.</div>}
        {form.materials.map((mat, idx) => (
          <div key={mat.id} style={{ background: S.surface, border: `1px solid ${S.surfaceBorder}`, borderRadius: 10, padding: 16, marginBottom: 10 }}>
            <div className="mat-editor-row" style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
              <div style={{ flex: "2 1 180px" }}><Field label="Product Name" value={mat.name} onChange={(v) => upMat(idx, "name", v)} type="text" /></div>
              <div style={{ flex: "0 1 90px" }}><div style={{ fontSize: 10, fontWeight: 600, color: S.textDim, textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 6 }}>Unit</div><select value={mat.unit} onChange={(e) => upMat(idx, "unit", e.target.value)} style={{ ...inputWrap, ...inputField, padding: "8px 12px", width: "100%", appearance: "none", cursor: "pointer", fontSize: 13 }}>{["gal","lb","oz","qt","each","bag","box","tube","roll","sq ft"].map((u) => <option key={u} value={u} style={{ background: S.card }}>{u}</option>)}</select></div>
              <div style={{ flex: "1 1 120px" }}><Field label="Coverage / Unit" value={mat.coveragePerUnit} onChange={(v) => upMat(idx, "coveragePerUnit", v)} suffix="sq ft" step={10} /></div>
              <div style={{ flex: "1 1 100px" }}><Field label="Cost / Unit" value={mat.costPerUnit} onChange={(v) => upMat(idx, "costPerUnit", v)} prefix="$" step={0.5} /></div>
              <button onClick={() => rmMat(idx)} style={{ ...btnBase, background: "rgba(239,68,68,0.08)", color: "#f87171", padding: 8, border: `1px solid rgba(239,68,68,0.15)`, flexShrink: 0, marginBottom: 1 }}><TrashIcon size={14} /></button>
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
        <button onClick={onCancel} style={{ ...btnBase, background: S.surface, color: S.textMuted, padding: "12px 24px", fontSize: 14, border: `1px solid ${S.surfaceBorder}` }}>Cancel</button>
        <button onClick={() => { if (form.name.trim()) onSave(form); }} disabled={!form.name.trim()} style={{ ...btnBase, background: `linear-gradient(135deg, ${S.amber}, ${S.amberDark})`, color: S.bg, padding: "12px 28px", fontSize: 14, opacity: form.name.trim() ? 1 : 0.4 }}>{isNew ? "Create System" : "Save Changes"}</button>
      </div>
    </div>
  );
}

function SystemManager({ systems, setSystems }) {
  const [editing, setEditing] = useState(null);
  const [isNew, setIsNew] = useState(false);
  const systemList = Object.values(systems);
  const handleSave = (f) => { setSystems((p) => ({ ...p, [f.id]: f })); setEditing(null); setIsNew(false); };
  const handleDelete = (id) => { setSystems((p) => { const n = { ...p }; delete n[id]; return n; }); setEditing(null); };
  const handleNew = () => { setEditing({ id: uid(), name: "", description: "", retailPerSqft: 5.0, materials: [] }); setIsNew(true); };
  const handleDuplicate = (sys) => { const d = { ...JSON.parse(JSON.stringify(sys)), id: uid(), name: sys.name + " (Copy)", materials: sys.materials.map((m) => ({ ...m, id: uid() })) }; setSystems((p) => ({ ...p, [d.id]: d })); };
  const handleReset = () => { if (confirm("Reset all systems back to defaults?")) setSystems(DEFAULT_SYSTEMS); };
  if (editing) return <SystemEditor system={editing} onSave={handleSave} onCancel={() => { setEditing(null); setIsNew(false); }} onDelete={handleDelete} isNew={isNew} />;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div><h2 style={{ fontSize: 18, fontWeight: 700, color: S.textBright }}>Epoxy Systems</h2><p style={{ fontSize: 12, color: S.textDim, marginTop: 4 }}>{systemList.length} system{systemList.length !== 1 ? "s" : ""} — edit materials, pricing, and coverage rates</p></div>
        <div style={{ display: "flex", gap: 8 }}><button onClick={handleReset} style={{ ...btnBase, background: S.surface, color: S.textDim, padding: "10px 16px", fontSize: 12, border: `1px solid ${S.surfaceBorder}` }}><ResetIcon size={13} /> Reset</button><button onClick={handleNew} style={{ ...btnBase, background: `linear-gradient(135deg, ${S.amber}, ${S.amberDark})`, color: S.bg, padding: "10px 20px", fontSize: 13 }}><PlusIcon size={14} /> New System</button></div>
      </div>
      {systemList.length === 0 && <div style={{ ...cardStyle, textAlign: "center", padding: 48 }}><div style={{ fontSize: 14, color: S.textDim, marginBottom: 12 }}>No systems configured.</div><button onClick={handleNew} style={{ ...btnBase, background: S.surface, color: S.amber, padding: "10px 20px", fontSize: 13, border: `1px solid ${S.amber}44` }}><PlusIcon size={14} /> Create your first system</button></div>}
      {systemList.map((sys) => (
        <div key={sys.id} onClick={() => { setEditing(sys); setIsNew(false); }} style={{ ...cardStyle, marginBottom: 12, display: "flex", alignItems: "center", gap: 16, cursor: "pointer", transition: "border-color 0.15s" }} onMouseEnter={(e) => e.currentTarget.style.borderColor = S.amber} onMouseLeave={(e) => e.currentTarget.style.borderColor = S.cardBorder}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: `linear-gradient(135deg, ${S.amber}22, ${S.amber}08)`, border: `1px solid ${S.amber}33`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700, color: S.amber, flexShrink: 0 }}>{sys.name.charAt(0)}</div>
          <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 15, fontWeight: 600, color: S.textBright }}>{sys.name}</div><div style={{ fontSize: 12, color: S.textDim, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sys.description || "No description"}</div></div>
          <div style={{ textAlign: "right", flexShrink: 0 }}><div style={{ fontFamily: "'JetBrains Mono'", fontSize: 15, fontWeight: 600, color: S.textBright }}>{fmt(sys.retailPerSqft)}<span style={{ fontSize: 10, color: S.textDim }}>/sqft</span></div><div style={{ fontSize: 11, color: S.textDim, marginTop: 2 }}>{sys.materials.length} material{sys.materials.length !== 1 ? "s" : ""}</div></div>
          <div style={{ display: "flex", gap: 6, flexShrink: 0 }}><button onClick={(e) => { e.stopPropagation(); handleDuplicate(sys); }} title="Duplicate" style={{ ...btnBase, background: S.surface, color: S.textDim, padding: 8, border: `1px solid ${S.surfaceBorder}` }}><CopyIcon size={14} /></button><div style={{ color: S.textFaint, display: "flex", alignItems: "center" }}><ChevIcon size={16} /></div></div>
        </div>
      ))}
      <div style={{ marginTop: 24, background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.15)", borderRadius: 10, padding: "14px 18px", fontSize: 12, color: S.textDim, lineHeight: 1.6 }}><strong style={{ color: S.blue }}>Tip:</strong> Coverage per unit = how many sq ft one unit covers. All changes auto-save to the cloud.</div>
    </div>
  );
}

// CostRow defined OUTSIDE Estimator so React doesn't remount on every render
function CostRow({ label, value, onChangeVal, excluded, onToggle, colSpan }) {
  return (<tr style={{ borderBottom: `1px solid ${S.surface}`, opacity: excluded ? 0.35 : 1, transition: "opacity 0.2s" }}>
    <td style={{ padding: "11px 4px", textAlign: "center" }}><Checkbox checked={!excluded} onChange={onToggle} /></td>
    <td style={{ padding: "11px 6px", fontSize: 13, fontWeight: 500, color: excluded ? S.textFaint : "#c8cad2", textDecoration: excluded ? "line-through" : "none" }}>{label}</td>
    <td colSpan={colSpan || 4} style={{ padding: "5px 6px", textAlign: "right" }}>
      <div style={{ display: "inline-flex", alignItems: "center", background: S.surface, border: `1px solid ${S.surfaceBorder}`, borderRadius: 6, padding: "4px 8px", maxWidth: 130 }}>
        <span style={{ color: S.textFaint, fontSize: 12, marginRight: 3 }}>$</span>
        <input type="number" value={value} onChange={(e) => onChangeVal(e.target.value)} style={{ ...inputField, fontSize: 13, width: 70, textAlign: "right" }} step={5} placeholder="0" />
      </div>
    </td>
    <td style={{ padding: "11px 6px", textAlign: "right", fontFamily: "'JetBrains Mono'", fontSize: 13, fontWeight: 600, color: excluded ? S.textFaint : S.textBright }}>{excluded ? "—" : fmt(parseFloat(value) || 0)}</td>
  </tr>);
}

function Estimator({ systems, settings, set }) {
  const systemList = Object.values(systems);
  const { selectedId, sqft, wastePercent, salesTaxRate, incomeTaxRate, retailOverrides, coverageOverrides, excludedMats, technicians, sundries, crackFiller, misc, excludeSundries, excludeCrackFiller, excludeMisc } = settings;
  useEffect(() => { if (!systems[selectedId] && systemList.length > 0) set({ selectedId: systemList[0].id }); }, [systems, selectedId, systemList, set]);
  const system = systems[selectedId];
  const retailOverride = retailOverrides?.[selectedId] ?? "";
  const hasOverride = retailOverride !== "" && retailOverride !== undefined;
  const toggleMat = (matId) => { const key = `${selectedId}::${matId}`; set((p) => ({ ...p, excludedMats: { ...p.excludedMats, [key]: !p.excludedMats[key] } })); };
  const isME = (matId) => !!excludedMats[`${selectedId}::${matId}`];
  const setRO = (val) => set((p) => ({ ...p, retailOverrides: { ...p.retailOverrides, [selectedId]: val } }));
  const getCovOverride = (matId) => (coverageOverrides || {})[`${selectedId}::${matId}`] ?? "";
  const setCovOverride = (matId, val) => set((p) => ({ ...p, coverageOverrides: { ...(p.coverageOverrides || {}), [`${selectedId}::${matId}`]: val } }));
  const upT = (id, key, val) => set((p) => ({ ...p, technicians: p.technicians.map((t) => t.id === id ? { ...t, [key]: val } : t) }));
  const addT = () => set((p) => ({ ...p, technicians: [...p.technicians, { id: uid(), name: `Tech ${p.technicians.length + 1}`, hourlyRate: 20, manHours: 8, enabled: true }] }));
  const rmT = (id) => set((p) => ({ ...p, technicians: p.technicians.filter((t) => t.id !== id) }));
  const calc = useMemo(() => {
    if (!system) return null;
    const wm = 1 + wastePercent / 100;
    const ml = system.materials.map((m) => {
      const ex = isME(m.id);
      const covOvr = getCovOverride(m.id);
      const effectiveCov = (covOvr !== "" && covOvr !== undefined && parseFloat(covOvr) > 0) ? parseFloat(covOvr) : m.coveragePerUnit;
      const hasCovOverride = covOvr !== "" && covOvr !== undefined && parseFloat(covOvr) > 0 && parseFloat(covOvr) !== m.coveragePerUnit;
      const rq = (sqft / effectiveCov) * wm;
      const qty = Math.ceil(rq * 10) / 10;
      const cost = ex ? 0 : qty * m.costPerUnit;
      return { ...m, qty: parseFloat(qty.toFixed(1)), cost, excluded: ex, effectiveCov, hasCovOverride };
    });
    const bmc = ml.filter((l) => !l.excluded).reduce((s, l) => s + l.cost, 0);
    const sc = excludeSundries ? 0 : (parseFloat(sundries) || 0), cc = excludeCrackFiller ? 0 : (parseFloat(crackFiller) || 0), mc2 = excludeMisc ? 0 : (parseFloat(misc) || 0);
    const tmc = bmc + sc + cc + mc2;
    const tl = technicians.map((t) => ({ ...t, totalCost: t.enabled ? t.hourlyRate * t.manHours : 0 }));
    const lc = tl.reduce((s, t) => s + t.totalCost, 0), tc = tmc + lc, sta = tmc * (salesTaxRate / 100);
    const er = hasOverride ? parseFloat(retailOverride) : system.retailPerSqft, rt = sqft * (er || 0), ct = rt + sta;
    const gp = rt - tc, gm = rt > 0 ? gp / rt : 0, eit = gp > 0 ? gp * (incomeTaxRate / 100) : 0, np = gp - eit, nm = rt > 0 ? np / rt : 0, cps = sqft > 0 ? tc / sqft : 0;
    return { materialLines: ml, totalMaterialCost: tmc, techLines: tl, laborCost: lc, totalCost: tc, salesTaxAmount: sta, effectiveRetail: er, retailTotal: rt, customerTotal: ct, grossProfit: gp, grossMargin: gm, estimatedIncomeTax: eit, netProfit: np, netMargin: nm, costPerSqft: cps };
  }, [sqft, selectedId, salesTaxRate, incomeTaxRate, wastePercent, retailOverride, hasOverride, excludedMats, coverageOverrides, technicians, sundries, crackFiller, misc, excludeSundries, excludeCrackFiller, excludeMisc, system]);
  if (!system || !calc) return <div style={{ ...cardStyle, textAlign: "center", padding: 48 }}><div style={{ fontSize: 14, color: S.textDim }}>No systems configured. Go to <strong>Manage Systems</strong>.</div></div>;
  const mc = calc.grossMargin >= 0.4 ? S.green : calc.grossMargin >= 0.2 ? S.amber : S.red;
  const nc = calc.netProfit >= 0 ? S.green : S.red;
  return (
    <div>
      <div className="grid-2col" style={{ marginBottom: 24 }}>
        <div style={cardStyle}><div style={labelStyle}>Epoxy System</div><div style={{ display: "flex", flexDirection: "column", gap: 7 }}>{systemList.map((sys) => (<button key={sys.id} onClick={() => set({ selectedId: sys.id })} style={{ background: selectedId === sys.id ? `linear-gradient(135deg, ${S.amber}18, ${S.amber}08)` : S.surface, border: selectedId === sys.id ? `1.5px solid ${S.amber}` : `1.5px solid ${S.surfaceBorder}`, borderRadius: 10, padding: "11px 14px", textAlign: "left", cursor: "pointer", transition: "all 0.15s" }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><div style={{ fontSize: 13, fontWeight: 600, color: selectedId === sys.id ? S.textBright : S.textMuted }}>{sys.name}</div><div style={{ fontFamily: "'JetBrains Mono'", fontSize: 11, color: S.textDim }}>{fmt(sys.retailPerSqft)}/sqft</div></div><div style={{ fontSize: 10, color: S.textDim, marginTop: 2, lineHeight: 1.3 }}>{sys.description}</div></button>))}</div></div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={cardStyle}><div style={labelStyle}>Project Size</div><div style={{ display: "flex", alignItems: "baseline", gap: 8 }}><input type="number" value={sqft} onChange={(e) => set({ sqft: Math.max(0, parseInt(e.target.value) || 0) })} style={{ fontFamily: "'JetBrains Mono'", fontSize: 34, fontWeight: 600, background: "transparent", border: "none", color: S.textBright, width: 170, outline: "none" }} /><span style={{ fontSize: 15, color: S.textDim, fontWeight: 500 }}>sq ft</span></div><input type="range" min={50} max={10000} step={50} value={sqft} onChange={(e) => set({ sqft: parseInt(e.target.value) })} style={{ width: "100%", marginTop: 10, accentColor: S.amber, height: 4 }} /><div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: S.textFaint, marginTop: 3 }}><span>50</span><span>10,000</span></div></div>
          <div style={cardStyle}><div className="grid-2col-fields"><Field label="Waste Factor" value={wastePercent} onChange={(v) => set({ wastePercent: v })} suffix="%" step={1} /><Field label="Mat. Sales Tax" value={salesTaxRate} onChange={(v) => set({ salesTaxRate: v })} suffix="%" step={0.1} /><Field label="Income Tax Rate" value={incomeTaxRate} onChange={(v) => set({ incomeTaxRate: v })} suffix="%" step={1} /><Field label="Retail Price Override" value={retailOverride} onChange={setRO} prefix="$" suffix="/ sq ft" step={0.25} placeholder={system.retailPerSqft.toFixed(2)} highlight /></div></div>
        </div>
      </div>
      <div className="grid-3col">
        <div style={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", ...labelStyle }}><span>Materials Breakdown</span>{calc.materialLines.some((m) => m.excluded) && <span style={{ fontSize: 10, fontWeight: 500, color: S.amber, textTransform: "none", letterSpacing: "0" }}>{calc.materialLines.filter((m) => m.excluded).length} excluded</span>}</div>
          <div className="table-scroll">
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 520 }}><thead><tr style={{ borderBottom: `1px solid ${S.cardBorder}` }}><th style={{ width: 32, padding: "8px 4px" }}></th>{["Material","Cov/Unit","Qty","Unit","Unit Cost","Line Total"].map((h) => <th key={h} style={{ textAlign: h==="Material"?"left":"right", fontSize: 10, fontWeight: 600, color: S.textFaint, textTransform: "uppercase", letterSpacing: "0.8px", padding: "8px 6px" }}>{h}</th>)}</tr></thead>
          <tbody>
            {calc.materialLines.map((m, i) => {
              const covVal = getCovOverride(m.id);
              const isOvr = m.hasCovOverride;
              return (<tr key={m.id} style={{ borderBottom: `1px solid ${S.surface}`, opacity: m.excluded ? 0.35 : 1, transition: "opacity 0.2s ease" }}>
                <td style={{ padding: "11px 4px", textAlign: "center" }}><Checkbox checked={!m.excluded} onChange={() => toggleMat(m.id)} /></td>
                <td style={{ padding: "11px 6px", fontSize: 13, fontWeight: 500, color: m.excluded ? S.textFaint : "#c8cad2", textDecoration: m.excluded ? "line-through" : "none" }}>{m.name}</td>
                <td style={{ padding: "5px 6px", textAlign: "right" }}>
                  <div style={{ display: "inline-flex", alignItems: "center", background: isOvr ? `${S.amber}0c` : S.surface, border: isOvr ? `1.5px solid ${S.amber}` : `1px solid ${S.surfaceBorder}`, borderRadius: 6, padding: "3px 6px", maxWidth: 100 }}>
                    <input type="number" value={covVal} onChange={(e) => setCovOverride(m.id, e.target.value)} style={{ ...inputField, fontSize: 12, width: 50, textAlign: "right", color: isOvr ? S.amber : S.text }} step={10} placeholder={String(m.coveragePerUnit)} />
                    <span style={{ color: isOvr ? `${S.amber}88` : S.textFaint, fontSize: 8, marginLeft: 2 }}>sqft</span>
                  </div>
                </td>
                <td style={{ padding: "11px 6px", textAlign: "right", fontFamily: "'JetBrains Mono'", fontSize: 13, color: m.excluded ? S.textFaint : S.text, fontWeight: 500 }}>{m.excluded ? "—" : m.qty.toFixed(1)}</td>
                <td style={{ padding: "11px 6px", textAlign: "right", fontSize: 11, color: S.textDim }}>{m.unit}</td>
                <td style={{ padding: "11px 6px", textAlign: "right", fontFamily: "'JetBrains Mono'", fontSize: 13, color: m.excluded ? S.textFaint : S.textMuted }}>{fmt(m.costPerUnit)}</td>
                <td style={{ padding: "11px 6px", textAlign: "right", fontFamily: "'JetBrains Mono'", fontSize: 13, color: m.excluded ? S.textFaint : S.textBright, fontWeight: 600 }}>{m.excluded ? "—" : fmt(m.cost)}</td>
              </tr>);
            })}
            <tr><td colSpan={8} style={{ padding: "4px 0", borderBottom: `1px dashed ${S.surfaceBorder}` }}></td></tr>
            <CostRow label="Crack Filler" value={crackFiller} onChangeVal={(v) => set({ crackFiller: v })} excluded={excludeCrackFiller} onToggle={() => set((p) => ({ ...p, excludeCrackFiller: !p.excludeCrackFiller }))} colSpan={5} />
            <CostRow label="Sundries" value={sundries} onChangeVal={(v) => set({ sundries: v })} excluded={excludeSundries} onToggle={() => set((p) => ({ ...p, excludeSundries: !p.excludeSundries }))} colSpan={5} />
            <CostRow label="Misc" value={misc} onChangeVal={(v) => set({ misc: v })} excluded={excludeMisc} onToggle={() => set((p) => ({ ...p, excludeMisc: !p.excludeMisc }))} colSpan={5} />
          </tbody>
          <tfoot><tr style={{ borderTop: `2px solid ${S.surfaceBorder}` }}><td colSpan={7} style={{ padding: "14px 6px", fontSize: 13, fontWeight: 700, color: S.textBright }}>Total Materials</td><td style={{ padding: "14px 6px", textAlign: "right", fontFamily: "'JetBrains Mono'", fontSize: 16, fontWeight: 700, color: S.amber }}>{fmt(calc.totalMaterialCost)}</td></tr></tfoot></table>
          </div>
          <div style={{ marginTop: 12, padding: "10px 14px", background: S.surface, borderRadius: 8, display: "flex", justifyContent: "space-between", fontSize: 12, color: S.textDim }}><span>Material cost / sq ft</span><span style={{ fontFamily: "'JetBrains Mono'", color: S.textMuted, fontWeight: 600 }}>{fmt(sqft > 0 ? calc.totalMaterialCost / sqft : 0)}</span></div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={cardStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", ...labelStyle }}><span>Labor / Technicians</span><button onClick={addT} style={{ ...btnBase, background: "rgba(59,130,246,0.1)", color: S.blue, padding: "4px 10px", fontSize: 11, border: `1px solid rgba(59,130,246,0.25)` }}><PlusIcon size={12} /> Add</button></div>
            {technicians.length === 0 && <div style={{ textAlign: "center", padding: 24, color: S.textDim, fontSize: 12 }}>No technicians.</div>}
            {technicians.map((tech) => (<div key={tech.id} style={{ background: S.surface, border: `1px solid ${S.surfaceBorder}`, borderRadius: 10, padding: "12px 14px", marginBottom: 8, opacity: tech.enabled ? 1 : 0.35, transition: "opacity 0.2s" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}><Checkbox checked={tech.enabled} onChange={() => upT(tech.id, "enabled", !tech.enabled)} color={S.blue} /><input type="text" value={tech.name} onChange={(e) => upT(tech.id, "name", e.target.value)} style={{ ...textInputStyle, fontSize: 13, fontWeight: 600, flex: 1 }} placeholder="Name" /><button onClick={() => rmT(tech.id)} style={{ ...btnBase, background: "rgba(239,68,68,0.08)", color: "#f87171", padding: 5, border: `1px solid rgba(239,68,68,0.15)`, flexShrink: 0 }}><TrashIcon size={12} /></button></div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div><div style={{ fontSize: 9, fontWeight: 600, color: S.textFaint, textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 4 }}>Hourly Rate</div><div style={{ ...inputWrap, padding: "5px 8px" }}><span style={{ color: S.textFaint, fontSize: 11, marginRight: 2 }}>$</span><input type="number" value={tech.hourlyRate} onChange={(e) => upT(tech.id, "hourlyRate", parseFloat(e.target.value) || 0)} style={{ ...inputField, fontSize: 13 }} step={1} /><span style={{ color: S.textFaint, fontSize: 9 }}>/hr</span></div></div>
                <div><div style={{ fontSize: 9, fontWeight: 600, color: S.textFaint, textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 4 }}>Man Hours</div><div style={{ ...inputWrap, padding: "5px 8px" }}><input type="number" value={tech.manHours} onChange={(e) => upT(tech.id, "manHours", parseFloat(e.target.value) || 0)} style={{ ...inputField, fontSize: 13 }} step={0.5} /><span style={{ color: S.textFaint, fontSize: 9 }}>hrs</span></div></div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, paddingTop: 8, borderTop: `1px solid ${S.surfaceBorder}` }}><span style={{ fontSize: 11, color: S.textDim }}>Subtotal</span><span style={{ fontFamily: "'JetBrains Mono'", fontSize: 13, fontWeight: 600, color: tech.enabled ? S.textBright : S.textFaint }}>{tech.enabled ? fmt(tech.hourlyRate * tech.manHours) : "—"}</span></div>
            </div>))}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0 0", borderTop: `2px solid ${S.surfaceBorder}`, marginTop: 4 }}><span style={{ fontSize: 13, fontWeight: 700, color: S.textBright }}>Total Labor</span><span style={{ fontFamily: "'JetBrains Mono'", fontSize: 16, fontWeight: 700, color: S.blue }}>{fmt(calc.laborCost)}</span></div>
          </div>
          <div style={{ ...cardStyle, background: `linear-gradient(135deg, ${S.amber}0a, ${S.amber}04)`, border: `1px solid ${S.amber}33` }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}><span style={{ fontSize: 12, color: S.textMuted }}>Materials</span><span style={{ fontFamily: "'JetBrains Mono'", fontSize: 13, color: S.text }}>{fmt(calc.totalMaterialCost)}</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}><span style={{ fontSize: 12, color: S.textMuted }}>Labor</span><span style={{ fontFamily: "'JetBrains Mono'", fontSize: 13, color: S.text }}>{fmt(calc.laborCost)}</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 10, borderTop: `2px solid ${S.amber}33` }}><span style={{ fontSize: 14, fontWeight: 700, color: S.textBright }}>Total Project Cost</span><span style={{ fontFamily: "'JetBrains Mono'", fontSize: 18, fontWeight: 700, color: S.amber }}>{fmt(calc.totalCost)}</span></div>
            <div style={{ fontSize: 11, color: S.textDim, textAlign: "right", marginTop: 4, fontFamily: "'JetBrains Mono'" }}>{fmt(calc.costPerSqft)} / sq ft</div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={cardStyle}>
            <div style={labelStyle}>Customer Invoice</div>
            {[{ label: `Retail (${fmt(calc.effectiveRetail)}/sqft × ${sqft})`, value: calc.retailTotal }, { label: `Sales Tax on Materials (${salesTaxRate}%)`, value: calc.salesTaxAmount }].map((r, i) => (<div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${S.surface}` }}><span style={{ fontSize: 13, color: S.textMuted }}>{r.label}</span><span style={{ fontFamily: "'JetBrains Mono'", fontSize: 14, color: S.text, fontWeight: 500 }}>{fmt(r.value)}</span></div>))}
            {hasOverride && <div style={{ fontSize: 10, color: S.amber, marginTop: 6, display: "flex", alignItems: "center", gap: 4 }}><span>●</span> Retail override active</div>}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 14, marginTop: 4 }}><span style={{ fontSize: 14, fontWeight: 700, color: S.textBright }}>Customer Total</span><span style={{ fontFamily: "'JetBrains Mono'", fontSize: 22, fontWeight: 700, color: S.textBright }}>{fmt(calc.customerTotal)}</span></div>
          </div>
          <div style={{ background: `linear-gradient(135deg, ${S.green}0a, ${S.green}04)`, border: `1px solid ${S.green}33`, borderRadius: 14, padding: 22 }}>
            <div style={{ ...labelStyle, color: S.green }}>Profit Analysis</div>
            {[{ label: "Revenue", value: calc.retailTotal, color: S.text }, { label: "Total Cost", value: -calc.totalCost, color: S.red }].map((r, i) => (<div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0" }}><span style={{ fontSize: 13, color: S.textMuted }}>{r.label}</span><span style={{ fontFamily: "'JetBrains Mono'", fontSize: 14, color: r.color, fontWeight: 500 }}>{r.value < 0 ? `(${fmt(Math.abs(r.value))})` : fmt(r.value)}</span></div>))}
            <div style={{ borderTop: `2px solid ${S.green}33`, marginTop: 8, paddingTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}><div style={{ fontSize: 13, fontWeight: 700, color: S.textBright }}>Gross Profit</div><span style={{ fontFamily: "'JetBrains Mono'", fontSize: 20, fontWeight: 700, color: calc.grossProfit >= 0 ? S.green : S.red }}>{fmt(calc.grossProfit)}</span></div>
            <div style={{ marginTop: 10 }}><div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}><span style={{ fontSize: 10, color: S.textDim, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.6px" }}>Gross Margin</span><span style={{ fontFamily: "'JetBrains Mono'", fontSize: 13, fontWeight: 700, color: mc }}>{fmtPct(calc.grossMargin)}</span></div><div style={{ height: 7, borderRadius: 4, background: S.surface, overflow: "hidden" }}><div style={{ height: "100%", borderRadius: 4, width: `${Math.max(0, Math.min(100, calc.grossMargin * 100))}%`, background: `linear-gradient(90deg, ${mc}, ${mc}cc)`, transition: "width 0.4s ease" }} /></div></div>
            <div style={{ borderTop: `1px solid ${S.green}22`, marginTop: 14, paddingTop: 10 }}><div style={{ display: "flex", justifyContent: "space-between", padding: "7px 0" }}><span style={{ fontSize: 13, color: S.textMuted }}>Est. Income Tax ({incomeTaxRate}%)</span><span style={{ fontFamily: "'JetBrains Mono'", fontSize: 14, color: "#f87171", fontWeight: 500 }}>({fmt(calc.estimatedIncomeTax)})</span></div></div>
            <div style={{ borderTop: `2px solid ${S.green}33`, marginTop: 6, paddingTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}><div><div style={{ fontSize: 14, fontWeight: 700, color: S.textBright }}>Net Profit</div><div style={{ fontSize: 10, color: S.textDim, marginTop: 1 }}>after est. income tax</div></div><span style={{ fontFamily: "'JetBrains Mono'", fontSize: 22, fontWeight: 700, color: nc }}>{fmt(calc.netProfit)}</span></div>
            <div style={{ marginTop: 10 }}><div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}><span style={{ fontSize: 10, color: S.textDim, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.6px" }}>Net Margin</span><span style={{ fontFamily: "'JetBrains Mono'", fontSize: 13, fontWeight: 700, color: nc }}>{fmtPct(calc.netMargin)}</span></div><div style={{ height: 7, borderRadius: 4, background: S.surface, overflow: "hidden" }}><div style={{ height: "100%", borderRadius: 4, width: `${Math.max(0, Math.min(100, calc.netMargin * 100))}%`, background: `linear-gradient(90deg, ${nc}, ${nc}cc)`, transition: "width 0.4s ease" }} /></div></div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {[{ label: "Material Cost", value: fmt(calc.totalMaterialCost), sub: `${fmt(sqft > 0 ? calc.totalMaterialCost / sqft : 0)}/sqft` }, { label: "Labor Cost", value: fmt(calc.laborCost), sub: `${technicians.filter((t) => t.enabled).length} tech active` }, { label: "Net / sqft", value: fmt(sqft > 0 ? calc.netProfit / sqft : 0), sub: "after tax" }, { label: "Tax Collected", value: fmt(calc.salesTaxAmount), sub: "on materials" }].map((s, i) => (<div key={i} style={{ background: S.card, border: `1px solid ${S.cardBorder}`, borderRadius: 10, padding: "13px 14px" }}><div style={{ fontSize: 9, fontWeight: 600, color: S.textFaint, textTransform: "uppercase", letterSpacing: "0.8px" }}>{s.label}</div><div style={{ fontFamily: "'JetBrains Mono'", fontSize: 15, fontWeight: 700, color: S.text, marginTop: 4 }}>{s.value}</div><div style={{ fontSize: 10, color: S.textDim, marginTop: 2 }}>{s.sub}</div></div>))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SyncDot({ status }) {
  const c = status === "saved" ? S.green : status === "saving" ? S.amber : S.red;
  const l = status === "saved" ? "Saved" : status === "saving" ? "Saving..." : "Sync error";
  return <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: S.textDim }}><div style={{ width: 6, height: 6, borderRadius: 3, background: c, transition: "background 0.3s" }} />{l}</div>;
}

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [systems, setSystems] = useState(DEFAULT_SYSTEMS);
  const [settings, setSettingsRaw] = useState(DEFAULT_SETTINGS);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [tab, setTab] = useState("estimate");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => { setSession(session); setLoading(false); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) { setDataLoaded(false); setSystems(DEFAULT_SYSTEMS); setSettingsRaw(DEFAULT_SETTINGS); }
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session?.user?.id) return;
    const load = async () => {
      try {
        const [sysRes, setRes] = await Promise.all([
          supabase.from("user_systems").select("data").eq("user_id", session.user.id).maybeSingle(),
          supabase.from("user_settings").select("data").eq("user_id", session.user.id).maybeSingle(),
        ]);
        if (sysRes.data?.data) setSystems(sysRes.data.data);
        if (setRes.data?.data) setSettingsRaw((prev) => ({ ...DEFAULT_SETTINGS, ...setRes.data.data }));
      } catch (e) { console.error("Load failed:", e); }
      setDataLoaded(true);
    };
    load();
  }, [session?.user?.id]);

  const set = useCallback((patch) => { setSettingsRaw((prev) => typeof patch === "function" ? patch(prev) : { ...prev, ...patch }); }, []);
  const systemsSync = useDebouncedSave("user_systems", session?.user?.id, systems, dataLoaded);
  const settingsSync = useDebouncedSave("user_settings", session?.user?.id, settings, dataLoaded);
  const overallSync = systemsSync === "error" || settingsSync === "error" ? "error" : systemsSync === "saving" || settingsSync === "saving" ? "saving" : "saved";
  const handleSignOut = async () => { await supabase.auth.signOut(); };

  if (loading) return <div style={{ minHeight: "100vh", background: S.bg, display: "flex", alignItems: "center", justifyContent: "center", color: S.textDim, fontFamily: "'DM Sans'" }}>Loading...</div>;
  if (!session) return <Auth />;

  return (
    <div style={{ fontFamily: "'DM Sans', 'Segoe UI', sans-serif", background: S.bg, color: S.text, minHeight: "100vh" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input[type="number"] { -moz-appearance: textfield; }
        input::-webkit-outer-spin-button, input::-webkit-inner-spin-button { -webkit-appearance: none; }
        select { -moz-appearance: none; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #2a2d38; border-radius: 3px; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        .grid-2col { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .grid-3col { display: grid; grid-template-columns: 1.3fr 0.9fr 1fr; gap: 20px; }
        .grid-2col-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .header-bar { padding: 0 32px; }
        .header-inner { display: flex; align-items: center; gap: 14px; padding-top: 20px; padding-bottom: 8px; }
        .header-user { display: flex; align-items: center; gap: 16px; }
        .header-email { font-size: 12px; color: #6b7084; }
        .content-area { padding: 24px 32px; max-width: 1400px; margin: 0 auto; }
        .table-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; }
        .mat-editor-row { display: flex; gap: 12px; align-items: flex-end; flex-wrap: wrap; }
        @media (max-width: 900px) {
          .grid-2col { grid-template-columns: 1fr; }
          .grid-3col { grid-template-columns: 1fr; }
          .header-bar { padding: 0 16px; }
          .content-area { padding: 16px; }
          .header-inner { flex-wrap: wrap; gap: 10px; }
          .header-user { width: 100%; justify-content: space-between; padding-bottom: 4px; }
          .header-email { font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 180px; }
        }
        @media (max-width: 600px) {
          .grid-2col-fields { grid-template-columns: 1fr; }
          .content-area { padding: 12px; }
          .header-bar { padding: 0 12px; }
          .mat-editor-row { flex-direction: column; align-items: stretch; }
          .mat-editor-row > div, .mat-editor-row > button { flex: 1 1 100% !important; }
        }
      `}</style>
      <div className="header-bar" style={{ background: "linear-gradient(135deg, #14161d, #1a1d28)", borderBottom: `1px solid ${S.cardBorder}` }}>
        <div className="header-inner">
          <div style={{ width: 38, height: 38, borderRadius: 10, background: `linear-gradient(135deg, ${S.amber}, ${S.amberDark})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700, color: S.bg, flexShrink: 0 }}>E</div>
          <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontWeight: 700, fontSize: 19, color: S.textBright, letterSpacing: "-0.5px" }}>Epoxy Floor Estimator</div><div style={{ fontSize: 11, color: S.textDim, marginTop: 1 }}>Material costs · Pricing · Profit analysis</div></div>
          <div className="header-user"><SyncDot status={overallSync} /><div className="header-email">{session.user.email}</div><button onClick={handleSignOut} style={{ ...btnBase, background: S.surface, color: S.textMuted, padding: "6px 14px", fontSize: 12, border: `1px solid ${S.surfaceBorder}`, flexShrink: 0 }}>Sign Out</button></div>
        </div>
        <div style={{ display: "flex", gap: 0, marginTop: 8 }}>{[{ id: "estimate", label: "Estimator" }, { id: "manage", label: "Manage Systems" }].map((t) => (<button key={t.id} onClick={() => setTab(t.id)} style={{ ...btnBase, background: "transparent", color: tab === t.id ? S.amber : S.textDim, padding: "10px 20px", fontSize: 13, borderRadius: 0, borderBottom: tab === t.id ? `2px solid ${S.amber}` : "2px solid transparent" }}>{t.label}</button>))}</div>
      </div>
      <div className="content-area">
        {tab === "estimate" ? <Estimator systems={systems} settings={settings} set={set} /> : <SystemManager systems={systems} setSystems={setSystems} />}
      </div>
    </div>
  );
}
