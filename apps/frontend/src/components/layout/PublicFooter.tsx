import { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Shield, Star, Code } from 'lucide-react';
import { Button } from '../ui';

const PublicFooter = memo(() => {
  const containerVariants = useMemo(() => ({
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  }), []);

  const itemVariants = useMemo(() => ({
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: "easeOut"
      }
    }
  }), []);

  return (
    <motion.footer 
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white py-20"
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
          {/* Company Info - Enhanced */}
          <motion.div variants={itemVariants} className="md:col-span-2">
            <div className="flex items-center space-x-3 mb-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 shadow-lg">
                <Shield className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold">SSO Hub</h3>
            </div>
            <p className="text-gray-300 mb-8 max-w-md leading-relaxed">
              A comprehensive Single Sign-On solution designed specifically for DevOps teams, providing seamless authentication and authorization across multiple tools and services.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              <Button 
                size="sm" 
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg hover:shadow-purple-500/25 transition-all duration-300 border-0"
                onClick={() => window.open('https://github.com/pramodksahoo/devops-sso-hub', '_blank')}
              >
                <Star className="w-4 h-4 mr-2" />
                Star on GitHub
              </Button>
              <Button 
                size="sm" 
                className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white shadow-lg hover:shadow-orange-500/25 transition-all duration-300 border-0"
                onClick={() => window.open('https://github.com/pramodksahoo/devops-sso-hub/blob/master/README.md', '_blank')}
              >
                <Code className="w-4 h-4 mr-2" />
                Documentation
              </Button>
            </div>
            {/* Contact Info */}
            <div className="text-sm text-gray-400">
              <p>🌐 Built with ❤️ for DevOps Teams</p>
            </div>
          </motion.div>

          {/* Product Links */}
          <motion.div variants={itemVariants}>
            <h4 className="text-lg font-semibold mb-6 text-white">Product</h4>
            <ul className="space-y-3 text-gray-300">
              <li><a href="/#features" className="hover:text-white transition-colors duration-200 hover:pl-2">✨ Features</a></li>
              <li><a href="/#integrations" className="hover:text-white transition-colors duration-200 hover:pl-2">🔗 Integrations</a></li>
              <li><a href="/#security" className="hover:text-white transition-colors duration-200 hover:pl-2">🔐 Security</a></li>
            </ul>
          </motion.div>

          {/* Resources */}
          <motion.div variants={itemVariants}>
            <h4 className="text-lg font-semibold mb-6 text-white">Resources</h4>
            <ul className="space-y-3 text-gray-300">
              <li><a href="https://github.com/pramodksahoo/devops-sso-hub" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors duration-200 hover:pl-2">📖 Documentation</a></li>
              <li><a href="#" className="hover:text-white transition-colors duration-200 hover:pl-2">👥 Community</a></li>
              <li><a href="#" className="hover:text-white transition-colors duration-200 hover:pl-2">🎓 Tutorials</a></li>
            </ul>
          </motion.div>

          {/* Legal & Company */}
          <motion.div variants={itemVariants}>
            <h4 className="text-lg font-semibold mb-6 text-white">Legal</h4>
            <ul className="space-y-3 text-gray-300">
              <li><a href="/privacy-policy" className="hover:text-white transition-colors duration-200 hover:pl-2">🛡️ Privacy Policy</a></li>
              <li><a href="/terms-conditions" className="hover:text-white transition-colors duration-200 hover:pl-2">📜 Terms & Conditions</a></li>
            </ul>
          </motion.div>
        </div>

        {/* Enhanced Bottom Section */}
        <motion.div 
          variants={itemVariants}
          className="border-t border-gray-700 mt-16 pt-8"
        >
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="text-gray-400 mb-4 md:mb-0">
              <p className="text-sm">
                © 2025 SSO Hub. All rights reserved. | Made with ❤️ for the DevOps Community
              </p>
            </div>
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2 text-sm text-gray-400">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span>All Systems Operational</span>
              </div>
              <div className="text-sm text-gray-400">
                <span>v1.0.0</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.footer>
  );
});

PublicFooter.displayName = 'PublicFooter';

export default PublicFooter;