import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Button } from '@/Components/ui/button';
import CreditNoteManager from '@/Components/finance/CreditNoteManager';
import { Receipt, FileText, DollarSign } from 'lucide-react';

export default function CreditNoteExample() {
  const [showManager, setShowManager] = useState(false);

  return (
    <div className="space-y-6 p-6">
      <Card className="border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Receipt className="w-8 h-8 text-amber-600" />
            Credit Note Management Example
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-700">
            This example demonstrates the Credit Note management functionality that was implemented 
            as part of the Automated Financial Workflow feature.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white/80 backdrop-blur-sm p-4 rounded-lg border border-amber-200">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-5 h-5 text-amber-600" />
                <h3 className="font-semibold text-gray-900">Create Credit Notes</h3>
              </div>
              <p className="text-sm text-gray-600">
                Process returns, refunds, and billing adjustments with automated ledger entries.
              </p>
            </div>
            
            <div className="bg-white/80 backdrop-blur-sm p-4 rounded-lg border border-amber-200">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-5 h-5 text-amber-600" />
                <h3 className="font-semibold text-gray-900">Approval Workflow</h3>
              </div>
              <p className="text-sm text-gray-600">
                Role-based approval system ensures proper authorization for financial adjustments.
              </p>
            </div>
            
            <div className="bg-white/80 backdrop-blur-sm p-4 rounded-lg border border-amber-200">
              <div className="flex items-center gap-2 mb-2">
                <Receipt className="w-5 h-5 text-amber-600" />
                <h3 className="font-semibold text-gray-900">Automated Integration</h3>
              </div>
              <p className="text-sm text-gray-600">
                Seamlessly integrates with invoice management and financial ledger systems.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <Button
              onClick={() => setShowManager(!showManager)}
              className="bg-gradient-to-r from-amber-500 to-orange-500 text-white"
            >
              {showManager ? 'Hide' : 'Show'} Credit Note Manager
            </Button>
          </div>
        </CardContent>
      </Card>

      {showManager && (
        <CreditNoteManager />
      )}
    </div>
  );
}