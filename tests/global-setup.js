async function globalSetup() {
  console.log('🚀 Starting global test setup...');
  
  // Simple service health check with fetch
  const checkService = async (url, serviceName) => {
    try {
      const fetch = (await import('node-fetch')).default;
      const response = await fetch(url, { timeout: 5000 });
      if (response.ok) {
        console.log(`✅ ${serviceName} is ready`);
        return true;
      }
    } catch (error) {
      console.log(`⚠️ ${serviceName} not ready: ${error.message}`);
    }
    return false;
  };
  
  // Check key services
  await checkService('http://localhost:3000', 'Frontend');
  await checkService('http://localhost:3002/healthz', 'Auth-BFF');
  await checkService('http://localhost:3006/healthz', 'Catalog Service');
  
  console.log('✅ Global test setup completed');
}

module.exports = globalSetup;