"use client";

import { useState } from "react";
import { Search, Upload, Folder, FileText, Eye, Download, Trash2 } from "lucide-react";

const mockDocuments = [
  { id: "1", name: "Invoice_2024_Q3.pdf", type: "Invoice", dateAdded: "Nov 10, 2024", size: "2.4 MB", source: "QuickBooks", ref: "INV-2024-089" },
  { id: "2", name: "Contract_Acme_2024.pdf", type: "Contract", dateAdded: "Oct 22, 2024", size: "1.1 MB", source: "Manual", ref: "" },
];

export default function DocumentsTab() {
  const [search, setSearch] = useState("");

  const filtered = mockDocuments.filter(
    (d) =>
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      (d.ref ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <h3 className="text-lg font-semibold text-white">Document Management</h3>
          <div className="flex gap-2">
            <button
              type="button"
              className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-xl hover:bg-teal-500"
            >
              <Upload className="w-4 h-4" />
              Upload document
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-700 border border-slate-600 text-slate-300 text-sm font-medium rounded-xl hover:bg-slate-600"
            >
              <Folder className="w-4 h-4" />
              New folder
            </button>
          </div>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search documents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-700 border border-slate-600 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
          />
        </div>

        <div className="border border-slate-600 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-700/30 border-b border-slate-600">
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Date added</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Size</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Source</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-slate-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {filtered.map((doc) => (
                <tr key={doc.id} className="hover:bg-slate-700/20">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-blue-400 shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-white">{doc.name}</p>
                        {doc.ref && <p className="text-xs text-slate-500">{doc.ref}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-400">{doc.type}</td>
                  <td className="px-4 py-3 text-sm text-slate-400">{doc.dateAdded}</td>
                  <td className="px-4 py-3 text-sm text-slate-400">{doc.size}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 text-xs rounded ${
                        doc.source === "QuickBooks"
                          ? "bg-emerald-500/20 text-emerald-400"
                          : "bg-slate-600 text-slate-300"
                      }`}
                    >
                      {doc.source}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-center gap-2">
                      <button type="button" className="p-1.5 text-slate-400 hover:text-white rounded">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button type="button" className="p-1.5 text-slate-400 hover:text-white rounded">
                        <Download className="w-4 h-4" />
                      </button>
                      <button type="button" className="p-1.5 text-red-400 hover:text-red-300 rounded">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
