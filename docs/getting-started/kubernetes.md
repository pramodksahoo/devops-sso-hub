# Kubernetes Deployment Guide ☸️

Deploy SSO Hub on Kubernetes for production-grade scalability, high availability, and cloud-native operations.

## 📋 Overview

SSO Hub provides Helm charts and Kubernetes manifests for cloud-native deployment:

- **Helm Charts**: Production-ready with customizable values
- **Horizontal Scaling**: Auto-scaling for microservices
- **High Availability**: Multi-replica deployments
- **Service Mesh Ready**: Istio/Linkerd compatible
- **Cloud Integration**: AWS EKS, GCP GKE, Azure AKS

## 🛠️ Prerequisites

### Kubernetes Cluster
- Kubernetes 1.24+
- Minimum 3 nodes with 4 CPU, 8GB RAM each
- LoadBalancer support (cloud provider or MetalLB)
- Persistent Volume support
- RBAC enabled

### Required Tools
```bash
# Install kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl

# Install Helm
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

# Verify installation
kubectl version --client
helm version
```

## 🚀 Deployment Methods

### Method 1: Helm Chart (Recommended)

#### Install SSO Hub Helm Chart
```bash
# Add SSO Hub Helm repository
helm repo add sso-hub https://charts.sso-hub.io
helm repo update

# Create namespace
kubectl create namespace sso-hub

# Install with default values
helm install sso-hub sso-hub/sso-hub -n sso-hub

# Or install with custom values
helm install sso-hub sso-hub/sso-hub -n sso-hub -f values.yaml
```

#### Custom Values Example
```yaml
# values.yaml
global:
  domain: sso-hub.company.com
  environment: production
  
frontend:
  replicas: 3
  ingress:
    enabled: true
    className: nginx
    annotations:
      cert-manager.io/cluster-issuer: "letsencrypt-prod"
    tls:
      - secretName: sso-hub-tls
        hosts:
          - sso-hub.company.com

auth-bff:
  replicas: 2
  autoscaling:
    enabled: true
    minReplicas: 2
    maxReplicas: 10
    targetCPUUtilizationPercentage: 70

catalog:
  replicas: 2
  resources:
    requests:
      memory: "512Mi"
      cpu: "500m"
    limits:
      memory: "1Gi"
      cpu: "1000m"

postgresql:
  enabled: true
  auth:
    database: sso_hub
    username: sso_hub_user
    password: "secure-postgres-password"
  primary:
    persistence:
      size: 100Gi
      storageClass: "fast-ssd"
    resources:
      requests:
        memory: "2Gi"
        cpu: "1000m"

redis:
  enabled: true
  auth:
    enabled: true
    password: "secure-redis-password"
  master:
    persistence:
      size: 10Gi

keycloak:
  enabled: true
  adminUser: admin
  adminPassword: "secure-admin-password"
  postgresql:
    enabled: false  # Use shared PostgreSQL
  externalDatabase:
    host: postgresql
    database: keycloak
    user: keycloak_user
    password: "keycloak-password"
```

### Method 2: Raw Kubernetes Manifests

#### Deploy Infrastructure
```bash
# Apply namespace and RBAC
kubectl apply -f k8s/00-namespace.yaml
kubectl apply -f k8s/01-rbac.yaml

# Deploy PostgreSQL and Redis
kubectl apply -f k8s/02-postgresql.yaml
kubectl apply -f k8s/03-redis.yaml

# Wait for database to be ready
kubectl wait --for=condition=ready pod -l app=postgresql -n sso-hub --timeout=300s
```

#### Deploy Authentication
```bash
# Deploy Keycloak
kubectl apply -f k8s/04-keycloak.yaml

# Deploy Auth-BFF
kubectl apply -f k8s/05-auth-bff.yaml

# Wait for auth services
kubectl wait --for=condition=ready pod -l app=keycloak -n sso-hub --timeout=300s
kubectl wait --for=condition=ready pod -l app=auth-bff -n sso-hub --timeout=300s
```

#### Deploy Microservices
```bash
# Deploy all microservices
kubectl apply -f k8s/06-microservices/

# Deploy frontend and gateway
kubectl apply -f k8s/07-frontend.yaml
kubectl apply -f k8s/08-nginx-gateway.yaml
kubectl apply -f k8s/09-ingress.yaml
```

## 📊 Configuration Examples

### High Availability Setup
```yaml
# values-ha.yaml
global:
  replicaCount: 3

postgresql:
  architecture: replication
  primary:
    replicas: 1
  readReplicas:
    replicas: 2

redis:
  architecture: replication
  sentinel:
    enabled: true

auth-bff:
  replicas: 3
  podDisruptionBudget:
    enabled: true
    minAvailable: 2

catalog:
  replicas: 3
  podDisruptionBudget:
    enabled: true
    minAvailable: 2
```

### Multi-Zone Deployment
```yaml
# values-multi-zone.yaml
global:
  nodeSelector:
    topology.kubernetes.io/zone: us-east-1a

postgresql:
  primary:
    affinity:
      podAntiAffinity:
        requiredDuringSchedulingIgnoredDuringExecution:
          - labelSelector:
              matchLabels:
                app.kubernetes.io/name: postgresql
            topologyKey: topology.kubernetes.io/zone

microservices:
  affinity:
    podAntiAffinity:
      preferredDuringSchedulingIgnoredDuringExecution:
        - weight: 100
          podAffinityTerm:
            labelSelector:
              matchLabels:
                app.kubernetes.io/instance: sso-hub
            topologyKey: topology.kubernetes.io/zone
```

## 🔧 Operations

### Scaling Operations
```bash
# Scale individual microservices
kubectl scale deployment catalog -n sso-hub --replicas=5
kubectl scale deployment auth-bff -n sso-hub --replicas=3

# Auto-scaling configuration
kubectl apply -f - <<EOF
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: catalog-hpa
  namespace: sso-hub
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: catalog
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
EOF
```

### Health Monitoring
```bash
# Check pod status
kubectl get pods -n sso-hub

# Check service endpoints
kubectl get endpoints -n sso-hub

# View service logs
kubectl logs -f deployment/auth-bff -n sso-hub
kubectl logs -f deployment/catalog -n sso-hub --tail=100

# Port forward for debugging
kubectl port-forward svc/auth-bff 3002:3002 -n sso-hub
kubectl port-forward svc/catalog 3006:3006 -n sso-hub
```

### Database Operations
```bash
# Connect to PostgreSQL
kubectl exec -it deployment/postgresql -n sso-hub -- psql -U sso_hub_user sso_hub

# Backup database
kubectl exec deployment/postgresql -n sso-hub -- pg_dump -U sso_hub_user sso_hub > backup.sql

# Port forward for external access
kubectl port-forward svc/postgresql 5432:5432 -n sso-hub
```

### Configuration Updates
```bash
# Update Helm deployment
helm upgrade sso-hub sso-hub/sso-hub -n sso-hub -f values.yaml

# Update specific service
kubectl set image deployment/catalog catalog=sso-hub/catalog:v1.2.0 -n sso-hub

# Rolling restart
kubectl rollout restart deployment/auth-bff -n sso-hub
kubectl rollout status deployment/auth-bff -n sso-hub
```

## 🔒 Security Configuration

### RBAC Setup
```yaml
# rbac.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: sso-hub-sa
  namespace: sso-hub
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  namespace: sso-hub
  name: sso-hub-role
rules:
- apiGroups: [""]
  resources: ["pods", "services", "endpoints"]
  verbs: ["get", "list", "watch"]
- apiGroups: ["apps"]
  resources: ["deployments"]
  verbs: ["get", "list", "watch", "patch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: sso-hub-rolebinding
  namespace: sso-hub
subjects:
- kind: ServiceAccount
  name: sso-hub-sa
  namespace: sso-hub
roleRef:
  kind: Role
  name: sso-hub-role
  apiGroup: rbac.authorization.k8s.io
```

### Network Policies
```yaml
# network-policy.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: sso-hub-network-policy
  namespace: sso-hub
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: sso-hub
  - from:
    - namespaceSelector:
        matchLabels:
          name: ingress-nginx
  egress:
  - to:
    - namespaceSelector:
        matchLabels:
          name: sso-hub
  - to: []
    ports:
    - protocol: TCP
      port: 53
    - protocol: UDP
      port: 53
```

### Secrets Management
```bash
# Create secrets for sensitive data
kubectl create secret generic sso-hub-secrets \
  --from-literal=postgres-password=secure-postgres-password \
  --from-literal=redis-password=secure-redis-password \
  --from-literal=session-secret=your-session-secret \
  --from-literal=identity-header-secret=your-hmac-secret \
  -n sso-hub

# Use with Sealed Secrets or External Secrets Operator
kubectl apply -f sealed-secrets.yaml

# Or use Helm secrets plugin
helm secrets upgrade sso-hub sso-hub/sso-hub -n sso-hub -f secrets.yaml
```

## 🌐 Ingress Configuration

### NGINX Ingress
```yaml
# ingress-nginx.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: sso-hub-ingress
  namespace: sso-hub
  annotations:
    kubernetes.io/ingress.class: nginx
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/auth-url: "https://sso-hub.company.com/auth/verify"
    nginx.ingress.kubernetes.io/auth-signin: "https://sso-hub.company.com/auth/login"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  tls:
  - hosts:
    - sso-hub.company.com
    secretName: sso-hub-tls
  rules:
  - host: sso-hub.company.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: frontend
            port:
              number: 3000
      - path: /api/
        pathType: Prefix
        backend:
          service:
            name: nginx-gateway
            port:
              number: 80
```

### Traefik Ingress
```yaml
# traefik-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: sso-hub-traefik
  namespace: sso-hub
  annotations:
    traefik.ingress.kubernetes.io/router.tls: "true"
    traefik.ingress.kubernetes.io/router.middlewares: "sso-hub-auth@kubernetescrd"
spec:
  tls:
  - hosts:
    - sso-hub.company.com
    secretName: sso-hub-tls
  rules:
  - host: sso-hub.company.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: frontend
            port:
              number: 3000
```

## 📊 Monitoring & Observability

### Prometheus Integration
```yaml
# servicemonitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: sso-hub-metrics
  namespace: sso-hub
spec:
  selector:
    matchLabels:
      app.kubernetes.io/instance: sso-hub
  endpoints:
  - port: metrics
    path: /metrics
    interval: 30s
```

### Grafana Dashboards
```bash
# Import SSO Hub dashboards
kubectl create configmap sso-hub-dashboards \
  --from-file=dashboards/ \
  -n monitoring

# Label for Grafana sidecar
kubectl label configmap sso-hub-dashboards \
  grafana_dashboard=1 \
  -n monitoring
```

## 🔧 Troubleshooting

### Common Issues

#### Pods Not Starting
```bash
# Check pod status and events
kubectl describe pod <pod-name> -n sso-hub
kubectl get events -n sso-hub --sort-by='.metadata.creationTimestamp'

# Check resource constraints
kubectl top pods -n sso-hub
kubectl describe node
```

#### Database Connection Issues
```bash
# Test database connectivity
kubectl run -it --rm debug --image=postgres:15 --restart=Never -- \
  psql -h postgresql.sso-hub.svc.cluster.local -U sso_hub_user -d sso_hub

# Check database logs
kubectl logs deployment/postgresql -n sso-hub
```

#### Service Discovery Problems
```bash
# Check DNS resolution
kubectl run -it --rm debug --image=busybox --restart=Never -- \
  nslookup auth-bff.sso-hub.svc.cluster.local

# Check service endpoints
kubectl get endpoints -n sso-hub
kubectl describe service auth-bff -n sso-hub
```

### Performance Optimization
```bash
# Resource optimization
kubectl apply -f - <<EOF
apiVersion: v1
kind: LimitRange
metadata:
  name: sso-hub-limits
  namespace: sso-hub
spec:
  limits:
  - default:
      memory: "1Gi"
      cpu: "500m"
    defaultRequest:
      memory: "512Mi"
      cpu: "250m"
    type: Container
EOF

# Node affinity for performance
kubectl patch deployment catalog -n sso-hub -p '
{
  "spec": {
    "template": {
      "spec": {
        "affinity": {
          "nodeAffinity": {
            "requiredDuringSchedulingIgnoredDuringExecution": {
              "nodeSelectorTerms": [{
                "matchExpressions": [{
                  "key": "node.kubernetes.io/instance-type",
                  "operator": "In",
                  "values": ["m5.large", "m5.xlarge"]
                }]
              }]
            }
          }
        }
      }
    }
  }
}'
```

## 🎯 Next Steps

- [Configure Kubernetes OIDC Integration](../integrations/kubernetes.md)
- [Set up GitOps with ArgoCD](../integrations/argocd.md)
- [Enable Service Mesh](../configuration/service-mesh.md)
- [Set up Multi-Cluster Deployment](../configuration/multi-cluster.md)

---

**Production Ready:** Your SSO Hub is now running on Kubernetes with enterprise-grade scalability and reliability!