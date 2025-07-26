// src/Components/admin/DataIntegrityMonitor.tsx
import React, { useState, useEffect } from 'react';
import { DataIntegrityService, DataIntegrityIssue, DataIntegrityAlert } from '@/lib/services/dataIntegrityService';
import { toast } from '@/lib/toast';
import { User } from '@/Entities/User';

interface DataIntegrityMonitorProps {
  autoRefresh?: boolean;
  refreshInterval?: number; // in milliseconds
}

const DataIntegrityMonitor: React.FC<DataIntegrityMonitorProps> = ({
  autoRefresh = false,
  refreshInterval = 60000 // Default to 1 minute
}) => {
  const [issues, setIssues] = useState<DataIntegrityIssue[]>([]);
  const [history, setHistory] = useState<DataIntegrityIssue[]>([]);
  const [alerts, setAlerts] = useState<DataIntegrityAlert[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [showAlerts, setShowAlerts] = useState<boolean>(false);
  const [runningCheck, setRunningCheck] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [resolution, setResolution] = useState<string>('');
  const [selectedIssue, setSelectedIssue] = useState<DataIntegrityIssue | null>(null);

  // Load current user
  useEffect(() => {
    const loadUser = async () => {
      try {
        const user = await User.me();
        setCurrentUser(user);
      } catch (error) {
        console.error('Error loading user:', error);
      }
    };

    loadUser();
  }, []);

  // Load issues
  const loadIssues = async () => {
    setLoading(true);
    try {
      const unresolvedIssues = await DataIntegrityService.getUnresolvedIssues();
      setIssues(unresolvedIssues);
    } catch (error) {
      console.error('Error loading issues:', error);
      toast.error('Failed to load data integrity issues');
    } finally {
      setLoading(false);
    }
  };

  // Load issue history
  const loadHistory = async () => {
    setLoading(true);
    try {
      const issueHistory = await DataIntegrityService.getIssueHistory();
      setHistory(issueHistory);
    } catch (error) {
      console.error('Error loading issue history:', error);
      toast.error('Failed to load issue history');
    } finally {
      setLoading(false);
    }
  };

  // Load alerts
  const loadAlerts = async () => {
    setLoading(true);
    try {
      const activeAlerts = await DataIntegrityService.getActiveAlerts();
      setAlerts(activeAlerts);
    } catch (error) {
      console.error('Error loading alerts:', error);
      toast.error('Failed to load alerts');
    } finally {
      setLoading(false);
    }
  };

  // Run data integrity check
  const runCheck = async () => {
    setRunningCheck(true);
    try {
      toast.info('Running data integrity check...');
      const result = await DataIntegrityService.runAllChecks();

      if (result.success) {
        if (result.issues.length === 0) {
          toast.success('No data integrity issues found');
        } else {
          toast.warning(`Found ${result.issues.length} data integrity issues`);
        }

        // Reload issues
        await loadIssues();
      } else {
        toast.error('Failed to run data integrity check');
      }
    } catch (error) {
      console.error('Error running data integrity check:', error);
      toast.error('Failed to run data integrity check');
    } finally {
      setRunningCheck(false);
    }
  };

  // Resolve issue
  const resolveIssue = async (issueId: string) => {
    if (!resolution.trim()) {
      toast.error('Please enter a resolution description');
      return;
    }

    try {
      const success = await DataIntegrityService.resolveIssue(issueId, resolution);

      if (success) {
        toast.success('Issue resolved successfully');
        setSelectedIssue(null);
        setResolution('');
        await loadIssues();
        await loadHistory();
      }
    } catch (error) {
      console.error('Error resolving issue:', error);
      toast.error('Failed to resolve issue');
    }
  };

  // Acknowledge alert
  const acknowledgeAlert = async (alertId: string) => {
    try {
      const success = await DataIntegrityService.acknowledgeAlert(alertId);

      if (success) {
        await loadAlerts();
      }
    } catch (error) {
      console.error('Error acknowledging alert:', error);
      toast.error('Failed to acknowledge alert');
    }
  };

  // Initial load
  useEffect(() => {
    loadIssues();
  }, []);

  // Auto refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      loadIssues();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval]);

  // Load history when tab changes
  useEffect(() => {
    if (showHistory) {
      loadHistory();
    }
  }, [showHistory]);

  // Load alerts when tab changes
  useEffect(() => {
    if (showAlerts) {
      loadAlerts();
    }
  }, [showAlerts]);

  // Get severity badge color
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-600 text-white';
      case 'high':
        return 'bg-orange-500 text-white';
      case 'medium':
        return 'bg-yellow-500 text-black';
      case 'low':
        return 'bg-blue-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  // Get issue type display name
  const getIssueTypeDisplay = (type: string) => {
    return type
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-800">Data Integrity Monitor</h2>
        <div className="flex space-x-2">
          <button
            onClick={() => {
              setShowHistory(false);
              setShowAlerts(!showAlerts);
            }}
            className={`px-4 py-2 rounded-md transition ${showAlerts
              ? 'bg-orange-600 text-white hover:bg-orange-700'
              : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
              }`}
          >
            {showAlerts ? 'Hide Alerts' : `Show Alerts ${alerts.length > 0 ? `(${alerts.length})` : ''}`}
          </button>
          <button
            onClick={() => {
              setShowAlerts(false);
              setShowHistory(!showHistory);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
          >
            {showHistory ? 'Show Active Issues' : 'Show History'}
          </button>
          <button
            onClick={runCheck}
            disabled={runningCheck}
            className={`px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition ${runningCheck ? 'opacity-50 cursor-not-allowed' : ''
              }`}
          >
            {runningCheck ? 'Running Check...' : 'Run Integrity Check'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : showAlerts ? (
        // Show alerts
        <div>
          <h3 className="text-xl font-medium text-gray-700 mb-4">Data Integrity Alerts</h3>
          {alerts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No active alerts found</div>
          ) : (
            <div className="space-y-4">
              {alerts.map(alert => (
                <div
                  key={alert.id}
                  className={`p-4 rounded-lg border ${alert.severity === 'critical' ? 'bg-red-50 border-red-300' :
                    alert.severity === 'high' ? 'bg-orange-50 border-orange-300' :
                      alert.severity === 'medium' ? 'bg-yellow-50 border-yellow-300' :
                        'bg-blue-50 border-blue-300'
                    }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 rounded-full text-xs ${getSeverityColor(alert.severity)}`}>
                          {alert.severity.toUpperCase()}
                        </span>
                        <h4 className="text-lg font-medium">{getIssueTypeDisplay(alert.issueType)}</h4>
                      </div>
                      <p className="mt-1 text-gray-700">{alert.message}</p>
                      <p className="text-sm text-gray-500 mt-1">
                        Triggered: {new Date(alert.triggeredAt).toLocaleString()}
                      </p>
                    </div>
                    <button
                      onClick={() => acknowledgeAlert(alert.id)}
                      className="px-3 py-1 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition"
                    >
                      Acknowledge
                    </button>
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <button
                      onClick={runCheck}
                      className="text-sm text-blue-600 hover:text-blue-800 transition"
                    >
                      Run integrity check to find related issues
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : showHistory ? (
        // Show resolved issues history
        <div>
          <h3 className="text-xl font-medium text-gray-700 mb-4">Resolved Issues</h3>
          {history.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No resolved issues found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="py-3 px-4 text-left">Type</th>
                    <th className="py-3 px-4 text-left">Description</th>
                    <th className="py-3 px-4 text-left">Severity</th>
                    <th className="py-3 px-4 text-left">Resolved At</th>
                    <th className="py-3 px-4 text-left">Resolution</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map(issue => (
                    <tr key={issue.id} className="border-t hover:bg-gray-50">
                      <td className="py-3 px-4">{getIssueTypeDisplay(issue.type)}</td>
                      <td className="py-3 px-4">{issue.description}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs ${getSeverityColor(issue.severity)}`}>
                          {issue.severity.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {new Date(issue.resolvedAt || '').toLocaleString()}
                      </td>
                      <td className="py-3 px-4">{issue.resolution}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        // Show active issues
        <div>
          <h3 className="text-xl font-medium text-gray-700 mb-4">Active Issues</h3>
          {issues.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No active data integrity issues found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="py-3 px-4 text-left">Type</th>
                    <th className="py-3 px-4 text-left">Description</th>
                    <th className="py-3 px-4 text-left">Severity</th>
                    <th className="py-3 px-4 text-left">Detected At</th>
                    <th className="py-3 px-4 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {issues.map(issue => (
                    <tr key={issue.id} className="border-t hover:bg-gray-50">
                      <td className="py-3 px-4">{getIssueTypeDisplay(issue.type)}</td>
                      <td className="py-3 px-4">{issue.description}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs ${getSeverityColor(issue.severity)}`}>
                          {issue.severity.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {new Date(issue.detectedAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => setSelectedIssue(issue)}
                          className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
                        >
                          Resolve
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Resolution Modal */}
      {selectedIssue && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold mb-4">Resolve Issue</h3>
            <p className="mb-4">{selectedIssue.description}</p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Resolution Description
              </label>
              <textarea
                value={resolution}
                onChange={e => setResolution(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={4}
                placeholder="Describe how this issue was resolved..."
              ></textarea>
            </div>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => {
                  setSelectedIssue(null);
                  setResolution('');
                }}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => resolveIssue(selectedIssue.id)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
              >
                Mark as Resolved
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataIntegrityMonitor;