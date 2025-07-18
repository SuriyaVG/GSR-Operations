# Design Document

## Overview

The User Profile Management system provides comprehensive user administration capabilities for the GSR Operations platform. It consists of user-facing profile management components and administrator-only user management interfaces. The system integrates with the existing Supabase authentication and extends the current User entity with enhanced profile management capabilities.

## Architecture

### Component Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                    User Management Layer                     │
├─────────────────────────────────────────────────────────────┤
│  ProfileSettings  │  UserManagement  │  RoleManager        │
│  Component        │  Dashboard       │  Component          │
├─────────────────────────────────────────────────────────────┤
│                    Business Logic Layer                     │
├─────────────────────────────────────────────────────────────┤
│  UserProfileService │ RoleService │ AuditService │ NotificationService │
├─────────────────────────────────────────────────────────────┤
│                    Data Access Layer                        │
├─────────────────────────────────────────────────────────────┤
│  Enhanced User Entity │ UserProfile Entity │ AuditLog Entity │
├─────────────────────────────────────────────────────────────┤
│                    Supabase Integration                     │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow
1. **Profile Updates**: User → ProfileSettings → UserProfileService → Database
2. **Role Management**: Admin → UserManagement → RoleService → Database + AuditLog
3. **Special Configurations**: System → UserProfileService → Enhanced User Entity

## Components and Interfaces

### 1. ProfileSettings Component
**Location**: `src/Components/auth/ProfileSettings.tsx`

**Purpose**: Allows users to update their own profile information

**Key Features**:
- Form for updating name, email preferences
- Real-time validation
- Success/error feedback
- Integration with existing auth context

**Props Interface**:
```typescript
interface ProfileSettingsProps {
  user: User;
  onProfileUpdate: (updates: Partial<User>) => Promise<void>;
  onClose?: () => void;
}
```

### 2. UserManagement Dashboard
**Location**: `src/Components/admin/UserManagement.tsx`

**Purpose**: Administrative interface for managing all users

**Key Features**:
- User list with search and filtering
- Role assignment interface
- Bulk operations
- User activity monitoring

**Props Interface**:
```typescript
interface UserManagementProps {
  users: User[];
  onRoleChange: (userId: string, newRole: UserRole) => Promise<void>;
  onUserUpdate: (userId: string, updates: Partial<User>) => Promise<void>;
}
```

### 3. RoleManager Component
**Location**: `src/Components/admin/RoleManager.tsx`

**Purpose**: Specialized component for role and permission management

**Key Features**:
- Role selection dropdown
- Permission preview
- Confirmation dialogs
- Audit trail display

## Data Models

### Enhanced User Profile
```typescript
interface EnhancedUserProfile extends UserProfile {
  designation?: string;
  custom_settings?: {
    display_name?: string;
    title?: string;
    department?: string;
    special_permissions?: string[];
  };
  last_profile_update?: string;
  updated_by?: string;
}
```

### User Configuration
```typescript
interface UserConfiguration {
  email: string;
  auto_settings: {
    name: string;
    designation: string;
    role: UserRole;
    custom_permissions?: string[];
  };
}
```

### Audit Log Entry
```typescript
interface AuditLogEntry {
  id: string;
  user_id: string;
  action: 'profile_update' | 'role_change' | 'permission_change';
  old_values: Record<string, any>;
  new_values: Record<string, any>;
  performed_by: string;
  timestamp: string;
  ip_address?: string;
}
```

## Services

### 1. UserProfileService
**Location**: `src/lib/services/userProfileService.ts`

**Responsibilities**:
- Handle profile updates
- Apply special user configurations
- Validate profile changes
- Coordinate with audit logging

**Key Methods**:
```typescript
class UserProfileService {
  static async updateProfile(userId: string, updates: Partial<User>): Promise<User>
  static async applySpecialConfiguration(email: string): Promise<UserConfiguration | null>
  static async getProfileHistory(userId: string): Promise<AuditLogEntry[]>
}
```

### 2. RoleService
**Location**: `src/lib/services/roleService.ts`

**Responsibilities**:
- Manage role assignments
- Validate role changes
- Handle permission updates
- Coordinate with notification system

**Key Methods**:
```typescript
class RoleService {
  static async changeUserRole(userId: string, newRole: UserRole, adminId: string): Promise<boolean>
  static async bulkRoleUpdate(updates: Array<{userId: string, role: UserRole}>): Promise<boolean>
  static async validateRoleChange(userId: string, newRole: UserRole): Promise<boolean>
}
```

### 3. SpecialUserConfigurations
**Location**: `src/lib/config/specialUsers.ts`

**Purpose**: Define special user configurations

```typescript
const SPECIAL_USER_CONFIGS: Record<string, UserConfiguration> = {
  'suriyavg834@gmail.com': {
    email: 'suriyavg834@gmail.com',
    auto_settings: {
      name: 'Suriya',
      designation: 'CEO',
      role: UserRole.ADMIN,
      custom_permissions: ['*']
    }
  }
};
```

## User Interface Design

### 1. Profile Settings Modal
- **Trigger**: User avatar/name click in sidebar
- **Layout**: Modal overlay with form fields
- **Fields**: Name, Email (read-only), Preferences
- **Actions**: Save, Cancel
- **Validation**: Real-time field validation

### 2. User Management Page
- **Route**: `/admin/users`
- **Layout**: Full page with sidebar navigation
- **Sections**: 
  - User list table with sorting/filtering
  - User detail panel
  - Role management controls
- **Access**: Admin role required

### 3. Role Assignment Interface
- **Location**: Within User Management page
- **Components**: 
  - Role dropdown with descriptions
  - Permission preview panel
  - Confirmation dialog
  - Audit trail section

## Integration Points

### 1. Authentication Context Enhancement
Extend existing `useAuth` hook to support:
- Profile update methods
- Role change notifications
- Special user detection

### 2. Layout Component Updates
Modify sidebar to:
- Show custom designations
- Add profile settings trigger
- Display role-appropriate navigation

### 3. Route Protection
Add new protected routes:
- `/profile` - User profile settings
- `/admin/users` - User management (admin only)

## Error Handling

### 1. Profile Update Errors
- Network connectivity issues
- Validation failures
- Permission denied scenarios
- Concurrent update conflicts

### 2. Role Change Errors
- Insufficient permissions
- Invalid role transitions
- Database constraint violations
- Audit logging failures

### 3. User Experience
- Toast notifications for success/error states
- Loading states during operations
- Graceful degradation for network issues
- Clear error messages with actionable guidance

## Testing Strategy

### 1. Unit Tests
- UserProfileService methods
- RoleService functionality
- Special user configuration logic
- Validation functions

### 2. Integration Tests
- Profile update flow
- Role change workflow
- Authentication integration
- Database operations

### 3. Component Tests
- ProfileSettings form behavior
- UserManagement interface
- Role assignment interactions
- Error state handling

### 4. End-to-End Tests
- Complete profile update journey
- Admin user management workflow
- Special user auto-configuration
- Permission enforcement