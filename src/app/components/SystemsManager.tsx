import { useState, useEffect } from "react";
import { supabase } from "../../supabase";
import { Button } from "./ui/button";
import { Trash2, Plus, Monitor } from "lucide-react";

interface SystemsManagerProps {
  cafeId: string;
}

interface GamingSystemRow {
  id: string;
  name: string;
  type: "PC" | "Console";
  gpu: string;
  cpu: string;
  ram: string;
  console: string;
}

export function SystemsManager({ cafeId }: SystemsManagerProps) {
  const [systems, setSystems] = useState<GamingSystemRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: "",
    type: "PC" as "PC" | "Console",
    gpu: "",
    cpu: "",
    ram: "",
    console: "",
  });

  useEffect(() => {
    fetchSystems();
  }, [cafeId]);

  const fetchSystems = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("gaming_systems")
      .select("*")
      .eq("cafe_id", cafeId)
      .order("created_at", { ascending: true });
    setSystems(data || []);
    setLoading(false);
  };

  const resetForm = () => {
    setForm({ name: "", type: "PC", gpu: "", cpu: "", ram: "", console: "" });
    setShowForm(false);
  };

  const handleAdd = async () => {
    if (!form.name) return;
    setSaving(true);

    await supabase.from("gaming_systems").insert({
      cafe_id: cafeId,
      name: form.name,
      type: form.type,
      gpu: form.type === "PC" ? form.gpu : null,
      cpu: form.type === "PC" ? form.cpu : null,
      ram: form.type === "PC" ? form.ram : null,
      console: form.type === "Console" ? form.console : null,
    });

    await fetchSystems();
    resetForm();
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this gaming system?")) return;
    await supabase.from("gaming_systems").delete().eq("id", id);
    fetchSystems();
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-500">Loading systems...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Gaming Systems ({systems.length})</h2>
        <Button
          onClick={() => setShowForm(!showForm)}
          className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 gap-2"
        >
          <Plus className="w-4 h-4" />
          Add System
        </Button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-md p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">System Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. System 1"
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-400"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Type</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as "PC" | "Console" })}
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-400"
              >
                <option value="PC">PC</option>
                <option value="Console">Console</option>
              </select>
            </div>
          </div>

          {form.type === "PC" ? (
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">GPU</label>
                <input
                  type="text"
                  value={form.gpu}
                  onChange={(e) => setForm({ ...form, gpu: e.target.value })}
                  placeholder="NVIDIA RTX 4090"
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-400"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">CPU</label>
                <input
                  type="text"
                  value={form.cpu}
                  onChange={(e) => setForm({ ...form, cpu: e.target.value })}
                  placeholder="Intel Core i9-14900K"
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-400"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">RAM</label>
                <input
                  type="text"
                  value={form.ram}
                  onChange={(e) => setForm({ ...form, ram: e.target.value })}
                  placeholder="64GB DDR5"
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-400"
                />
              </div>
            </div>
          ) : (
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Console</label>
              <input
                type="text"
                value={form.console}
                onChange={(e) => setForm({ ...form, console: e.target.value })}
                placeholder="PS5 / Xbox Series X"
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-400"
              />
            </div>
          )}

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={resetForm}>
              Cancel
            </Button>
            <Button
              onClick={handleAdd}
              disabled={saving || !form.name}
              className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              {saving ? "Adding..." : "Add System"}
            </Button>
          </div>
        </div>
      )}

      {systems.length === 0 && !showForm ? (
        <div className="bg-white rounded-xl shadow-md p-12 text-center">
          <Monitor className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No gaming systems added yet</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {systems.map((system) => (
            <div key={system.id} className="bg-white rounded-xl shadow-md p-4 flex justify-between items-start">
              <div>
                <h3 className="font-bold text-gray-900 mb-1">{system.name}</h3>
                {system.type === "PC" ? (
                  <div className="text-sm text-gray-600 space-y-0.5">
                    <p>{system.gpu}</p>
                    <p>{system.cpu}</p>
                    <p>{system.ram}</p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-600">{system.console}</p>
                )}
              </div>
              <button
                onClick={() => handleDelete(system.id)}
                className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}