import React, { useState } from "react";
import { HashRouter as Router, Routes, Route, Navigate, Link, useNavigate } from "react-router-dom";

const menuItems = ["Home", "About Us", "Contact Me"];

export default function HomePage() {
  const [selected, setSelected] = useState("Home");

  return (
    <div style={{
      display: "flex",
      minHeight: "100vh",
      backgroundColor: "#000",
      color: "white",
      fontFamily: "'Arial Black', Arial, sans-serif",
      padding: "40px",
      boxSizing: "border-box",
      gap: "60px",
      alignItems: "center",
      justifyContent: "center",
    }}>
      {/* Left side */}
      <div style={{ flex: 1, maxWidth: 500 }}>
        {/* Menu */}
        <nav style={{ display: "flex", gap: "40px", marginBottom: 60 }}>
          {menuItems.map(item => (
            <div
              key={item}
              onClick={() => setSelected(item)}
              style={{
                cursor: "pointer",
                fontWeight: "bold",
                color: "white",
                borderBottom: selected === item ? "2px solid white" : "none",
                paddingBottom: 4,
                userSelect: "none",
              }}
            >
              {item}
            </div>
          ))}
        </nav>

        {/* Title */}
        <h1 style={{ fontSize: 72, fontWeight: "bold", margin: 0, lineHeight: 1 }}>
          Curios
        </h1>

        {/* Description */}
        <p style={{ fontWeight: "normal", fontSize: 18, marginTop: 16, maxWidth: 400, color: "#ddd" }}>
          Η εφαρμογή που σου βοηθά να ανακαλύψεις νέα ενδιαφέροντα και να εξερευνήσεις τον κόσμο γύρω σου με απλό και διασκεδαστικό τρόπο.
        </p>

        {/* Download Button */}
        <a
          href="#"
          style={{
            marginTop: 40,
            display: "inline-block",
            padding: "12px 28px",
            backgroundColor: "white",
            color: "black",
            fontWeight: "bold",
            fontSize: 16,
            borderRadius: 6,
            textDecoration: "none",
            userSelect: "none",
          }}
        >
          Download App Store
        </a>
      </div>

      {/* Right side */}
      <div style={{ flex: 1, display: "flex", justifyContent: "flex-end" }}>
        {/* Φωτογραφία εδώ - θα την αλλάξεις εσύ */}
        <img
          src="https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80"
          alt="Curios Illustration"
          style={{ maxWidth: "100%", borderRadius: 12, objectFit: "cover", maxHeight: 400 }}
        />
      </div>
    </div>
  );
}