import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/Components/ui/card";
import { Skeleton } from "@/Components/ui/skeleton";
import { Factory, Target } from "lucide-react";

export default function ProductionMetrics({ avgYield, loading }) {
  if (loading) {
    return (
      <Card className="bg-white/70 backdrop-blur-sm border-amber-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Factory className="w-5 h-5" />
            Production Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-4 w-32" />
            <div className="grid grid-cols-2 gap-4 mt-6">
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white/70 backdrop-blur-sm border-amber-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-gray-900">
          <Factory className="w-5 h-5 text-amber-600" />
          Production Metrics
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-amber-700 font-medium">Average Yield</p>
            <p className="text-3xl font-bold text-gray-900">
              {avgYield.toFixed(1)}%
            </p>
          </div>
          
          <div className="flex items-center text-sm">
            <Target className="w-4 h-4 mr-1 text-blue-500" />
            <span className="text-blue-600 font-medium">Production efficiency</span>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mt-6">
            <div className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-700 font-medium">Batches Today</p>
              <p className="text-lg font-bold text-blue-800">0</p>
            </div>
            <div className="p-4 bg-gradient-to-br from-purple-50 to-violet-50 rounded-lg border border-purple-200">
              <p className="text-sm text-purple-700 font-medium">Quality Check</p>
              <p className="text-lg font-bold text-purple-800">0</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 