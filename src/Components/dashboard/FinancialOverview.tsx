import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/Components/ui/card";
import { Skeleton } from "@/Components/ui/skeleton";
import { IndianRupee, TrendingUp } from "lucide-react";

export default function FinancialOverview({ monthlyRevenue, loading }) {
  if (loading) {
    return (
      <Card className="bg-white/70 backdrop-blur-sm border-amber-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IndianRupee className="w-5 h-5" />
            Financial Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-4 w-24" />
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
          <IndianRupee className="w-5 h-5 text-amber-600" />
          Financial Overview
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-amber-700 font-medium">This Month's Revenue</p>
            <p className="text-3xl font-bold text-gray-900">
              ₹{monthlyRevenue.toLocaleString('en-IN')}
            </p>
          </div>
          
          <div className="flex items-center text-sm">
            <TrendingUp className="w-4 h-4 mr-1 text-green-500" />
            <span className="text-green-600 font-medium">Growth this month</span>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mt-6">
            <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border border-green-200">
              <p className="text-sm text-green-700 font-medium">Payments Received</p>
              <p className="text-lg font-bold text-green-800">₹{monthlyRevenue.toLocaleString('en-IN')}</p>
            </div>
            <div className="p-4 bg-gradient-to-br from-orange-50 to-amber-50 rounded-lg border border-orange-200">
              <p className="text-sm text-orange-700 font-medium">Outstanding</p>
              <p className="text-lg font-bold text-orange-800">₹0</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 