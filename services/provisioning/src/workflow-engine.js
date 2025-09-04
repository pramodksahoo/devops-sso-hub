/**
 * Workflow Engine - Phase 9
 * Handles execution of provisioning workflows with rollback capabilities
 */

const { v4: uuidv4 } = require('uuid');
const EventEmitter = require('events');

class WorkflowEngine extends EventEmitter {
  constructor(fastify, config, databaseManager, auditLogger) {
    super();
    this.fastify = fastify;
    this.config = config;
    this.db = databaseManager;
    this.audit = auditLogger;
    
    // Active workflows tracking
    this.activeWorkflows = new Map();
    this.workflowQueue = [];
    this.maxConcurrentWorkflows = config.MAX_CONCURRENT_WORKFLOWS;
    
    // Workflow execution stats
    this.stats = {
      total_workflows: 0,
      successful_workflows: 0,
      failed_workflows: 0,
      rolled_back_workflows: 0
    };
    
    this.isRunning = false;
  }

  async initialize() {
    this.fastify.log.info('🔄 Initializing Workflow Engine...');
    
    try {
      // Load active workflows from database
      await this.loadActiveWorkflows();
      
      // Set up workflow monitoring
      this.setupWorkflowMonitoring();
      
      this.fastify.log.info('✅ Workflow Engine initialized successfully');
    } catch (error) {
      this.fastify.log.error('❌ Failed to initialize Workflow Engine:', error);
      throw error;
    }
  }

  async start() {
    if (this.isRunning) {
      this.fastify.log.warn('Workflow Engine is already running');
      return;
    }

    this.isRunning = true;
    this.fastify.log.info('🚀 Starting Workflow Engine...');
    
    // Start processing workflow queue
    this.processWorkflowQueue();
    
    this.fastify.log.info('✅ Workflow Engine started');
  }

  async stop() {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    this.fastify.log.info('🛑 Stopping Workflow Engine...');
    
    // Wait for active workflows to complete or timeout
    await this.gracefulShutdown();
    
    this.fastify.log.info('✅ Workflow Engine stopped');
  }

  /**
   * Execute a provisioning workflow
   */
  async executeWorkflow(workflowConfig) {
    try {
      // Validate workflow configuration
      this.validateWorkflowConfig(workflowConfig);
      
      // Create workflow record
      const workflow = await this.createWorkflowRecord(workflowConfig);
      
      // Add to queue
      this.workflowQueue.push(workflow);
      
      // Emit workflow queued event
      this.emit('workflow_queued', workflow);
      
      // Process queue if not at capacity
      if (this.activeWorkflows.size < this.maxConcurrentWorkflows) {
        setImmediate(() => this.processWorkflowQueue());
      }
      
      return workflow;
    } catch (error) {
      this.fastify.log.error('Failed to execute workflow:', error);
      throw error;
    }
  }

  /**
   * Process the workflow queue
   */
  async processWorkflowQueue() {
    while (this.isRunning && 
           this.workflowQueue.length > 0 && 
           this.activeWorkflows.size < this.maxConcurrentWorkflows) {
      
      const workflow = this.workflowQueue.shift();
      
      try {
        // Start workflow execution
        this.activeWorkflows.set(workflow.id, workflow);
        await this.startWorkflowExecution(workflow);
      } catch (error) {
        this.fastify.log.error(`Failed to start workflow ${workflow.id}:`, error);
        this.activeWorkflows.delete(workflow.id);
        await this.markWorkflowFailed(workflow.id, error.message);
      }
    }
  }

  /**
   * Start executing a workflow
   */
  async startWorkflowExecution(workflow) {
    try {
      this.fastify.log.info(`🔄 Starting workflow execution: ${workflow.id}`);
      
      // Update workflow status
      await this.updateWorkflowStatus(workflow.id, 'running', { started_at: new Date() });
      
      // Audit workflow start
      await this.audit.logEvent('workflow_started', {
        workflow_id: workflow.id,
        tool_slug: workflow.tool_slug,
        resource_type: workflow.target_resource_type,
        initiated_by: workflow.initiated_by
      });
      
      // Execute workflow steps
      await this.executeWorkflowSteps(workflow);
      
      // Mark workflow as completed
      await this.markWorkflowCompleted(workflow.id);
      
      this.fastify.log.info(`✅ Workflow completed successfully: ${workflow.id}`);
      
    } catch (error) {
      this.fastify.log.error(`❌ Workflow execution failed: ${workflow.id}`, error);
      
      // Check if rollback is needed
      if (this.config.ROLLBACK_ENABLED && workflow.workflow_type === 'create') {
        await this.initiateRollback(workflow, error);
      } else {
        await this.markWorkflowFailed(workflow.id, error.message);
      }
    } finally {
      // Remove from active workflows
      this.activeWorkflows.delete(workflow.id);
      
      // Process next item in queue
      setImmediate(() => this.processWorkflowQueue());
    }
  }

  /**
   * Execute workflow steps sequentially
   */
  async executeWorkflowSteps(workflow) {
    const steps = await this.getWorkflowSteps(workflow.id);
    let rollbackData = [];
    
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      
      try {
        this.fastify.log.debug(`Executing step ${step.step_order}: ${step.step_name}`);
        
        // Update step status
        await this.updateStepStatus(step.id, 'running', { started_at: new Date() });
        
        // Execute the step
        const stepResult = await this.executeStep(workflow, step);
        
        // Store rollback data if provided
        if (stepResult.rollback_data) {
          rollbackData.push({
            step_id: step.id,
            step_name: step.step_name,
            rollback_data: stepResult.rollback_data
          });
        }
        
        // Update step as completed
        await this.updateStepStatus(step.id, 'completed', {
          completed_at: new Date(),
          output_data: stepResult.output_data
        });
        
        // Update workflow progress
        await this.updateWorkflowProgress(workflow.id, i + 1, steps.length, step.step_name);
        
      } catch (error) {
        this.fastify.log.error(`Step ${step.step_name} failed:`, error);
        
        // Update step as failed
        await this.updateStepStatus(step.id, 'failed', {
          completed_at: new Date(),
          error_message: error.message
        });
        
        // Store rollback data for completed steps
        await this.storeRollbackData(workflow.id, rollbackData);
        
        throw error;
      }
    }
    
    // Store rollback data for successful workflow
    await this.storeRollbackData(workflow.id, rollbackData);
  }

  /**
   * Execute individual workflow step
   */
  async executeStep(workflow, step) {
    const stepConfig = step.step_config;
    const stepType = step.step_type;
    
    switch (stepType) {
      case 'api_call':
        return await this.executeApiCallStep(workflow, step);
      
      case 'validation':
        return await this.executeValidationStep(workflow, step);
      
      case 'webhook':
        return await this.executeWebhookStep(workflow, step);
      
      case 'wait':
        return await this.executeWaitStep(workflow, step);
      
      case 'condition':
        return await this.executeConditionStep(workflow, step);
      
      case 'template_render':
        return await this.executeTemplateRenderStep(workflow, step);
      
      default:
        throw new Error(`Unknown step type: ${stepType}`);
    }
  }

  /**
   * Execute API call step
   */
  async executeApiCallStep(workflow, step) {
    const config = step.step_config;
    const toolProvisioner = await this.getToolProvisioner(workflow.tool_slug);
    
    if (!toolProvisioner) {
      throw new Error(`No provisioner found for tool: ${workflow.tool_slug}`);
    }
    
    // Execute the API call through tool-specific provisioner
    const result = await toolProvisioner.executeApiCall(config, workflow.execution_variables);
    
    return {
      output_data: result,
      rollback_data: result.rollback_data || null
    };
  }

  /**
   * Execute validation step
   */
  async executeValidationStep(workflow, step) {
    const config = step.step_config;
    const validationType = config.validation_type;
    
    switch (validationType) {
      case 'resource_exists':
        return await this.validateResourceExists(workflow, config);
      
      case 'permissions':
        return await this.validatePermissions(workflow, config);
      
      case 'policy_compliance':
        return await this.validatePolicyCompliance(workflow, config);
      
      default:
        throw new Error(`Unknown validation type: ${validationType}`);
    }
  }

  /**
   * Execute webhook step
   */
  async executeWebhookStep(workflow, step) {
    const config = step.step_config;
    const axios = require('axios');
    
    try {
      const response = await axios({
        method: config.method || 'POST',
        url: config.url,
        headers: config.headers || {},
        data: {
          workflow_id: workflow.id,
          step_name: step.step_name,
          ...config.payload
        },
        timeout: this.config.STEP_TIMEOUT_SECONDS * 1000
      });
      
      return {
        output_data: {
          status: response.status,
          data: response.data
        }
      };
    } catch (error) {
      throw new Error(`Webhook call failed: ${error.message}`);
    }
  }

  /**
   * Execute wait step
   */
  async executeWaitStep(workflow, step) {
    const config = step.step_config;
    const waitTime = config.wait_seconds || 5;
    
    this.fastify.log.debug(`Waiting ${waitTime} seconds...`);
    
    await new Promise(resolve => setTimeout(resolve, waitTime * 1000));
    
    return {
      output_data: {
        waited_seconds: waitTime
      }
    };
  }

  /**
   * Execute condition step
   */
  async executeConditionStep(workflow, step) {
    const config = step.step_config;
    const condition = config.condition;
    
    // Simple condition evaluation (can be enhanced with expression engine)
    const result = this.evaluateCondition(condition, workflow.execution_variables);
    
    if (!result) {
      throw new Error(`Condition failed: ${condition}`);
    }
    
    return {
      output_data: {
        condition_result: result
      }
    };
  }

  /**
   * Execute template render step
   */
  async executeTemplateRenderStep(workflow, step) {
    const config = step.step_config;
    const Handlebars = require('handlebars');
    
    try {
      const template = Handlebars.compile(config.template);
      const rendered = template(workflow.execution_variables);
      
      return {
        output_data: {
          rendered_content: rendered
        }
      };
    } catch (error) {
      throw new Error(`Template rendering failed: ${error.message}`);
    }
  }

  /**
   * Initiate rollback for failed workflow
   */
  async initiateRollback(workflow, originalError) {
    try {
      this.fastify.log.warn(`🔄 Initiating rollback for workflow: ${workflow.id}`);
      
      // Create rollback workflow
      const rollbackWorkflow = await this.createRollbackWorkflow(workflow, originalError);
      
      // Execute rollback immediately (high priority)
      this.workflowQueue.unshift(rollbackWorkflow);
      
      // Process rollback
      setImmediate(() => this.processWorkflowQueue());
      
      // Update original workflow status
      await this.updateWorkflowStatus(workflow.id, 'failed', {
        error_message: originalError.message,
        rollback_workflow_id: rollbackWorkflow.id
      });
      
      this.fastify.log.info(`🔄 Rollback initiated: ${rollbackWorkflow.id}`);
      
    } catch (rollbackError) {
      this.fastify.log.error(`❌ Failed to initiate rollback:`, rollbackError);
      await this.markWorkflowFailed(workflow.id, `Original error: ${originalError.message}. Rollback failed: ${rollbackError.message}`);
    }
  }

  /**
   * Create rollback workflow
   */
  async createRollbackWorkflow(originalWorkflow, error) {
    const rollbackSteps = await this.generateRollbackSteps(originalWorkflow.id);
    
    const rollbackWorkflow = {
      id: uuidv4(),
      workflow_name: `Rollback: ${originalWorkflow.workflow_name}`,
      description: `Rollback for failed workflow ${originalWorkflow.id}`,
      tool_slug: originalWorkflow.tool_slug,
      target_resource_type: originalWorkflow.target_resource_type,
      target_resource_id: originalWorkflow.target_resource_id,
      status: 'pending',
      workflow_type: 'rollback',
      parent_workflow_id: originalWorkflow.id,
      initiated_by: 'system',
      initiated_by_email: 'system@ssohub.internal',
      workflow_config: { rollback_reason: error.message },
      steps: rollbackSteps
    };
    
    // Create workflow record
    const workflowRecord = await this.createWorkflowRecord(rollbackWorkflow);
    
    // Create rollback steps
    for (const step of rollbackSteps) {
      await this.createWorkflowStep(workflowRecord.id, {
        ...step,
        is_rollback_step: true
      });
    }
    
    return workflowRecord;
  }

  // ===== DATABASE OPERATIONS =====

  async createWorkflowRecord(workflowConfig) {
    const client = await this.db.db.connect();
    
    try {
      const query = `
        INSERT INTO provisioning_workflows (
          id, workflow_name, description, tool_slug, target_resource_type,
          target_resource_id, status, workflow_type, template_id,
          workflow_config, execution_variables, initiated_by, initiated_by_email,
          user_roles, parent_workflow_id, total_steps
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        RETURNING *
      `;
      
      const workflowId = workflowConfig.id || uuidv4();
      const values = [
        workflowId,
        workflowConfig.workflow_name,
        workflowConfig.description,
        workflowConfig.tool_slug,
        workflowConfig.target_resource_type,
        workflowConfig.target_resource_id,
        'pending',
        workflowConfig.workflow_type || 'create',
        workflowConfig.template_id,
        JSON.stringify(workflowConfig.workflow_config || {}),
        JSON.stringify(workflowConfig.execution_variables || {}),
        workflowConfig.initiated_by,
        workflowConfig.initiated_by_email,
        workflowConfig.user_roles || [],
        workflowConfig.parent_workflow_id,
        workflowConfig.total_steps || 0
      ];
      
      const result = await client.query(query, values);
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  async updateWorkflowStatus(workflowId, status, additionalData = {}) {
    const client = await this.db.db.connect();
    
    try {
      const setFields = ['status = $2', 'updated_at = NOW()'];
      const values = [workflowId, status];
      let paramCount = 2;
      
      Object.entries(additionalData).forEach(([key, value]) => {
        paramCount++;
        setFields.push(`${key} = $${paramCount}`);
        values.push(typeof value === 'object' ? JSON.stringify(value) : value);
      });
      
      const query = `
        UPDATE provisioning_workflows 
        SET ${setFields.join(', ')}
        WHERE id = $1
        RETURNING *
      `;
      
      const result = await client.query(query, values);
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  async getWorkflowSteps(workflowId) {
    const client = await this.db.db.connect();
    
    try {
      const query = `
        SELECT * FROM provisioning_workflow_steps
        WHERE workflow_id = $1
        ORDER BY step_order ASC
      `;
      
      const result = await client.query(query, [workflowId]);
      return result.rows;
    } finally {
      client.release();
    }
  }

  // ===== HELPER METHODS =====

  validateWorkflowConfig(config) {
    const required = ['workflow_name', 'tool_slug', 'target_resource_type', 'initiated_by'];
    
    for (const field of required) {
      if (!config[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }
  }

  evaluateCondition(condition, variables) {
    // Simple condition evaluation - can be enhanced
    try {
      const conditionStr = condition.replace(/\$\{(\w+)\}/g, (match, varName) => {
        return JSON.stringify(variables[varName]);
      });
      
      return eval(conditionStr);
    } catch (error) {
      this.fastify.log.error('Condition evaluation failed:', error);
      return false;
    }
  }

  async setupWorkflowMonitoring() {
    // Set up periodic cleanup of old workflows
    setInterval(async () => {
      await this.cleanupOldWorkflows();
    }, this.config.CLEANUP_CHECK_INTERVAL_HOURS * 60 * 60 * 1000);
  }

  async loadActiveWorkflows() {
    // Load workflows that were running when service restarted
    const client = await this.db.db.connect();
    
    try {
      const query = `
        SELECT * FROM provisioning_workflows
        WHERE status IN ('running', 'pending')
        ORDER BY created_at ASC
      `;
      
      const result = await client.query(query);
      
      for (const workflow of result.rows) {
        if (workflow.status === 'running') {
          // Mark as failed - will need manual intervention
          await this.updateWorkflowStatus(workflow.id, 'failed', {
            error_message: 'Service restarted during workflow execution'
          });
        } else {
          // Re-queue pending workflows
          this.workflowQueue.push(workflow);
        }
      }
      
      this.fastify.log.info(`Loaded ${result.rows.length} workflows from database`);
    } finally {
      client.release();
    }
  }

  async gracefulShutdown() {
    const shutdownTimeout = 30000; // 30 seconds
    const startTime = Date.now();
    
    while (this.activeWorkflows.size > 0 && (Date.now() - startTime) < shutdownTimeout) {
      this.fastify.log.info(`Waiting for ${this.activeWorkflows.size} active workflows to complete...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    if (this.activeWorkflows.size > 0) {
      this.fastify.log.warn(`Forced shutdown with ${this.activeWorkflows.size} active workflows`);
    }
  }

  // Additional methods will be implemented as needed...
  async markWorkflowCompleted(workflowId) {
    return this.updateWorkflowStatus(workflowId, 'completed', {
      completed_at: new Date(),
      completed_steps: await this.getCompletedStepsCount(workflowId)
    });
  }

  async markWorkflowFailed(workflowId, errorMessage) {
    return this.updateWorkflowStatus(workflowId, 'failed', {
      completed_at: new Date(),
      error_message: errorMessage
    });
  }

  async getCompletedStepsCount(workflowId) {
    const client = await this.db.db.connect();
    
    try {
      const query = `
        SELECT COUNT(*) as count FROM provisioning_workflow_steps
        WHERE workflow_id = $1 AND status = 'completed'
      `;
      
      const result = await client.query(query, [workflowId]);
      return parseInt(result.rows[0].count);
    } finally {
      client.release();
    }
  }
}

module.exports = WorkflowEngine;
