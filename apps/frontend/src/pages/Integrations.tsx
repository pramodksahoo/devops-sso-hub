import { memo } from 'react';
import { motion } from 'framer-motion';
import { 
  Puzzle, 
  GitBranch, 
  Settings, 
  Cloud, 
  Monitor, 
  FileCode, 
  Shield, 
  Zap,
  CheckCircle,
  ExternalLink,
  ArrowRight,
  Code,
  Database,
  Globe,
} from 'lucide-react';
import { Button } from '../components/ui';

const Integrations = memo(() => {
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

  const integrationCategories = [
    {
      title: "Version Control",
      icon: <GitBranch className="h-8 w-8" />,
      color: "bg-orange-100 text-orange-600",
      tools: [
        { name: "GitHub", description: "Git repository hosting and collaboration", status: "active", setupTime: "2 mins" },
        { name: "GitLab", description: "DevOps platform with integrated CI/CD", status: "active", setupTime: "3 mins" },
        { name: "Bitbucket", description: "Git solution for professional teams", status: "active", setupTime: "3 mins" },
        { name: "Azure DevOps", description: "Microsoft's DevOps toolchain", status: "active", setupTime: "4 mins" }
      ]
    },
    {
      title: "CI/CD Pipeline",
      icon: <Settings className="h-8 w-8" />,
      color: "bg-blue-100 text-blue-600",
      tools: [
        { name: "Jenkins", description: "Open source automation server", status: "active", setupTime: "5 mins" },
        { name: "Argo CD", description: "GitOps continuous delivery tool", status: "active", setupTime: "4 mins" },
        { name: "CircleCI", description: "Cloud-native CI/CD platform", status: "active", setupTime: "3 mins" },
        { name: "GitHub Actions", description: "Native GitHub workflow automation", status: "active", setupTime: "2 mins" }
      ]
    },
    {
      title: "Cloud Platforms",
      icon: <Cloud className="h-8 w-8" />,
      color: "bg-green-100 text-green-600",
      tools: [
        { name: "AWS", description: "Amazon Web Services cloud platform", status: "active", setupTime: "6 mins" },
        { name: "Azure", description: "Microsoft Azure cloud services", status: "active", setupTime: "6 mins" },
        { name: "Google Cloud", description: "Google's cloud computing platform", status: "active", setupTime: "6 mins" },
        { name: "DigitalOcean", description: "Simple cloud computing platform", status: "beta", setupTime: "5 mins" }
      ]
    },
    {
      title: "Monitoring & Analytics",
      icon: <Monitor className="h-8 w-8" />,
      color: "bg-purple-100 text-purple-600",
      tools: [
        { name: "Grafana", description: "Observability and monitoring platform", status: "active", setupTime: "4 mins" },
        { name: "Prometheus", description: "Systems monitoring and alerting", status: "active", setupTime: "5 mins" },
        { name: "Kibana", description: "Data visualization for Elasticsearch", status: "active", setupTime: "4 mins" },
        { name: "Datadog", description: "Cloud monitoring and security platform", status: "coming-soon", setupTime: "Est. 5 mins" }
      ]
    },
    {
      title: "Code Quality & Security",
      icon: <Shield className="h-8 w-8" />,
      color: "bg-red-100 text-red-600",
      tools: [
        { name: "SonarQube", description: "Continuous code quality inspection", status: "active", setupTime: "4 mins" },
        { name: "Snyk", description: "Developer security platform", status: "active", setupTime: "3 mins" },
        { name: "Checkmarx", description: "Application security testing", status: "beta", setupTime: "5 mins" },
        { name: "Veracode", description: "Application security testing", status: "coming-soon", setupTime: "Est. 6 mins" }
      ]
    },
    {
      title: "Infrastructure as Code",
      icon: <FileCode className="h-8 w-8" />,
      color: "bg-indigo-100 text-indigo-600",
      tools: [
        { name: "Terraform", description: "Infrastructure provisioning tool", status: "active", setupTime: "5 mins" },
        { name: "Ansible", description: "IT automation and configuration", status: "active", setupTime: "6 mins" },
        { name: "Pulumi", description: "Modern infrastructure as code", status: "beta", setupTime: "4 mins" },
        { name: "CloudFormation", description: "AWS infrastructure as code", status: "active", setupTime: "5 mins" }
      ]
    }
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">Active</span>;
      case 'beta':
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Beta</span>;
      case 'coming-soon':
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">Coming Soon</span>;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <motion.section
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="py-20 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50"
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div variants={itemVariants} className="text-center max-w-4xl mx-auto">
            <div className="flex items-center justify-center mb-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg">
                <Puzzle className="h-8 w-8 text-white" />
              </div>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              Connect Your
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600"> Entire Toolchain</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 leading-relaxed">
              Seamlessly integrate SSO Hub with 20+ popular DevOps tools. 
              One login, unlimited access across your entire ecosystem.
            </p>
            <div className="flex items-center justify-center space-x-8 text-sm text-gray-500">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>20+ Pre-built Integrations</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>2-6 Min Setup Time</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>REST API & Webhooks</span>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* Integration Categories */}
      <motion.section
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        className="py-20 bg-white"
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div variants={itemVariants} className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Browse by Category</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Discover integrations organized by your workflow needs
            </p>
          </motion.div>

          <div className="space-y-16">
            {integrationCategories.map((category) => (
              <motion.div key={category.title} variants={itemVariants} className="group">
                <div className="flex items-center mb-8">
                  <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl ${category.color} mr-4`}>
                    {category.icon}
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">{category.title}</h3>
                    <p className="text-gray-600">{category.tools.length} integrations available</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {category.tools.map((tool) => (
                    <motion.div
                      key={tool.name}
                      variants={itemVariants}
                      className="group/card bg-white rounded-xl p-6 shadow-soft hover:shadow-medium transition-all duration-300 border hover:border-indigo-200"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                            <div className="w-6 h-6 bg-gray-400 rounded"></div>
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900">{tool.name}</h4>
                            <p className="text-xs text-gray-500">{tool.setupTime}</p>
                          </div>
                        </div>
                        {getStatusBadge(tool.status)}
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                        {tool.description}
                      </p>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 text-xs text-gray-500">
                          <Zap className="w-3 h-3" />
                          <span>Quick Setup</span>
                        </div>
                        {tool.status === 'active' && (
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="text-xs group-hover/card:bg-indigo-50 group-hover/card:border-indigo-300"
                          >
                            Configure
                            <ExternalLink className="w-3 h-3 ml-1" />
                          </Button>
                        )}
                        {tool.status === 'coming-soon' && (
                          <Button 
                            size="sm" 
                            variant="outline" 
                            disabled
                            className="text-xs"
                          >
                            Coming Soon
                          </Button>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Custom Integration */}
      <motion.section
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        className="py-20 bg-gray-50"
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <motion.div variants={itemVariants} className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Custom Integrations
              </h2>
              <p className="text-xl text-gray-600">
                Don't see your tool? Build custom integrations with our open source APIs
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <motion.div variants={itemVariants} className="text-center bg-white rounded-xl p-8 shadow-soft">
                <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Code className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">REST APIs</h3>
                <p className="text-gray-600 mb-6">
                  Comprehensive REST APIs with OpenAPI documentation for seamless integration
                </p>
                <div className="space-y-2 text-sm text-gray-500">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>OAuth 2.0 & JWT Support</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Rate Limiting</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>SDK Available</span>
                  </div>
                </div>
              </motion.div>

              <motion.div variants={itemVariants} className="text-center bg-white rounded-xl p-8 shadow-soft">
                <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Globe className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">Webhooks</h3>
                <p className="text-gray-600 mb-6">
                  Real-time event notifications to keep your tools in sync automatically
                </p>
                <div className="space-y-2 text-sm text-gray-500">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Real-time Events</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Retry Logic</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Event Filtering</span>
                  </div>
                </div>
              </motion.div>

              <motion.div variants={itemVariants} className="text-center bg-white rounded-xl p-8 shadow-soft">
                <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Database className="w-8 h-8 text-purple-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">SAML/OIDC</h3>
                <p className="text-gray-600 mb-6">
                  Industry-standard protocols for secure authentication with any system
                </p>
                <div className="space-y-2 text-sm text-gray-500">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>SAML 2.0</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>OpenID Connect</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>SCIM Provisioning</span>
                  </div>
                </div>
              </motion.div>
            </div>

            <motion.div variants={itemVariants} className="text-center mt-12">
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Need Help with Integration?</h3>
                <p className="text-gray-600 mb-6">
                  Our open source community can help you connect any tool to SSO Hub. 
                  From documentation to community support, we've got you covered.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button 
                    className="bg-indigo-600 hover:bg-indigo-700"
                    onClick={() => window.open('https://github.com/pramodksahoo/devops-sso-hub/issues/new', '_blank')}
                  >
                    Request Integration
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                  <Button variant="outline">
                    View API Docs
                    <ExternalLink className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* Integration Statistics */}
      <motion.section
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        className="py-20 bg-gradient-to-r from-indigo-600 to-purple-600"
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div variants={itemVariants} className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Trusted by DevOps Teams Worldwide
            </h2>
            <p className="text-xl text-indigo-100">
              See how our integrations are powering modern development workflows
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <motion.div variants={itemVariants} className="text-center">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Puzzle className="w-8 h-8 text-white" />
              </div>
              <div className="text-4xl font-bold text-white mb-2">20+</div>
              <div className="text-indigo-100">Pre-built Integrations</div>
            </motion.div>

            <motion.div variants={itemVariants} className="text-center">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Zap className="w-8 h-8 text-white" />
              </div>
              <div className="text-4xl font-bold text-white mb-2">&lt; 5min</div>
              <div className="text-indigo-100">Average Setup Time</div>
            </motion.div>

            <motion.div variants={itemVariants} className="text-center">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-white" />
              </div>
              <div className="text-4xl font-bold text-white mb-2">99.9%</div>
              <div className="text-indigo-100">Integration Uptime</div>
            </motion.div>

            <motion.div variants={itemVariants} className="text-center">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Globe className="w-8 h-8 text-white" />
              </div>
              <div className="text-4xl font-bold text-white mb-2">1000+</div>
              <div className="text-indigo-100">Active Connections</div>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* Call to Action */}
      <motion.section
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        className="py-20 bg-white"
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div variants={itemVariants} className="max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
              Ready to Connect Your Tools?
            </h2>
            <p className="text-xl text-gray-600 mb-8">
              Start integrating your DevOps toolchain today. Completely free and open source.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                className="bg-indigo-600 hover:bg-indigo-700 font-bold px-8 py-4 text-lg"
                onClick={() => window.open('https://github.com/pramodksahoo/devops-sso-hub', '_blank')}
              >
                Start Integrating
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Button 
                variant="outline" 
                size="lg" 
                className="border-gray-300 text-gray-700 hover:bg-gray-50 font-bold px-8 py-4 text-lg"
              >
                View All Tools
                <ExternalLink className="w-5 h-5 ml-2" />
              </Button>
            </div>
          </motion.div>
        </div>
      </motion.section>
    </div>
  );
});

Integrations.displayName = 'Integrations';

export default Integrations;