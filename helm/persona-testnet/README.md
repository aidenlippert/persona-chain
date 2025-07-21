# Persona Chain Testnet Helm Chart

This Helm chart deploys a 4-node Persona Chain testnet with integrated faucet and block explorer.

## Prerequisites

- Kubernetes 1.19+
- Helm 3.2.0+
- Persistent Volume provisioner support in the underlying infrastructure
- LoadBalancer service support (for cloud deployments)

## Installation

### Add Helm Repository

```bash
# Add the Persona Chain Helm repository (when available)
helm repo add persona-chain https://charts.persona-chain.dev
helm repo update
```

### Install the Chart

```bash
# Install with default values
helm install persona-testnet persona-chain/persona-testnet

# Install with custom values
helm install persona-testnet persona-chain/persona-testnet -f custom-values.yaml

# Install in a specific namespace
helm install persona-testnet persona-chain/persona-testnet --namespace persona-testnet --create-namespace
```

## Configuration

The following table lists the configurable parameters and their default values:

| Parameter | Description | Default |
|-----------|-------------|---------|
| `global.chainId` | Chain ID for the testnet | `"persona-testnet-1"` |
| `global.namespace` | Kubernetes namespace | `"persona-testnet"` |
| `image.repository` | Docker image repository | `"persona-chain/testnet"` |
| `image.tag` | Docker image tag | `"latest"` |
| `image.pullPolicy` | Image pull policy | `"IfNotPresent"` |
| `service.type` | Kubernetes service type | `"LoadBalancer"` |
| `validators.count` | Number of validator nodes | `4` |
| `validators.resources.limits.cpu` | CPU limit per validator | `"2000m"` |
| `validators.resources.limits.memory` | Memory limit per validator | `"4Gi"` |
| `validators.storage.size` | Storage size per validator | `"10Gi"` |
| `ingress.enabled` | Enable ingress | `true` |
| `faucet.enabled` | Enable faucet service | `true` |
| `explorer.enabled` | Enable block explorer | `true` |

## Accessing the Testnet

After installation, you can access the testnet through:

### RPC Endpoints
- Primary RPC: `http://<EXTERNAL-IP>:26657`
- Secondary RPCs: `http://<EXTERNAL-IP>:26667`, `26677`, `26687`

### API Endpoints  
- Primary API: `http://<EXTERNAL-IP>:1317`
- Secondary APIs: `http://<EXTERNAL-IP>:1318`, `1319`, `1320`

### Faucet
- Faucet: `http://<EXTERNAL-IP>:8080`

### Block Explorer
- Explorer: `http://<EXTERNAL-IP>:3000`

Get the external IP:
```bash
kubectl get svc persona-testnet-rpc -o jsonpath='{.status.loadBalancer.ingress[0].ip}'
```

## Updating the Chart

```bash
helm upgrade persona-testnet persona-chain/persona-testnet -f values.yaml
```

## Uninstalling

```bash
helm uninstall persona-testnet
```

## Monitoring

The chart includes Prometheus metrics on port 26660 when monitoring is enabled.

## Persistence

The testnet data is persisted using PersistentVolumeClaims. Make sure your cluster has dynamic volume provisioning enabled or manually create PersistentVolumes.

## Custom Configuration

Create a `custom-values.yaml` file to override default settings:

```yaml
global:
  chainId: "my-persona-testnet"

validators:
  resources:
    limits:
      cpu: "4000m"
      memory: "8Gi"
  storage:
    size: "50Gi"

ingress:
  hosts:
    - host: rpc.my-domain.com
      paths:
        - path: /
          pathType: Prefix
          backend:
            service:
              name: persona-rpc
              port:
                number: 26657
```

Then install with:
```bash
helm install persona-testnet persona-chain/persona-testnet -f custom-values.yaml
```