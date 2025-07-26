// Real-time connection status indicator component
import React from 'react';
import { useRealtimeConnection, ConnectionState } from '@/lib/realtime';
import { Wifi, WifiOff, RotateCcw, AlertTriangle } from 'lucide-react';

export interface RealtimeStatusProps {
  showText?: boolean;
  className?: string;
}

export function RealtimeStatus({ showText = false, className = '' }: RealtimeStatusProps) {
  const { connectionState, isConnected, isReconnecting, hasError } = useRealtimeConnection();

  const getStatusIcon = () => {
    switch (connectionState) {
      case ConnectionState.CONNECTED:
        return <Wifi className="w-4 h-4 text-green-500" />;
      case ConnectionState.RECONNECTING:
        return <RotateCcw className="w-4 h-4 text-yellow-500 animate-spin" />;
      case ConnectionState.ERROR:
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case ConnectionState.DISCONNECTED:
      default:
        return <WifiOff className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusText = () => {
    switch (connectionState) {
      case ConnectionState.CONNECTED:
        return 'Real-time connected';
      case ConnectionState.RECONNECTING:
        return 'Reconnecting...';
      case ConnectionState.ERROR:
        return 'Connection error';
      case ConnectionState.DISCONNECTED:
      default:
        return 'Disconnected';
    }
  };

  const getStatusColor = () => {
    switch (connectionState) {
      case ConnectionState.CONNECTED:
        return 'text-green-600';
      case ConnectionState.RECONNECTING:
        return 'text-yellow-600';
      case ConnectionState.ERROR:
        return 'text-red-600';
      case ConnectionState.DISCONNECTED:
      default:
        return 'text-gray-500';
    }
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {getStatusIcon()}
      {showText && (
        <span className={`text-sm font-medium ${getStatusColor()}`}>
          {getStatusText()}
        </span>
      )}
    </div>
  );
}

// Compact version for use in headers/toolbars
export function RealtimeStatusIndicator({ className = '' }: { className?: string }) {
  return <RealtimeStatus showText={false} className={className} />;
}

// Full version with text for use in status panels
export function RealtimeStatusPanel({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-gradient-to-r from-amber-50 to-orange-50 p-3 rounded-lg border border-amber-200 ${className}`}>
      <RealtimeStatus showText={true} />
    </div>
  );
}