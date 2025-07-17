import { useState, useEffect } from "react";
import { ProductionBatch, MaterialIntakeLog, RawMaterial } from "@/Entities/all";
import { Button } from "@/Components/ui/button";
import { Card, CardContent } from "@/Components/ui/card";
import { Plus, Factory, BarChart3, Search, Filter } from "lucide-react";
import { Input } from "@/Components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/Components/ui/tabs";

import ProductionForm from "../Components/production/ProductionForm";
import BatchList from "../Components/production/BatchList";
import ProductionMetrics from "../Components/production/ProductionMetrics";
import YieldAnalysis from "../Components/production/YieldAnalysis";

export default function Production() {
  const [batches, setBatches] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [rawMaterials, setRawMaterials] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [batchesData, materialsData, rawMaterialsData] = await Promise.all([
        ProductionBatch.list('-created_date', 50),
        MaterialIntakeLog.list(),
        RawMaterial.list()
      ]);
      
      setBatches(batchesData);
      setMaterials(materialsData);
      setRawMaterials(rawMaterialsData);
    } catch (error) {
      console.error("Error loading data:", error);
    }
    setIsLoading(false);
  };

  const handleSaveBatch = async (batchData: any) => {
    try {
      await ProductionBatch.create(batchData);
      setShowForm(false);
      loadData();
    } catch (error) {
      console.error("Error saving batch:", error);
    }
  };

  const filteredBatches = batches.filter(batch => {
    const matchesSearch = batch.batch_number?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || batch.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-6 space-y-6 bg-gradient-to-br from-amber-50 to-orange-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Production Management</h1>
            <p className="text-amber-700 mt-1">Track batches, yield, and production efficiency</p>
          </div>
          <Button 
            onClick={() => setShowForm(true)}
            className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Production Batch
          </Button>
        </div>

        <Tabs defaultValue="batches" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-white/70 backdrop-blur-sm border border-amber-200">
            <TabsTrigger value="batches" className="data-[state=active]:bg-amber-100 data-[state=active]:text-amber-800">
              <Factory className="w-4 h-4 mr-2" />
              Production Batches
            </TabsTrigger>
            <TabsTrigger value="metrics" className="data-[state=active]:bg-amber-100 data-[state=active]:text-amber-800">
              <BarChart3 className="w-4 h-4 mr-2" />
              Production Metrics
            </TabsTrigger>
            <TabsTrigger value="yield" className="data-[state=active]:bg-amber-100 data-[state=active]:text-amber-800">
              <BarChart3 className="w-4 h-4 mr-2" />
              Yield Analysis
            </TabsTrigger>
          </TabsList>

          <TabsContent value="batches" className="space-y-6">
            {/* Search and Filter */}
            <Card className="bg-white/70 backdrop-blur-sm border-amber-200">
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search by batch number..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 border-amber-200 focus:border-amber-400"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-gray-500" />
                    <select 
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="px-3 py-2 border border-amber-200 rounded-md focus:border-amber-400 bg-white"
                    >
                      <option value="all">All Status</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="quality_check">Quality Check</option>
                      <option value="approved">Approved</option>
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <BatchList 
              batches={filteredBatches}
              loading={isLoading}
              onRefresh={loadData}
            />
          </TabsContent>

          <TabsContent value="metrics">
            <ProductionMetrics batches={batches} loading={isLoading} />
          </TabsContent>

          <TabsContent value="yield">
            <YieldAnalysis batches={batches} materials={materials} rawMaterials={rawMaterials} loading={isLoading} />
          </TabsContent>
        </Tabs>

        {/* Form Modal */}
        {showForm && (
          <ProductionForm
            materials={materials}
            rawMaterials={rawMaterials}
            onSave={handleSaveBatch}
            onCancel={() => setShowForm(false)}
          />
        )}
      </div>
    </div>
  );
} 