import React from "react";
import { createRoot } from "react-dom/client";
import TasksApp from "../TasksApp.jsx";   // ← UNCOMMENT THIS

const root = createRoot(document.getElementById("root"));
root.render(<TasksApp />);