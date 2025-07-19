import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { 
  AuditService, 
  type AuditLogFilter, 
  type AuditLogEntryWithNames,
  type PaginatedAuditLog
} from '@/lib/services/auditService';
import { useAuth } from '@/lib/auth';
import { UserRole } from '@/Entities/User';
import { toast } from '@/lib/toast';

// UI Components
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/Components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/Components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/Components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/Components/ui/dialog";
import { Button } from "@/Components/ui/button";
import { Input } from "@/Components/ui/input";
import { Label } from "@/Components/ui/label";
import { Skeleton } from "@/Components/ui/skeleton";
import { Badge } from "@/Components/ui/badge";
import { CalendarIcon, FilterIcon, SearchIcon, RefreshCw } from 'lucide-react';

interface AuditLogViewerProps {
  userId?: string; // Optional: Filter logs for a specific user
  className?: string;
}

export function AuditLogViewer({ userId, className }: AuditLogViewerProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [auditLogs, setAuditLogs] = useState<PaginatedAuditLog | null>(null);
  const [selectedLog, setSelectedLog] = useState<AuditLogEntryWithNames | null>(null);
  const [filter, setFilter] = useState<AuditLogFilter>({
    userId: userId,
    limit: 10,
    offset: 0
  });
  const [showFilterDialog, setShowFilterDialog] = useState(false);
  const [filterForm, setFilterForm] = useState({
    action: '',
    fromDate: '',
    toDate: '',
    performedBy: ''
  });

  // Check if user is admin
  const isAdmin = user?.role === UserRole.ADMIN;

  // Load audit logs
  useEffect(() => {
    if (!isAdmin) {
      toast.error('Access denied: Admin role required to view audit logs');
      return;
    }

    loadAuditLogs();
  }, [filter, isAdmin]);

  // Load audit logs from API
  const loadAuditLogs = async () => {
    try {
      setLoading(true);
      
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      const logs = await AuditService.getAuditLogs(filter, user.id);
      setAuditLogs(logs);
    } catch (error) {
      console.error('Error loading audit logs:', error);
      toast.error(`Failed to load audit logs: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle page change
  const handlePageChange = (newPage: number) => {
    if (!auditLogs) return;
    
    const offset = (newPage - 1) * (filter.limit || 10);
    setFilter({
      ...filter,
      offset
    });
  };

  // Apply filters
  const applyFilters = () => {
    const newFilter: AuditLogFilter = {
      ...filter,
      offset: 0 // Reset to first page
    };

    if (filterForm.action) {
      newFilter.action = filterForm.action as any;
    } else {
      delete newFilter.action;
    }

    if (filterForm.fromDate) {
      newFilter.fromDate = filterForm.fromDate;
    } else {
      delete newFilter.fromDate;
    }

    if (filterForm.toDate) {
      newFilter.toDate = filterForm.toDate;
    } else {
      delete newFilter.toDate;
    }

    if (filterForm.performedBy) {
      newFilter.performedBy = filterForm.performedBy;
    } else {
      delete newFilter.performedBy;
    }

    setFilter(newFilter);
    setShowFilterDialog(false);
  };

  // Reset filters
  const resetFilters = () => {
    setFilterForm({
      action: '',
      fromDate: '',
      toDate: '',
      performedBy: ''
    });
    
    setFilter({
      userId: userId,
      limit: 10,
      offset: 0
    });
    
    setShowFilterDialog(false);
  };

  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    try {
      return format(new Date(timestamp), 'MMM d, yyyy h:mm a');
    } catch (e) {
      return timestamp;
    }
  };

  // Get action badge color
  const getActionBadgeColor = (action: string) => {
    switch (action) {
      case 'profile_update':
        return 'bg-blue-100 text-blue-800';
      case 'role_change':
        return 'bg-purple-100 text-purple-800';
      case 'permission_change':
        return 'bg-amber-100 text-amber-800';
      case 'designation_change':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Format action for display
  const formatAction = (action: string) => {
    return action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  // View log details
  const viewLogDetails = (log: AuditLogEntryWithNames) => {
    setSelectedLog(log);
  };

  // Render pagination controls
  const renderPagination = () => {
    if (!auditLogs) return null;

    const { page, totalPages } = auditLogs;
    
    return (
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handlePageChange(page - 1)}
          disabled={page <= 1}
        >
          Previous
        </Button>
        <span className="text-sm text-gray-600">
          Page {page} of {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handlePageChange(page + 1)}
          disabled={page >= totalPages}
        >
          Next
        </Button>
      </div>
    );
  };

  // Render log details
  const renderLogDetails = () => {
    if (!selectedLog) return null;

    const changes = AuditService.getDetailedChanges(selectedLog);

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-sm font-medium">User</Label>
            <p className="text-sm">{selectedLog.user_name || selectedLog.user_id}</p>
          </div>
          <div>
            <Label className="text-sm font-medium">Performed By</Label>
            <p className="text-sm">{selectedLog.performed_by_name || selectedLog.performed_by}</p>
          </div>
          <div>
            <Label className="text-sm font-medium">Action</Label>
            <p className="text-sm">{formatAction(selectedLog.action)}</p>
          </div>
          <div>
            <Label className="text-sm font-medium">Timestamp</Label>
            <p className="text-sm">{formatTimestamp(selectedLog.timestamp)}</p>
          </div>
        </div>

        <div>
          <Label className="text-sm font-medium">Changes</Label>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Field</TableHead>
                <TableHead>Old Value</TableHead>
                <TableHead>New Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {changes.map((change, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{change.field}</TableCell>
                  <TableCell>
                    {typeof change.oldValue === 'object' 
                      ? JSON.stringify(change.oldValue, null, 2) 
                      : String(change.oldValue || '')}
                  </TableCell>
                  <TableCell>
                    {typeof change.newValue === 'object' 
                      ? JSON.stringify(change.newValue, null, 2) 
                      : String(change.newValue || '')}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  };

  // If not admin, show access denied
  if (!isAdmin) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Audit Logs</CardTitle>
          <CardDescription>View system audit logs</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-40">
            <p className="text-red-500">Access denied: Admin role required</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Audit Logs</CardTitle>
            <CardDescription>View and filter system audit logs</CardDescription>
          </div>
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowFilterDialog(true)}
            >
              <FilterIcon className="h-4 w-4 mr-1" />
              Filter
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={loadAuditLogs}
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Performed By</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditLogs?.logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium">
                      {formatTimestamp(log.timestamp)}
                    </TableCell>
                    <TableCell>
                      <Badge className={getActionBadgeColor(log.action)}>
                        {formatAction(log.action)}
                      </Badge>
                    </TableCell>
                    <TableCell>{log.user_name || log.user_id}</TableCell>
                    <TableCell>{log.performed_by_name || log.performed_by}</TableCell>
                    <TableCell>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => viewLogDetails(log)}
                      >
                        View Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {auditLogs?.logs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-4">
                      No audit logs found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
      <CardFooter>
        {renderPagination()}
      </CardFooter>

      {/* Filter Dialog */}
      <Dialog open={showFilterDialog} onOpenChange={setShowFilterDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Filter Audit Logs</DialogTitle>
            <DialogDescription>
              Set filters to narrow down audit log results
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="action">Action Type</Label>
              <Select
                value={filterForm.action}
                onValueChange={(value) => setFilterForm({...filterForm, action: value})}
              >
                <SelectTrigger id="action">
                  <SelectValue placeholder="Select action type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Actions</SelectItem>
                  <SelectItem value="profile_update">Profile Update</SelectItem>
                  <SelectItem value="role_change">Role Change</SelectItem>
                  <SelectItem value="permission_change">Permission Change</SelectItem>
                  <SelectItem value="designation_change">Designation Change</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fromDate">From Date</Label>
              <Input
                id="fromDate"
                type="datetime-local"
                value={filterForm.fromDate}
                onChange={(e) => setFilterForm({...filterForm, fromDate: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="toDate">To Date</Label>
              <Input
                id="toDate"
                type="datetime-local"
                value={filterForm.toDate}
                onChange={(e) => setFilterForm({...filterForm, toDate: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="performedBy">Performed By (User ID)</Label>
              <Input
                id="performedBy"
                value={filterForm.performedBy}
                onChange={(e) => setFilterForm({...filterForm, performedBy: e.target.value})}
                placeholder="Enter user ID"
              />
            </div>
          </div>
          <div className="flex justify-between">
            <Button variant="outline" onClick={resetFilters}>
              Reset Filters
            </Button>
            <Button onClick={applyFilters}>
              Apply Filters
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Log Details Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Audit Log Details</DialogTitle>
            <DialogDescription>
              Detailed information about this audit log entry
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {renderLogDetails()}
          </div>
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setSelectedLog(null)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export default AuditLogViewer;