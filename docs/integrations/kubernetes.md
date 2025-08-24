# Kubernetes OIDC Integration Guide ☸️

Complete guide to integrate Kubernetes with SSO Hub using OIDC authentication and RBAC for secure, scalable cluster access management.

## 📋 Overview

Kubernetes OIDC integration with SSO Hub provides:
- **OIDC Authentication** for kubectl and dashboard access
- **Role-Based Access Control (RBAC)** with group mapping
- **Service Account Management** for workloads
- **Audit logging** for cluster access compliance
- **Multi-cluster support** with unified authentication
- **kubectl plugin** for seamless CLI access

## 🎯 Architecture Overview

```mermaid
flowchart TD
    User[👤 DevOps User] --> kubectl[🔧 kubectl CLI]
    User --> Dashboard[🎛️ K8s Dashboard]
    User --> SSO[🔐 SSO Hub]
    
    kubectl --> OIDC[🗝️ OIDC Provider<br/>Keycloak]
    Dashboard --> OIDC
    SSO --> OIDC
    
    OIDC --> API[☸️ Kubernetes API Server<br/>OIDC Validation]
    API --> RBAC[🛡️ RBAC Authorization]
    RBAC --> Resources[📦 K8s Resources<br/>Pods, Services, etc.]
    
    SSO --> Webhook[📡 Webhook Events]
    API --> Audit[📝 Audit Logs]
    
    style User fill:#e3f2fd
    style kubectl fill:#fff3e0
    style Dashboard fill:#fff3e0
    style SSO fill:#e8f5e8
    style OIDC fill:#ffebee
    style API fill:#f3e5f5
    style RBAC fill:#fce4ec
    style Resources fill:#e0f2f1
```

## 🔧 Kubernetes API Server Configuration

### Step 1: Configure OIDC in API Server

#### For kubeadm Clusters
```yaml
# /etc/kubernetes/manifests/kube-apiserver.yaml
apiVersion: v1
kind: Pod
metadata:
  name: kube-apiserver
  namespace: kube-system
spec:
  containers:
  - command:
    - kube-apiserver
    # Existing flags...
    - --oidc-issuer-url=http://keycloak.sso-hub.local:8080/realms/sso-hub
    - --oidc-client-id=kubernetes-client
    - --oidc-username-claim=preferred_username
    - --oidc-groups-claim=groups
    - --oidc-username-prefix="oidc:"
    - --oidc-groups-prefix="oidc:"
    # Optional: For CA verification
    # - --oidc-ca-file=/etc/ssl/certs/ca-certificates.crt
    # - --oidc-signing-algs=RS256
```

#### For Managed Kubernetes (EKS/GKE/AKS)

**Amazon EKS:**
```bash
# Create EKS cluster with OIDC support
eksctl create cluster \
  --name sso-hub-cluster \
  --region us-west-2 \
  --with-oidc \
  --ssh-access \
  --ssh-public-key my-key

# Configure OIDC identity provider
aws eks associate-identity-provider-config \
  --cluster-name sso-hub-cluster \
  --oidc identityProviderConfigName=sso-hub-oidc,type=oidc,issuerUrl=http://keycloak.sso-hub.local:8080/realms/sso-hub,clientId=kubernetes-client,usernameClaim=preferred_username,groupsClaim=groups
```

**Google GKE:**
```bash
# Create GKE cluster with Workload Identity
gcloud container clusters create sso-hub-cluster \
  --workload-pool=PROJECT_ID.svc.id.goog \
  --enable-ip-alias \
  --machine-type=e2-standard-4

# Configure OIDC (requires GKE Enterprise)
gcloud container clusters update sso-hub-cluster \
  --enable-authenticator-groups
```

**Azure AKS:**
```bash
# Create AKS cluster with Azure AD integration
az aks create \
  --resource-group sso-hub-rg \
  --name sso-hub-cluster \
  --enable-aad \
  --aad-server-app-id kubernetes-server-app \
  --aad-client-app-id kubernetes-client-app \
  --aad-tenant-id your-tenant-id
```

### Step 2: Configure Keycloak OIDC Client

```bash
# Create Kubernetes OIDC client in Keycloak
curl -X POST http://localhost:8080/admin/realms/sso-hub/clients \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "kubernetes-client",
    "protocol": "openid-connect",
    "publicClient": true,
    "standardFlowEnabled": true,
    "directAccessGrantsEnabled": true,
    "serviceAccountsEnabled": false,
    "authorizationServicesEnabled": false,
    "redirectUris": [
      "http://localhost:8000",
      "http://localhost:18000",
      "urn:ietf:wg:oauth:2.0:oob"
    ],
    "webOrigins": ["*"],
    "attributes": {
      "access.token.lifespan": "3600",
      "refresh.token.max.reuse": "0"
    }
  }'
```

## 👥 RBAC Configuration

### Step 1: Create ClusterRoles
```yaml
# k8s-rbac-roles.yaml
---
# Full cluster admin role
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: sso-hub-cluster-admin
rules:
- apiGroups: ["*"]
  resources: ["*"]
  verbs: ["*"]

---
# Developer role - namespace-scoped admin
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: sso-hub-developer
rules:
- apiGroups: [""]
  resources: ["pods", "services", "configmaps", "secrets", "persistentvolumeclaims"]
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
- apiGroups: ["apps"]
  resources: ["deployments", "replicasets", "statefulsets", "daemonsets"]
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
- apiGroups: ["networking.k8s.io"]
  resources: ["ingresses", "networkpolicies"]
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
- apiGroups: ["autoscaling"]
  resources: ["horizontalpodautoscalers"]
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]

---
# Viewer role - read-only access
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: sso-hub-viewer
rules:
- apiGroups: ["*"]
  resources: ["*"]
  verbs: ["get", "list", "watch"]

---
# CI/CD role for automated deployments
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: sso-hub-cicd
rules:
- apiGroups: [""]
  resources: ["pods", "services", "configmaps", "secrets"]
  verbs: ["get", "list", "watch", "create", "update", "patch"]
- apiGroups: ["apps"]
  resources: ["deployments", "replicasets"]
  verbs: ["get", "list", "watch", "create", "update", "patch"]
- apiGroups: ["networking.k8s.io"]
  resources: ["ingresses"]
  verbs: ["get", "list", "watch", "create", "update", "patch"]
```

### Step 2: Create ClusterRoleBindings
```yaml
# k8s-rbac-bindings.yaml
---
# Bind SSO Hub admins to cluster-admin
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: sso-hub-cluster-admins
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: sso-hub-cluster-admin
subjects:
- kind: User
  name: oidc:admin@sso-hub.local
  apiGroup: rbac.authorization.k8s.io
- kind: Group
  name: oidc:sso-hub-k8s-admin
  apiGroup: rbac.authorization.k8s.io

---
# Bind developers to developer role
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: sso-hub-developers
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: sso-hub-developer
subjects:
- kind: Group
  name: oidc:sso-hub-k8s-developer
  apiGroup: rbac.authorization.k8s.io

---
# Bind viewers to viewer role
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: sso-hub-viewers
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: sso-hub-viewer
subjects:
- kind: Group
  name: oidc:sso-hub-k8s-viewer
  apiGroup: rbac.authorization.k8s.io

---
# Namespace-specific bindings for development teams
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: sso-hub-team-alpha
  namespace: team-alpha
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: sso-hub-developer
subjects:
- kind: Group
  name: oidc:sso-hub-team-alpha
  apiGroup: rbac.authorization.k8s.io
```

### Step 3: Apply RBAC Configuration
```bash
# Apply RBAC roles and bindings
kubectl apply -f k8s-rbac-roles.yaml
kubectl apply -f k8s-rbac-bindings.yaml

# Verify RBAC setup
kubectl auth can-i --list --as=oidc:developer@sso-hub.local
kubectl auth can-i create pods --as=oidc:developer@sso-hub.local -n team-alpha
```

## 🔧 kubectl Configuration

### Method 1: OIDC Plugin (Recommended)
```bash
# Install kubectl oidc-login plugin
kubectl krew install oidc-login

# Configure kubectl context
kubectl config set-cluster sso-hub-cluster \
  --server=https://kubernetes.company.com:6443 \
  --certificate-authority=ca.crt

kubectl config set-credentials sso-hub-oidc \
  --exec-api-version=client.authentication.k8s.io/v1beta1 \
  --exec-command=kubectl \
  --exec-arg=oidc-login \
  --exec-arg=get-token \
  --exec-arg=--oidc-issuer-url=http://localhost:8080/realms/sso-hub \
  --exec-arg=--oidc-client-id=kubernetes-client \
  --exec-arg=--oidc-extra-scope=groups \
  --exec-arg=--oidc-extra-scope=email

kubectl config set-context sso-hub-context \
  --cluster=sso-hub-cluster \
  --user=sso-hub-oidc

kubectl config use-context sso-hub-context
```

### Method 2: Manual Token Configuration
```bash
# Get OIDC token from SSO Hub
TOKEN=$(curl -s -X POST http://localhost:8080/realms/sso-hub/protocol/openid-connect/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=password&client_id=kubernetes-client&username=user@company.com&password=password" \
  | jq -r '.access_token')

# Configure kubectl with token
kubectl config set-credentials sso-hub-user --token=$TOKEN
kubectl config set-context sso-hub-context --user=sso-hub-user
kubectl config use-context sso-hub-context

# Test access
kubectl get pods --all-namespaces
```

### Method 3: SSO Hub kubectl Helper
```bash
# Install SSO Hub kubectl helper
curl -L https://github.com/sso-hub/kubectl-sso/releases/latest/download/kubectl-sso-linux-amd64 \
  -o ~/.local/bin/kubectl-sso
chmod +x ~/.local/bin/kubectl-sso

# Configure SSO Hub CLI
kubectl sso configure \
  --sso-url=http://localhost:3000 \
  --cluster-url=https://kubernetes.company.com:6443 \
  --username=user@company.com

# Login and get credentials
kubectl sso login
kubectl sso context --cluster=production
```

## 🎛️ Kubernetes Dashboard Integration

### Step 1: Deploy Dashboard with OIDC
```yaml
# k8s-dashboard-oidc.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: kubernetes-dashboard
  namespace: kubernetes-dashboard
spec:
  template:
    spec:
      containers:
      - name: kubernetes-dashboard
        image: kubernetesui/dashboard:v2.7.0
        args:
          - --auto-generate-certificates
          - --namespace=kubernetes-dashboard
          - --authentication-mode=token
          - --enable-skip-login
          - --enable-insecure-login
        env:
        - name: OIDC_ISSUER_URL
          value: "http://localhost:8080/realms/sso-hub"
        - name: OIDC_CLIENT_ID
          value: "kubernetes-dashboard"
        - name: OIDC_USERNAME_CLAIM
          value: "preferred_username"
        - name: OIDC_GROUPS_CLAIM
          value: "groups"
```

### Step 2: Create Dashboard Service Account
```yaml
# dashboard-service-account.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: dashboard-admin
  namespace: kubernetes-dashboard

---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: dashboard-admin
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: cluster-admin
subjects:
- kind: ServiceAccount
  name: dashboard-admin
  namespace: kubernetes-dashboard

---
apiVersion: v1
kind: Secret
metadata:
  name: dashboard-admin-token
  namespace: kubernetes-dashboard
  annotations:
    kubernetes.io/service-account.name: dashboard-admin
type: kubernetes.io/service-account-token
```

### Step 3: Configure Ingress with OIDC
```yaml
# dashboard-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: kubernetes-dashboard
  namespace: kubernetes-dashboard
  annotations:
    kubernetes.io/ingress.class: "nginx"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/backend-protocol: "HTTPS"
    # OIDC authentication
    nginx.ingress.kubernetes.io/auth-url: "http://localhost:3015/auth/verify"
    nginx.ingress.kubernetes.io/auth-signin: "http://localhost:3015/auth/login?rd=$scheme://$host$request_uri"
    nginx.ingress.kubernetes.io/auth-response-headers: "X-Auth-User,X-Auth-Groups,X-Auth-Token"
spec:
  tls:
  - hosts:
    - k8s-dashboard.company.com
    secretName: dashboard-tls
  rules:
  - host: k8s-dashboard.company.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: kubernetes-dashboard
            port:
              number: 443
```

## 🔗 SSO Hub Integration

### Step 1: Register Kubernetes in SSO Hub
```bash
curl -X POST http://localhost:3006/api/tools \
  -H "Content-Type: application/json" \
  -H "X-Identity-User: admin@sso-hub.local" \
  -d '{
    "name": "Kubernetes",
    "category": "Container Platform",
    "description": "Container orchestration and management",
    "url": "https://k8s-dashboard.company.com",
    "icon_url": "http://localhost:3000/assets/logos/Kubernetes.svg",
    "status": "active",
    "launch_config": {
      "type": "seamless_sso", 
      "auth_method": "oidc",
      "auto_login": true,
      "redirect_after_auth": "/",
      "session_duration": 8,
      "iframe_support": false
    },
    "health_check": {
      "enabled": true,
      "endpoint": "https://kubernetes.company.com:6443/version",
      "method": "GET", 
      "interval": 60,
      "timeout": 10,
      "expected_status": 200,
      "headers": {
        "Authorization": "Bearer k8s-health-check-token"
      }
    },
    "webhook_config": {
      "enabled": true,
      "events": ["pod_created", "deployment_updated", "service_deleted"],
      "secret": "your-k8s-webhook-secret"
    },
    "additional_config": {
      "cluster_endpoint": "https://kubernetes.company.com:6443",
      "oidc_issuer": "http://localhost:8080/realms/sso-hub",
      "supported_auth_methods": ["oidc", "token"],
      "rbac_enabled": true,
      "audit_enabled": true
    }
  }'
```

### Step 2: Configure Group Mapping
```yaml
# SSO Hub Kubernetes group mapping
kubernetes_group_mapping:
  # SSO Hub Groups → Kubernetes RBAC
  sso-hub-k8s-admin:
    kubernetes_groups: ["system:masters"]
    cluster_roles: ["cluster-admin"]
    description: "Full cluster administration access"
    
  sso-hub-k8s-developer:
    kubernetes_groups: ["developers"]
    cluster_roles: ["sso-hub-developer"]
    namespace_roles:
      - namespace: "dev"
        role: "admin"
      - namespace: "staging" 
        role: "edit"
    description: "Development and staging environment access"
    
  sso-hub-k8s-viewer:
    kubernetes_groups: ["viewers"]
    cluster_roles: ["view"]
    description: "Read-only cluster access"
    
  sso-hub-team-alpha:
    kubernetes_groups: ["team-alpha"]
    namespace_roles:
      - namespace: "team-alpha"
        role: "admin"
    description: "Team Alpha namespace administration"
    
  sso-hub-k8s-cicd:
    kubernetes_groups: ["cicd"]
    cluster_roles: ["sso-hub-cicd"]
    service_accounts: ["cicd-deployer"]
    description: "CI/CD deployment access"
```

## 📊 Audit and Monitoring

### Step 1: Enable Kubernetes Audit Logging
```yaml
# audit-policy.yaml
apiVersion: audit.k8s.io/v1
kind: Policy
rules:
# Authentication events
- level: Metadata
  namespaces: [""]
  verbs: ["create"]
  resources:
  - group: "authentication.k8s.io"
    resources: ["tokenreviews"]
    
# RBAC events  
- level: Request
  namespaces: [""]
  verbs: ["create", "update", "delete"]
  resources:
  - group: "rbac.authorization.k8s.io"
    resources: ["roles", "rolebindings", "clusterroles", "clusterrolebindings"]
    
# Resource access by OIDC users
- level: Metadata
  users: ["oidc:*"]
  verbs: ["get", "list", "create", "update", "delete"]
  resources:
  - group: ""
    resources: ["pods", "services", "configmaps", "secrets"]
  - group: "apps"
    resources: ["deployments", "replicasets", "statefulsets"]
```

### Step 2: Configure API Server Audit
```yaml
# Update kube-apiserver.yaml
spec:
  containers:
  - command:
    - kube-apiserver
    # Existing flags...
    - --audit-log-path=/var/log/audit.log
    - --audit-policy-file=/etc/kubernetes/audit-policy.yaml
    - --audit-log-maxage=30
    - --audit-log-maxbackup=3
    - --audit-log-maxsize=100
```

### Step 3: SSO Hub Audit Integration
```javascript
// Kubernetes audit log processing in SSO Hub
const kubernetesAuditProcessor = {
  // Process authentication events
  processAuthEvents: async (auditLog) => {
    const authEvents = auditLog.items.filter(
      item => item.objectRef?.resource === 'tokenreviews'
    );
    
    for (const event of authEvents) {
      const auditEvent = {
        type: 'k8s_authentication',
        user: event.user?.username,
        groups: event.user?.groups,
        timestamp: event.requestReceivedTimestamp,
        source_ip: event.sourceIPs?.[0],
        user_agent: event.userAgent,
        success: event.responseStatus?.code < 400
      };
      
      await auditService.logEvent(auditEvent);
    }
  },
  
  // Process resource access
  processResourceEvents: async (auditLog) => {
    const resourceEvents = auditLog.items.filter(
      item => item.verb && item.objectRef?.resource
    );
    
    for (const event of resourceEvents) {
      const accessEvent = {
        type: 'k8s_resource_access',
        user: event.user?.username,
        verb: event.verb,
        resource: event.objectRef.resource,
        namespace: event.objectRef.namespace,
        name: event.objectRef.name,
        timestamp: event.requestReceivedTimestamp,
        success: event.responseStatus?.code < 400
      };
      
      await analyticsService.recordAccess(accessEvent);
    }
  }
};
```

## 🔔 Webhook Integration

### Step 1: Deploy Admission Controller
```yaml
# sso-hub-admission-controller.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: sso-hub-admission-controller
  namespace: sso-hub-system
spec:
  replicas: 2
  selector:
    matchLabels:
      app: sso-hub-admission-controller
  template:
    metadata:
      labels:
        app: sso-hub-admission-controller
    spec:
      serviceAccountName: sso-hub-admission-controller
      containers:
      - name: admission-controller
        image: sso-hub/k8s-admission-controller:latest
        env:
        - name: SSO_HUB_API
          value: "http://localhost:3006/api"
        - name: WEBHOOK_URL
          value: "http://localhost:3007/webhooks/kubernetes"
        - name: TLS_CERT_FILE
          value: "/etc/certs/tls.crt"
        - name: TLS_KEY_FILE
          value: "/etc/certs/tls.key"
        volumeMounts:
        - name: certs
          mountPath: /etc/certs
          readOnly: true
        ports:
        - containerPort: 8443
          name: webhook
          protocol: TCP
      volumes:
      - name: certs
        secret:
          secretName: admission-controller-certs
```

### Step 2: Configure Admission Webhook
```yaml
# admission-webhook.yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionWebhook
metadata:
  name: sso-hub-validator
webhooks:
- name: pod-security.sso-hub.local
  clientConfig:
    service:
      name: sso-hub-admission-controller
      namespace: sso-hub-system
      path: "/validate"
  rules:
  - operations: ["CREATE", "UPDATE"]
    apiGroups: [""]
    apiVersions: ["v1"]
    resources: ["pods"]
  admissionReviewVersions: ["v1beta1", "v1"]
  sideEffects: None
  failurePolicy: Ignore
```

### Step 3: Event Processing
```javascript
// Kubernetes event webhook handler
const kubernetesWebhookHandler = {
  // Pod lifecycle events
  handlePodEvents: async (event) => {
    const podEvent = {
      type: 'k8s_pod_event',
      action: event.type, // ADDED, MODIFIED, DELETED
      namespace: event.object.metadata.namespace,
      name: event.object.metadata.name,
      owner: event.object.metadata.labels?.owner,
      timestamp: new Date().toISOString(),
      metadata: {
        phase: event.object.status.phase,
        node: event.object.spec.nodeName,
        containers: event.object.spec.containers.length
      }
    };
    
    await analyticsService.recordEvent(podEvent);
    
    // Alert on failed pods
    if (podEvent.metadata.phase === 'Failed') {
      await notificationService.alert('pod_failure', podEvent);
    }
  },
  
  // Deployment events
  handleDeploymentEvents: async (event) => {
    const deployEvent = {
      type: 'k8s_deployment_event',
      action: event.type,
      namespace: event.object.metadata.namespace,
      name: event.object.metadata.name,
      replicas: event.object.spec.replicas,
      ready_replicas: event.object.status.readyReplicas || 0,
      timestamp: new Date().toISOString()
    };
    
    await analyticsService.recordEvent(deployEvent);
    
    // Notify on deployment completion
    if (deployEvent.ready_replicas === deployEvent.replicas) {
      await notificationService.notify('deployment_ready', deployEvent);
    }
  }
};
```

## 🔧 Troubleshooting

### Common Issues & Solutions

#### OIDC Authentication Fails
```bash
# Check API server OIDC configuration
kubectl logs -n kube-system kube-apiserver-master-node | grep -i oidc

# Verify OIDC endpoint accessibility
curl -k http://localhost:8080/realms/sso-hub/.well-known/openid_configuration

# Test token validation
TOKEN="your-oidc-token"
curl -H "Authorization: Bearer $TOKEN" https://kubernetes.company.com:6443/api/v1/namespaces

# Check kubectl plugin logs
kubectl oidc-login get-token --v=8
```

#### RBAC Permission Denied
```bash
# Check user's effective permissions
kubectl auth can-i --list --as=oidc:user@company.com

# Verify group membership
kubectl get clusterrolebindings -o yaml | grep -A 10 -B 10 "oidc:sso-hub-k8s-developer"

# Test specific permission
kubectl auth can-i create pods --as=oidc:user@company.com --namespace=dev

# Check RBAC rules
kubectl describe clusterrole sso-hub-developer
kubectl describe clusterrolebinding sso-hub-developers
```

#### Token Expiry Issues
```bash
# Check token expiration
echo $TOKEN | base64 -d | jq '.exp | todate'

# Refresh token automatically
kubectl config set-credentials sso-hub-oidc \
  --exec-arg=--oidc-use-refresh-token

# Manual token refresh
kubectl oidc-login get-token --refresh-token
```

#### Dashboard Access Problems
```bash
# Check dashboard logs
kubectl logs -n kubernetes-dashboard deployment/kubernetes-dashboard

# Verify ingress configuration
kubectl describe ingress -n kubernetes-dashboard kubernetes-dashboard

# Test OIDC authentication flow
curl -v -H "Authorization: Bearer $TOKEN" https://k8s-dashboard.company.com/api/v1/login
```

### Performance Optimization
```bash
# Optimize OIDC token caching
# Add to API server configuration:
--oidc-ca-file=/etc/ssl/certs/ca-certificates.crt
--oidc-required-claim=iss=http://localhost:8080/realms/sso-hub

# Reduce token validation overhead
--oidc-username-prefix=""
--oidc-groups-prefix=""

# Enable token caching in kubectl
kubectl config set-credentials sso-hub-oidc \
  --exec-arg=--oidc-use-pkce \
  --exec-arg=--oidc-listen-port=18000
```

## 📈 Advanced Features

### Multi-Cluster Management
```yaml
# Configure multiple clusters with SSO Hub
clusters:
  production:
    server: https://prod-k8s.company.com:6443
    oidc_issuer: http://localhost:8080/realms/sso-hub
    rbac_groups:
      - sso-hub-k8s-prod-admin
      - sso-hub-k8s-prod-developer
      
  staging:
    server: https://staging-k8s.company.com:6443
    oidc_issuer: http://localhost:8080/realms/sso-hub
    rbac_groups:
      - sso-hub-k8s-staging-admin
      - sso-hub-k8s-staging-developer
      
  development:
    server: https://dev-k8s.company.com:6443
    oidc_issuer: http://localhost:8080/realms/sso-hub
    rbac_groups:
      - sso-hub-k8s-dev-admin
      - sso-hub-k8s-dev-developer
```

### Service Account Token Integration
```yaml
# Create service account for CI/CD
apiVersion: v1
kind: ServiceAccount
metadata:
  name: sso-hub-cicd
  namespace: default
  annotations:
    sso-hub.io/managed: "true"
    sso-hub.io/owner-group: "sso-hub-k8s-cicd"

---
# Bind to CI/CD role
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: sso-hub-cicd-binding
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: sso-hub-cicd
subjects:
- kind: ServiceAccount
  name: sso-hub-cicd
  namespace: default

---
# Token secret for CI/CD
apiVersion: v1
kind: Secret
metadata:
  name: sso-hub-cicd-token
  namespace: default
  annotations:
    kubernetes.io/service-account.name: sso-hub-cicd
type: kubernetes.io/service-account-token
```

### Custom Resource Integration
```yaml
# CRD for SSO Hub managed resources
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: ssohubusers.sso-hub.io
spec:
  group: sso-hub.io
  versions:
  - name: v1
    served: true
    storage: true
    schema:
      openAPIV3Schema:
        type: object
        properties:
          spec:
            type: object
            properties:
              email:
                type: string
              groups:
                type: array
                items:
                  type: string
              rbacRules:
                type: array
                items:
                  type: object
          status:
            type: object
            properties:
              synced:
                type: boolean
              lastSync:
                type: string
  scope: Cluster
  names:
    plural: ssohubusers
    singular: ssohubuser
    kind: SSOHubUser
```

## 🎯 Best Practices

### Security Best Practices
1. **Use HTTPS** for all OIDC communications
2. **Rotate OIDC client secrets** regularly
3. **Implement least privilege RBAC** with namespace isolation
4. **Enable comprehensive audit logging**
5. **Use service accounts** for automation

### Performance Best Practices
1. **Configure token caching** to reduce OIDC overhead
2. **Implement RBAC efficiently** with group-based permissions
3. **Monitor authentication metrics**
4. **Use admission controllers** for policy enforcement
5. **Optimize webhook performance**

### Operational Best Practices
1. **Test RBAC changes** in non-production first
2. **Monitor token expiration** and renewal
3. **Implement graceful fallbacks** for authentication failures
4. **Document group mappings** and permissions
5. **Regularly audit access** and permissions

---

**🎉 Success!** Kubernetes is now fully integrated with SSO Hub, providing seamless OIDC authentication, comprehensive RBAC, and enterprise-grade access management.

**Next Steps:**
- [ArgoCD Integration](argocd.md) - GitOps with SSO
- [Grafana Integration](grafana.md) - Monitoring dashboards
- [Advanced Security Configuration](../security/rbac-guide.md)