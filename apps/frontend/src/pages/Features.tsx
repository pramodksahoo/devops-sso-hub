import { memo } from 'react';
import { motion } from 'framer-motion';
import { 
  Shield, 
  Zap, 
  Users, 
  Lock, 
  Eye, 
  Globe, 
  Activity, 
  FileText, 
  Settings, 
  Smartphone, 
  Cloud, 
  Database,
  CheckCircle,
  Star,
  ArrowRight
} from 'lucide-react';
import { Button } from '../components/ui';

const Features = memo(() => {
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

  const coreFeatures = [
    {
      icon: <Shield className="h-8 w-8" />,
      title: "Enterprise Security",
      description: "SOC 2 compliant with end-to-end encryption, MFA, and zero-trust architecture.",
      color: "bg-blue-100 text-blue-600",
      benefits: ["End-to-end encryption", "SOC 2 Type II compliance", "Zero-trust architecture", "Regular security audits"]
    },
    {
      icon: <Zap className="h-8 w-8" />,
      title: "Lightning Fast SSO",
      description: "Sub-second authentication with seamless tool switching and session management.",
      color: "bg-yellow-100 text-yellow-600",
      benefits: ["< 1 second login", "Seamless switching", "Smart session management", "High availability"]
    },
    {
      icon: <Users className="h-8 w-8" />,
      title: "Advanced RBAC",
      description: "Granular role-based access control with dynamic permissions and group management.",
      color: "bg-green-100 text-green-600",
      benefits: ["Fine-grained permissions", "Dynamic role assignment", "Group-based policies", "Attribute-based access"]
    },
    {
      icon: <Eye className="h-8 w-8" />,
      title: "Real-time Monitoring",
      description: "Comprehensive audit trails, real-time alerts, and detailed analytics dashboard.",
      color: "bg-purple-100 text-purple-600",
      benefits: ["Real-time dashboards", "Automated alerts", "Compliance reporting", "Usage analytics"]
    }
  ];

  const advancedFeatures = [
    {
      icon: <Lock className="h-6 w-6" />,
      title: "Multi-Factor Authentication",
      description: "TOTP, SMS, email, and hardware token support for enhanced security.",
      category: "Security"
    },
    {
      icon: <Globe className="h-6 w-6" />,
      title: "Global Load Balancing",
      description: "Multi-region deployment with automatic failover and edge caching.",
      category: "Infrastructure"
    },
    {
      icon: <Activity className="h-6 w-6" />,
      title: "Health Monitoring",
      description: "Comprehensive health checks and automated service recovery.",
      category: "Reliability"
    },
    {
      icon: <FileText className="h-6 w-6" />,
      title: "Audit & Compliance",
      description: "Complete audit trails with compliance reporting for SOX, GDPR, and more.",
      category: "Compliance"
    },
    {
      icon: <Settings className="h-6 w-6" />,
      title: "Custom Integrations",
      description: "REST APIs and webhooks for custom tool integrations and workflows.",
      category: "Integration"
    },
    {
      icon: <Smartphone className="h-6 w-6" />,
      title: "Mobile Support",
      description: "Full mobile compatibility with responsive design and native app feel.",
      category: "Accessibility"
    },
    {
      icon: <Cloud className="h-6 w-6" />,
      title: "Cloud Native",
      description: "Kubernetes-native architecture with auto-scaling and container orchestration.",
      category: "Architecture"
    },
    {
      icon: <Database className="h-6 w-6" />,
      title: "Data Export",
      description: "Complete data portability with export capabilities in multiple formats.",
      category: "Data Management"
    }
  ];

  const integrationTools = [
    "GitHub", "GitLab", "Jenkins", "Argo CD", "Terraform", "SonarQube", 
    "Grafana", "Prometheus", "Kibana", "Jira", "AWS", "Azure"
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <motion.section
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="py-20 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50"
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div variants={itemVariants} className="text-center max-w-4xl mx-auto">
            <div className="flex items-center justify-center mb-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg">
                <Star className="h-8 w-8 text-white" />
              </div>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              Powerful Features for
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600"> Modern DevOps</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 leading-relaxed">
              Discover the comprehensive set of features that make SSO Hub the ultimate 
              authentication solution for enterprise DevOps teams.
            </p>
            <div className="flex items-center justify-center space-x-8 text-sm text-gray-500">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>12+ Tool Integrations</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>99.9% Uptime SLA</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>SOC 2 Compliant</span>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* Core Features */}
      <motion.section
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        className="py-20 bg-white"
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div variants={itemVariants} className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Core Features</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Essential capabilities that power secure and efficient DevOps workflows
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {coreFeatures.map((feature) => (
              <motion.div
                key={feature.title}
                variants={itemVariants}
                className="group bg-white rounded-2xl p-8 shadow-soft hover:shadow-medium transition-all duration-300 border"
              >
                <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl ${feature.color} mb-6 group-hover:scale-110 transition-transform duration-200`}>
                  {feature.icon}
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">{feature.title}</h3>
                <p className="text-gray-600 mb-6 leading-relaxed">{feature.description}</p>
                <div className="space-y-2">
                  {feature.benefits.map((benefit, idx) => (
                    <div key={idx} className="flex items-center space-x-3">
                      <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                      <span className="text-sm text-gray-700">{benefit}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Advanced Features Grid */}
      <motion.section
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        className="py-20 bg-gray-50"
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div variants={itemVariants} className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Advanced Capabilities</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Enterprise-grade features designed for scale, security, and performance
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {advancedFeatures.map((feature) => (
              <motion.div
                key={feature.title}
                variants={itemVariants}
                className="group bg-white rounded-xl p-6 shadow-soft hover:shadow-medium transition-all duration-300 border hover:border-blue-200"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-gray-100 rounded-lg group-hover:bg-blue-100 transition-colors duration-200">
                    {feature.icon}
                  </div>
                  <span className="text-xs font-medium text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                    {feature.category}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Integration Showcase */}
      <motion.section
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        className="py-20 bg-white"
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div variants={itemVariants} className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Seamless Tool Integration
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Connect with all your favorite DevOps tools in minutes, not hours
            </p>
          </motion.div>

          <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-3xl p-8 md:p-12">
            <div className="grid grid-cols-3 md:grid-cols-6 gap-6 items-center justify-items-center">
              {integrationTools.map((tool) => (
                <motion.div
                  key={tool}
                  variants={itemVariants}
                  className="group flex flex-col items-center p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer"
                  whileHover={{ y: -4, scale: 1.05 }}
                >
                  <div className="w-12 h-12 bg-gray-100 rounded-lg mb-2 group-hover:bg-blue-100 transition-colors duration-200 flex items-center justify-center">
                    <div className="w-8 h-8 bg-gray-400 rounded group-hover:bg-blue-500 transition-colors duration-200"></div>
                  </div>
                  <span className="text-xs font-medium text-gray-700 group-hover:text-blue-600 transition-colors duration-200">
                    {tool}
                  </span>
                </motion.div>
              ))}
            </div>
            
            <motion.div variants={itemVariants} className="text-center mt-12">
              <p className="text-gray-600 mb-6">
                Can't find your tool? We support custom integrations via REST APIs and webhooks.
              </p>
              <Button 
                variant="outline" 
                className="border-blue-500 text-blue-600 hover:bg-blue-500 hover:text-white"
              >
                View All Integrations
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* Security Deep Dive */}
      <motion.section
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        className="py-20 bg-gray-900 text-white"
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div variants={itemVariants} className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Security First Approach</h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Built with enterprise-grade security from the ground up
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <motion.div variants={itemVariants} className="text-center">
              <div className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Shield className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-4">Zero Trust Architecture</h3>
              <p className="text-gray-300 leading-relaxed">
                Every request is verified and authenticated, regardless of source or location. 
                No implicit trust, maximum security.
              </p>
            </motion.div>

            <motion.div variants={itemVariants} className="text-center">
              <div className="w-20 h-20 bg-green-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Lock className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-4">End-to-End Encryption</h3>
              <p className="text-gray-300 leading-relaxed">
                AES-256 encryption for data at rest and TLS 1.3 for data in transit. 
                Your data is protected at every step.
              </p>
            </motion.div>

            <motion.div variants={itemVariants} className="text-center">
              <div className="w-20 h-20 bg-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Eye className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-4">Continuous Monitoring</h3>
              <p className="text-gray-300 leading-relaxed">
                24/7 security monitoring with real-time threat detection and 
                automated incident response.
              </p>
            </motion.div>
          </div>

          <motion.div variants={itemVariants} className="mt-16 text-center">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 max-w-4xl mx-auto">
              <h3 className="text-2xl font-bold mb-4">Compliance & Certifications</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {['SOC 2 Type II', 'GDPR', 'CCPA', 'ISO 27001'].map((cert) => (
                  <div key={cert} className="flex items-center justify-center space-x-2">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                    <span className="font-medium">{cert}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* Call to Action */}
      <motion.section
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        className="py-20 bg-gradient-to-r from-blue-600 to-purple-600"
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div variants={itemVariants} className="max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
              Ready to Experience These Features?
            </h2>
            <p className="text-xl text-blue-100 mb-8">
              Join the open source community building the future of DevOps authentication.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                className="bg-white text-blue-600 hover:bg-gray-100 font-bold px-8 py-4 text-lg"
                onClick={() => window.open('https://github.com/pramodksahoo/devops-sso-hub', '_blank')}
              >
                Get Started Free
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Button 
                variant="outline" 
                size="lg" 
                className="border-white text-white hover:bg-white hover:text-blue-600 font-bold px-8 py-4 text-lg"
                onClick={() => window.open('https://github.com/pramodksahoo/devops-sso-hub/blob/main/README.md', '_blank')}
              >
                View Documentation
              </Button>
            </div>
          </motion.div>
        </div>
      </motion.section>
    </div>
  );
});

Features.displayName = 'Features';

export default Features;