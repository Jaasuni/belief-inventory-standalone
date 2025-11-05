(() => {
  const qs = s => document.querySelector(s);
  const ce = (t, attrs={}) => Object.assign(document.createElement(t), attrs);

  const C = window.WORKSHEET || {};
  const {
    id="worksheet_v1",
    title="Worksheet",
    intro="Complete the fields below. Data stays in your browser.",
    sections=[],
    believability=null, // {id,label,min,max,default,minPass,gateMsg}
    exportName="worksheet.txt",
    gdocTitlePrefix="Worksheet"
  } = C;

  const KEY = id;

  // Title + intro
  document.title = title;
  const root = qs("#ws-root");
  const meta = ce("p", {className:"meta", textContent:intro});
  root.appendChild(meta);

  // Render sections/fields
  const fieldEls = {};
  sections.forEach(sec => {
    const h2 = ce("h2"); h2.textContent = sec.title || "";
    root.appendChild(h2);
    (sec.fields||[]).forEach(f => {
      const row = ce("div", {className:"row"});
      const lab = ce("label", {htmlFor:f.id, textContent:f.label || f.id});
      row.appendChild(lab);
      let input;
      if (f.type === "text") {
        input = ce("input", {id:f.id, type:"text"}); input.className="text";
      } else if (f.type === "range") {
        input = ce("input", {id:f.id, type:"range", min:f.min||1, max:f.max||10, step:f.step||1, value:f.value ?? (f.default ?? 7)});
      } else {
        input = ce("textarea", {id:f.id, placeholder:f.placeholder||""});
      }
      row.appendChild(input);
      if (f.count === true && input.tagName === "TEXTAREA") {
        const cnt = ce("div", {className:"meta small", id:f.id+"Count"});
        const upd = () => cnt.textContent = (input.value||"").length + " characters";
        input.addEventListener("input", upd); upd(); row.appendChild(cnt);
      }
      fieldEls[f.id] = input;
      root.appendChild(row);
    });
  });

  // Believability slider (optional)
  let belInput=null, belVal=null, belGate=null;
  if (believability) {
    const row = ce("div", {className:"row"});
    const lab = ce("label", {htmlFor:believability.id, textContent:believability.label || "Believability:"});
    belInput = ce("input", {id:believability.id, type:"range", min:believability.min||1, max:believability.max||10, step:1, value:believability.default||7});
    belVal = ce("span", {className:"meta", id:believability.id+"Val"});
    belGate = ce("div", {className:"hint", id:believability.id+"Gate", textContent: believability.gateMsg || "Believability is below threshold — rewrite until it feels ≥ target."});
    const wrap = ce("div"); wrap.appendChild(lab); wrap.appendChild(document.createTextNode(" "));
    wrap.appendChild(belInput); wrap.appendChild(document.createTextNode(" ")); wrap.appendChild(belVal);
    row.appendChild(wrap); root.appendChild(row); root.appendChild(belGate);
    const updateBel = () => {
      const v = parseInt(belInput.value||"0",10);
      belVal.textContent = ` ${v} / ${(believability.max||10)}`;
      belGate.classList.toggle("show", v < (believability.minPass||7));
    };
    belInput.addEventListener("input", updateBel); updateBel();
  }

  // Controls
  const ctr = ce("div", {className:"controls"});
  const btnSave = ce("button", {id:"save", type:"button", textContent:"Save"});
  const btnLoad = ce("button", {id:"load", type:"button", textContent:"Load"});
  const btnExport = ce("button", {id:"exportTxt", type:"button", textContent:"Export .txt"});
  const btnPrint = ce("button", {id:"printBtn", type:"button", textContent:"Print / Save PDF"});
  const btnGdoc = ce("button", {id:"gdoc", type:"button", textContent:"Export → Google Doc", title:"Creates a Google Doc in your Drive"});
  const btnClear = ce("button", {id:"clearBtn", type:"button", textContent:"Clear", title:"Clear fields and remove local save"});
  [btnSave,btnLoad,btnExport,btnPrint,btnGdoc,btnClear].forEach(b=>ctr.appendChild(b));
  root.appendChild(ctr);

  // Status + last saved
  const status = ce("div", {id:"status", className:"status meta", ariaLive:"polite"}); root.appendChild(status);
  const lastSaved = ce("span", {id:"lastSaved", className:"meta"}); root.appendChild(lastSaved);

  const say = m => status.textContent = m;
  const fmt = ms => new Date(ms).toLocaleString([], {year:'numeric',month:'short',day:'2-digit',hour:'2-digit',minute:'2-digit'});

  // Data helpers
  const getData = () => {
    const out = {}; Object.keys(fieldEls).forEach(k => out[k]=fieldEls[k].value);
    if (belInput) out[believability.id] = parseInt(belInput.value||"0",10);
    return out;
  };
  const setData = (d) => {
    Object.keys(fieldEls).forEach(k => fieldEls[k].value = d[k] || "");
    if (belInput) { belInput.value = d[believability.id] ?? believability.default ?? 7; belInput.dispatchEvent(new Event("input")); }
    Object.keys(fieldEls).forEach(k => {
      const cnt = document.getElementById(k+"Count");
      if (cnt && fieldEls[k].tagName==="TEXTAREA") cnt.textContent = (fieldEls[k].value||"").length + " characters";
    });
  };

  // Save/Load/Clear
  btnSave.onclick = () => { const now=Date.now(); localStorage.setItem(KEY, JSON.stringify({...getData(), t:now})); lastSaved.textContent="Saved: "+fmt(now); say("Saved."); };
  btnLoad.onclick = () => { const d=JSON.parse(localStorage.getItem(KEY)||"{}"); setData(d); lastSaved.textContent=d.t?("Saved: "+fmt(d.t)):""; say(d.t?"Loaded previous save.":"Nothing saved yet."); };
  btnClear.onclick = () => { if(!confirm("Clear fields and remove the saved copy?")) return; setData({}); try{localStorage.removeItem(KEY);}catch(_){} lastSaved.textContent=""; say("Cleared."); };

  // Export .txt
  btnExport.onclick = () => {
    const d = getData(); const lines=[`${title}\n`];
    sections.forEach(sec => {
      lines.push(sec.title.toUpperCase());
      (sec.fields||[]).forEach(f => { lines.push(`${f.label||f.id}:`); lines.push(`${d[f.id]||""}\n`); });
    });
    if (belInput) lines.push(`Believability: ${d[believability.id]||0} / ${believability.max||10}\n`);
    const blob = new Blob([lines.join("\n")], {type:"text/plain"});
    const a = ce("a", {href:URL.createObjectURL(blob)}); a.download = exportName; a.click(); say("Exported .txt");
  };

  // Print
  btnPrint.onclick = () => window.print();

  // Google Export (GIS OAuth)
  function setG(enabled){ btnGdoc.disabled=!enabled; btnGdoc.title = enabled ? "Creates a Google Doc in your Drive" : "Google export not configured (owner must set GOOGLE_CLIENT_ID)."; }
  const googleEnabled = !!(window.GOOGLE_CLIENT_ID && String(window.GOOGLE_CLIENT_ID).length>10);
  setG(googleEnabled);

  async function ensureGIS(){
    if(window.google && window.google.accounts && window.google.accounts.oauth2) return window.google;
    await new Promise((res,rej)=>{ const s=document.createElement("script"); s.src="https://accounts.google.com/gsi/client"; s.onload=res; s.onerror=rej; document.head.appendChild(s); });
    return window.google;
  }
  async function exportToGoogleDoc(){
    try{
      const google = await ensureGIS();
      const tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: window.GOOGLE_CLIENT_ID,
        scope: "https://www.googleapis.com/auth/drive.file",
        callback: async (resp)=>{
          if(!resp || resp.error) return alert("Authorization failed.");
          const d = getData();
          const docTitle = `${gdocTitlePrefix} ${new Date().toISOString().slice(0,10)}`;
          let body = "";
          sections.forEach(sec => {
            body += sec.title.toUpperCase()+"\n";
            (sec.fields||[]).forEach(f => { body += (f.label||f.id)+":\n"+(d[f.id]||"")+"\n\n"; });
          });
          if (belInput) body += `Believability: ${d[believability.id]||0} / ${believability.max||10}\n`;

          const meta = { name: docTitle, mimeType: "application/vnd.google-apps.document" };
          const boundary = "-------wsboundary"+Math.random().toString(16).slice(2);
          const multi = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n`+
                        JSON.stringify(meta)+`\r\n--${boundary}\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n`+
                        body+`\r\n--${boundary}--`;
          const r = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", {
            method:"POST", headers:{ "Authorization":"Bearer "+resp.access_token, "Content-Type":"multipart/related; boundary="+boundary }, body: multi
          });
          if(!r.ok) return alert("Drive upload failed: "+r.status);
          const j = await r.json(); if(confirm("Open the new Google Doc?")) window.open("https://docs.google.com/document/d/"+j.id+"/edit","_blank","noopener");
        }
      });
      tokenClient.requestAccessToken();
    }catch(e){ console.error(e); alert("Google init failed."); }
  }
  if (googleEnabled) btnGdoc.onclick = exportToGoogleDoc;

  // Autosave
  setInterval(() => { try{ const now=Date.now(); localStorage.setItem(KEY, JSON.stringify({ ...getData(), t: now })); }catch(_){ } }, 10000);

  // Initial lastSaved
  try{ const d = JSON.parse(localStorage.getItem(KEY)||"{}"); if(d.t){ lastSaved.textContent = "Saved: " + fmt(d.t); } }catch(_){}
})();
