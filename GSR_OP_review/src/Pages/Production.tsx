import { useState, useEffect } from "react";
import MaterialIntakeService from "@/services/MaterialIntakeService";
import RawMaterialService from "@/services/RawMaterialService";
import { ProductionBatchService } from '@/lib/productionBatch';
import type { CreateProductionBatchData } from '@/lib/productionBatch';
import { Button } from "@/Components/ui/button";
import { Card, CardContent } from "@/Components/ui/card";
import { Plus, Factory, BarChart3, Search, Filter, AlertCircle } from "lucide-react";
import { Input } from "@/Components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/Components/ui/tabs";
import { toast } from "@/lib/toast";
import { getBatchYieldData } from "@/lib/database-view-handler";
import { PageSkeleton } from "@/Components/ui/skeleton";

import ProductionForm from "../Components/production/ProductionForm";
import BatchList from "../Components/production/BatchList";
import ProductionMetrics from "../Components/production/ProductionMetrics";
import YieldAnalysis from "../Components/production/YieldAnalysis";

export default function Production() {
  console.log('Production mounted');
  const [batches, setBatches] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [rawMaterials, setRawMaterials] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      console.log('Fetching batchYieldData...');
      const batchYieldDataPromise = getBatchYieldData(undefined, 50);
      console.log('Fetching materials...');
      const materialsPromise = MaterialIntakeService.list();
      console.log('Fetching rawMaterials...');
      const rawMaterialsPromise = RawMaterialService.list();

      const [batchYieldData, materialsData, rawMaterialsData] = await Promise.all([
        batchYieldDataPromise,
        materialsPromise,
        rawMaterialsPromise
      ]);
      console.log('All production data fetched.');
      
      // Convert batch yield data to the format expected by components
      const batchesData = batchYieldData.map(batch => ({
        id: batch.batch_id,
        batch_number: batch.batch_number,
        production_date: batch.production_date,
        status: batch.status,
        output_litres: batch.output_litres,
        remaining_quantity: batch.output_litres, // Fallback
        total_input_cost: batch.total_input_cost,
        cost_per_litre: batch.cost_per_litre,
        yield_percentage: batch.yield_percentage,
        efficiency_rating: batch.efficiency_rating,
        material_breakdown: batch.material_breakdown
      }));
      
      setBatches(batchesData);
      setMaterials(materialsData);
      setRawMaterials(rawMaterialsData);
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load production data. Please try again.");
    } finally {
      setIsLoading(false);
      console.log('Production loading set to false');
    }
  };

  const handleSaveBatch = async (batchData: any) => {
    setIsSaving(true);
    try {
      // Validate batch data structure
      if (!batchData.batch_number || !batchData.production_date) {
        toast.error("Batch number and production date are required");
        return;
      }

      if (!batchData.inputs || !Array.isArray(batchData.inputs) || batchData.inputs.length === 0) {
        toast.error("At least one material input is required");
        return;
      }

      // Check inventory availability before attempting to create batch
      const validation = await ProductionBatchService.validateProductionBatchInputs(batchData.inputs);
      if (!validation.isValid) {
        const errorMessages = validation.errors.map(err => 
          `Material ${err.material_intake_id}: ${err.error}${err.availableQuantity !== undefined ? ` (Available: ${err.availableQuantity})` : ''}`
        );
        
        toast.error(`Inventory validation failed:\n${errorMessages.join('\n')}`);
        return;
      }

      // Convert to proper format for service
      const createData: CreateProductionBatchData = {
        batch_number: batchData.batch_number,
        production_date: batchData.production_date,
        notes: batchData.notes,
        inputs: batchData.inputs.map((input: any) => ({
          material_intake_id: input.material_intake_id,
          quantity_used: parseFloat(input.quantity_used) || 0
        }))
      };

      // Use proper service layer instead of direct entity call
      const createdBatch = await ProductionBatchService.createWithInventoryDecrement(createData);
      
      toast.success(`Production batch ${createdBatch.batch_number} created successfully`);
      setShowForm(false);
      loadData();
      
    } catch (error) {
      console.error("Error saving batch:", error);
      
      // Provide user-friendly error messages
      let errorMessage = "Failed to create production batch";
      if (error instanceof Error) {
        if (error.message.includes("Insufficient inventory")) {
          errorMessage = "Insufficient inventory for one or more materials";
        } else if (error.message.includes("not found")) {
          errorMessage = "One or more materials not found";
        } else if (error.message.includes("validation")) {
          errorMessage = "Batch validation failed";
        } else {
          errorMessage = `Creation failed: ${error.message}`;
        }
      }
      
      toast.error(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const filteredBatches = batches.filter(batch => {
    const matchesSearch = batch.batch_number?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || batch.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (isLoading) {
    return (
      <div className="p-6 bg-gradient-to-br from-amber-50 to-orange-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <PageSkeleton variant="list" />
        </div>
      </div>
    );
  }
  console.log('Production main content rendered');
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
                      className="px-3 py-2 border border-amber-200 rounded-md focus:border-amber-400 focus:ring-amber-100 bg-white"
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

            {/* Inventory Status Card */}
            <Card className="bg-white/70 backdrop-blur-sm border-amber-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                    <span className="text-sm font-medium text-amber-800">Inventory Status</span>
                  </div>
                  <span className="text-xs text-amber-600">
                    Check material availability before creating batches
                  </span>
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
            loading={isSaving}
          />
        )}
      </div>
    </div>
  );
} 