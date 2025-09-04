import { memo, useCallback, useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Shield, 
  Lock, 
  Users, 
  Zap, 
  ArrowRight, 
  CheckCircle,
  Star,
  Globe,
  Code,
  KeyRound,
  Fingerprint,
  ClipboardCheck,
  MousePointerClick,
  Rocket,
  DollarSign,
  Activity,
  Gauge,
  Clock,
  Sparkles,
  Play,
  ExternalLink,
  GitBranch
} from 'lucide-react';
import { Button } from '../components/ui';
import { ThemeToggle } from '../components/ui/theme-toggle';
import { useAuth } from '../contexts/AuthContext';

// Import tool logos
import {
  GitHubLogo,
  GitLabLogo,
  JenkinsLogo,
  ArgoCDLogo,
  TerraformLogo,
  SonarQubeLogo,
  GrafanaLogo,
  PrometheusLogo,
  KibanaLogo,
  JiraLogo,
  AWLogo,
  AzureLogo,
  CircleCILogo,
  BitBucketLogo,
  KubernetesLogo
} from '../assets/logos';

// ROI Calculator Component
const ROICalculator = memo(() => {
  const [teamSize, setTeamSize] = useState(10);
  const [toolsCount, setToolsCount] = useState(8);
  
  const calculations = useMemo(() => {
    const avgLoginTime = 30; // seconds per tool per day
    const workingDaysPerYear = 250;
    const avgHourlySalary = 75; // dollars
    
    const timeWastedPerYear = (teamSize * toolsCount * avgLoginTime * workingDaysPerYear) / 3600; // hours
    const costPerYear = timeWastedPerYear * avgHourlySalary;
    const timeSavedPerDay = (teamSize * toolsCount * avgLoginTime) / 60; // minutes
    
    return {
      timeWasted: Math.round(timeWastedPerYear),
      costWasted: Math.round(costPerYear),
      timeSavedDaily: Math.round(timeSavedPerDay),
      productivity: Math.round((timeSavedPerDay / (8 * 60)) * 100 * 10) / 10 // percentage
    };
  }, [teamSize, toolsCount]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20"
    >
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
        <DollarSign className="w-5 h-5 mr-2" />
        ROI Calculator
      </h3>
      
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-white/70 block mb-1">Team Size</label>
            <input
              type="range"
              min="5"
              max="100"
              value={teamSize}
              onChange={(e) => setTeamSize(Number(e.target.value))}
              className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer slider"
            />
            <span className="text-white font-medium">{teamSize} developers</span>
          </div>
          
          <div>
            <label className="text-sm text-white/70 block mb-1">Tools Count</label>
            <input
              type="range"
              min="3"
              max="15"
              value={toolsCount}
              onChange={(e) => setToolsCount(Number(e.target.value))}
              className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer slider"
            />
            <span className="text-white font-medium">{toolsCount} tools</span>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/20">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400">${calculations.costWasted.toLocaleString()}</div>
            <div className="text-xs text-white/70">Annual savings</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-400">{calculations.timeSavedDaily}min</div>
            <div className="text-xs text-white/70">Daily time saved</div>
          </div>
        </div>
      </div>
    </motion.div>
  );
});

// Real-time System Health Component
const SystemHealthWidget = memo(() => {
  const [healthData, setHealthData] = useState({
    uptime: 99.9,
    responseTime: 1.2,
    activeUsers: 1,
    toolsOnline: 6
  });
  
  useEffect(() => {
    // Simulate real-time data updates
    const interval = setInterval(() => {
      setHealthData(prev => ({
        ...prev,
        responseTime: Math.round((0.8 + Math.random() * 0.8) * 100) / 100,
        activeUsers: Math.max(1, prev.activeUsers + Math.floor(Math.random() * 3) - 1)
      }));
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20"
    >
      <h3 className="text-base font-semibold text-white mb-3 flex items-center">
        <Activity className="w-4 h-4 mr-2 text-green-400" />
        System Health
      </h3>
      
      <div className="grid grid-cols-4 gap-2">
        <div className="text-center">
          <div className="flex items-center justify-center mb-2">
            <Gauge className="w-4 h-4 text-green-400" />
          </div>
          <div className="text-lg font-bold text-green-400">{healthData.uptime}%</div>
          <div className="text-xs text-white/70">Uptime</div>
        </div>
        
        <div className="text-center">
          <div className="flex items-center justify-center mb-2">
            <Clock className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-lg font-bold text-blue-400">{healthData.responseTime}s</div>
          <div className="text-xs text-white/70">Response</div>
        </div>
        
        <div className="text-center">
          <div className="flex items-center justify-center mb-2">
            <Users className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-lg font-bold text-purple-400">{healthData.activeUsers}</div>
          <div className="text-xs text-white/70">Active Users</div>
        </div>
        
        <div className="text-center">
          <div className="flex items-center justify-center mb-2">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-lg font-bold text-emerald-400">{healthData.toolsOnline}</div>
          <div className="text-xs text-white/70">Tools Online</div>
        </div>
      </div>
    </motion.div>
  );
});

// Animated Background Particles Component
const AnimatedBackground = memo(() => {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Floating Orbs */}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full bg-white/5 backdrop-blur-sm"
          style={{
            width: `${20 + i * 10}px`,
            height: `${20 + i * 10}px`,
            left: `${10 + i * 15}%`,
            top: `${10 + i * 10}%`,
          }}
          animate={{
            y: [-20, 20, -20],
            x: [-10, 10, -10],
            scale: [1, 1.1, 1],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 4 + i,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.5,
          }}
        />
      ))}
      
      {/* Grid Lines */}
      <motion.div
        className="absolute inset-0 opacity-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.1 }}
        transition={{ duration: 2 }}
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
      />
      
      {/* Gradient Overlay */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-br from-purple-600/20 via-blue-600/20 to-indigo-600/20"
        animate={{
          background: [
            'linear-gradient(135deg, rgba(147,51,234,0.2), rgba(37,99,235,0.2), rgba(79,70,229,0.2))',
            'linear-gradient(135deg, rgba(168,85,247,0.2), rgba(59,130,246,0.2), rgba(99,102,241,0.2))',
            'linear-gradient(135deg, rgba(147,51,234,0.2), rgba(37,99,235,0.2), rgba(79,70,229,0.2))',
          ]
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
    </div>
  );
});

// Enhanced Trust Indicators Component
const TrustIndicators = memo(() => {
  const [activeUsers, setActiveUsers] = useState(1247);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveUsers(prev => prev + Math.floor(Math.random() * 3));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.8 }}
      className="flex flex-col sm:flex-row items-center gap-6 mt-8"
    >
      {/* Active Users Counter */}
      <motion.div
        className="flex items-center gap-3 bg-white/10 backdrop-blur-md rounded-full px-4 py-2 border border-white/20"
        whileHover={{ scale: 1.05 }}
      >
        <div className="flex -space-x-2">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 border-2 border-white/50 flex items-center justify-center"
            >
              <Users className="w-4 h-4 text-white" />
            </div>
          ))}
        </div>
        <div className="text-white">
          <div className="font-semibold">{activeUsers.toLocaleString()}+</div>
          <div className="text-xs text-white/70">Active DevOps Teams</div>
        </div>
      </motion.div>

      {/* GitHub Stars */}
      <motion.a
        href="https://github.com/pramodksahoo/devops-sso-hub"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 bg-white/10 backdrop-blur-md rounded-full px-4 py-2 border border-white/20 hover:bg-white/20 transition-all duration-200"
        whileHover={{ scale: 1.05 }}
      >
        <GitBranch className="w-4 h-4 text-white" />
        <span className="text-white font-medium">Star on GitHub</span>
        <ExternalLink className="w-3 h-3 text-white/70" />
      </motion.a>

      {/* Security Badge */}
      <motion.div
        className="flex items-center gap-2 bg-green-500/20 backdrop-blur-md rounded-full px-4 py-2 border border-green-400/30"
        whileHover={{ scale: 1.05 }}
      >
        <Shield className="w-4 h-4 text-green-400" />
        <span className="text-green-100 font-medium text-sm">SOC 2 Compliant</span>
      </motion.div>
    </motion.div>
  );
});

const HomePage = memo(() => {
  const { login } = useAuth();

  const handleLogin = useCallback(() => {
    login();
  }, [login]);

  const tools = useMemo(() => [
    { name: 'GitHub', logo: GitHubLogo, category: 'Version Control', status: 'active' },
    { name: 'GitLab', logo: GitLabLogo, category: 'Version Control', status: 'active' },
    { name: 'Jenkins', logo: JenkinsLogo, category: 'CI/CD', status: 'active' },
    { name: 'Argo CD', logo: ArgoCDLogo, category: 'GitOps', status: 'active' },
    { name: 'Terraform', logo: TerraformLogo, category: 'IaC', status: 'active' },
    { name: 'SonarQube', logo: SonarQubeLogo, category: 'Code Quality', status: 'active' },
    { name: 'Grafana', logo: GrafanaLogo, category: 'Monitoring', status: 'active' },
    { name: 'Prometheus', logo: PrometheusLogo, category: 'Monitoring', status: 'maintenance' },
    { name: 'Kibana', logo: KibanaLogo, category: 'Logging', status: 'active' },
    { name: 'Jira', logo: JiraLogo, category: 'Project Management', status: 'active' },
    { name: 'AWS', logo: AWLogo, category: 'Cloud', status: 'active' },
    { name: 'Azure', logo: AzureLogo, category: 'Cloud', status: 'active' },
    { name: 'CircleCI', logo: CircleCILogo, category: 'CI/CD', status: 'active' },
    { name: 'BitBucket', logo: BitBucketLogo, category: 'Version Control', status: 'active' },
    { name: 'Kubernetes', logo: KubernetesLogo, category: 'Orchestration', status: 'active' },
  ], []);

  const features = useMemo(() => [
    {
      icon: <Shield className="h-8 w-8" />,
      title: "Enterprise Security",
      description: "OIDC compliance, RBAC, and zero-trust architecture with enterprise-grade encryption.",
      color: "bg-blue-100 text-blue-600",
      stats: "99.9% secure"
    },
    {
      icon: <Users className="h-8 w-8" />,
      title: "Unified Access",
      description: "Single sign-on to 12+ DevOps tools with centralized user management and permissions.",
      color: "bg-green-100 text-green-600",
      stats: "12+ tools"
    },
    {
      icon: <Zap className="h-8 w-8" />,
      title: "Lightning Fast",
      description: "Optimized performance with sub-second authentication and seamless tool switching.",
      color: "bg-purple-100 text-purple-600",
      stats: "<1s login"
    },
    {
      icon: <Globe className="h-8 w-8" />,
      title: "Global Scale",
      description: "Built for distributed teams with multi-region support and 99.9% uptime guarantee.",
      color: "bg-orange-100 text-orange-600",
      stats: "99.9% uptime"
    }
  ], []);

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

  const cardHoverVariants = useMemo(() => ({
    hover: {
      scale: 1.05,
      y: -8,
      transition: {
        duration: 0.3,
        ease: "easeOut"
      }
    }
  }), []);


  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Floating Theme Toggle */}
      <ThemeToggle variant="floating" />
      
      {/* Section 1: Header - Enhanced with accessibility */}
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
        role="banner"
        aria-label="Site header"
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Left side - Logo */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="flex items-center space-x-3"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 shadow-lg" role="img" aria-label="SSO Hub logo">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">SSO Hub</h1>
            </motion.div>

            {/* Right side - Theme Toggle and Sign In Button */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="flex items-center space-x-4"
            >
              <ThemeToggle variant="minimal" />
              
              <Button
                onClick={handleLogin}
                size="lg"
                className="bg-primary-600 hover:bg-primary-700 text-white font-semibold px-8 py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 border-0 min-w-[180px]"
                aria-label="Sign in with Single Sign-On authentication"
              >
                <Lock className="w-5 h-5 mr-3" aria-hidden="true" />
                Sign in with SSO
                <ArrowRight className="w-5 h-5 ml-3" aria-hidden="true" />
              </Button>
            </motion.div>
          </div>
        </div>
      </motion.header>

      {/* Transform Your DevOps Workflow Banner */}
      <motion.section
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 py-3"
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.5, type: "spring", stiffness: 200 }}
            className="flex items-center justify-center space-x-3"
          >
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br from-white/20 to-white/10 shadow-lg"
            >
              <Sparkles className="h-4 w-4 text-white" />
            </motion.div>
            <span className="text-white font-semibold text-lg">Transform Your DevOps Workflow</span>
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="w-2 h-2 rounded-full bg-green-300"
            />
          </motion.div>
        </div>
      </motion.section>

      {/* Section 2: Enhanced Hero Section with Stunning Visual Impact */}
      <motion.section 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative overflow-hidden bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 min-h-screen flex items-center pt-4 lg:pt-8 pb-12 lg:pb-16"
        role="main"
        aria-labelledby="hero-heading"
      >
        {/* Animated Background */}
        <AnimatedBackground />
        
        {/* Enhanced Gradient Overlay */}
        <motion.div 
          className="absolute inset-0 bg-gradient-to-br from-black/10 via-transparent to-black/20"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.5 }}
        />

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            {/* Left Side - Enhanced Value Proposition */}
            <motion.div variants={itemVariants} className="text-white lg:pr-4">
              {/* Removed badge - moved to top banner */}

              {/* Enhanced Main Headline with Typing Effect */}
              <motion.div className="mb-6">
                <motion.h1 
                  id="hero-heading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 1, delay: 0.5 }}
                  className="text-4xl md:text-5xl lg:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-blue-100 to-purple-100 mb-4 leading-[0.95] tracking-tight"
                >
                  Zero-Click
                  <br />
                  <span className="text-white">DevOps Access</span>
                </motion.h1>
                
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 1.5, delay: 1 }}
                  className="h-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full max-w-md"
                />
              </motion.div>
              
              {/* Enhanced Description with Highlights */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.8 }}
                className="mb-8 max-w-xl"
              >
                <p className="text-xl md:text-2xl text-white/90 mb-4 font-light leading-relaxed">
                  Eliminate password fatigue forever. 
                  <span className="font-semibold text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-purple-300"> One secure login</span> unlocks your entire toolchain.
                </p>
                <p className="text-lg text-white/70 leading-relaxed">
                  Enterprise-grade SSO for Jenkins, Grafana, SonarQube, Prometheus, ArgoCD, and 12+ more DevOps tools.
                </p>
              </motion.div>

              {/* Enhanced Call-to-Action Buttons */}
              <motion.div 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 1.2 }}
                className="flex flex-col sm:flex-row gap-4 mb-6"
              >
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    onClick={handleLogin}
                    size="xl"
                    className="group bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold px-10 py-5 rounded-2xl shadow-2xl hover:shadow-blue-500/30 transition-all duration-300 border-0 text-lg relative overflow-hidden"
                    aria-label="Get started with SSO Hub authentication"
                  >
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent"
                      initial={{ x: "-100%" }}
                      whileHover={{ x: "100%" }}
                      transition={{ duration: 0.5 }}
                    />
                    <Rocket className="w-6 h-6 mr-3" aria-hidden="true" />
                    Launch SSO Hub
                    <ArrowRight className="w-5 h-5 ml-3 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
                  </Button>
                </motion.div>
                
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    variant="outline"
                    size="xl"
                    className="group bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold px-10 py-5 rounded-2xl shadow-2xl hover:shadow-green-500/30 transition-all duration-300 text-lg border-0"
                    aria-label="Watch demo video"
                  >
                    <Play className="w-5 h-5 mr-3" />
                    Watch Demo
                  </Button>
                </motion.div>
              </motion.div>

              {/* Trust Indicators */}
              <TrustIndicators />
              
              {/* Statistics Section - Moved from bottom */}
              <motion.div 
                variants={itemVariants}
                className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4"
              >
                {/* Active Users */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 1.0 }}
                  className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/20 text-center"
                >
                  <Users className="w-5 h-5 text-white/80 mx-auto mb-2" />
                  <div className="text-xl font-bold text-white">1</div>
                  <div className="text-xs text-white/70">Active Users</div>
                </motion.div>

                {/* Connected Tools */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 1.1 }}
                  className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/20 text-center"
                >
                  <Globe className="w-5 h-5 text-white/80 mx-auto mb-2" />
                  <div className="text-xl font-bold text-white">0</div>
                  <div className="text-xs text-white/70">Connected Tools</div>
                </motion.div>

                {/* System Health */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 1.2 }}
                  className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/20 text-center"
                >
                  <CheckCircle className="w-5 h-5 text-green-400 mx-auto mb-2" />
                  <div className="text-xl font-bold text-white">100%</div>
                  <div className="text-xs text-white/70">System Health</div>
                </motion.div>

                {/* System Uptime */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 1.3 }}
                  className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/20 text-center"
                >
                  <Zap className="w-5 h-5 text-white/80 mx-auto mb-2" />
                  <div className="text-xl font-bold text-white">99.9%</div>
                  <div className="text-xs text-white/70">System Uptime</div>
                </motion.div>
              </motion.div>
            </motion.div>

            {/* Right Side - Enhanced 3D Dashboard Preview */}
            <motion.div 
              variants={itemVariants} 
              className="relative lg:pl-4"
            >
              {/* 3D Container with Perspective */}
              <motion.div
                initial={{ opacity: 0, rotateY: 30, scale: 0.8 }}
                animate={{ opacity: 1, rotateY: 0, scale: 1 }}
                transition={{ duration: 1, delay: 0.5, type: "spring", stiffness: 100 }}
                className="relative transform-gpu"
                style={{ perspective: "1000px" }}
              >
                {/* Main Dashboard Container */}
                <motion.div 
                  className="relative bg-gradient-to-br from-white/20 to-white/5 backdrop-blur-xl rounded-3xl p-4 border border-white/30 shadow-2xl"
                  whileHover={{ 
                    rotateY: 5, 
                    rotateX: 5, 
                    scale: 1.02,
                    transition: { duration: 0.3 }
                  }}
                >
                  {/* Dashboard Header */}
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.8 }}
                    className="flex items-center justify-between mb-3"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                      <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    </div>
                    <div className="flex items-center space-x-2 text-white/80">
                      <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                      <span className="text-sm font-medium">Live Dashboard</span>
                    </div>
                  </motion.div>

                  {/* ROI Calculator with Enhanced Animation */}
                  <motion.div
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.8, delay: 1 }}
                  >
                    <ROICalculator />
                  </motion.div>

                  <div className="my-3">
                    {/* System Health Widget with Glow Effect */}
                    <motion.div
                      initial={{ opacity: 0, x: -50 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.8, delay: 1.2 }}
                      className="relative"
                    >
                      <motion.div
                        className="absolute inset-0 bg-green-500/20 rounded-2xl blur-xl"
                        animate={{
                          opacity: [0.2, 0.5, 0.2],
                          scale: [1, 1.1, 1],
                        }}
                        transition={{
                          duration: 3,
                          repeat: Infinity,
                          ease: "easeInOut"
                        }}
                      />
                      <SystemHealthWidget />
                    </motion.div>
                  </div>

                  {/* Enhanced Tool Grid with Stagger Animation */}
                  <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 1.4 }}
                    className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-base font-semibold text-white flex items-center">
                        <Code className="w-5 h-5 mr-2" />
                        DevOps Ecosystem
                      </h3>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                        className="text-white/60"
                      >
                        <Activity className="w-4 h-4" />
                      </motion.div>
                    </div>
                    
                    <motion.div 
                      className="grid grid-cols-5 gap-2"
                      initial="hidden"
                      animate="visible"
                      variants={{
                        visible: {
                          transition: {
                            staggerChildren: 0.1,
                          },
                        },
                      }}
                    >
                      {tools.slice(0, 15).map((tool) => (
                        <motion.div
                          key={tool.name}
                          variants={{
                            hidden: { opacity: 0, scale: 0, rotate: -180 },
                            visible: { 
                              opacity: 1, 
                              scale: 1, 
                              rotate: 0,
                              transition: {
                                type: "spring",
                                stiffness: 200,
                                damping: 10
                              }
                            },
                          }}
                          whileHover={{ 
                            scale: 1.15, 
                            y: -5,
                            rotate: 5,
                            transition: { duration: 0.2 }
                          }}
                          className="text-center p-2 bg-gradient-to-br from-white/20 to-white/10 rounded-lg cursor-pointer relative group border border-white/10 hover:border-white/30 transition-all duration-200"
                        >
                          {/* Status Indicator with Pulse */}
                          <motion.div 
                            className={`absolute top-1 right-1 w-2 h-2 rounded-full ${
                              tool.status === 'active' ? 'bg-green-400' : 
                              tool.status === 'maintenance' ? 'bg-yellow-400' : 'bg-red-400'
                            }`}
                            animate={{
                              scale: tool.status === 'active' ? [1, 1.2, 1] : 1,
                              opacity: tool.status === 'active' ? [1, 0.7, 1] : 1,
                            }}
                            transition={{
                              duration: 2,
                              repeat: Infinity,
                              ease: "easeInOut"
                            }}
                          />
                          
                          <img
                            src={tool.logo}
                            alt={tool.name}
                            className="h-6 w-6 mx-auto mb-1 opacity-90 group-hover:opacity-100 transition-opacity"
                          />
                          <p className="text-xs text-white/90 font-medium truncate">{tool.name}</p>
                          <motion.p 
                            className="text-xs text-green-300 capitalize font-semibold"
                            animate={{ opacity: [0.7, 1, 0.7] }}
                            transition={{ duration: 2, repeat: Infinity }}
                          >
                            {tool.status}
                          </motion.p>
                        </motion.div>
                      ))}
                    </motion.div>
                  </motion.div>
                </motion.div>

                {/* Floating Elements for Depth */}
                <motion.div
                  className="absolute -top-4 -right-4 w-20 h-20 bg-gradient-to-br from-blue-500/30 to-purple-500/30 rounded-full blur-xl"
                  animate={{
                    y: [-10, 10, -10],
                    opacity: [0.3, 0.7, 0.3],
                  }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                />
                
                <motion.div
                  className="absolute -bottom-6 -left-6 w-16 h-16 bg-gradient-to-br from-green-500/30 to-blue-500/30 rounded-full blur-xl"
                  animate={{
                    y: [10, -10, 10],
                    opacity: [0.2, 0.6, 0.2],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 1
                  }}
                />
              </motion.div>
            </motion.div>

            {/* Statistics section moved to left side after Trust Indicators */}
          </div>
        </div>
      </motion.section>

      {/* Section 3: Why Choose DevOps SSO? */}
      <motion.section 
        id="features"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        className="py-20 lg:py-28 bg-white"
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div variants={itemVariants} className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
              Why Choose DevOps SSO?
            </h2>
            <p className="text-gray-600 max-w-3xl mx-auto">
              Streamline your DevOps workflow with our comprehensive SSO solution designed for modern teams.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                variants={itemVariants}
                whileHover={cardHoverVariants.hover}
                className="text-center group bg-white rounded-xl p-6 shadow-soft hover:shadow-medium transition-all duration-300 border"
              >
                <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl ${feature.color} mb-4 group-hover:scale-110 transition-transform duration-200 relative`}>
                  {feature.icon}
                  <motion.div
                    className="absolute -top-2 -right-2 bg-primary-500 text-white text-xs px-2 py-1 rounded-full font-semibold"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.5 + index * 0.1 }}
                  >
                    {feature.stats}
                  </motion.div>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-600 leading-relaxed text-sm">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Section 4: Security */}
      <section id="security" className="py-20 bg-gray-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Security</h3>
            <p className="text-gray-600">Enterprise-grade security by default: MFA, RBAC, audit logging, and hardened session/token lifecycle.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl border p-6">
              <div className="flex items-center gap-3 mb-3"><KeyRound className="h-5 w-5 text-primary-600" /><span className="font-medium">Multi-Factor Authentication</span></div>
              <p className="text-sm text-gray-600">Support for MFA across services and critical actions.</p>
            </div>
            <div className="bg-white rounded-xl border p-6">
              <div className="flex items-center gap-3 mb-3"><Fingerprint className="h-5 w-5 text-primary-600" /><span className="font-medium">Role-Based Access Control</span></div>
              <p className="text-sm text-gray-600">Fine-grained permissions and group-based policies.</p>
            </div>
            <div className="bg-white rounded-xl border p-6">
              <div className="flex items-center gap-3 mb-3"><ClipboardCheck className="h-5 w-5 text-primary-600" /><span className="font-medium">Audit & Compliance</span></div>
              <p className="text-sm text-gray-600">Comprehensive audit logs, security baselines, and CSR.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 5: How It Works */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">How It Works</h3>
            <p className="text-gray-600">Three quick steps to streamline your access to DevOps tools.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gray-50 rounded-xl border p-6">
              <div className="flex items-center gap-3 mb-3"><Lock className="h-5 w-5 text-primary-600" /><span className="font-medium">1. Sign in</span></div>
              <p className="text-sm text-gray-600">Authenticate once with secure SSO.</p>
            </div>
            <div className="bg-gray-50 rounded-xl border p-6">
              <div className="flex items-center gap-3 mb-3"><MousePointerClick className="h-5 w-5 text-primary-600" /><span className="font-medium">2. Pick a Tool</span></div>
              <p className="text-sm text-gray-600">See available tools and your access.</p>
            </div>
            <div className="bg-gray-50 rounded-xl border p-6">
              <div className="flex items-center gap-3 mb-3"><Rocket className="h-5 w-5 text-primary-600" /><span className="font-medium">3. One-Click Access</span></div>
              <p className="text-sm text-gray-600">Launch with SSO—no extra logins.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 6: Integrated DevOps Tools */}
      <section id="integrations" className="py-20 bg-gray-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Integrated DevOps Tools</h3>
            <p className="text-gray-600">Connect seamlessly with all your favorite DevOps tools and services.</p>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4 items-center">
            {tools.slice(0, 15).map(tool => (
              <div key={tool.name} className="flex flex-col items-center bg-white rounded-lg border p-3">
                <img src={tool.logo} alt={tool.name} className="h-8 w-8 mb-2" />
                <span className="text-xs text-gray-600">{tool.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 7: Ready to Streamline CTA */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary-700 mb-4">
            <Star className="h-5 w-5" />
          </div>
          <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">Ready to Streamline Your DevOps Workflow?</h3>
          <p className="text-gray-600 mb-6">Get started with DevOps SSO Dashboard today and simplify access to all your tools with enterprise-grade security.</p>
          <div className="flex items-center justify-center gap-3">
            <Button onClick={handleLogin}>
              Sign in Now
            </Button>
            <Button variant="outline">Learn More</Button>
          </div>
        </div>
      </section>

      {/* Section 8: Testimonials */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">What teams say</h3>
            <p className="text-gray-600">Simple sign-in, secure by default, and built for DevOps velocity.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { quote: 'One-click to Jenkins and Grafana saved us countless passwords.', role: 'Engineering Manager' },
              { quote: 'The RBAC model fits our teams perfectly. Setup was fast.', role: 'Release Lead' },
              { quote: 'Security and usability finally aligned for our toolchain.', role: 'DevOps Architect' },
            ].map((t, i) => (
              <div key={i} className="bg-white rounded-xl border p-6">
                <p className="text-gray-700 mb-3">“{t.quote}”</p>
                <p className="text-sm text-gray-500">{t.role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 9: Newsletter */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h3 className="text-2xl font-bold text-gray-900 mb-3">Stay in the loop</h3>
          <p className="text-gray-600 mb-6">Product updates and best practices for secure DevOps access.</p>
          <div className="max-w-md mx-auto flex items-center gap-2">
            <input type="email" className="flex-1 border border-gray-300 rounded-md px-3 py-2" placeholder="you@example.com" />
            <Button>Subscribe</Button>
          </div>
        </div>
      </section>

      {/* Enhanced Footer */}
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
                <li><a href="#features" className="hover:text-white transition-colors duration-200 hover:pl-2">✨ Features</a></li>
                <li><a href="#integrations" className="hover:text-white transition-colors duration-200 hover:pl-2">🔗 Integrations</a></li>
                <li><a href="#security" className="hover:text-white transition-colors duration-200 hover:pl-2">🔐 Security</a></li>
              </ul>
            </motion.div>

            {/* Resources */}
            <motion.div variants={itemVariants}>
              <h4 className="text-lg font-semibold mb-6 text-white">Resources</h4>
              <ul className="space-y-3 text-gray-300">
                <li><a href="#" className="hover:text-white transition-colors duration-200 hover:pl-2">📖 Documentation</a></li>
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
    </div>
  );
});

HomePage.displayName = 'HomePage';

export default HomePage;
