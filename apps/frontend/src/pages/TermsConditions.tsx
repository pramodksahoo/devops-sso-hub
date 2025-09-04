import { memo } from 'react';
import { motion } from 'framer-motion';
import { FileText, Scale, Shield, AlertTriangle, CheckCircle, Calendar, Users, Gavel } from 'lucide-react';
import PublicHeader from '../components/layout/PublicHeader';
import PublicFooter from '../components/layout/PublicFooter';

const TermsConditions = memo(() => {
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
              <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 shadow-lg">
                <Scale className="h-8 w-8 text-white" />
              </div>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">Terms & Conditions</h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              These terms govern your use of SSO Hub services. Please read them carefully.
            </p>
            <div className="flex items-center justify-center mt-4 text-sm text-gray-500">
              <Calendar className="w-4 h-4 mr-2" />
              Last updated: August 13, 2025
            </div>
          </motion.div>

          {/* Important Notice */}
          <motion.div variants={itemVariants} className="bg-amber-50 border-l-4 border-amber-400 rounded-r-xl p-6 mb-12">
            <div className="flex items-start">
              <AlertTriangle className="w-6 h-6 text-amber-600 mt-1 mr-3 flex-shrink-0" />
              <div>
                <h2 className="text-lg font-semibold text-amber-900 mb-2">Important Notice</h2>
                <p className="text-amber-800">
                  By using SSO Hub, you agree to these terms. If you do not agree, please do not use our services. 
                  These terms may be updated from time to time, and continued use constitutes acceptance of any changes.
                </p>
              </div>
            </div>
          </motion.div>

          {/* Main Content */}
          <div className="space-y-12">
            {/* Service Description */}
            <motion.section variants={itemVariants}>
              <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
                <Shield className="w-7 w-7 mr-3 text-blue-600" />
                Service Description
              </h2>
              <div className="prose prose-lg max-w-none text-gray-700">
                <p className="mb-6">
                  SSO Hub is an open source Single Sign-On (SSO) platform designed to provide secure authentication 
                  and authorization services across multiple DevOps tools and applications. This open source software includes:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div className="bg-blue-50 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Core Features</h3>
                    <ul className="space-y-2 text-gray-700">
                      <li>• Single Sign-On authentication</li>
                      <li>• Role-based access control (RBAC)</li>
                      <li>• Multi-factor authentication (MFA)</li>
                      <li>• Session management</li>
                    </ul>
                  </div>
                  <div className="bg-green-50 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Additional Services</h3>
                    <ul className="space-y-2 text-gray-700">
                      <li>• Audit logging and compliance</li>
                      <li>• Analytics and reporting</li>
                      <li>• API access and integrations</li>
                      <li>• Community support</li>
                    </ul>
                  </div>
                </div>
              </div>
            </motion.section>

            {/* User Responsibilities */}
            <motion.section variants={itemVariants}>
              <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
                <Users className="w-7 w-7 mr-3 text-green-600" />
                User Responsibilities
              </h2>
              <div className="space-y-6">
                <div className="bg-gray-50 rounded-xl p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">Account Security</h3>
                  <ul className="space-y-2 text-gray-700">
                    <li className="flex items-start">
                      <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                      Maintain the confidentiality of your login credentials
                    </li>
                    <li className="flex items-start">
                      <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                      Enable multi-factor authentication when available
                    </li>
                    <li className="flex items-start">
                      <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                      Report suspected security breaches immediately
                    </li>
                    <li className="flex items-start">
                      <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                      Use the service in compliance with your organization's policies
                    </li>
                  </ul>
                </div>

                <div className="bg-gray-50 rounded-xl p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">Acceptable Use</h3>
                  <p className="text-gray-700 mb-4">You agree NOT to:</p>
                  <ul className="space-y-2 text-gray-700">
                    <li className="flex items-start">
                      <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
                      Use the service for illegal or unauthorized purposes
                    </li>
                    <li className="flex items-start">
                      <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
                      Attempt to gain unauthorized access to other systems
                    </li>
                    <li className="flex items-start">
                      <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
                      Share your account credentials with others
                    </li>
                    <li className="flex items-start">
                      <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
                      Interfere with or disrupt the service or servers
                    </li>
                  </ul>
                </div>
              </div>
            </motion.section>

            {/* Service Availability */}
            <motion.section variants={itemVariants}>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Service Availability & Support</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 text-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Shield className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">99.9% Uptime</h3>
                  <p className="text-sm text-gray-600">We strive to maintain high availability with minimal downtime</p>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 text-center">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">24/7 Monitoring</h3>
                  <p className="text-sm text-gray-600">Continuous monitoring and automated alerting systems</p>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 text-center">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Users className="w-6 h-6 text-purple-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">Community Support</h3>
                  <p className="text-sm text-gray-600">Community-driven support and contributions</p>
                </div>
              </div>
            </motion.section>

            {/* Data and Privacy */}
            <motion.section variants={itemVariants}>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Data & Privacy</h2>
              <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-2xl p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">Data Protection</h3>
                    <ul className="space-y-2 text-gray-700">
                      <li>• Enterprise-grade encryption in transit and at rest</li>
                      <li>• SOC 2 Type II compliance</li>
                      <li>• GDPR and CCPA compliance</li>
                      <li>• Regular security audits and penetration testing</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">Your Rights</h3>
                    <ul className="space-y-2 text-gray-700">
                      <li>• Access and export your data</li>
                      <li>• Request data correction or deletion</li>
                      <li>• Opt-out of non-essential communications</li>
                      <li>• Data breach notifications within 72 hours</li>
                    </ul>
                  </div>
                </div>
                <div className="mt-6 p-4 bg-white rounded-lg border-l-4 border-blue-500">
                  <p className="text-gray-700 text-sm">
                    <strong>Note:</strong> For detailed information about data collection and usage, 
                    please refer to our <a href="/privacy-policy" className="text-blue-600 hover:underline">Privacy Policy</a>.
                  </p>
                </div>
              </div>
            </motion.section>

            {/* Limitation of Liability */}
            <motion.section variants={itemVariants}>
              <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
                <Gavel className="w-7 w-7 mr-3 text-red-600" />
                Limitation of Liability
              </h2>
              <div className="bg-red-50 border border-red-200 rounded-2xl p-8">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Open Source Disclaimer</h3>
                <p className="text-gray-700 mb-6">
                  SSO Hub is provided "as is" under the open source license. While we strive to maintain quality, 
                  we make no warranties about the software's availability, reliability, or suitability for your specific needs.
                </p>
                <div className="space-y-4">
                  <div className="flex items-start">
                    <AlertTriangle className="w-5 h-5 text-red-500 mt-1 mr-3 flex-shrink-0" />
                    <p className="text-gray-700 text-sm">
                      We are not liable for any indirect, incidental, or consequential damages arising from your use of the service.
                    </p>
                  </div>
                  <div className="flex items-start">
                    <AlertTriangle className="w-5 h-5 text-red-500 mt-1 mr-3 flex-shrink-0" />
                    <p className="text-gray-700 text-sm">
                      As open source software provided free of charge, our liability is limited as outlined in the project's license agreement.
                    </p>
                  </div>
                  <div className="flex items-start">
                    <AlertTriangle className="w-5 h-5 text-red-500 mt-1 mr-3 flex-shrink-0" />
                    <p className="text-gray-700 text-sm">
                      You are responsible for maintaining backups and alternative access methods for critical systems.
                    </p>
                  </div>
                </div>
              </div>
            </motion.section>

            {/* Termination */}
            <motion.section variants={itemVariants}>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Termination</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-gray-50 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Rights</h3>
                  <ul className="space-y-2 text-gray-700">
                    <li>• Stop using the software at any time</li>
                    <li>• Export your data before termination</li>
                    <li>• Fork and modify the source code</li>
                  </ul>
                </div>
                <div className="bg-gray-50 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Our Rights</h3>
                  <ul className="space-y-2 text-gray-700">
                    <li>• Modify or discontinue features</li>
                    <li>• Update terms with community notice</li>
                    <li>• Maintain project governance</li>
                  </ul>
                </div>
              </div>
            </motion.section>

            {/* Contact Information */}
            <motion.section variants={itemVariants}>
              <div className="bg-gray-900 rounded-2xl p-8 text-white">
                <h2 className="text-3xl font-bold mb-6 flex items-center">
                  <FileText className="w-7 w-7 mr-3 text-blue-400" />
                  Questions About These Terms?
                </h2>
                <p className="text-gray-300 mb-6">
                  If you have any questions about these Terms & Conditions or need clarification on any provisions, 
                  please contact our legal team.
                </p>
                <div className="flex flex-col sm:flex-row gap-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                      <FileText className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold">Legal Team</p>
                      <p className="text-gray-300 text-sm">devopspramod100@gmail.com</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center">
                      <Users className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold">Customer Success</p>
                      <p className="text-gray-300 text-sm">devopspramod100@gmail.com</p>
                    </div>
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

TermsConditions.displayName = 'TermsConditions';

export default TermsConditions;