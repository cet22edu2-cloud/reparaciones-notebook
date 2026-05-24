import { useState, useEffect } from "react";

// ─────────────────────────────────────────────
// ⚙️  CONFIGURACIÓN EMAILJS
// Reemplaza estos valores con los tuyos de emailjs.com
// ─────────────────────────────────────────────
const EMAILJS_SERVICE_ID       = "service_i4iiue6";
const EMAILJS_PUBLIC_KEY       = "S9pFD_PvAe5ZeTFqJ";
const EMAILJS_TEMPLATE_INGRESO = "template_rymqt73";
const EMAILJS_TEMPLATE_LISTO   = "template_9pdf4ii";

const STORAGE_KEY = "notebook-repairs";

const STATUS_CONFIG = {
  pendiente:          { label: "Pendiente",           color: "#F59E0B", bg: "#FEF3C7", icon: "⏳" },
  en_proceso:         { label: "En Proceso",          color: "#3B82F6", bg: "#DBEAFE", icon: "🔧" },
  esperando_repuesto: { label: "Esperando Repuesto",  color: "#8B5CF6", bg: "#EDE9FE", icon: "📦" },
  listo:              { label: "Listo para Entregar", color: "#10B981", bg: "#D1FAE5", icon: "✅" },
  entregado:          { label: "Entregado",           color: "#6B7280", bg: "#F3F4F6", icon: "🏁" },
};

const EMPTY_FORM = {
  cliente: "", telefono: "", email: "", marca: "", modelo: "",
  serial: "", falla_reportada: "", diagnostico: "", repuestos: "",
  tecnico: "", fecha_ingreso: new Date().toISOString().split("T")[0],
  fecha_estimada: "", estado: "pendiente", notas: "",
};

function generateId() {
  return "REP-" + Date.now().toString(36).toUpperCase();
}

// ─── EmailJS ───
async function enviarCorreoEmailJS(templateId, datos) {
  try {
    const res = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        service_id: EMAILJS_SERVICE_ID,
        template_id: templateId,
        user_id: EMAILJS_PUBLIC_KEY,
        template_params: datos,
      }),
    });
    return res.status === 200;
  } catch { return false; }
}

// ─── Mercado Libre ───
function buscarEnML(termino) {
  if (!termino?.trim()) { alert("No hay repuestos o falla cargados para buscar."); return; }
  window.open(`https://listado.mercadolibre.com.ar/${encodeURIComponent(termino.trim())}`, "_blank");
}
function armarBusquedaML(rep) {
  if (rep.repuestos?.trim()) return rep.repuestos.trim();
  if (rep.falla_reportada?.trim()) return `${rep.marca} ${rep.modelo} ${rep.falla_reportada}`.trim();
  return `${rep.marca} ${rep.modelo} repuesto`.trim();
}

// ─────────────────────────────────────────────
// UI COMPONENTS
// ─────────────────────────────────────────────
const inp = {
  padding: "8px 12px", border: "1.5px solid #E2E8F0", borderRadius: 8,
  fontSize: 13, color: "#0F172A", background: "#F8FAFC", outline: "none",
  transition: "border-color 0.15s", fontFamily: "inherit",
};
const btnBase = {
  padding: "10px 18px", border: "none", borderRadius: 8,
  fontSize: 13, fontWeight: 700, cursor: "pointer", transition: "opacity 0.15s",
};
const btnSm = {
  width: 30, height: 30, border: "none", borderRadius: 6,
  cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center",
};
const lbl  = { fontSize: 10, color: "#94A3B8", textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 700 };
const hint = { margin: "0 0 10px", fontSize: 12, color: "#64748B" };

function Badge({ status }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span style={{
      background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}40`,
      padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700,
      letterSpacing: 0.4, whiteSpace: "nowrap",
    }}>{cfg.icon} {cfg.label}</span>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(15,23,42,0.7)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 1000, padding: 16, backdropFilter: "blur(4px)",
    }}>
      <div style={{
        background: "#fff", borderRadius: 16, width: "100%", maxWidth: 700,
        maxHeight: "90vh", overflow: "auto", boxShadow: "0 25px 60px rgba(0,0,0,0.3)",
      }}>
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "20px 24px 16px", position: "sticky", top: 0,
          background: "#fff", borderBottom: "1px solid #E2E8F0", zIndex: 1,
        }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#0F172A" }}>{title}</h2>
          <button onClick={onClose} style={{
            background: "#F1F5F9", border: "none", borderRadius: 8, width: 32, height: 32,
            cursor: "pointer", fontSize: 16, color: "#64748B",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>✕</button>
        </div>
        <div style={{ padding: "20px 24px 24px" }}>{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children, col = 1 }) {
  return (
    <div style={{ gridColumn: `span ${col}`, display: "flex", flexDirection: "column", gap: 4 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: "#64748B", textTransform: "uppercase", letterSpacing: 0.5 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function SectionNotif({ title, color, bg, children }) {
  return (
    <div style={{ border: `1.5px solid ${color}30`, borderRadius: 10, overflow: "hidden" }}>
      <div style={{ background: bg, padding: "8px 14px", fontSize: 13, fontWeight: 700, color }}>{title}</div>
      <div style={{ padding: "12px 14px" }}>{children}</div>
    </div>
  );
}

function BtnNotif({ color, onClick, disabled, children }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      background: color, color: "#fff", border: "none", borderRadius: 8,
      padding: "8px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer",
      opacity: disabled ? 0.6 : 1, display: "flex", alignItems: "center", gap: 6,
    }}>{children}</button>
  );
}

// ─── Panel Notificaciones (solo correo) ───
function NotifPanel({ rep, onClose }) {
  const [sending, setSending] = useState(false);
  const [log, setLog] = useState([]);
  const addLog = (msg) => setLog(p => [{ msg, time: new Date().toLocaleTimeString() }, ...p]);

  const enviarCorreo = async (tipo) => {
    if (!rep.email) { addLog("❌ Sin email — agrega el correo del cliente primero."); return; }
    setSending(true);
    const templateId = tipo === "ingreso" ? EMAILJS_TEMPLATE_INGRESO : EMAILJS_TEMPLATE_LISTO;
    const ok = await enviarCorreoEmailJS(templateId, {
      to_email: rep.email,
      cliente_nombre: rep.cliente,
      repair_id: rep.id,
      marca: rep.marca,
      modelo: rep.modelo,
      falla: rep.falla_reportada || "Sin especificar",
      fecha: rep.fecha_ingreso,
      fecha_estimada: rep.fecha_estimada || "Por confirmar",
    });
    addLog(ok
      ? `✅ Correo de ${tipo} enviado a ${rep.email}`
      : "❌ Error al enviar. Revisa tu configuración EmailJS.");
    setSending(false);
  };

  return (
    <Modal title={`📣 Notificar a ${rep.cliente}`} onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

        {/* Info */}
        <div style={{ background: "#F8FAFC", borderRadius: 10, padding: "12px 16px", display: "flex", gap: 24, flexWrap: "wrap" }}>
          <div><span style={lbl}>Equipo</span><br /><b>{rep.marca} {rep.modelo}</b></div>
          <div><span style={lbl}>Orden</span><br />
            <code style={{ background: "#EFF6FF", color: "#3B82F6", padding: "1px 6px", borderRadius: 4, fontSize: 12 }}>{rep.id}</code>
          </div>
          <div><span style={lbl}>Email</span><br />
            <span style={{ color: rep.email ? "#0F172A" : "#EF4444" }}>{rep.email || "⚠️ Sin email"}</span>
          </div>
        </div>

        <SectionNotif title="📥 Confirmación de Ingreso" color="#3B82F6" bg="#EFF6FF">
          <p style={hint}>Avisa al cliente que su equipo fue recibido en el taller.</p>
          <BtnNotif color="#3B82F6" disabled={sending} onClick={() => enviarCorreo("ingreso")}>
            📧 Enviar correo de ingreso
          </BtnNotif>
        </SectionNotif>

        <SectionNotif title="✅ Listo para Retirar" color="#10B981" bg="#D1FAE5">
          <p style={hint}>Notifica al cliente que su equipo está reparado y puede pasar a buscarlo.</p>
          <BtnNotif color="#10B981" disabled={sending} onClick={() => enviarCorreo("listo")}>
            📧 Enviar correo de entrega
          </BtnNotif>
        </SectionNotif>

        {log.length > 0 && (
          <div style={{ background: "#0F172A", borderRadius: 10, padding: "12px 14px" }}>
            <div style={{ fontSize: 11, color: "#64748B", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>Registro de envíos</div>
            {log.map((l, i) => (
              <div key={i} style={{ fontSize: 12, color: "#94A3B8", padding: "3px 0", borderBottom: "1px solid #1E293B" }}>
                <span style={{ color: "#475569", marginRight: 8 }}>{l.time}</span>{l.msg}
              </div>
            ))}
          </div>
        )}

        {sending && <div style={{ textAlign: "center", color: "#6366F1", fontSize: 13, fontWeight: 600 }}>⏳ Enviando...</div>}

        <div style={{ background: "#FEF9C3", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "#92400E" }}>
          💡 <b>Antes de usar:</b> configura tus credenciales de EmailJS en las primeras líneas del código (SERVICE_ID, PUBLIC_KEY, TEMPLATE IDs).
        </div>

        <button onClick={onClose} style={{ ...btnBase, background: "#F1F5F9", color: "#64748B", alignSelf: "flex-end" }}>Cerrar</button>
      </div>
    </Modal>
  );
}

// ─── Panel Mercado Libre ───
function MLSearchPanel({ rep }) {
  const sugerencias = [];
  if (rep.repuestos?.trim()) {
    rep.repuestos.split(/[,\n]+/).forEach(s => {
      const t = s.trim();
      if (t) sugerencias.push(`${rep.marca} ${rep.modelo} ${t}`);
    });
  }
  if (rep.falla_reportada?.trim()) sugerencias.push(`${rep.marca} ${rep.modelo} ${rep.falla_reportada}`);
  sugerencias.push(`repuestos ${rep.marca} ${rep.modelo}`);

  const [query, setQuery] = useState(sugerencias[0] || "");

  return (
    <div style={{ border: "1.5px solid #F5A62330", borderRadius: 12, overflow: "hidden", marginTop: 16 }}>
      <div style={{
        background: "linear-gradient(135deg, #FFF8E7, #FEF3C7)",
        padding: "10px 16px", display: "flex", alignItems: "center", gap: 10,
        borderBottom: "1px solid #F5A62320",
      }}>
        <span style={{ fontSize: 20 }}>🛒</span>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#92400E" }}>Buscar repuestos en Mercado Libre</div>
          <div style={{ fontSize: 11, color: "#B45309" }}>Consulta precios sin salir del sistema</div>
        </div>
      </div>
      <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Ej: Dell Inspiron pantalla 15.6..."
            style={{
              flex: 1, padding: "8px 12px", border: "1.5px solid #F5A623",
              borderRadius: 8, fontSize: 13, color: "#0F172A",
              background: "#FFFBF0", outline: "none", fontFamily: "inherit",
            }}
          />
          <button onClick={() => buscarEnML(query)} style={{
            background: "linear-gradient(135deg, #F5A623, #F59E0B)",
            border: "none", borderRadius: 8, padding: "8px 16px",
            color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer",
            whiteSpace: "nowrap", boxShadow: "0 2px 8px rgba(245,166,35,0.35)",
          }}>Buscar 🔍</button>
        </div>
        <div>
          <div style={{ fontSize: 10, color: "#94A3B8", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Búsquedas sugeridas</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {sugerencias.slice(0, 4).map((s, i) => (
              <button key={i} onClick={() => setQuery(s)} style={{
                background: query === s ? "#FEF3C7" : "#F8FAFC",
                border: `1px solid ${query === s ? "#F5A623" : "#E2E8F0"}`,
                borderRadius: 20, padding: "4px 10px", fontSize: 11,
                color: query === s ? "#92400E" : "#475569",
                cursor: "pointer", fontWeight: query === s ? 700 : 400,
                maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }} title={s}>{s.length > 40 ? s.slice(0, 40) + "…" : s}</button>
            ))}
          </div>
        </div>
        <div style={{ fontSize: 11, color: "#94A3B8" }}>💡 Podés editar el texto antes de buscar. Se abre en una nueva pestaña.</div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// APP PRINCIPAL
// ─────────────────────────────────────────────
export default function App() {
  const [repairs, setRepairs]           = useState([]);
  const [modal, setModal]               = useState(null);
  const [selected, setSelected]         = useState(null);
  const [form, setForm]                 = useState(EMPTY_FORM);
  const [search, setSearch]             = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [notifTarget, setNotifTarget]   = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await window.storage.get(STORAGE_KEY);
        if (r?.value) setRepairs(JSON.parse(r.value));
      } catch {}
    })();
  }, []);

  const save = async (data) => {
    try { await window.storage.set(STORAGE_KEY, JSON.stringify(data)); } catch {}
    setRepairs(data);
  };

  const openNew    = () => { setForm({ ...EMPTY_FORM, fecha_ingreso: new Date().toISOString().split("T")[0] }); setModal("new"); };
  const openEdit   = (r) => { setForm({ ...r }); setSelected(r); setModal("edit"); };
  const openView   = (r) => { setSelected(r); setModal("view"); };
  const closeModal = () => { setModal(null); setSelected(null); };
  const f          = (v) => setForm(p => ({ ...p, ...v }));

  const handleSubmit = async () => {
    if (!form.cliente || !form.marca || !form.modelo) {
      alert("Cliente, marca y modelo son obligatorios."); return;
    }
    if (modal === "new") {
      const newRepair = { ...form, id: generateId(), creado: new Date().toISOString() };
      await save([newRepair, ...repairs]);
      closeModal();
      setTimeout(() => setNotifTarget(newRepair), 300);
    } else {
      await save(repairs.map(r => r.id === selected.id
        ? { ...form, id: r.id, creado: r.creado, actualizado: new Date().toISOString() } : r));
      closeModal();
    }
  };

  const handleDelete = async (id) => {
    await save(repairs.filter(r => r.id !== id));
    setDeleteConfirm(null);
  };

  const handleStatusChange = async (id, newStatus) => {
    const updated = repairs.map(r => r.id === id
      ? { ...r, estado: newStatus, actualizado: new Date().toISOString() } : r);
    await save(updated);
    if (newStatus === "listo") {
      const rep = updated.find(r => r.id === id);
      setTimeout(() => setNotifTarget(rep), 200);
    }
  };

  const filtered = repairs.filter(r => {
    const q = search.toLowerCase();
    const matchSearch = !q || r.cliente?.toLowerCase().includes(q) || r.modelo?.toLowerCase().includes(q) ||
      r.marca?.toLowerCase().includes(q) || r.id?.toLowerCase().includes(q) || r.serial?.toLowerCase().includes(q);
    return matchSearch && (filterStatus === "all" || r.estado === filterStatus);
  });

  const stats = Object.keys(STATUS_CONFIG).reduce((a, k) =>
    ({ ...a, [k]: repairs.filter(r => r.estado === k).length }), {});

  return (
    <div style={{ fontFamily: "'DM Sans','Segoe UI',sans-serif", minHeight: "100vh", background: "#F0F4F8" }}>

      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg, #1E293B 0%, #0F172A 100%)",
        padding: "20px 24px", display: "flex", alignItems: "center", justifyContent: "space-between",
        boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 40, height: 40, background: "linear-gradient(135deg, #3B82F6, #8B5CF6)",
            borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20,
          }}>💻</div>
          <div>
            <h1 style={{ margin: 0, color: "#fff", fontSize: 18, fontWeight: 800, letterSpacing: -0.5 }}>NotebookFix</h1>
            <p style={{ margin: 0, color: "#94A3B8", fontSize: 11 }}>Sistema de Gestión de Reparaciones</p>
          </div>
        </div>
        <button onClick={openNew} style={{
          background: "linear-gradient(135deg, #3B82F6, #6366F1)", border: "none", borderRadius: 10,
          color: "#fff", padding: "10px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer",
          display: "flex", alignItems: "center", gap: 6, boxShadow: "0 4px 12px rgba(99,102,241,0.4)",
        }}>＋ Nueva Reparación</button>
      </div>

      <div style={{ padding: "20px 24px", maxWidth: 1200, margin: "0 auto" }}>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 12, marginBottom: 20 }}>
          {Object.entries(STATUS_CONFIG).map(([k, cfg]) => (
            <div key={k} onClick={() => setFilterStatus(filterStatus === k ? "all" : k)} style={{
              background: "#fff", borderRadius: 12, padding: "12px 14px", cursor: "pointer",
              border: `2px solid ${filterStatus === k ? cfg.color : "transparent"}`,
              boxShadow: filterStatus === k ? `0 4px 12px ${cfg.color}30` : "0 1px 3px rgba(0,0,0,0.08)",
              transition: "all 0.15s",
            }}>
              <div style={{ fontSize: 22, marginBottom: 4 }}>{cfg.icon}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: cfg.color }}>{stats[k]}</div>
              <div style={{ fontSize: 10, color: "#64748B", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.3 }}>{cfg.label}</div>
            </div>
          ))}
          <div onClick={() => setFilterStatus("all")} style={{
            background: "linear-gradient(135deg,#1E293B,#334155)", borderRadius: 12, padding: "12px 14px", cursor: "pointer",
          }}>
            <div style={{ fontSize: 22, marginBottom: 4 }}>📊</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#fff" }}>{repairs.length}</div>
            <div style={{ fontSize: 10, color: "#94A3B8", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.3 }}>Total</div>
          </div>
        </div>

        {/* Buscador */}
        <div style={{
          background: "#fff", borderRadius: 12, padding: "12px 16px", marginBottom: 16,
          display: "flex", gap: 12, alignItems: "center", boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
        }}>
          <span style={{ fontSize: 16 }}>🔍</span>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por cliente, marca, modelo, serial o ID..."
            style={{ ...inp, flex: 1, background: "transparent", border: "none", padding: 0, fontSize: 14 }} />
          {search && <button onClick={() => setSearch("")} style={{ background: "none", border: "none", cursor: "pointer", color: "#94A3B8", fontSize: 16 }}>✕</button>}
        </div>

        {/* Tabla */}
        <div style={{ background: "#fff", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
          {filtered.length === 0 ? (
            <div style={{ padding: 60, textAlign: "center", color: "#94A3B8" }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🔧</div>
              <p style={{ margin: 0, fontWeight: 600 }}>
                {repairs.length === 0 ? "Sin reparaciones registradas. ¡Agrega la primera!" : "No se encontraron resultados."}
              </p>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#F8FAFC", borderBottom: "2px solid #E2E8F0" }}>
                    {["ID", "Cliente", "Equipo", "Falla", "Estado", "Ingreso", "Acciones"].map(h => (
                      <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: 0.5, whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r, i) => (
                    <tr key={r.id} style={{ borderBottom: "1px solid #F1F5F9", background: i % 2 === 0 ? "#fff" : "#FAFBFC" }}>
                      <td style={{ padding: "10px 14px" }}>
                        <span style={{ fontFamily: "monospace", fontSize: 11, background: "#EFF6FF", color: "#3B82F6", padding: "2px 6px", borderRadius: 4, fontWeight: 700 }}>{r.id}</span>
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        <div style={{ fontWeight: 600, fontSize: 13, color: "#0F172A" }}>{r.cliente}</div>
                        <div style={{ fontSize: 11, color: "#94A3B8" }}>{r.telefono}</div>
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        <div style={{ fontWeight: 600, fontSize: 13, color: "#0F172A" }}>{r.marca} {r.modelo}</div>
                        {r.serial && <div style={{ fontSize: 11, color: "#94A3B8" }}>S/N: {r.serial}</div>}
                      </td>
                      <td style={{ padding: "10px 14px", maxWidth: 180 }}>
                        <div style={{ fontSize: 12, color: "#475569", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.falla_reportada || "—"}</div>
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        <select value={r.estado} onChange={e => handleStatusChange(r.id, e.target.value)} style={{
                          ...inp, padding: "4px 8px", fontSize: 11, cursor: "pointer",
                          background: STATUS_CONFIG[r.estado].bg, color: STATUS_CONFIG[r.estado].color,
                          fontWeight: 700, border: `1px solid ${STATUS_CONFIG[r.estado].color}40`,
                        }}>
                          {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
                        </select>
                      </td>
                      <td style={{ padding: "10px 14px", fontSize: 12, color: "#64748B", whiteSpace: "nowrap" }}>{r.fecha_ingreso}</td>
                      <td style={{ padding: "10px 14px" }}>
                        <div style={{ display: "flex", gap: 5 }}>
                          <button onClick={() => openView(r)}           title="Ver detalle"                  style={{ ...btnSm, background: "#EFF6FF", color: "#3B82F6" }}>👁</button>
                          <button onClick={() => openEdit(r)}           title="Editar"                       style={{ ...btnSm, background: "#F0FDF4", color: "#10B981" }}>✏️</button>
                          <button onClick={() => setNotifTarget(r)}     title="Notificar por correo"         style={{ ...btnSm, background: "#FFF7ED", color: "#F97316" }}>📣</button>
                          <button onClick={() => buscarEnML(armarBusquedaML(r))} title="Buscar en Mercado Libre" style={{ ...btnSm, background: "#FFF8E7", color: "#F5A623" }}>🛒</button>
                          <button onClick={() => setDeleteConfirm(r.id)} title="Eliminar"                   style={{ ...btnSm, background: "#FEF2F2", color: "#EF4444" }}>🗑</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <p style={{ textAlign: "center", color: "#94A3B8", fontSize: 11, marginTop: 12 }}>
          {filtered.length} registro{filtered.length !== 1 ? "s" : ""} · Datos guardados automáticamente
        </p>
      </div>

      {/* ── Modal Nuevo / Editar ── */}
      {(modal === "new" || modal === "edit") && (
        <Modal title={modal === "new" ? "➕ Nueva Reparación" : `✏️ Editar ${selected?.id}`} onClose={closeModal}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>

            <div style={{ gridColumn: "1/-1", background: "#EFF6FF", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "#3B82F6", fontWeight: 600 }}>👤 Datos del Cliente</div>
            <Field label="Nombre Cliente *"><input style={inp} value={form.cliente} onChange={e => f({ cliente: e.target.value })} placeholder="Nombre completo" /></Field>
            <Field label="Teléfono"><input style={inp} value={form.telefono} onChange={e => f({ telefono: e.target.value })} placeholder="+56912345678" /></Field>
            <Field label="Email" col={2}><input style={inp} value={form.email} onChange={e => f({ email: e.target.value })} placeholder="correo@ejemplo.com" /></Field>

            <div style={{ gridColumn: "1/-1", background: "#F0FDF4", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "#10B981", fontWeight: 600, marginTop: 8 }}>💻 Datos del Equipo</div>
            <Field label="Marca *"><input style={inp} value={form.marca} onChange={e => f({ marca: e.target.value })} placeholder="Dell, HP, Lenovo..." /></Field>
            <Field label="Modelo *"><input style={inp} value={form.modelo} onChange={e => f({ modelo: e.target.value })} placeholder="Inspiron 15, ThinkPad X1..." /></Field>
            <Field label="Número de Serie"><input style={inp} value={form.serial} onChange={e => f({ serial: e.target.value })} placeholder="SN123456" /></Field>
            <Field label="Técnico Asignado"><input style={inp} value={form.tecnico} onChange={e => f({ tecnico: e.target.value })} placeholder="Nombre del técnico" /></Field>

            <div style={{ gridColumn: "1/-1", background: "#FEF3C7", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "#92400E", fontWeight: 600, marginTop: 8 }}>🔧 Diagnóstico y Reparación</div>
            <Field label="Falla Reportada" col={2}><textarea style={{ ...inp, minHeight: 60, resize: "vertical" }} value={form.falla_reportada} onChange={e => f({ falla_reportada: e.target.value })} placeholder="Descripción del problema según el cliente..." /></Field>
            <Field label="Diagnóstico Técnico" col={2}><textarea style={{ ...inp, minHeight: 60, resize: "vertical" }} value={form.diagnostico} onChange={e => f({ diagnostico: e.target.value })} placeholder="Diagnóstico realizado..." /></Field>
            <Field label="Repuestos Necesarios" col={2}><textarea style={{ ...inp, minHeight: 50, resize: "vertical" }} value={form.repuestos} onChange={e => f({ repuestos: e.target.value })} placeholder="Lista de repuestos o piezas..." /></Field>
            <Field label="Estado">
              <select style={inp} value={form.estado} onChange={e => f({ estado: e.target.value })}>
                {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
              </select>
            </Field>
            <Field label="Fecha de Ingreso"><input style={inp} type="date" value={form.fecha_ingreso} onChange={e => f({ fecha_ingreso: e.target.value })} /></Field>
            <Field label="Fecha Estimada Entrega" col={2}><input style={inp} type="date" value={form.fecha_estimada} onChange={e => f({ fecha_estimada: e.target.value })} /></Field>
            <Field label="Notas Internas" col={2}><textarea style={{ ...inp, minHeight: 50, resize: "vertical" }} value={form.notas} onChange={e => f({ notas: e.target.value })} placeholder="Notas adicionales para uso interno..." /></Field>
          </div>
          {modal === "new" && (
            <div style={{ background: "#EDE9FE", borderRadius: 8, padding: "10px 14px", marginTop: 14, fontSize: 12, color: "#5B21B6" }}>
              💡 Al guardar, se abrirá el panel para notificar al cliente por correo.
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>
            <button onClick={closeModal} style={{ ...btnBase, background: "#F1F5F9", color: "#64748B" }}>Cancelar</button>
            <button onClick={handleSubmit} style={{ ...btnBase, background: "linear-gradient(135deg,#3B82F6,#6366F1)", color: "#fff", boxShadow: "0 4px 12px rgba(99,102,241,0.3)" }}>
              {modal === "new" ? "✅ Guardar Reparación" : "💾 Actualizar"}
            </button>
          </div>
        </Modal>
      )}

      {/* ── Modal Ver Detalle ── */}
      {modal === "view" && selected && (
        <Modal title={`📋 Detalle: ${selected.id}`} onClose={closeModal}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {[
              ["Cliente", selected.cliente], ["Teléfono", selected.telefono],
              ["Email", selected.email, 2],
              ["Marca", selected.marca], ["Modelo", selected.modelo],
              ["Serial", selected.serial], ["Técnico", selected.tecnico],
              ["Falla Reportada", selected.falla_reportada, 2],
              ["Diagnóstico", selected.diagnostico, 2],
              ["Repuestos", selected.repuestos, 2],
              ["Fecha Ingreso", selected.fecha_ingreso], ["Fecha Estimada", selected.fecha_estimada || "—"],
              ["Notas", selected.notas, 2],
            ].map(([label, val, col = 1]) => val ? (
              <div key={label} style={{ gridColumn: `span ${col}`, background: "#F8FAFC", borderRadius: 8, padding: "10px 12px" }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 }}>{label}</div>
                <div style={{ fontSize: 13, color: "#0F172A", fontWeight: 500 }}>{val}</div>
              </div>
            ) : null)}
            <div style={{ gridColumn: "1/-1", background: "#F8FAFC", borderRadius: 8, padding: "10px 12px" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Estado</div>
              <Badge status={selected.estado} />
            </div>
          </div>

          <MLSearchPanel rep={selected} />

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
            <button onClick={closeModal}                      style={{ ...btnBase, background: "#F1F5F9", color: "#64748B" }}>Cerrar</button>
            <button onClick={() => setNotifTarget(selected)}  style={{ ...btnBase, background: "#FFF7ED", color: "#F97316" }}>📣 Notificar</button>
            <button onClick={() => openEdit(selected)}        style={{ ...btnBase, background: "#F0FDF4", color: "#10B981" }}>✏️ Editar</button>
          </div>
        </Modal>
      )}

      {/* ── Panel Notificaciones ── */}
      {notifTarget && <NotifPanel rep={notifTarget} onClose={() => setNotifTarget(null)} />}

      {/* ── Confirmar Eliminar ── */}
      {deleteConfirm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(4px)" }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 28, maxWidth: 360, width: "90%", textAlign: "center", boxShadow: "0 25px 60px rgba(0,0,0,0.3)" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🗑️</div>
            <h3 style={{ margin: "0 0 8px", color: "#0F172A" }}>¿Eliminar reparación?</h3>
            <p style={{ margin: "0 0 20px", color: "#64748B", fontSize: 13 }}>Esta acción no se puede deshacer.</p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button onClick={() => setDeleteConfirm(null)}        style={{ ...btnBase, background: "#F1F5F9", color: "#64748B" }}>Cancelar</button>
              <button onClick={() => handleDelete(deleteConfirm)}   style={{ ...btnBase, background: "#EF4444", color: "#fff" }}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
