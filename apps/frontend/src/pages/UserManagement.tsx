import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Loading } from '../components/ui/loading';
import { 
  Users, 
  UserPlus, 
  Shield, 
  Search,
  AlertCircle,
  Edit,
  Trash2,
  RefreshCw,
  CheckCircle,
  UserCheck,
  UserMinus
} from 'lucide-react';
import { config } from '../config/environment';

interface User {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  enabled: boolean;
  emailVerified: boolean;
  roles: string[];
  groups: string[];
  createdTimestamp: number;
  lastLogin?: number;
  attributes?: Record<string, string[]>;
}

interface UserFormData {
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  password?: string;
  enabled: boolean;
  emailVerified: boolean;
  roles: string[];
  groups: string[];
}

export const UserManagement: React.FC = () => {
  console.log('👥 UserManagement component rendering');
  const { user, isAdmin } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<UserFormData>({
    username: '',
    email: '',
    firstName: '',
    lastName: '',
    password: '',
    enabled: true,
    emailVerified: false,
    roles: [],
    groups: []
  });

  // Available roles and groups
  const availableRoles = ['admin', 'user', 'viewer', 'manager'];
  const availableGroups = ['admins', 'users', 'developers', 'operators'];

  useEffect(() => {
    console.log('👥 useEffect triggered, user:', !!user, 'isAdmin:', isAdmin);
    if (user && isAdmin) {
      fetchUsers();
    } else {
      setIsLoading(false);
    }
  }, [user, isAdmin]);

  const fetchUsers = async () => {
    if (!user || !isAdmin) {
      console.log('👥 No user or not admin, skipping fetch');
      return;
    }

    try {
      console.log('👥 Starting users fetch from User Service...');
      setIsLoading(true);
      setError(null);
      
      // Fetch from User Service API via auth-bff proxy
      const response = await fetch('http://localhost:3002/api/users', {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      console.log('👥 Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('👥 Received user data:', data);
        
        // Transform User Service data to our interface format
        const transformedUsers: User[] = (data.users || data.data || []).map((u: any) => ({
          id: u.id,
          username: u.username || u.email?.split('@')[0] || 'unknown',
          email: u.email,
          firstName: u.first_name || '',
          lastName: u.last_name || '',
          enabled: u.is_active !== false,
          emailVerified: u.email_verified || false,
          roles: u.roles || ['user'],
          groups: u.groups || ['users'],
          createdTimestamp: u.created_at ? new Date(u.created_at).getTime() : Date.now(),
          lastLogin: u.last_login_at ? new Date(u.last_login_at).getTime() : undefined,
          attributes: u.metadata || {}
        }));
        
        setUsers(transformedUsers);
      } else if (response.status === 404) {
        // User Service endpoint not available, create sample data for demo
        console.log('👥 User Service not available, using mock data');
        const mockUsers: User[] = [
          {
            id: '1',
            username: 'admin',
            email: 'admin@sso-hub.local',
            firstName: 'System',
            lastName: 'Administrator',
            enabled: true,
            emailVerified: true,
            roles: ['admin', 'user'],
            groups: ['admins', 'users'],
            createdTimestamp: Date.now() - 86400000 * 30,
            lastLogin: Date.now() - 3600000
          },
          {
            id: '2',
            username: 'john.doe',
            email: 'john.doe@company.com',
            firstName: 'John',
            lastName: 'Doe',
            enabled: true,
            emailVerified: true,
            roles: ['user'],
            groups: ['users', 'developers'],
            createdTimestamp: Date.now() - 86400000 * 15,
            lastLogin: Date.now() - 7200000
          }
        ];
        setUsers(mockUsers);
      } else {
        const errorText = await response.text();
        console.error('👥 Response error:', errorText);
        setError(`Failed to fetch users: ${response.status} - ${errorText}`);
      }
    } catch (err) {
      console.error('👥 Failed to fetch users:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch users');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddUser = () => {
    setFormData({
      username: '',
      email: '',
      firstName: '',
      lastName: '',
      password: '',
      enabled: true,
      emailVerified: false,
      roles: ['user'],
      groups: ['users']
    });
    setEditingUser(null);
    setShowAddModal(true);
  };

  const handleEditUser = (userToEdit: User) => {
    setFormData({
      username: userToEdit.username,
      email: userToEdit.email,
      firstName: userToEdit.firstName,
      lastName: userToEdit.lastName,
      enabled: userToEdit.enabled,
      emailVerified: userToEdit.emailVerified,
      roles: userToEdit.roles,
      groups: userToEdit.groups
    });
    setEditingUser(userToEdit);
    setShowAddModal(true);
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    try {
      console.log('👥 Deleting user:', userId);
      
      const response = await fetch(`http://localhost:3002/api/users/${userId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (response.ok) {
        console.log('✅ User deleted successfully');
        setUsers(prev => prev.filter(u => u.id !== userId));
      } else {
        const errorText = await response.text();
        console.error('❌ Failed to delete user:', errorText);
        
        // If User Service is not available, fall back to local state for demo
        if (response.status === 404) {
          setUsers(prev => prev.filter(u => u.id !== userId));
          console.log('⚠️ Fallback: User removed from local state');
        } else {
          setError('Failed to delete user: ' + errorText);
        }
      }
    } catch (err) {
      console.error('👥 Failed to delete user:', err);
      setError('Failed to delete user: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const handleToggleUser = async (userId: string, enabled: boolean) => {
    try {
      console.log('👥 Toggling user:', userId, 'enabled:', enabled);
      
      const response = await fetch(`http://localhost:3002/api/users/${userId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ enabled })
      });
      
      if (response.ok) {
        console.log('✅ User status updated successfully');
        setUsers(prev => prev.map(u => 
          u.id === userId ? { ...u, enabled } : u
        ));
      } else {
        const errorText = await response.text();
        console.error('❌ Failed to update user status:', errorText);
        
        // If User Service is not available, fall back to local state for demo
        if (response.status === 404) {
          setUsers(prev => prev.map(u => 
            u.id === userId ? { ...u, enabled } : u
          ));
          console.log('⚠️ Fallback: User status updated in local state');
        } else {
          setError('Failed to update user status: ' + errorText);
        }
      }
    } catch (err) {
      console.error('👥 Failed to toggle user:', err);
      setError('Failed to update user status: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const handleSubmitUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      console.log('👥 Submitting user form:', formData);
      
      const userData = {
        username: formData.username,
        email: formData.email,
        first_name: formData.firstName,
        last_name: formData.lastName,
        enabled: formData.enabled,
        email_verified: formData.emailVerified,
        roles: formData.roles,
        groups: formData.groups,
        ...(formData.password && { password: formData.password })
      };
      
      if (editingUser) {
        // Update existing user via User Service
        const response = await fetch(`http://localhost:3002/api/users/${editingUser.id}`, {
          method: 'PUT',
          credentials: 'include',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(userData)
        });
        
        if (response.ok) {
          console.log('✅ User updated successfully');
          await fetchUsers(); // Refresh the user list
        } else {
          const errorText = await response.text();
          console.error('❌ Failed to update user:', errorText);
          setError('Failed to update user: ' + errorText);
          return;
        }
      } else {
        // Create new user via User Service
        const response = await fetch(`${config.urls.api}/users`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(userData)
        });
        
        if (response.ok) {
          console.log('✅ User created successfully');
          await fetchUsers(); // Refresh the user list
        } else {
          const errorText = await response.text();
          console.error('❌ Failed to create user:', errorText);
          
          // If User Service is not available, fall back to local state for demo
          if (response.status === 404) {
            const newUser: User = {
              id: String(Date.now()),
              username: formData.username,
              email: formData.email,
              firstName: formData.firstName,
              lastName: formData.lastName,
              enabled: formData.enabled,
              emailVerified: formData.emailVerified,
              roles: formData.roles,
              groups: formData.groups,
              createdTimestamp: Date.now()
            };
            setUsers(prev => [...prev, newUser]);
            console.log('⚠️ Fallback: User added to local state');
          } else {
            setError('Failed to create user: ' + errorText);
            return;
          }
        }
      }
      
      setShowAddModal(false);
      setEditingUser(null);
    } catch (err) {
      console.error('👥 Failed to save user:', err);
      setError('Failed to save user: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const filteredUsers = users.filter(u => 
    u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.lastName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleRoleToggle = (role: string) => {
    setFormData(prev => ({
      ...prev,
      roles: prev.roles.includes(role)
        ? prev.roles.filter(r => r !== role)
        : [...prev.roles, role]
    }));
  };

  const handleGroupToggle = (group: string) => {
    setFormData(prev => ({
      ...prev,
      groups: prev.groups.includes(group)
        ? prev.groups.filter(g => g !== group)
        : [...prev.groups, group]
    }));
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <Shield className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h3>
            <p className="text-gray-600">You need administrator privileges to access user management.</p>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <Loading />
            <p className="mt-4 text-gray-600">Loading users...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Users</h3>
            <p className="text-gray-600 mb-6">{error}</p>
            <Button onClick={fetchUsers}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">User Management</h1>
              <p className="text-gray-600">
                Manage users, roles, and permissions for your SSO Hub instance
              </p>
            </div>
            <Button onClick={handleAddUser}>
              <UserPlus className="h-4 w-4 mr-2" />
              Add User
            </Button>
          </div>
        </div>

        {/* Search and Stats */}
        <div className="flex flex-wrap items-center gap-4 mb-8">
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div className="flex items-center space-x-4 text-sm text-gray-600">
            <span>{users.length} total users</span>
            <span>{users.filter(u => u.enabled).length} active</span>
            <span>{users.filter(u => u.roles.includes('admin')).length} admins</span>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Users</p>
                  <p className="text-2xl font-bold">{users.length}</p>
                </div>
                <Users className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active Users</p>
                  <p className="text-2xl font-bold text-green-600">
                    {users.filter(u => u.enabled).length}
                  </p>
                </div>
                <UserCheck className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Administrators</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {users.filter(u => u.roles.includes('admin')).length}
                  </p>
                </div>
                <Shield className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Email Verified</p>
                  <p className="text-2xl font-bold text-indigo-600">
                    {users.filter(u => u.emailVerified).length}
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-indigo-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Users Grid */}
        {filteredUsers.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredUsers.map((userData) => (
              <Card key={userData.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
                        {userData.firstName.charAt(0)}{userData.lastName.charAt(0)}
                      </div>
                      <div>
                        <CardTitle className="text-lg font-semibold">
                          {userData.firstName} {userData.lastName}
                        </CardTitle>
                        <p className="text-sm text-gray-600">@{userData.username}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {userData.enabled ? (
                        <Badge variant="default" className="bg-green-100 text-green-800">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-red-100 text-red-800">
                          Disabled
                        </Badge>
                      )}
                      {userData.emailVerified && (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      )}
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-600">Email</p>
                      <p className="text-sm font-medium">{userData.email}</p>
                    </div>
                    
                    <div>
                      <p className="text-sm text-gray-600">Roles</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {userData.roles.map((role) => (
                          <Badge key={role} variant="outline" className="text-xs">
                            {role}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <p className="text-sm text-gray-600">Groups</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {userData.groups.map((group) => (
                          <Badge key={group} variant="secondary" className="text-xs">
                            {group}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    
                    {userData.lastLogin && (
                      <div>
                        <p className="text-sm text-gray-600">Last Login</p>
                        <p className="text-xs text-gray-500">
                          {new Date(userData.lastLogin).toLocaleString()}
                        </p>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-end space-x-2 mt-4 pt-4 border-t">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleEditUser(userData)}
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleToggleUser(userData.id, !userData.enabled)}
                      className={userData.enabled ? "text-red-600 hover:text-red-700" : "text-green-600 hover:text-green-700"}
                    >
                      {userData.enabled ? (
                        <>
                          <UserMinus className="h-3 w-3 mr-1" />
                          Disable
                        </>
                      ) : (
                        <>
                          <UserCheck className="h-3 w-3 mr-1" />
                          Enable
                        </>
                      )}
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleDeleteUser(userData.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Users Found</h3>
            <p className="text-gray-600 mb-6">
              {searchQuery ? 'No users match your search criteria.' : 'No users have been created yet.'}
            </p>
            {!searchQuery && (
              <Button onClick={handleAddUser}>
                <UserPlus className="h-4 w-4 mr-2" />
                Create First User
              </Button>
            )}
          </div>
        )}

        {/* Add/Edit User Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold">
                    {editingUser ? 'Edit User' : 'Add New User'}
                  </h2>
                  <Button variant="outline" onClick={() => setShowAddModal(false)}>
                    ×
                  </Button>
                </div>

                <form onSubmit={handleSubmitUser} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Username
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.username}
                      onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        First Name
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.firstName}
                        onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Last Name
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.lastName}
                        onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  {!editingUser && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Password
                      </label>
                      <input
                        type="password"
                        required
                        value={formData.password}
                        onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.enabled}
                        onChange={(e) => setFormData(prev => ({ ...prev, enabled: e.target.checked }))}
                        className="mr-2"
                      />
                      Enabled
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.emailVerified}
                        onChange={(e) => setFormData(prev => ({ ...prev, emailVerified: e.target.checked }))}
                        className="mr-2"
                      />
                      Email Verified
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Roles
                    </label>
                    <div className="space-y-1">
                      {availableRoles.map(role => (
                        <label key={role} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={formData.roles.includes(role)}
                            onChange={() => handleRoleToggle(role)}
                            className="mr-2"
                          />
                          {role}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Groups
                    </label>
                    <div className="space-y-1">
                      {availableGroups.map(group => (
                        <label key={group} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={formData.groups.includes(group)}
                            onChange={() => handleGroupToggle(group)}
                            className="mr-2"
                          />
                          {group}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={() => setShowAddModal(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">
                      {editingUser ? 'Update User' : 'Create User'}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserManagement;