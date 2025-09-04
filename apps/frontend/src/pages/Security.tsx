import { memo } from 'react';
import { motion } from 'framer-motion';
import { 
  Shield, 
  Lock, 
  Eye, 
 
  CheckCircle, 
  AlertTriangle, 
  Key, 
  Database,
  Globe,
  Code,
  Users,
  Activity,
  Fingerprint,
  GitBranch,
  Star,
  ExternalLink
} from 'lucide-react';
import { Button } from '../components/ui';

const Security = memo(() => {
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

  const securityFeatures = [
    {
      icon: <Shield className="h-8 w-8" />,
      title: "Zero Trust Architecture",
      description: "Every request is verified regardless of source or location. No implicit trust zones.",
      color: "bg-blue-100 text-blue-600",
      details: ["Identity verification for every access", "Continuous authentication", "Least privilege access", "Network micro-segmentation"]
    },
    {
      icon: <Lock className="h-8 w-8" />,
      title: "End-to-End Encryption",
      description: "All data encrypted in transit and at rest using industry-standard algorithms.",
      color: "bg-green-100 text-green-600",
      details: ["AES-256 encryption at rest", "TLS 1.3 for data in transit", "Key rotation policies", "Hardware security modules"]
    },
    {
      icon: <Key className="h-8 w-8" />,
      title: "Multi-Factor Authentication",
      description: "Multiple authentication factors including TOTP, hardware tokens, and biometrics.",
      color: "bg-purple-100 text-purple-600",
      details: ["TOTP authenticator apps", "Hardware security keys", "SMS verification", "Biometric authentication"]
    },
    {
      icon: <Eye className="h-8 w-8" />,
      title: "Comprehensive Auditing",
      description: "Complete audit trails for all authentication and authorization events.",
      color: "bg-red-100 text-red-600",
      details: ["Real-time audit logging", "Tamper-proof log storage", "Compliance reporting", "Forensic analysis tools"]
    }
  ];

  const complianceStandards = [
    { name: "OWASP Top 10", description: "Follows OWASP security guidelines", status: "implemented" },
    { name: "NIST Framework", description: "Aligned with NIST cybersecurity framework", status: "implemented" },
    { name: "ISO 27001", description: "Information security management standards", status: "compliant" },
    { name: "SOC 2 Type II", description: "Security, availability, and confidentiality", status: "compliant" },
    { name: "GDPR", description: "European data protection regulation", status: "compliant" },
    { name: "CCPA", description: "California consumer privacy act", status: "compliant" }
  ];

  const openSourceSecurity = [
    {
      title: "Transparent Security",
      description: "Open source code means complete transparency in our security implementations",
      icon: <Code className="h-6 w-6" />
    },
    {
      title: "Community Audits",
      description: "Security reviewed by the open source community and security researchers",
      icon: <Users className="h-6 w-6" />
    },
    {
      title: "Regular Updates",
      description: "Frequent security updates and patches from active community contributors",
      icon: <Activity className="h-6 w-6" />
    },
    {
      title: "No Vendor Lock-in",
      description: "Deploy and control your security infrastructure without vendor dependencies",
      icon: <GitBranch className="h-6 w-6" />
    }
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <motion.section
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="py-20 bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50"
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div variants={itemVariants} className="text-center max-w-4xl mx-auto">
            <div className="flex items-center justify-center mb-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-red-500 to-orange-600 shadow-lg">
                <Shield className="h-8 w-8 text-white" />
              </div>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              Security by
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-orange-600"> Design & Default</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 leading-relaxed">
              Built with enterprise-grade security from the ground up. Open source transparency 
              meets industry-leading security practices to protect your DevOps infrastructure.
            </p>
            <div className="flex items-center justify-center space-x-8 text-sm text-gray-500">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Open Source Transparency</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Zero Trust Architecture</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Community Audited</span>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* Open Source Security Benefits */}
      <motion.section
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        className="py-20 bg-white"
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div variants={itemVariants} className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Open Source Security Advantage</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Leveraging the power of open source for enhanced security and transparency
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {openSourceSecurity.map((item) => (
              <motion.div
                key={item.title}
                variants={itemVariants}
                className="text-center group bg-gray-50 rounded-xl p-6 hover:bg-white hover:shadow-medium transition-all duration-300"
              >
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:bg-blue-200 transition-colors">
                  {item.icon}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">{item.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Core Security Features */}
      <motion.section
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        className="py-20 bg-gray-50"
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div variants={itemVariants} className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Core Security Features</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Enterprise-grade security capabilities built into every component
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {securityFeatures.map((feature) => (
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
                  {feature.details.map((detail, idx) => (
                    <div key={idx} className="flex items-center space-x-3">
                      <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                      <span className="text-sm text-gray-700">{detail}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Security Architecture */}
      <motion.section
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        className="py-20 bg-white"
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div variants={itemVariants} className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Security Architecture</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Defense in depth with multiple layers of security controls
            </p>
          </motion.div>

          <div className="max-w-4xl mx-auto">
            <motion.div variants={itemVariants} className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-8 md:p-12 text-white">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="text-center">
                  <div className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <Globe className="w-10 h-10 text-white" />
                  </div>
                  <h3 className="text-xl font-bold mb-4">Network Security</h3>
                  <ul className="text-gray-300 text-sm space-y-2">
                    <li>• WAF Protection</li>
                    <li>• DDoS Mitigation</li>
                    <li>• Network Segmentation</li>
                    <li>• Rate Limiting</li>
                  </ul>
                </div>

                <div className="text-center">
                  <div className="w-20 h-20 bg-green-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <Database className="w-10 h-10 text-white" />
                  </div>
                  <h3 className="text-xl font-bold mb-4">Application Security</h3>
                  <ul className="text-gray-300 text-sm space-y-2">
                    <li>• Input Validation</li>
                    <li>• SQL Injection Prevention</li>
                    <li>• XSS Protection</li>
                    <li>• CSRF Tokens</li>
                  </ul>
                </div>

                <div className="text-center">
                  <div className="w-20 h-20 bg-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <Fingerprint className="w-10 h-10 text-white" />
                  </div>
                  <h3 className="text-xl font-bold mb-4">Identity Security</h3>
                  <ul className="text-gray-300 text-sm space-y-2">
                    <li>• Strong Authentication</li>
                    <li>• Session Management</li>
                    <li>• Access Controls</li>
                    <li>• Privilege Escalation Prevention</li>
                  </ul>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* Compliance & Standards */}
      <motion.section
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        className="py-20 bg-gray-50"
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div variants={itemVariants} className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Compliance & Standards</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Adherence to industry standards and regulatory requirements
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {complianceStandards.map((standard) => (
              <motion.div
                key={standard.name}
                variants={itemVariants}
                className="bg-white rounded-xl p-6 shadow-soft border"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">{standard.name}</h3>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    standard.status === 'implemented' ? 'bg-blue-100 text-blue-800' :
                    standard.status === 'compliant' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {standard.status}
                  </span>
                </div>
                <p className="text-gray-600 text-sm">{standard.description}</p>
              </motion.div>
            ))}
          </div>

          <motion.div variants={itemVariants} className="mt-12 text-center">
            <div className="bg-blue-50 rounded-2xl p-8 max-w-3xl mx-auto">
              <AlertTriangle className="w-12 h-12 text-blue-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-4">Security Disclosure</h3>
              <p className="text-gray-600 mb-6">
                Found a security vulnerability? We take security seriously and appreciate responsible disclosure. 
                Please report security issues through our dedicated security channel.
              </p>
              <Button 
                className="bg-blue-600 hover:bg-blue-700"
                onClick={() => window.open('https://github.com/pramodksahoo/devops-sso-hub/security/advisories/new', '_blank')}
              >
                Report Security Issue
                <ExternalLink className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* Security Best Practices */}
      <motion.section
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        className="py-20 bg-white"
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div variants={itemVariants} className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Deployment Security</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Best practices for secure deployment and operation
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <motion.div variants={itemVariants}>
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Infrastructure Security</h3>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-gray-900">Container Security</h4>
                    <p className="text-gray-600 text-sm">Minimal base images, security scanning, and runtime protection</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-gray-900">Kubernetes Security</h4>
                    <p className="text-gray-600 text-sm">Pod security policies, network policies, and RBAC configuration</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-gray-900">Secrets Management</h4>
                    <p className="text-gray-600 text-sm">External secrets operators and encrypted storage</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-gray-900">Network Security</h4>
                    <p className="text-gray-600 text-sm">Service mesh, network policies, and traffic encryption</p>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div variants={itemVariants}>
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Operational Security</h3>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-gray-900">Regular Updates</h4>
                    <p className="text-gray-600 text-sm">Automated security updates and vulnerability patching</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-gray-900">Monitoring & Alerting</h4>
                    <p className="text-gray-600 text-sm">Real-time security monitoring and incident response</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-gray-900">Backup & Recovery</h4>
                    <p className="text-gray-600 text-sm">Secure backup procedures and disaster recovery plans</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-gray-900">Access Controls</h4>
                    <p className="text-gray-600 text-sm">Principle of least privilege and regular access reviews</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* Community & Support */}
      <motion.section
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        className="py-20 bg-gray-900 text-white"
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div variants={itemVariants} className="max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Community-Driven Security
            </h2>
            <p className="text-xl text-gray-300 mb-8">
              Join our open source community to contribute to security improvements and stay updated on the latest security practices.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                className="bg-white text-gray-900 hover:bg-gray-100 font-bold px-8 py-4 text-lg"
                onClick={() => window.open('https://github.com/pramodksahoo/devops-sso-hub', '_blank')}
              >
                <Star className="w-5 h-5 mr-2" />
                Star on GitHub
              </Button>
              <Button 
                variant="outline" 
                className="border-gray-600 text-white hover:bg-gray-800 font-bold px-8 py-4 text-lg"
                onClick={() => window.open('https://github.com/pramodksahoo/devops-sso-hub/blob/main/SECURITY.md', '_blank')}
              >
                Security Documentation
                <ExternalLink className="w-5 h-5 ml-2" />
              </Button>
            </div>
          </motion.div>
        </div>
      </motion.section>
    </div>
  );
});

Security.displayName = 'Security';

export default Security;