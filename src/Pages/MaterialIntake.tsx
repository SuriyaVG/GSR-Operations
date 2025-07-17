import { useState, useEffect } from "react";
import { MaterialIntakeLog, Supplier, RawMaterial } from "@/Entities/all";
import { Button } from "@/Components/ui/button";
import { Card, CardContent } from "@/Components/ui/card";
import { Plus, Search } from "lucide-react";
import { Input } from "@/Components/ui/input";

import MaterialIntakeForm from "../Components/material/MaterialIntakeForm";
import MaterialList from "../Components/material/MaterialList";
import StockSummary from "../Components/material/StockSummary";

export default function MaterialIntake() {
  const [materials, setMaterials] = useState<MaterialIntakeLog[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [materialsData, suppliersData, rawMaterialsData] = await Promise.all([
        MaterialIntakeLog.list('-created_date', 50),
        Supplier.list(),
        RawMaterial.list()
      ]);
      
      setMaterials(materialsData);
      setSuppliers(suppliersData);
      setRawMaterials(rawMaterialsData);
    } catch (error) {
      console.error("Error loading data:", error);
    }
    setIsLoading(false);
  };

  const handleSaveIntake = async (intakeData: any) => {
    try {
      await MaterialIntakeLog.create({
        ...intakeData,
        remaining_quantity: intakeData.quantity // Initialize remaining quantity
      });
      setShowForm(false);
      loadData();
    } catch (error) {
      console.error("Error saving intake:", error);
    }
  };

  const filteredMaterials = materials.filter(material => {
    if (!searchTerm) return true;
    
    const supplier = suppliers.find(s => s.id === material.supplier_id);
    const rawMaterial = rawMaterials.find(r => r.id === material.raw_material_id);
    
    return (
      supplier?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rawMaterial?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      material.lot_number?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <div className="p-6 space-y-6 bg-gradient-to-br from-amber-50 to-orange-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Material Intake</h1>
            <p className="text-amber-700 mt-1">Track raw materials and inventory</p>
          </div>
          <Button 
            onClick={() => setShowForm(true)}
            className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Material Intake
          </Button>
        </div>

        {/* Stock Summary */}
        <StockSummary 
          materials={materials}
          rawMaterials={rawMaterials}
          suppliers={suppliers}
          loading={isLoading}
        />

        {/* Search */}
        <Card className="bg-white/70 backdrop-blur-sm border-amber-200 mb-6">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search by supplier, material, or lot number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 border-amber-200 focus:border-amber-400"
              />
            </div>
          </CardContent>
        </Card>

        {/* Material List */}
        <MaterialList 
          materials={filteredMaterials}
          suppliers={suppliers}
          rawMaterials={rawMaterials}
          loading={isLoading}
        />

        {/* Form Modal */}
        {showForm && (
          <MaterialIntakeForm
            suppliers={suppliers}
            rawMaterials={rawMaterials}
            onSave={handleSaveIntake}
            onCancel={() => setShowForm(false)}
          />
        )}
      </div>
    </div>
  );
} 