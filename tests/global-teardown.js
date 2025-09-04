async function globalTeardown() {
  console.log('🧹 Starting global test teardown...');
  
  // Optional: Clean up any test data or resources
  // For now, we'll let Docker Compose handle service cleanup
  
  console.log('✅ Global test teardown completed');
}

module.exports = globalTeardown;