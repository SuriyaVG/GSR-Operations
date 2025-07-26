import { useState, useEffect } from "react";
import MaterialIntakeService from "@/services/MaterialIntakeService";
import SupplierService from "@/services/SupplierService";
import RawMaterialService from "@/services/RawMaterialService";
import { Button } from "@/Components/ui/button";
import { Card, CardContent } from "@/Components/ui/card";
import { Plus, Search } from "lucide-react";
import { Input } from "@/Components/ui/input";

import MaterialIntakeForm from "../Components/material/MaterialIntakeForm";
import MaterialList from "../Components/material/MaterialList";
import StockSummary from "../Components/material/StockSummary";

export default function MaterialIntake() {
  const [materials, setMaterials] = useState<any[]>([]); // Changed type to any[] as MaterialIntakeLog is removed
  const [suppliers, setSuppliers] = useState<any[]>([]); // Changed type to any[] as Supplier is removed
  const [rawMaterials, setRawMaterials] = useState<any[]>([]); // Changed type to any[] as RawMaterial is removed
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
        MaterialIntakeService.list('-created_at', 50),
        SupplierService.list(),
        RawMaterialService.list()
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
      console.log("Saving intake data:", intakeData);
      
      // Make sure we have all required fields
      if (!intakeData.supplier_id || !intakeData.raw_material_id || 
          !intakeData.quantity || !intakeData.cost_per_unit) {
        console.error("Missing required fields:", intakeData);
        throw new Error("Missing required fields");
      }
      
      // Ensure numeric fields are numbers
      const dataToSave = {
        supplier_id: intakeData.supplier_id,
        raw_material_id: intakeData.raw_material_id,
        quantity: parseFloat(intakeData.quantity),
        cost_per_unit: parseFloat(intakeData.cost_per_unit),
        total_cost: parseFloat(intakeData.quantity) * parseFloat(intakeData.cost_per_unit),
        remaining_quantity: parseFloat(intakeData.quantity), // Initialize remaining quantity
        lot_number: intakeData.lot_number || null,
        intake_date: intakeData.intake_date,
        expiry_date: intakeData.expiry_date || null,
        quality_notes: intakeData.quality_notes || null
      };
      
      const result = await MaterialIntakeService.create(dataToSave);
      console.log("Material intake saved successfully:", result);
      
      setShowForm(false);
      loadData();
    } catch (error) {
      console.error("Error saving intake:", error);
      alert("Failed to save material intake. Please check the console for details.");
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