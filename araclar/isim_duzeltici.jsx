import { useState, useEffect, useCallback } from "react";

// Türkçe karakter dönüşüm çiftleri — yaygın hatalar
const TR_FIXES = [
  // I/İ karışıklığı
  { wrong: /KIR[İI]C[İI]/g,  right: "KIRICI" },
  { wrong: /K[İI]R[İI]C[İI]/g, right: "KIRICI" },
  // Genel: büyük I yerine İ gelmesi gereken durumlar (sözcük içi)
  // Küçük ı yerine i gelmesi
  // Bunlar için kelime bazlı öneri sistemi kullanıyoruz
];

// Türkçe büyük harf düzeltme: "OZAN KIRICI" → kontrol
// Temel kural: Türkçe'de büyük I → İ, küçük i → ı dönüşümü
function trUpperCase(s) {
  return s
    .replace(/i/g, "İ")
    .replace(/ı/g, "I")
    .toUpperCase()
    .replace(/I/g, "I")   // İngilizce I kalır I
    .replace(/İ/g, "İ");  // Türkçe İ kalır
}

// Bir kelimede Türkçe karakter sorunlarını tespit et
function detectIssues(word) {
  // Sadece büyük harf kelimelerde çalış
  if (word !== word.toUpperCase()) return [];
  const issues = [];

  // "I" harfi Türkçe'de sesli olmayan I (ı'nın büyüğü)
  // "İ" harfi sesli I (i'nin büyüğü)
  // Yaygın hata: İngilizce klavye ile I yerine İ yazılamaması
  // Türkçe'de İ olması gereken yerde I var mı?
  
  // Türkçe'de I ile biten/başlayan heceler — İ olması gereken durumlar
  // Örnek: KİRİCİ → KIRICI, SİNAN → SINAN (değişmez), İBRAHİM → İBRAHİM
  
  // ASCII "I" ile yazılmış ama "İ" olması gereken durumları bul
  // Kural: sesli uyumu — ince ünlüler (e,i,ö,ü) ile gelen I → İ olmalı
  const vowelMap = { "A": "kalın", "I": "kalın", "O": "kalın", "U": "kalın",
                     "E": "ince", "İ": "ince", "Ö": "ince", "Ü": "ince" };
  
  // I harflerini bul
  for (let i = 0; i < word.length; i++) {
    if (word[i] === "I") {
      // Önceki veya sonraki sesliyi bak
      let prevVowel = null, nextVowel = null;
      for (let j = i - 1; j >= 0; j--) {
        if (vowelMap[word[j]]) { prevVowel = word[j]; break; }
      }
      for (let j = i + 1; j < word.length; j++) {
        if (vowelMap[word[j]]) { nextVowel = word[j]; break; }
      }
      const ref = prevVowel || nextVowel;
      if (ref && vowelMap[ref] === "ince") {
        issues.push({ pos: i, type: "I→İ", char: "I", suggest: "İ" });
      }
    } else if (word[i] === "İ") {
      // İ harfi — kalın ünlü ortamında mı?
      let prevVowel = null;
      for (let j = i - 1; j >= 0; j--) {
        if (vowelMap[word[j]]) { prevVowel = word[j]; break; }
      }
      if (prevVowel && vowelMap[prevVowel] === "kalın" && prevVowel !== "İ") {
        issues.push({ pos: i, type: "İ→I", char: "İ", suggest: "I" });
      }
    }
  }
  return issues;
}

function suggestCorrection(word) {
  const issues = detectIssues(word);
  if (!issues.length) return null;
  let corrected = word.split("");
  issues.forEach(issue => { corrected[issue.pos] = issue.suggest; });
  return corrected.join("");
}

function analyzeName(fullName) {
  const words = fullName.trim().split(/\s+/);
  const suggestions = [];
  words.forEach((word, idx) => {
    const sugg = suggestCorrection(word);
    if (sugg && sugg !== word) {
      suggestions.push({ wordIdx: idx, original: word, suggested: sugg });
    }
  });
  return suggestions;
}

export default function IsimDuzeltici() {
  const [input, setInput] = useState("");
  const [names, setNames] = useState([]);
  const [processed, setProcessed] = useState(false);

  const parseNames = useCallback(() => {
    const lines = input.split("\n").map(l => l.trim()).filter(Boolean);
    const parsed = lines.map((line, i) => {
      const suggs = analyzeName(line);
      return {
        id: i,
        original: line,
        current: line,
        suggestions: suggs,
        confirmed: suggs.length === 0, // sorun yoksa zaten onaylı
        changed: false,
      };
    });
    setNames(parsed);
    setProcessed(true);
  }, [input]);

  const applySuggestion = (nameId, wordIdx, suggested) => {
    setNames(prev => prev.map(n => {
      if (n.id !== nameId) return n;
      const words = n.current.split(/\s+/);
      words[wordIdx] = suggested;
      const newCurrent = words.join(" ");
      const newSuggs = n.suggestions.filter(s => s.wordIdx !== wordIdx);
      return { ...n, current: newCurrent, suggestions: newSuggs, changed: newCurrent !== n.original, confirmed: newSuggs.length === 0 };
    }));
  };

  const rejectSuggestion = (nameId, wordIdx) => {
    setNames(prev => prev.map(n => {
      if (n.id !== nameId) return n;
      const newSuggs = n.suggestions.filter(s => s.wordIdx !== wordIdx);
      return { ...n, suggestions: newSuggs, confirmed: newSuggs.length === 0 };
    }));
  };

  const manualEdit = (nameId, val) => {
    setNames(prev => prev.map(n => {
      if (n.id !== nameId) return n;
      return { ...n, current: val.toUpperCase(), changed: val.toUpperCase() !== n.original };
    }));
  };

  const copyAll = () => {
    const text = names.map(n => n.current).join("\n");
    navigator.clipboard.writeText(text).then(() => {
      alert("Tüm isimler kopyalandı!");
    });
  };

  const pendingCount = names.filter(n => n.suggestions.length > 0).length;
  const changedCount = names.filter(n => n.changed).length;

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0f0f13",
      fontFamily: "'Segoe UI', Tahoma, sans-serif",
      color: "#e2e8f0",
      padding: "0",
    }}>
      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
        borderBottom: "1px solid #2d3748",
        padding: "24px 32px",
        display: "flex",
        alignItems: "center",
        gap: "16px",
      }}>
        <div style={{
          width: 48, height: 48,
          background: "linear-gradient(135deg, #e53e3e, #fc8181)",
          borderRadius: 14,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 22,
        }}>Ş</div>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.5px", color: "#fff" }}>
            Türkçe İsim Düzeltici
          </div>
          <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>
            I / İ karakter hatalarını otomatik tespit & düzelt
          </div>
        </div>
      </div>

      <div style={{ padding: "28px 32px", maxWidth: 860, margin: "0 auto" }}>

        {!processed ? (
          /* GİRİŞ EKRANI */
          <div>
            <div style={{
              background: "#1a1a2e",
              border: "1.5px solid #2d3748",
              borderRadius: 16,
              padding: 24,
              marginBottom: 20,
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#94a3b8", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                İsimleri Yapıştırın
              </div>
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder={"Her satıra bir isim\nÖrnek:\nOZAN KİRİCİ\nAYŞE DEMIR\nMEHMET YILDIZ"}
                style={{
                  width: "100%",
                  minHeight: 220,
                  background: "#0f0f13",
                  border: "1.5px solid #2d3748",
                  borderRadius: 10,
                  color: "#e2e8f0",
                  fontSize: 14,
                  padding: "12px 14px",
                  fontFamily: "'Courier New', monospace",
                  resize: "vertical",
                  outline: "none",
                  boxSizing: "border-box",
                  lineHeight: 1.7,
                }}
              />
              <div style={{ fontSize: 11, color: "#64748b", marginTop: 8 }}>
                {input.split("\n").filter(l => l.trim()).length} isim girildi
              </div>
            </div>

            <button
              onClick={parseNames}
              disabled={!input.trim()}
              style={{
                background: input.trim() ? "linear-gradient(135deg, #e53e3e, #c53030)" : "#2d3748",
                color: input.trim() ? "#fff" : "#64748b",
                border: "none",
                borderRadius: 12,
                padding: "14px 32px",
                fontSize: 14,
                fontWeight: 800,
                cursor: input.trim() ? "pointer" : "not-allowed",
                letterSpacing: "0.03em",
                transition: "all .15s",
              }}
            >
              Analiz Et →
            </button>

            {/* Açıklama */}
            <div style={{
              marginTop: 28,
              background: "#1a1a2e",
              border: "1.5px solid #2d3748",
              borderRadius: 12,
              padding: "16px 20px",
            }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", marginBottom: 10, textTransform: "uppercase" }}>Nasıl Çalışır?</div>
              <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.8 }}>
                • Sesli uyumu kuralına göre <span style={{ color: "#fc8181", fontWeight: 700 }}>I → İ</span> ve <span style={{ color: "#68d391", fontWeight: 700 }}>İ → I</span> hatalarını tespit eder<br/>
                • Her öneriyi onaylayabilir veya reddedebilirsiniz<br/>
                • Manuel düzenleme de yapabilirsiniz<br/>
                • Sonunda tüm düzeltilmiş isimleri kopyalarsınız
              </div>
            </div>
          </div>
        ) : (
          /* SONUÇ EKRANI */
          <div>
            {/* Üst bar */}
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 20,
              flexWrap: "wrap",
              gap: 12,
            }}>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <div style={{
                  background: pendingCount > 0 ? "#2d1a1a" : "#1a2d1a",
                  border: `1.5px solid ${pendingCount > 0 ? "#e53e3e" : "#38a169"}`,
                  borderRadius: 10, padding: "8px 16px",
                  fontSize: 13, fontWeight: 700,
                  color: pendingCount > 0 ? "#fc8181" : "#68d391",
                }}>
                  {pendingCount > 0 ? `⚠ ${pendingCount} bekleyen öneri` : "✓ Tüm öneriler işlendi"}
                </div>
                {changedCount > 0 && (
                  <div style={{
                    background: "#1a2340",
                    border: "1.5px solid #4299e1",
                    borderRadius: 10, padding: "8px 16px",
                    fontSize: 13, fontWeight: 700, color: "#63b3ed",
                  }}>
                    {changedCount} isim değişti
                  </div>
                )}
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={() => { setProcessed(false); setNames([]); }}
                  style={{
                    background: "#1a1a2e", border: "1.5px solid #2d3748",
                    color: "#94a3b8", borderRadius: 10, padding: "9px 18px",
                    fontSize: 13, fontWeight: 700, cursor: "pointer",
                  }}
                >
                  ← Geri
                </button>
                <button
                  onClick={copyAll}
                  style={{
                    background: "linear-gradient(135deg, #276749, #38a169)",
                    border: "none", color: "#fff", borderRadius: 10,
                    padding: "9px 22px", fontSize: 13, fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  Tümünü Kopyala
                </button>
              </div>
            </div>

            {/* İsim kartları */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {names.map(n => (
                <div key={n.id} style={{
                  background: n.suggestions.length > 0 ? "#1f1520" : n.changed ? "#121f17" : "#141418",
                  border: `1.5px solid ${n.suggestions.length > 0 ? "#702459" : n.changed ? "#276749" : "#2d3748"}`,
                  borderRadius: 12,
                  padding: "14px 18px",
                  transition: "border-color .2s",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                    {/* Sol: numara */}
                    <div style={{
                      width: 28, height: 28, borderRadius: 8,
                      background: "#2d3748", display: "flex",
                      alignItems: "center", justifyContent: "center",
                      fontSize: 11, fontWeight: 800, color: "#94a3b8",
                      flexShrink: 0,
                    }}>
                      {n.id + 1}
                    </div>

                    {/* Orta: isim (düzenlenebilir) */}
                    <input
                      value={n.current}
                      onChange={e => manualEdit(n.id, e.target.value)}
                      style={{
                        flex: 1,
                        background: "transparent",
                        border: "none",
                        color: n.changed ? "#68d391" : "#e2e8f0",
                        fontSize: 15,
                        fontWeight: 800,
                        fontFamily: "'Courier New', monospace",
                        letterSpacing: "0.05em",
                        outline: "none",
                        minWidth: 160,
                      }}
                    />

                    {/* Sağ: durum */}
                    <div style={{ fontSize: 11, color: "#475569", flexShrink: 0 }}>
                      {n.suggestions.length > 0
                        ? <span style={{ color: "#f687b3" }}>● Öneri var</span>
                        : n.changed
                        ? <span style={{ color: "#68d391" }}>✓ Değiştirildi</span>
                        : <span style={{ color: "#4a5568" }}>— Sorun yok</span>
                      }
                    </div>
                  </div>

                  {/* Öneriler */}
                  {n.suggestions.map(s => (
                    <div key={s.wordIdx} style={{
                      marginTop: 10,
                      background: "#0f0f13",
                      border: "1px solid #702459",
                      borderRadius: 9,
                      padding: "10px 14px",
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      flexWrap: "wrap",
                    }}>
                      <div style={{ fontSize: 12, color: "#94a3b8", flex: 1, minWidth: 120 }}>
                        <span style={{ color: "#fc8181", fontFamily: "monospace", fontWeight: 700 }}>{s.original}</span>
                        <span style={{ margin: "0 8px", color: "#4a5568" }}>→</span>
                        <span style={{ color: "#68d391", fontFamily: "monospace", fontWeight: 700 }}>{s.suggested}</span>
                        <span style={{ marginLeft: 8, color: "#64748b", fontSize: 11 }}>
                          ({s.type === "I→İ" ? "I yerine İ" : "İ yerine I"})
                        </span>
                      </div>
                      <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                        <button
                          onClick={() => applySuggestion(n.id, s.wordIdx, s.suggested)}
                          style={{
                            background: "linear-gradient(135deg, #276749, #38a169)",
                            border: "none", color: "#fff",
                            borderRadius: 8, padding: "6px 14px",
                            fontSize: 12, fontWeight: 800, cursor: "pointer",
                          }}
                        >
                          Evet, Düzelt
                        </button>
                        <button
                          onClick={() => rejectSuggestion(n.id, s.wordIdx)}
                          style={{
                            background: "#2d3748", border: "1px solid #4a5568",
                            color: "#94a3b8", borderRadius: 8, padding: "6px 14px",
                            fontSize: 12, fontWeight: 700, cursor: "pointer",
                          }}
                        >
                          Hayır
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {/* Alt kopyala */}
            {names.length > 5 && (
              <div style={{ textAlign: "center", marginTop: 20 }}>
                <button
                  onClick={copyAll}
                  style={{
                    background: "linear-gradient(135deg, #276749, #38a169)",
                    border: "none", color: "#fff", borderRadius: 12,
                    padding: "13px 36px", fontSize: 14, fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  Tümünü Kopyala ({names.length} isim)
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
