import {
  Building2,
  Clock,
  DollarSign,
  Download,
  Edit2,
  FileText,
  Mail,
  MapPin,
  Phone,
  Plus,
  RefreshCw,
  Save,
  Search,
  Trash2,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
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
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [filterType, setFilterType] = useState("Tous");
  const [filterStatut, setFilterStatut] = useState("Tous");
  const [searchQuery, setSearchQuery] = useState("");
  const [editingDoc, setEditingDoc] = useState(null);
  const [showClientModal, setShowClientModal] = useState(false);
  const [showFileModal, setShowFileModal] = useState(false);
  const [selectedDocForFiles, setSelectedDocForFiles] = useState(null);
  const [newDoc, setNewDoc] = useState({
    type: "Facture",
    numero: "",
    client_id: "",
    date: "",
    montantHT: "",
    tauxTVA: 20,
    statut: "En attente",
    datePaiement: "",
  });
  const [newClient, setNewClient] = useState({
    nom: "",
    email: "",
    telephone: "",
    adresse: "",
    code_postal: "",
    ville: "",
    siret: "",
    notes: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    await Promise.all([fetchDocuments(), fetchClients()]);
  };

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("documents")
        .select(
          `
          *,
          clients (
            id,
            nom,
            email,
            telephone
          )
        `
        )
        .order("date", { ascending: false });

      if (error) throw error;

      const formattedDocs = data.map((doc) => ({
        id: doc.id,
        type: doc.type,
        numero: doc.numero,
        client: doc.clients?.nom || doc.client || "Client inconnu",
        client_id: doc.client_id,
        client_email: doc.clients?.email,
        client_telephone: doc.clients?.telephone,
        date: doc.date,
        montantHT: parseFloat(doc.montant_ht),
        tauxTVA: parseFloat(doc.taux_tva),
        statut: doc.statut,
        datePaiement: doc.date_paiement || "",
      }));

      setDocuments(formattedDocs);
    } catch (error) {
      console.error("Erreur lors du chargement:", error);
      alert("Erreur lors du chargement des documents");
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .order("nom", { ascending: true });

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error("Erreur lors du chargement des clients:", error);
    }
  };

  const addClient = async () => {
    if (!newClient.nom) {
      alert("Le nom du client est obligatoire");
      return;
    }

    try {
      const { data, error } = await supabase
        .from("clients")
        .insert([newClient])
        .select();

      if (error) throw error;

      await fetchClients();
      setNewClient({
        nom: "",
        email: "",
        telephone: "",
        adresse: "",
        code_postal: "",
        ville: "",
        siret: "",
        notes: "",
      });
      setShowClientModal(false);
      alert("Client ajouté avec succès !");
    } catch (error) {
      console.error("Erreur lors de l'ajout du client:", error);
      alert("Erreur lors de l'ajout du client");
    }
  };

  const deleteClient = async (id) => {
    if (
      !window.confirm(
        "Êtes-vous sûr de vouloir supprimer ce client ? Les documents associés ne seront pas supprimés."
      )
    ) {
      return;
    }

    try {
      const { error } = await supabase.from("clients").delete().eq("id", id);

      if (error) throw error;
      await fetchClients();
      alert("Client supprimé avec succès !");
    } catch (error) {
      console.error("Erreur lors de la suppression:", error);
      alert("Erreur lors de la suppression du client");
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
      const yearMatch = docYear === selectedYear;
      const typeMatch = filterType === "Tous" || doc.type === filterType;
      const statutMatch =
        filterStatut === "Tous" || doc.statut === filterStatut;
      const searchMatch =
        searchQuery === "" ||
        doc.client.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.numero.toLowerCase().includes(searchQuery.toLowerCase());

      return yearMatch && typeMatch && statutMatch && searchMatch;
    });
  }, [documents, selectedYear, filterType, filterStatut, searchQuery]);

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
      caParMois[m] = { encaisse: 0, attente: 0 };
    });

    facturesPayees.forEach((doc) => {
      const date = new Date(doc.date);
      const moisIndex = date.getMonth();
      const moisNom = mois[moisIndex];
      caParMois[moisNom].encaisse += calculateTTC(doc.montantHT, doc.tauxTVA);
    });

    facturesEnAttente.forEach((doc) => {
      const date = new Date(doc.date);
      const moisIndex = date.getMonth();
      const moisNom = mois[moisIndex];
      caParMois[moisNom].attente += calculateTTC(doc.montantHT, doc.tauxTVA);
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
    const devisValides = filteredDocuments.filter(
      (d) => d.type === "Devis" && d.statut === "Validé"
    ).length;
    const nbFacturesEnAttente = facturesEnAttente.length;

    const chartDataMensuel = Object.entries(caParMois).map(
      ([mois, values]) => ({
        mois,
        encaisse: parseFloat(values.encaisse.toFixed(2)),
        attente: parseFloat(values.attente.toFixed(2)),
        total: parseFloat((values.encaisse + values.attente).toFixed(2)),
      })
    );

    const statutData = [
      {
        name: "Payé",
        value: filteredDocuments.filter((d) => d.statut === "Payé").length,
        color: "#10b981",
      },
      {
        name: "En attente",
        value: filteredDocuments.filter((d) => d.statut === "En attente")
          .length,
        color: "#f59e0b",
      },
      {
        name: "Validé",
        value: filteredDocuments.filter((d) => d.statut === "Validé").length,
        color: "#3b82f6",
      },
      {
        name: "Refusé",
        value: filteredDocuments.filter((d) => d.statut === "Refusé").length,
        color: "#ef4444",
      },
    ].filter((item) => item.value > 0);

    // Taux de conversion devis -> factures
    const totalDevis = filteredDocuments.filter(
      (d) => d.type === "Devis"
    ).length;
    const devisConverted = filteredDocuments.filter(
      (d) => d.type === "Devis" && d.statut === "Validé"
    ).length;
    const tauxConversion =
      totalDevis > 0 ? ((devisConverted / totalDevis) * 100).toFixed(1) : 0;

    const clientsMap = {};
    facturesPayees.forEach((doc) => {
      if (!clientsMap[doc.client]) {
        clientsMap[doc.client] = { montant: 0, count: 0 };
      }
      clientsMap[doc.client].montant += calculateTTC(
        doc.montantHT,
        doc.tauxTVA
      );
      clientsMap[doc.client].count += 1;
    });

    const topClients = Object.entries(clientsMap)
      .map(([client, data]) => ({
        client,
        montant: data.montant,
        count: data.count,
      }))
      .sort((a, b) => b.montant - a.montant)
      .slice(0, 5);

    // Montant moyen par facture
    const montantMoyen =
      facturesPayees.length > 0 ? caAnnuel / facturesPayees.length : 0;

    return {
      caParMois,
      caAnnuel,
      caEnAttente,
      devisEnAttente,
      devisValides,
      nbFacturesEnAttente,
      chartDataMensuel,
      statutData,
      topClients,
      tauxConversion,
      montantMoyen,
      totalDevis,
    };
  }, [filteredDocuments]);

  const addDocument = async () => {
    if (
      !newDoc.numero ||
      !newDoc.client_id ||
      !newDoc.date ||
      !newDoc.montantHT
    ) {
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
            client_id: newDoc.client_id,
            date: newDoc.date,
            montant_ht: parseFloat(newDoc.montantHT),
            taux_tva: parseFloat(newDoc.tauxTVA),
            statut: newDoc.statut,
            date_paiement: newDoc.datePaiement || null,
          },
        ])
        .select();

      if (error) throw error;

      await fetchDocuments();

      setNewDoc({
        type: "Facture",
        numero: "",
        client_id: "",
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

      await fetchDocuments();
      alert("Document supprimé avec succès !");
    } catch (error) {
      console.error("Erreur lors de la suppression:", error);
      alert("Erreur lors de la suppression du document");
    }
  };

  const updateDocument = async (id, field, value) => {
    try {
      const dbField =
        field === "montantHT"
          ? "montant_ht"
          : field === "tauxTVA"
          ? "taux_tva"
          : field === "datePaiement"
          ? "date_paiement"
          : field === "client"
          ? "client_id"
          : field;

      const { error } = await supabase
        .from("documents")
        .update({ [dbField]: value || null })
        .eq("id", id);

      if (error) throw error;

      await fetchDocuments();
    } catch (error) {
      console.error("Erreur lors de la mise à jour:", error);
      alert("Erreur lors de la mise à jour du document");
    }
  };

  const saveEditedDocument = async () => {
    if (!editingDoc) return;

    try {
      const { error } = await supabase
        .from("documents")
        .update({
          type: editingDoc.type,
          numero: editingDoc.numero,
          client_id: editingDoc.client_id,
          date: editingDoc.date,
          montant_ht: parseFloat(editingDoc.montantHT),
          taux_tva: parseFloat(editingDoc.tauxTVA),
          statut: editingDoc.statut,
          date_paiement: editingDoc.datePaiement || null,
        })
        .eq("id", editingDoc.id);

      if (error) throw error;

      await fetchDocuments();
      setEditingDoc(null);
      alert("Document modifié avec succès !");
    } catch (error) {
      console.error("Erreur lors de la modification:", error);
      alert("Erreur lors de la modification du document");
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="animate-spin h-12 w-12 text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Chargement des données...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="fixed left-0 top-0 h-full w-64 bg-slate-900 text-white shadow-2xl z-10">
        <div className="p-6 border-b border-slate-700">
          <h1 className="text-2xl font-bold">💼 FacturaPro</h1>
          <p className="text-sm text-slate-400 mt-1">Gestion intelligente</p>
        </div>

        <nav className="p-4 space-y-2">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
              activeTab === "dashboard"
                ? "bg-blue-600 text-white shadow-lg"
                : "text-slate-300 hover:bg-slate-800"
            }`}
          >
            <TrendingUp size={20} />
            <span className="font-medium">Dashboard</span>
          </button>

          <button
            onClick={() => setActiveTab("documents")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
              activeTab === "documents"
                ? "bg-blue-600 text-white shadow-lg"
                : "text-slate-300 hover:bg-slate-800"
            }`}
          >
            <FileText size={20} />
            <span className="font-medium">Documents</span>
          </button>

          <button
            onClick={() => setActiveTab("clients")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
              activeTab === "clients"
                ? "bg-blue-600 text-white shadow-lg"
                : "text-slate-300 hover:bg-slate-800"
            }`}
          >
            <Users size={20} />
            <span className="font-medium">Clients</span>
          </button>
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-700">
          <div className="text-xs text-slate-400">
            <p>Année: {selectedYear}</p>
            <p className="mt-1">{filteredDocuments.length} documents</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="ml-64 p-8">
        {/* Top Bar */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 bg-white hover:border-blue-500 transition focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              {availableYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>

            <button
              onClick={fetchData}
              className="flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition"
              title="Actualiser"
            >
              <RefreshCw size={18} />
              Actualiser
            </button>
          </div>

          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition shadow-sm"
          >
            <Download size={18} />
            Exporter CSV
          </button>
        </div>

        {/* Dashboard Tab */}
        {activeTab === "dashboard" && (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm font-medium text-gray-600">
                    CA Encaissé
                  </div>
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <DollarSign className="text-green-600" size={20} />
                  </div>
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-1">
                  {stats.caAnnuel.toLocaleString("fr-FR", {
                    maximumFractionDigits: 0,
                  })}{" "}
                  €
                </div>
                <div className="text-xs text-gray-500">
                  Factures payées {selectedYear}
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm font-medium text-gray-600">
                    CA En Attente
                  </div>
                  <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                    <Clock className="text-orange-600" size={20} />
                  </div>
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-1">
                  {stats.caEnAttente.toLocaleString("fr-FR", {
                    maximumFractionDigits: 0,
                  })}{" "}
                  €
                </div>
                <div className="text-xs text-gray-500">
                  {stats.nbFacturesEnAttente} factures en attente
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm font-medium text-gray-600">
                    Taux Conversion
                  </div>
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <TrendingUp className="text-blue-600" size={20} />
                  </div>
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-1">
                  {stats.tauxConversion}%
                </div>
                <div className="text-xs text-gray-500">
                  {stats.devisValides}/{stats.totalDevis} devis convertis
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm font-medium text-gray-600">
                    Ticket Moyen
                  </div>
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <FileText className="text-purple-600" size={20} />
                  </div>
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-1">
                  {stats.montantMoyen.toLocaleString("fr-FR", {
                    maximumFractionDigits: 0,
                  })}{" "}
                  €
                </div>
                <div className="text-xs text-gray-500">
                  Montant moyen par facture
                </div>
              </div>
            </div>

            {/* Charts Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4">
                  Évolution du CA {selectedYear}
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={stats.chartDataMensuel}>
                    <defs>
                      <linearGradient
                        id="colorEncaisse"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#10b981"
                          stopOpacity={0.8}
                        />
                        <stop
                          offset="95%"
                          stopColor="#10b981"
                          stopOpacity={0}
                        />
                      </linearGradient>
                      <linearGradient
                        id="colorAttente"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#f59e0b"
                          stopOpacity={0.8}
                        />
                        <stop
                          offset="95%"
                          stopColor="#f59e0b"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="mois" />
                    <YAxis />
                    <Tooltip formatter={(value) => `${value.toFixed(2)} €`} />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="encaisse"
                      stroke="#10b981"
                      fillOpacity={1}
                      fill="url(#colorEncaisse)"
                      name="CA Encaissé"
                    />
                    <Area
                      type="monotone"
                      dataKey="attente"
                      stroke="#f59e0b"
                      fillOpacity={1}
                      fill="url(#colorAttente)"
                      name="CA En Attente"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4">
                  CA Mensuel Total
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={stats.chartDataMensuel}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="mois" />
                    <YAxis />
                    <Tooltip formatter={(value) => `${value.toFixed(2)} €`} />
                    <Legend />
                    <Bar
                      dataKey="total"
                      fill="#3b82f6"
                      name="CA Total"
                      radius={[8, 8, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Charts Row 2 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4">
                  Répartition par Statut
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={stats.statutData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) =>
                        `${name} ${(percent * 100).toFixed(0)}%`
                      }
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {stats.statutData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4">
                  Top 5 Clients
                </h3>
                <div className="space-y-4">
                  {stats.topClients.map((client, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${
                            index === 0
                              ? "bg-yellow-500"
                              : index === 1
                              ? "bg-gray-400"
                              : index === 2
                              ? "bg-orange-600"
                              : "bg-blue-500"
                          }`}
                        >
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {client.client}
                          </p>
                          <p className="text-xs text-gray-500">
                            {client.count} facture{client.count > 1 ? "s" : ""}
                          </p>
                        </div>
                      </div>
                      <span className="text-lg font-bold text-green-600">
                        {client.montant.toLocaleString("fr-FR", {
                          maximumFractionDigits: 0,
                        })}{" "}
                        €
                      </span>
                    </div>
                  ))}
                  {stats.topClients.length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-8">
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
            {/* Filtres et Recherche */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-[250px]">
                  <div className="relative">
                    <Search
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                      size={18}
                    />
                    <input
                      type="text"
                      placeholder="Rechercher par client ou numéro..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg font-medium bg-white hover:border-blue-500 transition focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option>Tous</option>
                  <option>Facture</option>
                  <option>Devis</option>
                </select>

                <select
                  value={filterStatut}
                  onChange={(e) => setFilterStatut(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg font-medium bg-white hover:border-blue-500 transition focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option>Tous</option>
                  <option>En attente</option>
                  <option>Validé</option>
                  <option>Payé</option>
                  <option>Refusé</option>
                </select>
              </div>
            </div>

            {/* Formulaire d'ajout */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="font-bold text-lg mb-4 text-gray-800 flex items-center gap-2">
                <Plus size={20} />
                Ajouter un document
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
                <select
                  value={newDoc.type}
                  onChange={(e) =>
                    setNewDoc({ ...newDoc, type: e.target.value })
                  }
                  className="p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
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
                  className="p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <select
                  value={newDoc.client_id}
                  onChange={(e) =>
                    setNewDoc({ ...newDoc, client_id: e.target.value })
                  }
                  className="p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="">Sélectionner un client</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.nom}
                    </option>
                  ))}
                </select>
                <input
                  type="date"
                  value={newDoc.date}
                  onChange={(e) =>
                    setNewDoc({ ...newDoc, date: e.target.value })
                  }
                  className="p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
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
                  className="p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <input
                  type="number"
                  placeholder="TVA %"
                  value={newDoc.tauxTVA}
                  onChange={(e) =>
                    setNewDoc({ ...newDoc, tauxTVA: e.target.value })
                  }
                  className="p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <select
                  value={newDoc.statut}
                  onChange={(e) =>
                    setNewDoc({ ...newDoc, statut: e.target.value })
                  }
                  className="p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
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
                  className="p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <button
                  onClick={addDocument}
                  className="flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition shadow-sm"
                >
                  <Plus size={20} />
                  Ajouter
                </button>
              </div>
            </div>

            {/* Tableau des documents */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-100">
                <h3 className="font-bold text-lg text-gray-800">
                  Documents {selectedYear} ({filteredDocuments.length})
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="p-4 text-left font-semibold text-gray-700">
                        Type
                      </th>
                      <th className="p-4 text-left font-semibold text-gray-700">
                        Numéro
                      </th>
                      <th className="p-4 text-left font-semibold text-gray-700">
                        Client
                      </th>
                      <th className="p-4 text-left font-semibold text-gray-700">
                        Date
                      </th>
                      <th className="p-4 text-right font-semibold text-gray-700">
                        HT
                      </th>
                      <th className="p-4 text-right font-semibold text-gray-700">
                        TVA
                      </th>
                      <th className="p-4 text-right font-semibold text-gray-700">
                        TTC
                      </th>
                      <th className="p-4 text-left font-semibold text-gray-700">
                        Statut
                      </th>
                      <th className="p-4 text-center font-semibold text-gray-700">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDocuments.map((doc) => (
                      <tr
                        key={doc.id}
                        className="border-b border-gray-100 hover:bg-gray-50 transition"
                      >
                        <td className="p-4">
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
                        <td className="p-4 font-medium text-gray-900">
                          {doc.numero}
                        </td>
                        <td className="p-4 text-gray-700">{doc.client}</td>
                        <td className="p-4 text-gray-600">{doc.date}</td>
                        <td className="p-4 text-right text-gray-700">
                          {doc.montantHT.toFixed(2)} €
                        </td>
                        <td className="p-4 text-right text-gray-600">
                          {doc.tauxTVA}%
                        </td>
                        <td className="p-4 text-right font-bold text-gray-900">
                          {calculateTTC(doc.montantHT, doc.tauxTVA).toFixed(2)}{" "}
                          €
                        </td>
                        <td className="p-4">
                          <select
                            value={doc.statut}
                            onChange={(e) =>
                              updateDocument(doc.id, "statut", e.target.value)
                            }
                            className={`p-2 rounded-lg text-sm font-medium border-0 ${
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
                        <td className="p-4">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => setEditingDoc({ ...doc })}
                              className="text-blue-600 hover:text-blue-800 transition p-2 hover:bg-blue-50 rounded"
                              title="Modifier"
                            >
                              <Edit2 size={18} />
                            </button>
                            <button
                              onClick={() => deleteDocument(doc.id)}
                              className="text-red-600 hover:text-red-800 transition p-2 hover:bg-red-50 rounded"
                              title="Supprimer"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredDocuments.length === 0 && (
                  <p className="text-center text-gray-500 py-12">
                    Aucun document trouvé
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Clients Tab */}
        {activeTab === "clients" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-800">
                Gestion des Clients
              </h2>
              <button
                onClick={() => setShowClientModal(true)}
                className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition shadow-sm"
              >
                <Plus size={20} />
                Nouveau Client
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {clients.map((client) => (
                <div
                  key={client.id}
                  className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <Building2 className="text-blue-600" size={24} />
                    </div>
                    <button
                      onClick={() => deleteClient(client.id)}
                      className="text-red-600 hover:text-red-800 transition p-2 hover:bg-red-50 rounded"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>

                  <h3 className="font-bold text-lg text-gray-900 mb-3">
                    {client.nom}
                  </h3>

                  <div className="space-y-2 text-sm">
                    {client.email && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <Mail size={16} />
                        <span>{client.email}</span>
                      </div>
                    )}
                    {client.telephone && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <Phone size={16} />
                        <span>{client.telephone}</span>
                      </div>
                    )}
                    {client.ville && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <MapPin size={16} />
                        <span>{client.ville}</span>
                      </div>
                    )}
                  </div>

                  {client.siret && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <p className="text-xs text-gray-500">
                        SIRET: {client.siret}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {clients.length === 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
                <Users className="mx-auto mb-4 text-gray-400" size={48} />
                <h3 className="font-bold text-lg text-gray-800 mb-2">
                  Aucun client
                </h3>
                <p className="text-gray-500 mb-4">
                  Commencez par ajouter votre premier client
                </p>
                <button
                  onClick={() => setShowClientModal(true)}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
                >
                  Ajouter un client
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal Nouveau Client */}
      {showClientModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-gray-800">
                Nouveau Client
              </h3>
              <button
                onClick={() => setShowClientModal(false)}
                className="text-gray-500 hover:text-gray-700 transition"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nom du client *
                </label>
                <input
                  type="text"
                  value={newClient.nom}
                  onChange={(e) =>
                    setNewClient({ ...newClient, nom: e.target.value })
                  }
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="Entreprise SARL"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={newClient.email}
                    onChange={(e) =>
                      setNewClient({ ...newClient, email: e.target.value })
                    }
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="contact@entreprise.fr"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Téléphone
                  </label>
                  <input
                    type="tel"
                    value={newClient.telephone}
                    onChange={(e) =>
                      setNewClient({ ...newClient, telephone: e.target.value })
                    }
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="01 23 45 67 89"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Adresse
                </label>
                <input
                  type="text"
                  value={newClient.adresse}
                  onChange={(e) =>
                    setNewClient({ ...newClient, adresse: e.target.value })
                  }
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="123 rue de la République"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Code postal
                  </label>
                  <input
                    type="text"
                    value={newClient.code_postal}
                    onChange={(e) =>
                      setNewClient({
                        ...newClient,
                        code_postal: e.target.value,
                      })
                    }
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="75001"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ville
                  </label>
                  <input
                    type="text"
                    value={newClient.ville}
                    onChange={(e) =>
                      setNewClient({ ...newClient, ville: e.target.value })
                    }
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="Paris"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  SIRET
                </label>
                <input
                  type="text"
                  value={newClient.siret}
                  onChange={(e) =>
                    setNewClient({ ...newClient, siret: e.target.value })
                  }
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="123 456 789 00012"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes
                </label>
                <textarea
                  value={newClient.notes}
                  onChange={(e) =>
                    setNewClient({ ...newClient, notes: e.target.value })
                  }
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  rows="3"
                  placeholder="Notes supplémentaires..."
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowClientModal(false)}
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
              >
                Annuler
              </button>
              <button
                onClick={addClient}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Ajouter le client
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Édition Document */}
      {editingDoc && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-8 max-w-2xl w-full mx-4">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-gray-800">
                Modifier le document
              </h3>
              <button
                onClick={() => setEditingDoc(null)}
                className="text-gray-500 hover:text-gray-700 transition"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Type
                  </label>
                  <select
                    value={editingDoc.type}
                    onChange={(e) =>
                      setEditingDoc({ ...editingDoc, type: e.target.value })
                    }
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option>Facture</option>
                    <option>Devis</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Numéro
                  </label>
                  <input
                    type="text"
                    value={editingDoc.numero}
                    onChange={(e) =>
                      setEditingDoc({ ...editingDoc, numero: e.target.value })
                    }
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Client
                </label>
                <select
                  value={editingDoc.client_id || ""}
                  onChange={(e) =>
                    setEditingDoc({ ...editingDoc, client_id: e.target.value })
                  }
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="">Sélectionner un client</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.nom}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date
                  </label>
                  <input
                    type="date"
                    value={editingDoc.date}
                    onChange={(e) =>
                      setEditingDoc({ ...editingDoc, date: e.target.value })
                    }
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date paiement
                  </label>
                  <input
                    type="date"
                    value={editingDoc.datePaiement}
                    onChange={(e) =>
                      setEditingDoc({
                        ...editingDoc,
                        datePaiement: e.target.value,
                      })
                    }
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Montant HT
                  </label>
                  <input
                    type="number"
                    value={editingDoc.montantHT}
                    onChange={(e) =>
                      setEditingDoc({
                        ...editingDoc,
                        montantHT: e.target.value,
                      })
                    }
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    TVA %
                  </label>
                  <input
                    type="number"
                    value={editingDoc.tauxTVA}
                    onChange={(e) =>
                      setEditingDoc({ ...editingDoc, tauxTVA: e.target.value })
                    }
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Statut
                  </label>
                  <select
                    value={editingDoc.statut}
                    onChange={(e) =>
                      setEditingDoc({ ...editingDoc, statut: e.target.value })
                    }
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option>En attente</option>
                    <option>Validé</option>
                    <option>Payé</option>
                    <option>Refusé</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setEditingDoc(null)}
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
              >
                Annuler
              </button>
              <button
                onClick={saveEditedDocument}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2"
              >
                <Save size={20} />
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
