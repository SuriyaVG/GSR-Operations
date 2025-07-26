import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/Components/ui/card";
import { Skeleton } from "@/Components/ui/skeleton";
import { TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils"; // We'll use cn for consistency

const colorVariants = {
  blue: {
    gradient: "from-blue-500 to-cyan-500",
    text: "text-blue-600",
  },
  green: {
    gradient: "from-green-500 to-emerald-500",
    text: "text-green-600",
  },
  orange: {
    gradient: "from-orange-500 to-amber-500",
    text: "text-orange-600",
  },
  purple: {
    gradient: "from-purple-500 to-violet-500",
    text: "text-purple-600",
  },
};

export default function StatsCard({ title, value, icon: Icon, color, trend, loading }) {
  if (loading || !Icon) { // Add a guard for the Icon
    return (
      <Card className="relative overflow-hidden bg-white/70 backdrop-blur-sm border-amber-200">
        <CardHeader className="p-6">
          <div className="flex justify-between items-start">
            <div>
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-8 w-16" />
            </div>
            <Skeleton className="w-12 h-12 rounded-xl" />
          </div>
          <Skeleton className="h-4 w-20 mt-4" />
        </CardHeader>
      </Card>
    );
  }

  const selectedColor = colorVariants[color] || colorVariants.blue;

  return (
    <Card className="relative overflow-hidden bg-white/70 backdrop-blur-sm border-amber-200 hover:shadow-lg transition-all duration-300 rounded-2xl p-8">
      <div className={cn('absolute top-0 right-0 w-40 h-40 bg-gradient-to-br opacity-10 rounded-full transform translate-x-8 -translate-y-8', selectedColor.gradient)} />
      <CardHeader className="p-0 mb-4">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-lg font-semibold text-amber-700 mb-2">{title}</p>
            <CardTitle className="text-3xl md:text-4xl font-bold text-gray-900">
              {value}
            </CardTitle>
          </div>
          <div className={cn('p-4 rounded-2xl bg-gradient-to-br bg-opacity-20', selectedColor.gradient)}>
            <Icon className={cn('w-8 h-8', selectedColor.text)} />
          </div>
        </div>
        {trend && (
          <div className="flex items-center mt-5 text-base">
            <TrendingUp className="w-5 h-5 mr-2 text-green-500" />
            <span className="text-gray-600">{trend}</span>
          </div>
        )}
      </CardHeader>
    </Card>
  );
} 