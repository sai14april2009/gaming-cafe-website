import { useState } from "react";
import { Cpu, MonitorSpeaker, X } from "lucide-react";
import { gamingCafes, hardwareOptions } from "../data/mockData";
import { CafeCard } from "./CafeCard";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";

export function FilterByHardware() {
  const [selectedGPUs, setSelectedGPUs] = useState<string[]>([]);
  const [selectedCPUs, setSelectedCPUs] = useState<string[]>([]);
  const [selectedConsoles, setSelectedConsoles] = useState<string[]>([]);
  const [vrOnly, setVrOnly] = useState(false);

  const toggleSelection = (
    item: string,
    list: string[],
    setter: (list: string[]) => void
  ) => {
    if (list.includes(item)) {
      setter(list.filter((i) => i !== item));
    } else {
      setter([...list, item]);
    }
  };

  const filteredCafes = gamingCafes.filter((cafe) => {
    const matchesGPU =
      selectedGPUs.length === 0 ||
      selectedGPUs.some((gpu) => cafe.hardware.gpu.includes(gpu));
    
    const matchesCPU =
      selectedCPUs.length === 0 ||
      selectedCPUs.some((cpu) => cafe.hardware.cpu.includes(cpu));
    
    const matchesConsole =
      selectedConsoles.length === 0 ||
      selectedConsoles.some((console) => cafe.hardware.consoles.includes(console));
    
    const matchesVR = !vrOnly || cafe.hardware.vr;

    return matchesGPU && matchesCPU && matchesConsole && matchesVR;
  });

  const clearAllFilters = () => {
    setSelectedGPUs([]);
    setSelectedCPUs([]);
    setSelectedConsoles([]);
    setVrOnly(false);
  };

  const totalFilters = selectedGPUs.length + selectedCPUs.length + selectedConsoles.length + (vrOnly ? 1 : 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero Section */}
      <div className="mb-8">
        <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
          Filter by Hardware
        </h1>
        <p className="text-gray-600 text-lg">
          Find cafes with specific hardware components and consoles
        </p>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Filters Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-md p-6 sticky top-24">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-lg">Filters</h2>
              {totalFilters > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllFilters}
                  className="text-purple-600"
                >
                  Clear all
                </Button>
              )}
            </div>

            {/* GPU Filters */}
            <div className="mb-6">
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <Cpu className="w-4 h-4" />
                Graphics Cards
              </h3>
              <div className="space-y-2">
                {hardwareOptions.gpu.map((gpu) => (
                  <label key={gpu} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedGPUs.includes(gpu)}
                      onChange={() => toggleSelection(gpu, selectedGPUs, setSelectedGPUs)}
                      className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                    />
                    <span className="text-sm">{gpu}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* CPU Filters */}
            <div className="mb-6">
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <Cpu className="w-4 h-4" />
                Processors
              </h3>
              <div className="space-y-2">
                {hardwareOptions.cpu.map((cpu) => (
                  <label key={cpu} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedCPUs.includes(cpu)}
                      onChange={() => toggleSelection(cpu, selectedCPUs, setSelectedCPUs)}
                      className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                    />
                    <span className="text-sm">{cpu}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Console Filters */}
            <div className="mb-6">
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <MonitorSpeaker className="w-4 h-4" />
                Consoles
              </h3>
              <div className="space-y-2">
                {hardwareOptions.consoles.map((console) => (
                  <label key={console} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedConsoles.includes(console)}
                      onChange={() => toggleSelection(console, selectedConsoles, setSelectedConsoles)}
                      className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                    />
                    <span className="text-sm">{console}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* VR Support */}
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={vrOnly}
                  onChange={() => setVrOnly(!vrOnly)}
                  className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                />
                <span className="text-sm font-medium">VR Support</span>
              </label>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="lg:col-span-3">
          {/* Active Filters */}
          {totalFilters > 0 && (
            <div className="bg-white rounded-xl shadow-md p-4 mb-6">
              <div className="flex flex-wrap gap-2">
                {selectedGPUs.map((gpu) => (
                  <Badge key={gpu} variant="secondary" className="gap-1">
                    {gpu}
                    <X
                      className="w-3 h-3 cursor-pointer"
                      onClick={() => toggleSelection(gpu, selectedGPUs, setSelectedGPUs)}
                    />
                  </Badge>
                ))}
                {selectedCPUs.map((cpu) => (
                  <Badge key={cpu} variant="secondary" className="gap-1">
                    {cpu}
                    <X
                      className="w-3 h-3 cursor-pointer"
                      onClick={() => toggleSelection(cpu, selectedCPUs, setSelectedCPUs)}
                    />
                  </Badge>
                ))}
                {selectedConsoles.map((console) => (
                  <Badge key={console} variant="secondary" className="gap-1">
                    {console}
                    <X
                      className="w-3 h-3 cursor-pointer"
                      onClick={() => toggleSelection(console, selectedConsoles, setSelectedConsoles)}
                    />
                  </Badge>
                ))}
                {vrOnly && (
                  <Badge variant="secondary" className="gap-1">
                    VR Support
                    <X className="w-3 h-3 cursor-pointer" onClick={() => setVrOnly(false)} />
                  </Badge>
                )}
              </div>
            </div>
          )}

          <div className="mb-4">
            <p className="text-gray-600">
              {filteredCafes.length} {filteredCafes.length === 1 ? "cafe" : "cafes"} found
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredCafes.map((cafe) => (
              <CafeCard key={cafe.id} cafe={cafe} />
            ))}
          </div>

          {filteredCafes.length === 0 && (
            <div className="text-center py-16 bg-white rounded-xl">
              <Cpu className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg mb-2">No cafes found with selected hardware</p>
              <p className="text-gray-400">Try adjusting your filters</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
