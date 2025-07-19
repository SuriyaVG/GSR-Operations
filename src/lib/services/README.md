# UserProfileService

The `UserProfileService` provides comprehensive user profile management functionality for the GSR Operations system. It handles profile updates, special user configuration detection, validation, and error handling with full integration to Supabase operations.

## Features

- **Profile Updates**: Update user names, designations, and custom settings with validation
- **Special User Configuration**: Automatic detection and application of special user settings
- **Validation**: Comprehensive input validation with user-friendly error messages
- **Audit Logging**: Complete audit trail for all profile changes
- **Error Handling**: Robust error handling with user feedback via toast notifications
- **Supabase Integration**: Full integration with existing User entity and Supabase operations

## Usage Examples

### Basic Profile Update

```typescript
import { UserProfileService } from '@/lib/services/userProfileService';

// Update user profile
const result = await UserProfileService.updateProfile('user-id', {
  name: 'John Doe',
  designation: 'Senior Manager',
  custom_settings: {
    display_name: 'Johnny',
    title: 'Senior Operations Manager',
    department: 'Operations'
  }
});

if (result.success) {
  console.log('Profile updated successfully:', result.user);
} else {
  console.error('Update failed:', result.errors);
}
```

### Special User Configuration

```typescript
// Check if user has special configuration
const isSpecial = UserProfileService.isSpecialUser('suriyavg834@gmail.com');
console.log('Is special user:', isSpecial); // true

// Get special configuration
const config = UserProfileService.getSpecialUserConfiguration('suriyavg834@gmail.com');
console.log('Special config:', config);
// Output: { email: 'suriyavg834@gmail.com', auto_settings: { name: 'Suriya', designation: 'CEO', role: 'admin' } }

// Apply special configuration during profile creation
const profile = await UserProfileService.createEnhancedProfileWithSpecialConfig(
  'user-id',
  'suriyavg834@gmail.com'
);
```

### Profile Validation

```typescript
// Validate profile update data
const validation = UserProfileService.validateProfileUpdate({
  name: 'John Doe',
  designation: 'Manager'
});

if (validation.isValid) {
  console.log('Validation passed');
} else {
  console.log('Validation errors:', validation.errors);
}
```

### Profile History

```typescript
// Get profile change history
const history = await UserProfileService.getProfileHistory('user-id', 10);
console.log('Profile history:', history);
```

### Input Sanitization

```typescript
// Sanitize user input
const sanitized = UserProfileService.sanitizeProfileUpdate({
  name: '  John Doe  ',
  designation: '  Manager  ',
  custom_settings: {
    display_name: '  Johnny  '
  }
});
console.log('Sanitized:', sanitized);
// Output: { name: 'John Doe', designation: 'Manager', custom_settings: { display_name: 'Johnny' } }
```

## Validation Rules

The service enforces the following validation rules:

### Name
- **Required**: Yes
- **Min Length**: 2 characters
- **Max Length**: 100 characters
- **Pattern**: Letters, spaces, hyphens, and apostrophes only

### Designation
- **Required**: No
- **Max Length**: 50 characters
- **Pattern**: Letters, spaces, hyphens, and apostrophes only

### Custom Settings
- **Display Name**: Max 100 characters
- **Title**: Max 50 characters
- **Department**: Max 50 characters

## Error Handling

The service provides comprehensive error handling:

- **Validation Errors**: Detailed field-level validation messages
- **Database Errors**: Graceful handling of database connection issues
- **User Feedback**: Automatic toast notifications for success/error states
- **Audit Logging**: Error logging doesn't block main operations

## Integration Points

### Supabase Integration
- Uses `UserProfileManager` for database operations
- Integrates with Supabase Auth for user session management
- Creates audit log entries in the `audit_logs` table

### Special User Configuration
- Integrates with `SpecialUserConfigService` for special user detection
- Automatically applies predefined settings for configured emails
- Supports custom permissions and role assignments

### Toast Notifications
- Success messages for successful updates
- Error messages for failed operations
- User-friendly feedback throughout the process

## Requirements Fulfilled

This service fulfills the following requirements from the user profile management specification:

- **1.1**: Profile information display and updates
- **1.2**: Name updates with immediate UI reflection
- **1.3**: Input validation and user feedback
- **3.1**: Custom designation configuration
- **3.2**: Special user email detection and auto-configuration

## Testing

The service includes comprehensive test coverage:

- **Unit Tests**: Validation, sanitization, and utility functions
- **Integration Tests**: Database operations and error handling
- **Mock Support**: Full mocking of dependencies for isolated testing

Run tests with:
```bash
npm run test -- src/lib/services/__tests__/userProfileService.test.ts
npm run test -- src/lib/services/__tests__/userProfileService.integration.test.ts
```