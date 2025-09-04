import React from 'react';
import { motion } from 'framer-motion';
// import { useAuth } from '../../contexts/AuthContext'; // Not needed in simplified component
import { useSimplePermissions } from '../../contexts/SimplePermissionContext';
import { Shield } from 'lucide-react';

interface PowerUserDashboardProps {
  onNavigate?: (view: string) => void;
}

export const PowerUserDashboard: React.FC<PowerUserDashboardProps> = ({ onNavigate }) => {
  const { isAdmin } = useSimplePermissions();

  // PowerUser role has been simplified to admin-only in the new system
  // This component redirects users to the appropriate dashboard
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 mx-auto bg-blue-100 rounded-full flex items-center justify-center">
          <Shield className="w-8 h-8 text-blue-600" />
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900">
          Role Simplified
        </h1>
        
        <p className="text-gray-600 max-w-md">
          The PowerUser role has been simplified in the new admin/user system. 
          {isAdmin ? ' You have admin access.' : ' You have user access.'}
        </p>
        
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onNavigate?.('dashboard')}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          Go to Dashboard
        </motion.button>
      </div>
    </div>
  );
};