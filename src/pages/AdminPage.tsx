import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import SettingsPage from '@/components/SettingsPage';
import { Settings } from 'lucide-react';

const AdminPage: React.FC = () => {
  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <Card className="mb-6 bg-gradient-to-br from-white to-blue-50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-3">
              <Settings className="h-6 w-6 text-blue-600" />
              <span>Admin Tools</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SettingsPage />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminPage;
