import { useEffect, useState } from "react";
import { Viewer } from "./components/Viewer";
import { TextLab } from "./components/TextLab";
import { CipherLab } from "./components/CipherLab";
import { About } from "./components/About";

type Tab = "lab" | "cipher" | "viewer" | "about";

export default function App() {
  const [tab, setTab] = useState<Tab>("lab");
  const [theme, setTheme] = useState<string>(() => localStorage.getItem("quirelab-theme") ?? "");

  useEffect(() => {
    if (theme) {
      document.documentElement.setAttribute("data-theme", theme);
      localStorage.setItem("quirelab-theme", theme);
    } else {
      document.documentElement.removeAttribute("data-theme");
      localStorage.removeItem("quirelab-theme");
    }
  }, [theme]);

  function cycleTheme() {
    setTheme((t) => (t === "" ? "dark" : t === "dark" ? "light" : ""));
  }

  return (
    <>
      <header className="site-header">
        <div className="wordmark">
          Quire<span>Lab</span>
        </div>
        <div className="tagline">Computational analysis of historical manuscripts</div>
        <button className="theme-toggle" onClick={cycleTheme} title="Cycle theme: auto / dark / light">
          {theme === "" ? "◐ auto" : theme === "dark" ? "● dark" : "○ light"}
        </button>
      </header>
      <nav className="tabs">
        <button className={tab === "lab" ? "active" : ""} onClick={() => setTab("lab")}>
          Text Lab
        </button>
        <button className={tab === "cipher" ? "active" : ""} onClick={() => setTab("cipher")}>
          Cipher Lab
        </button>
        <button className={tab === "viewer" ? "active" : ""} onClick={() => setTab("viewer")}>
          Manuscript Viewer
        </button>
        <button className={tab === "about" ? "active" : ""} onClick={() => setTab("about")}>
          About &amp; Methods
        </button>
      </nav>
      {tab === "lab" && <TextLab />}
      {tab === "cipher" && <CipherLab />}
      {tab === "viewer" && <Viewer />}
      {tab === "about" && <About />}
      <footer>
        QuireLab · open manuscript analytics · images &amp; transliterations remain the property of
        their institutions — see About &amp; Methods for credits.
      </footer>
    </>
  );
}
