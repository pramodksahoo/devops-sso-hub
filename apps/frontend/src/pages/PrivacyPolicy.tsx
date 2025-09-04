import { memo } from 'react';
import { motion } from 'framer-motion';
import { Shield, Eye, Lock, Database, Users, FileText, Mail, Calendar } from 'lucide-react';
import PublicHeader from '../components/layout/PublicHeader';
import PublicFooter from '../components/layout/PublicFooter';

const PrivacyPolicy = memo(() => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: "easeOut"
      }
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicHeader />
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="max-w-4xl mx-auto"
        >
          {/* Header */}
          <motion.div variants={itemVariants} className="text-center mb-12">
            <div className="flex items-center justify-center mb-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg">
                <Shield className="h-8 w-8 text-white" />
              </div>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">Privacy Policy</h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Your privacy is important to us. This policy explains how SSO Hub collects, uses, and protects your information.
            </p>
            <div className="flex items-center justify-center mt-4 text-sm text-gray-500">
              <Calendar className="w-4 h-4 mr-2" />
              Last updated: August 13, 2025
            </div>
          </motion.div>

          {/* Quick Overview */}
          <motion.div variants={itemVariants} className="bg-blue-50 rounded-2xl p-8 mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
              <Eye className="w-6 h-6 mr-3 text-blue-600" />
              Quick Overview
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                <div>
                  <h3 className="font-semibold text-gray-900">Data Minimization</h3>
                  <p className="text-gray-600 text-sm">Open source transparency in data collection practices</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                <div>
                  <h3 className="font-semibold text-gray-900">Enterprise Security</h3>
                  <p className="text-gray-600 text-sm">SOC 2 compliant with end-to-end encryption</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                <div>
                  <h3 className="font-semibold text-gray-900">No Third-Party Sharing</h3>
                  <p className="text-gray-600 text-sm">Self-hosted deployment keeps data under your control</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                <div>
                  <h3 className="font-semibold text-gray-900">Full Control</h3>
                  <p className="text-gray-600 text-sm">Complete data ownership and portability</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Main Content */}
          <div className="space-y-12">
            {/* Information We Collect */}
            <motion.section variants={itemVariants}>
              <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
                <Database className="w-7 w-7 mr-3 text-blue-600" />
                Information We Collect
              </h2>
              <div className="prose prose-lg max-w-none text-gray-700">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Account Information</h3>
                <ul className="space-y-2 mb-6">
                  <li>• Email address and username for authentication</li>
                  <li>• Profile information (name, role, department)</li>
                  <li>• Organization details for multi-tenant setup</li>
                </ul>

                <h3 className="text-xl font-semibold text-gray-900 mb-4">Usage Data</h3>
                <ul className="space-y-2 mb-6">
                  <li>• Login times and authentication events</li>
                  <li>• Tool access patterns for analytics</li>
                  <li>• System performance metrics</li>
                </ul>

                <h3 className="text-xl font-semibold text-gray-900 mb-4">Security Logs</h3>
                <ul className="space-y-2">
                  <li>• Authentication attempts and results</li>
                  <li>• Session management data</li>
                  <li>• Audit trail for compliance purposes</li>
                </ul>
              </div>
            </motion.section>

            {/* How We Use Information */}
            <motion.section variants={itemVariants}>
              <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
                <Users className="w-7 w-7 mr-3 text-green-600" />
                How We Use Your Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-gray-50 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Core Functionality</h3>
                  <ul className="space-y-2 text-gray-700">
                    <li>• Authenticate users across integrated tools</li>
                    <li>• Manage access permissions and roles</li>
                    <li>• Provide seamless single sign-on experience</li>
                  </ul>
                </div>
                <div className="bg-gray-50 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Security & Compliance</h3>
                  <ul className="space-y-2 text-gray-700">
                    <li>• Monitor for suspicious activities</li>
                    <li>• Generate compliance reports</li>
                    <li>• Maintain audit trails</li>
                  </ul>
                </div>
                <div className="bg-gray-50 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Analytics & Insights</h3>
                  <ul className="space-y-2 text-gray-700">
                    <li>• Usage analytics for administrators</li>
                    <li>• Performance optimization</li>
                    <li>• Feature usage statistics</li>
                  </ul>
                </div>
                <div className="bg-gray-50 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Communication</h3>
                  <ul className="space-y-2 text-gray-700">
                    <li>• System notifications and alerts</li>
                    <li>• Security updates and patches</li>
                    <li>• Account-related communications</li>
                  </ul>
                </div>
              </div>
            </motion.section>

            {/* Data Security */}
            <motion.section variants={itemVariants}>
              <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
                <Lock className="w-7 w-7 mr-3 text-red-600" />
                Data Security
              </h2>
              <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-2xl p-8">
                <p className="text-gray-700 mb-6 text-lg">
                  We implement enterprise-grade security measures to protect your data:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Shield className="w-6 h-6 text-red-600" />
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2">Encryption</h3>
                    <p className="text-sm text-gray-600">End-to-end encryption for all data transmission and storage</p>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Lock className="w-6 h-6 text-orange-600" />
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2">Access Control</h3>
                    <p className="text-sm text-gray-600">Role-based access with multi-factor authentication</p>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <FileText className="w-6 h-6 text-yellow-600" />
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2">Compliance</h3>
                    <p className="text-sm text-gray-600">SOC 2, GDPR, and industry standard compliance</p>
                  </div>
                </div>
              </div>
            </motion.section>

            {/* Your Rights */}
            <motion.section variants={itemVariants}>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Your Rights</h2>
              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-blue-600 font-bold text-sm">1</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Access Your Data</h3>
                    <p className="text-gray-700">You can request a copy of all personal data we hold about you.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-green-600 font-bold text-sm">2</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Correct Information</h3>
                    <p className="text-gray-700">Update or correct any inaccurate personal information.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-red-600 font-bold text-sm">3</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Delete Your Data</h3>
                    <p className="text-gray-700">Request deletion of your personal data (subject to legal requirements).</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-purple-600 font-bold text-sm">4</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Data Portability</h3>
                    <p className="text-gray-700">Export your data in a structured, commonly used format.</p>
                  </div>
                </div>
              </div>
            </motion.section>

            {/* Contact Us */}
            <motion.section variants={itemVariants}>
              <div className="bg-gray-900 rounded-2xl p-8 text-white">
                <h2 className="text-3xl font-bold mb-6 flex items-center">
                  <Mail className="w-7 w-7 mr-3 text-blue-400" />
                  Questions About Privacy?
                </h2>
                <p className="text-gray-300 mb-6">
                  If you have any questions about this Privacy Policy or how we handle your data, please don't hesitate to contact us.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex items-center space-x-3">
                    <Mail className="w-5 h-5 text-blue-400" />
                    <span>devopspramod100@gmail.com</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <FileText className="w-5 h-5 text-green-400" />
                    <span>Data Protection Officer</span>
                  </div>
                </div>
              </div>
            </motion.section>
          </div>
        </motion.div>
      </div>
      <PublicFooter />
    </div>
  );
});

PrivacyPolicy.displayName = 'PrivacyPolicy';

export default PrivacyPolicy;