// /pages/index.jsx
"use client";

import { useState } from "react";
import TrialTable from "../components/TrialReg";
import OnTrialTable from "../components/OnTrial";

export default function Home() {
  const [selectedTable, setSelectedTable] = useState("trial"); // default to TrialTable

  return (
    <>
      <div className="mb-6">
        <label htmlFor="tableFilter" className="mr-2 font-semibold">Select Table:</label>
        <select
          id="tableFilter"
          value={selectedTable}
          onChange={(e) => setSelectedTable(e.target.value)}
          className="border border-gray-300 rounded px-3 py-2"
        >
          <option value="trial" className="hover:bg-blue-400">Trial Table</option>
          <option value="ontrial">On Trial Table</option>
        </select>
      </div>

      {selectedTable === "trial" && (
        <div className="border border-gray-300 shadow-lg rounded-lg">
          <TrialTable />
        </div>
      )}

      {selectedTable === "ontrial" && (
        <div className="border border-gray-300 shadow-lg rounded-lg">
          <OnTrialTable />
        </div>
      )}
    </>
  );
}
