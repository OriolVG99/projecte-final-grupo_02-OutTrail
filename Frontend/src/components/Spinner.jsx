//Component de carrega visual amb estils CSS injectats
export default function Spinner() {
  return (
    <div style={{ width: "100%", height: "100vh", display: "flex", justifyContent: "center", alignItems: "center", background: "rgba(255,255,255,0.8)" }}>
      <div className="loader"></div>
      <style>{`
        .loader {
          border: 6px solid #ddd;
          border-top: 6px solid #004c06;
          border-radius: 50%;
          width: 45px;
          height: 45px;
          animation: spin 0.7s linear infinite;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}