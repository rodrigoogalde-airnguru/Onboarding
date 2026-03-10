import { useState, useEffect } from "react";

const API_KEY = "AIzaSyAmF-5a7jaouMr0Cfm-A00ZPT00Wxx_juE";
const VIDEO_IDS = [
  "ZRogsfEKDcg","bn7TATirLUI","317-ocAmJGM","P6YdxMhUslY",
  "rTkhfbEZUhI","DdNV5w35pS0","mZY4CU05PLw","7b8hYHUCwQU",
  "MK_klO-KVmM","t8afuAgdhJg","LrmbaC-aEWc","VGUfDZfN6LM"
];

function parseDuration(iso) {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  const h = parseInt(m?.[1]||0), min = parseInt(m?.[2]||0), s = parseInt(m?.[3]||0);
  return h*3600 + min*60 + s;
}

function fmtSec(s) {
  const h = Math.floor(s/3600), m = Math.floor((s%3600)/60), sec = s%60;
  if (h > 0) return `${h}h ${m}m ${sec}s`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

export default function App() {
  const [videos, setVideos] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch_data() {
      try {
        const url = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,snippet&id=${VIDEO_IDS.join(",")}&key=${API_KEY}`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.error) throw new Error(data.error.message);
        const items = (data.items || []).map(item => ({
          id: item.id,
          title: item.snippet?.title || item.id,
          seconds: parseDuration(item.contentDetails.duration)
        }));
        setVideos(items);
      } catch(e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    fetch_data();
  }, []);

  const total = videos.reduce((a, v) => a + v.seconds, 0);
  const speeds = [0.75, 1, 1.25, 1.5, 1.75, 2];

  if (loading) return <div style={{padding:24,color:"#aaa"}}>⏳ Obteniendo duraciones de YouTube...</div>;
  if (error) return <div style={{padding:24,color:"#f66"}}>❌ Error: {error}</div>;

  return (
    <div style={{fontFamily:"Segoe UI,sans-serif",background:"#0f0f0f",minHeight:"100vh",padding:24,color:"#e0e0e0"}}>
      <h2 style={{color:"#ff4444",marginBottom:4}}>🎬 Optimization Models for Revenue Management</h2>
      <p style={{color:"#888",fontSize:"0.85rem",marginBottom:20}}>{videos.length} videos encontrados</p>

      <div style={{background:"#1a1a1a",border:"1px solid #2a2a2a",borderRadius:12,padding:20,marginBottom:16}}>
        <div style={{fontSize:"0.8rem",color:"#aaa",marginBottom:12}}>TIEMPO TOTAL</div>
        <div style={{fontSize:"2rem",fontWeight:700,color:"#ff4444"}}>{fmtSec(total)}</div>
      </div>

      <div style={{background:"#1a1a1a",border:"1px solid #2a2a2a",borderRadius:12,padding:20,marginBottom:16}}>
        <div style={{fontSize:"0.8rem",color:"#aaa",marginBottom:12}}>SEGÚN VELOCIDAD DE REPRODUCCIÓN</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
          {speeds.map(sp => (
            <div key={sp} style={{background:"#111",border:"1px solid #2a2a2a",borderRadius:8,padding:"10px",textAlign:"center"}}>
              <div style={{fontSize:"1rem",fontWeight:700,color:"#ffaa44"}}>{fmtSec(Math.round(total/sp))}</div>
              <div style={{fontSize:"0.7rem",color:"#888",marginTop:2}}>{sp}x</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{background:"#1a1a1a",border:"1px solid #2a2a2a",borderRadius:12,padding:20}}>
        <div style={{fontSize:"0.8rem",color:"#aaa",marginBottom:12}}>DETALLE POR VIDEO</div>
        {videos.map((v, i) => (
          <div key={v.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:i<videos.length-1?"1px solid #222":"none",gap:12}}>
            <span style={{color:"#555",fontSize:"0.75rem",minWidth:22}}>{i+1}.</span>
            <span style={{flex:1,fontSize:"0.82rem",color:"#ccc",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{v.title}</span>
            <span style={{fontWeight:700,color:"#ff4444",whiteSpace:"nowrap",fontSize:"0.9rem"}}>{fmtSec(v.seconds)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}