import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Alert, AlertDescription } from '@/Components/ui/alert';
import { Badge } from '@/Components/ui/badge';
import { Button } from '@/Components/ui/button';
import { SecurityAuditService, SecurityEventType } from '@/lib/services/securityAuditService';
import { useAuth } from '@/lib/auth';
import { Shield, AlertTriangle, Eye, RefreshCw, Clock, Users, Activity } from 'lucide-react';

interface SecurityStats {
  timeRange: string;
  totalEvents: number;
  eventBreakdown: Record<string, number>;
  securityMetrics: {
    failedLogins: number;
    successfulLogins: number;
    loginSuccessRate: string;
    unauthorizedAttempts: number;
    criticalEvents: number;
  };
  currentLockouts: number;
}

interface SecurityEvent {
  id: string;
  event_type: SecurityEventType;
  user_name?: string;
  email?: string;
  ip_address?: string;
  resource?: string;
  action?: string;
  attempted_role?: string;
  user_role?: string;
  error_message?: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export const SecurityMonitor: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<SecurityStats | null>(null);
  const [recentEvents, setRecentEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState(24);

  const loadSecurityData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      // Load security statistics
      const securityStats = await SecurityAuditService.getSecurityStats(user.id, timeRange);
      setStats(securityStats);

      // Load recent security events (this would need to be implemented)
      // For now, we'll show a placeholder
      setRecentEvents([]);

    } catch (err) {
      console.error('Failed to load security data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load security data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSecurityData();
  }, [user, timeRange]);

  const getEventTypeColor = (eventType: SecurityEventType): string => {
    switch (eventType) {
      case SecurityEventType.LOGIN_SUCCESS:
        return 'bg-green-100 text-green-800';
      case SecurityEventType.LOGIN_FAILED:
      case SecurityEventType.MULTIPLE_LOGIN_ATTEMPTS:
      case SecurityEventType.AUTHENTICATION_FAILURE:
        return 'bg-red-100 text-red-800';
      case SecurityEventType.UNAUTHORIZED_ACCESS_ATTEMPT:
      case SecurityEventType.ROLE_ESCALATION_ATTEMPT:
      case SecurityEventType.SESSION_HIJACK_ATTEMPT:
      case SecurityEventType.BRUTE_FORCE_ATTEMPT:
        return 'bg-red-100 text-red-800';
      case SecurityEventType.ROLE_ASSIGNMENT_CHANGE:
        return 'bg-orange-100 text-orange-800';
      case SecurityEventType.PERMISSION_DENIED:
        return 'bg-yellow-100 text-yellow-800';
      case SecurityEventType.LOGOUT:
      case SecurityEventType.SESSION_EXPIRED:
        return 'bg-blue-100 text-blue-800';
      case SecurityEventType.PASSWORD_RESET_REQUEST:
      case SecurityEventType.PASSWORD_CHANGE:
        return 'bg-purple-100 text-purple-800';
      case SecurityEventType.SUSPICIOUS_ACTIVITY:
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getEventTypeIcon = (eventType: SecurityEventType) => {
    switch (eventType) {
      case SecurityEventType.LOGIN_SUCCESS:
      case SecurityEventType.LOGOUT:
      case SecurityEventType.SESSION_EXPIRED:
        return <Users className="h-4 w-4" />;
      case SecurityEventType.UNAUTHORIZED_ACCESS_ATTEMPT:
      case SecurityEventType.ROLE_ESCALATION_ATTEMPT:
      case SecurityEventType.SESSION_HIJACK_ATTEMPT:
      case SecurityEventType.BRUTE_FORCE_ATTEMPT:
      case SecurityEventType.SUSPICIOUS_ACTIVITY:
        return <AlertTriangle className="h-4 w-4" />;
      case SecurityEventType.ROLE_ASSIGNMENT_CHANGE:
        return <Users className="h-4 w-4" />;
      case SecurityEventType.PERMISSION_DENIED:
        return <Shield className="h-4 w-4" />;
      case SecurityEventType.LOGIN_FAILED:
      case SecurityEventType.MULTIPLE_LOGIN_ATTEMPTS:
      case SecurityEventType.AUTHENTICATION_FAILURE:
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const formatEventType = (eventType: string): string => {
    return eventType.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Security Monitor</h2>
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-amber-500"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Security Monitor</h2>
          <Button onClick={loadSecurityData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Security Monitor</h2>
        <div className="flex items-center space-x-4">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(Number(e.target.value))}
            className="border border-gray-300 rounded-md px-3 py-1 text-sm"
          >
            <option value={1}>Last Hour</option>
            <option value={24}>Last 24 Hours</option>
            <option value={168}>Last Week</option>
            <option value={720}>Last Month</option>
          </select>
          <Button onClick={loadSecurityData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Security Metrics Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Events</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalEvents}</p>
                </div>
                <Activity className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Login Success Rate</p>
                  <p className="text-2xl font-bold text-green-600">{stats.securityMetrics.loginSuccessRate}</p>
                </div>
                <Users className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Critical Events</p>
                  <p className="text-2xl font-bold text-red-600">{stats.securityMetrics.criticalEvents}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Lockouts</p>
                  <p className="text-2xl font-bold text-orange-600">{stats.currentLockouts}</p>
                </div>
                <Shield className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Event Breakdown */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Eye className="h-5 w-5 mr-2" />
              Event Breakdown ({stats.timeRange})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(stats.eventBreakdown).map(([eventType, count]) => (
                <div key={eventType} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    {getEventTypeIcon(eventType as SecurityEventType)}
                    <span className="text-sm font-medium">{formatEventType(eventType)}</span>
                  </div>
                  <Badge variant="secondary">{count}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Security Alerts */}
      {stats && stats.securityMetrics.criticalEvents > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Security Alert:</strong> {stats.securityMetrics.criticalEvents} critical security events detected in the last {stats.timeRange}. 
            This includes {stats.securityMetrics.unauthorizedAttempts} unauthorized access attempts.
          </AlertDescription>
        </Alert>
      )}

      {/* Recent Events Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Clock className="h-5 w-5 mr-2" />
            Recent Security Events
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Recent events display will be available once the security audit logs are populated.</p>
            <p className="text-sm mt-2">Events are being logged and will appear here as they occur.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SecurityMonitor;