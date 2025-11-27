import {
  Clock,
  DollarSign,
  Download,
  FileText,
  Plus,
  RefreshCw,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { supabase } from "./supabaseClient";

function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [newDoc, setNewDoc] = useState({
    type: "Facture",
    numero: "",
    client: "",
    date: "",
    montantHT: "",
    tauxTVA: 20,
    statut: "En attente",
    datePaiement: "",
  });

  // Charger les documents depuis Supabase
  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .order("date", { ascending: false });

      if (error) throw error;

      // Convertir les données de la DB au format de l'app
      const formattedDocs = data.map((doc) => ({
        id: doc.id,
        type: doc.type,
        numero: doc.numero,
        client: doc.client,
        date: doc.date,
        montantHT: parseFloat(doc.montant_ht),
        tauxTVA: parseFloat(doc.taux_tva),
        statut: doc.statut,
        datePaiement: doc.date_paiement || "",
      }));

      setDocuments(formattedDocs);
    } catch (error) {
      console.error("Erreur lors du chargement:", error);
      alert("Erreur lors du chargement des données");
    } finally {
      setLoading(false);
    }
  };

  const calculateTTC = (ht, tva) => {
    return ht * (1 + tva / 100);
  };

  const availableYears = useMemo(() => {
    const years = new Set();
    documents.forEach((doc) => {
      const year = new Date(doc.date).getFullYear();
      years.add(year);
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [documents]);

  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      const docYear = new Date(doc.date).getFullYear();
      return docYear === selectedYear;
    });
  }, [documents, selectedYear]);

  const stats = useMemo(() => {
    const facturesPayees = filteredDocuments.filter(
      (d) => d.type === "Facture" && d.statut === "Payé"
    );
    const facturesEnAttente = filteredDocuments.filter(
      (d) => d.type === "Facture" && d.statut === "En attente"
    );

    const caParMois = {};
    const mois = [
      "Jan",
      "Fév",
      "Mar",
      "Avr",
      "Mai",
      "Jun",
      "Jul",
      "Aoû",
      "Sep",
      "Oct",
      "Nov",
      "Déc",
    ];

    mois.forEach((m) => {
      caParMois[m] = 0;
    });

    facturesPayees.forEach((doc) => {
      const date = new Date(doc.date);
      const moisIndex = date.getMonth();
      const moisNom = mois[moisIndex];
      caParMois[moisNom] += calculateTTC(doc.montantHT, doc.tauxTVA);
    });

    const caAnnuel = facturesPayees.reduce(
      (sum, doc) => sum + calculateTTC(doc.montantHT, doc.tauxTVA),
      0
    );

    const caEnAttente = facturesEnAttente.reduce(
      (sum, doc) => sum + calculateTTC(doc.montantHT, doc.tauxTVA),
      0
    );

    const devisEnAttente = filteredDocuments.filter(
      (d) => d.type === "Devis" && d.statut === "En attente"
    ).length;
    const nbFacturesEnAttente = facturesEnAttente.length;

    const chartDataMensuel = Object.entries(caParMois).map(
      ([mois, montant]) => ({
        mois,
        montant: parseFloat(montant.toFixed(2)),
      })
    );

    const statutData = [
      {
        name: "Payé",
        value: filteredDocuments.filter((d) => d.statut === "Payé").length,
      },
      {
        name: "En attente",
        value: filteredDocuments.filter((d) => d.statut === "En attente")
          .length,
      },
      {
        name: "Validé",
        value: filteredDocuments.filter((d) => d.statut === "Validé").length,
      },
      {
        name: "Refusé",
        value: filteredDocuments.filter((d) => d.statut === "Refusé").length,
      },
    ].filter((item) => item.value > 0);

    const typeData = [
      {
        name: "Factures",
        value: filteredDocuments.filter((d) => d.type === "Facture").length,
      },
      {
        name: "Devis",
        value: filteredDocuments.filter((d) => d.type === "Devis").length,
      },
    ];

    const clientsMap = {};
    facturesPayees.forEach((doc) => {
      if (!clientsMap[doc.client]) {
        clientsMap[doc.client] = 0;
      }
      clientsMap[doc.client] += calculateTTC(doc.montantHT, doc.tauxTVA);
    });

    const topClients = Object.entries(clientsMap)
      .map(([client, montant]) => ({ client, montant }))
      .sort((a, b) => b.montant - a.montant)
      .slice(0, 5);

    return {
      caParMois,
      caAnnuel,
      caEnAttente,
      devisEnAttente,
      nbFacturesEnAttente,
      chartDataMensuel,
      statutData,
      typeData,
      topClients,
    };
  }, [filteredDocuments]);

  const addDocument = async () => {
    if (!newDoc.numero || !newDoc.client || !newDoc.date || !newDoc.montantHT) {
      alert("Veuillez remplir tous les champs obligatoires");
      return;
    }

    try {
      const { data, error } = await supabase
        .from("documents")
        .insert([
          {
            type: newDoc.type,
            numero: newDoc.numero,
            client: newDoc.client,
            date: newDoc.date,
            montant_ht: parseFloat(newDoc.montantHT),
            taux_tva: parseFloat(newDoc.tauxTVA),
            statut: newDoc.statut,
            date_paiement: newDoc.datePaiement || null,
          },
        ])
        .select();

      if (error) throw error;

      // Recharger les documents
      await fetchDocuments();

      // Réinitialiser le formulaire
      setNewDoc({
        type: "Facture",
        numero: "",
        client: "",
        date: "",
        montantHT: "",
        tauxTVA: 20,
        statut: "En attente",
        datePaiement: "",
      });

      alert("Document ajouté avec succès !");
    } catch (error) {
      console.error("Erreur lors de l'ajout:", error);
      alert("Erreur lors de l'ajout du document");
    }
  };

  const deleteDocument = async (id) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer ce document ?")) {
      return;
    }

    try {
      const { error } = await supabase.from("documents").delete().eq("id", id);

      if (error) throw error;

      // Recharger les documents
      await fetchDocuments();
      alert("Document supprimé avec succès !");
    } catch (error) {
      console.error("Erreur lors de la suppression:", error);
      alert("Erreur lors de la suppression du document");
    }
  };

  const updateDocument = async (id, field, value) => {
    try {
      // Convertir le nom du champ pour la DB
      const dbField =
        field === "montantHT"
          ? "montant_ht"
          : field === "tauxTVA"
          ? "taux_tva"
          : field === "datePaiement"
          ? "date_paiement"
          : field;

      const { error } = await supabase
        .from("documents")
        .update({ [dbField]: value || null })
        .eq("id", id);

      if (error) throw error;

      // Recharger les documents
      await fetchDocuments();
    } catch (error) {
      console.error("Erreur lors de la mise à jour:", error);
      alert("Erreur lors de la mise à jour du document");
    }
  };

  const exportToCSV = () => {
    const headers = [
      "Type",
      "Numéro",
      "Client",
      "Date",
      "Montant HT",
      "TVA %",
      "Montant TTC",
      "Statut",
      "Date Paiement",
    ];
    const rows = filteredDocuments.map((d) => [
      d.type,
      d.numero,
      d.client,
      d.date,
      d.montantHT,
      d.tauxTVA,
      calculateTTC(d.montantHT, d.tauxTVA).toFixed(2),
      d.statut,
      d.datePaiement,
    ]);

    let csv = headers.join(",") + "\n";
    rows.forEach((row) => {
      csv += row.join(",") + "\n";
    });

    csv += `\n\nCA Annuel ${selectedYear},${stats.caAnnuel.toFixed(2)}\n`;

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `facturation_${selectedYear}.csv`;
    a.click();
  };

  const COLORS = ["#10b981", "#f59e0b", "#3b82f6", "#ef4444"];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="animate-spin h-12 w-12 text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Chargement des données...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-3xl font-bold text-gray-800">
              Gestion de Facturation
            </h1>
            <div className="flex items-center gap-4">
              <button
                onClick={fetchDocuments}
                className="flex items-center gap-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition"
                title="Actualiser"
              >
                <RefreshCw size={20} />
              </button>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="px-4 py-2 border-2 border-blue-500 rounded-lg font-semibold text-blue-700 bg-white hover:bg-blue-50 transition"
              >
                {availableYears.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
              <button
                onClick={exportToCSV}
                className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
              >
                <Download size={20} />
                Export
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 border-b">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`px-6 py-3 font-semibold transition ${
                activeTab === "dashboard"
                  ? "border-b-2 border-blue-600 text-blue-600"
                  : "text-gray-600 hover:text-gray-800"
              }`}
            >
              📊 Dashboard
            </button>
            <button
              onClick={() => setActiveTab("documents")}
              className={`px-6 py-3 font-semibold transition ${
                activeTab === "documents"
                  ? "border-b-2 border-blue-600 text-blue-600"
                  : "text-gray-600 hover:text-gray-800"
              }`}
            >
              📄 Documents
            </button>
          </div>
        </div>

        {/* Dashboard Tab */}
        {activeTab === "dashboard" && (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-medium opacity-90">
                    CA Encaissé {selectedYear}
                  </div>
                  <DollarSign className="opacity-80" size={24} />
                </div>
                <div className="text-3xl font-bold mb-1">
                  {stats.caAnnuel.toLocaleString("fr-FR", {
                    maximumFractionDigits: 0,
                  })}{" "}
                  €
                </div>
                <div className="text-xs opacity-75">Factures payées</div>
              </div>

              <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg p-6 text-white">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-medium opacity-90">
                    CA En Attente
                  </div>
                  <Clock className="opacity-80" size={24} />
                </div>
                <div className="text-3xl font-bold mb-1">
                  {stats.caEnAttente.toLocaleString("fr-FR", {
                    maximumFractionDigits: 0,
                  })}{" "}
                  €
                </div>
                <div className="text-xs opacity-75">
                  {stats.nbFacturesEnAttente} factures
                </div>
              </div>

              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-medium opacity-90">
                    Documents {selectedYear}
                  </div>
                  <FileText className="opacity-80" size={24} />
                </div>
                <div className="text-3xl font-bold mb-1">
                  {filteredDocuments.length}
                </div>
                <div className="text-xs opacity-75">Total devis + factures</div>
              </div>

              <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-medium opacity-90">
                    Devis en Attente
                  </div>
                  <TrendingUp className="opacity-80" size={24} />
                </div>
                <div className="text-3xl font-bold mb-1">
                  {stats.devisEnAttente}
                </div>
                <div className="text-xs opacity-75">À convertir</div>
              </div>
            </div>

            {/* Charts Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4">
                  Évolution du CA {selectedYear}
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={stats.chartDataMensuel}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="mois" />
                    <YAxis />
                    <Tooltip formatter={(value) => `${value.toFixed(2)} €`} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="montant"
                      stroke="#3b82f6"
                      strokeWidth={3}
                      name="CA TTC"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4">
                  CA Mensuel (Barres)
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={stats.chartDataMensuel}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="mois" />
                    <YAxis />
                    <Tooltip formatter={(value) => `${value.toFixed(2)} €`} />
                    <Legend />
                    <Bar dataKey="montant" fill="#10b981" name="CA TTC" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Charts Row 2 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4">
                  Répartition par Statut
                </h3>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={stats.statutData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) =>
                        `${name} ${(percent * 100).toFixed(0)}%`
                      }
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {stats.statutData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4">
                  Factures vs Devis
                </h3>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={stats.typeData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) =>
                        `${name} ${(percent * 100).toFixed(0)}%`
                      }
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      <Cell fill="#3b82f6" />
                      <Cell fill="#8b5cf6" />
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4">
                  Top 5 Clients
                </h3>
                <div className="space-y-3">
                  {stats.topClients.map((client, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">
                          {index + 1}
                        </div>
                        <span className="text-sm font-medium text-gray-700">
                          {client.client}
                        </span>
                      </div>
                      <span className="text-sm font-bold text-green-600">
                        {client.montant.toLocaleString("fr-FR", {
                          maximumFractionDigits: 0,
                        })}{" "}
                        €
                      </span>
                    </div>
                  ))}
                  {stats.topClients.length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-4">
                      Aucun client pour le moment
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Documents Tab */}
        {activeTab === "documents" && (
          <div className="space-y-6">
            {/* Formulaire d'ajout */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="font-bold text-lg mb-4 text-gray-800">
                Ajouter un document
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
                <select
                  value={newDoc.type}
                  onChange={(e) =>
                    setNewDoc({ ...newDoc, type: e.target.value })
                  }
                  className="p-2 border rounded-lg"
                >
                  <option>Facture</option>
                  <option>Devis</option>
                </select>
                <input
                  type="text"
                  placeholder="Numéro"
                  value={newDoc.numero}
                  onChange={(e) =>
                    setNewDoc({ ...newDoc, numero: e.target.value })
                  }
                  className="p-2 border rounded-lg"
                />
                <input
                  type="text"
                  placeholder="Client"
                  value={newDoc.client}
                  onChange={(e) =>
                    setNewDoc({ ...newDoc, client: e.target.value })
                  }
                  className="p-2 border rounded-lg"
                />
                <input
                  type="date"
                  value={newDoc.date}
                  onChange={(e) =>
                    setNewDoc({ ...newDoc, date: e.target.value })
                  }
                  className="p-2 border rounded-lg"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                <input
                  type="number"
                  placeholder="Montant HT"
                  value={newDoc.montantHT}
                  onChange={(e) =>
                    setNewDoc({ ...newDoc, montantHT: e.target.value })
                  }
                  className="p-2 border rounded-lg"
                />
                <input
                  type="number"
                  placeholder="TVA %"
                  value={newDoc.tauxTVA}
                  onChange={(e) =>
                    setNewDoc({ ...newDoc, tauxTVA: e.target.value })
                  }
                  className="p-2 border rounded-lg"
                />
                <select
                  value={newDoc.statut}
                  onChange={(e) =>
                    setNewDoc({ ...newDoc, statut: e.target.value })
                  }
                  className="p-2 border rounded-lg"
                >
                  <option>En attente</option>
                  <option>Validé</option>
                  <option>Payé</option>
                  <option>Refusé</option>
                </select>
                <input
                  type="date"
                  placeholder="Date paiement"
                  value={newDoc.datePaiement}
                  onChange={(e) =>
                    setNewDoc({ ...newDoc, datePaiement: e.target.value })
                  }
                  className="p-2 border rounded-lg"
                />
                <button
                  onClick={addDocument}
                  className="flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                >
                  <Plus size={20} />
                  Ajouter
                </button>
              </div>
            </div>

            {/* Tableau des documents */}
            <div className="bg-white rounded-xl shadow-lg p-6 overflow-x-auto">
              <h3 className="font-bold text-lg mb-4 text-gray-800">
                Liste des documents {selectedYear}
              </h3>
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-3 text-left font-semibold text-gray-700">
                      Type
                    </th>
                    <th className="p-3 text-left font-semibold text-gray-700">
                      Numéro
                    </th>
                    <th className="p-3 text-left font-semibold text-gray-700">
                      Client
                    </th>
                    <th className="p-3 text-left font-semibold text-gray-700">
                      Date
                    </th>
                    <th className="p-3 text-right font-semibold text-gray-700">
                      HT
                    </th>
                    <th className="p-3 text-right font-semibold text-gray-700">
                      TVA
                    </th>
                    <th className="p-3 text-right font-semibold text-gray-700">
                      TTC
                    </th>
                    <th className="p-3 text-left font-semibold text-gray-700">
                      Statut
                    </th>
                    <th className="p-3 text-left font-semibold text-gray-700">
                      Paiement
                    </th>
                    <th className="p-3 text-center font-semibold text-gray-700">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDocuments.map((doc) => (
                    <tr
                      key={doc.id}
                      className="border-b hover:bg-gray-50 transition"
                    >
                      <td className="p-3">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            doc.type === "Facture"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-purple-100 text-purple-800"
                          }`}
                        >
                          {doc.type}
                        </span>
                      </td>
                      <td className="p-3 font-medium text-gray-700">
                        {doc.numero}
                      </td>
                      <td className="p-3 text-gray-700">{doc.client}</td>
                      <td className="p-3 text-gray-600">{doc.date}</td>
                      <td className="p-3 text-right text-gray-700">
                        {doc.montantHT.toFixed(2)} €
                      </td>
                      <td className="p-3 text-right text-gray-600">
                        {doc.tauxTVA}%
                      </td>
                      <td className="p-3 text-right font-bold text-gray-800">
                        {calculateTTC(doc.montantHT, doc.tauxTVA).toFixed(2)} €
                      </td>
                      <td className="p-3">
                        <select
                          value={doc.statut}
                          onChange={(e) =>
                            updateDocument(doc.id, "statut", e.target.value)
                          }
                          className={`p-2 rounded-lg text-sm font-medium ${
                            doc.statut === "Payé"
                              ? "bg-green-100 text-green-800"
                              : doc.statut === "Validé"
                              ? "bg-blue-100 text-blue-800"
                              : doc.statut === "Refusé"
                              ? "bg-red-100 text-red-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          <option>En attente</option>
                          <option>Validé</option>
                          <option>Payé</option>
                          <option>Refusé</option>
                        </select>
                      </td>
                      <td className="p-3">
                        <input
                          type="date"
                          value={doc.datePaiement}
                          onChange={(e) =>
                            updateDocument(
                              doc.id,
                              "datePaiement",
                              e.target.value
                            )
                          }
                          className="p-2 border rounded-lg text-sm"
                        />
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => deleteDocument(doc.id)}
                          className="text-red-600 hover:text-red-800 transition"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredDocuments.length === 0 && (
                <p className="text-center text-gray-500 py-8">
                  Aucun document pour {selectedYear}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
