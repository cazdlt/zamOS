# Docker Monitoring Guide

This guide explains how zamOS monitors real system and network metrics when running inside Docker.

## Overview

By default, Docker containers are isolated and can only see their own resources. To monitor the **host system** (not just the container), we use several techniques:

1. **Host filesystem mounts** - Mount host's `/proc`, `/sys`, and `/` into the container
2. **Privileged mode** - Required for hardware sensor access (temperature)
3. **systeminformation library** - Node.js library that reads from these mounted paths

## What Can Be Monitored

### ✅ Fully Supported
- **CPU Usage** - Real host CPU load across all cores
- **RAM Usage** - Host memory utilization (used/total)
- **Disk Usage** - Host filesystem usage
- **Network Traffic** - Real network interface statistics (rx/tx bytes and speeds)
- **System Uptime** - Host system uptime

### ⚠️ Limited Support
- **Temperature** - Requires privileged mode; may not work on all systems
  - Works on: Most Linux hosts with hwmon sensors
  - May fail on: VMs, cloud instances, some ARM devices

## Docker Configuration

### docker-compose.yml

The key configuration for monitoring:

```yaml
services:
  zamos:
    privileged: true  # Required for accessing host system info
    volumes:
      # Mount host directories directly for systeminformation
      - /proc:/proc:ro
      - /sys:/sys:ro
      - /:/rootfs:ro
      # Data persistence
      - ./data:/app/data
```

### Volume Mounts Explained

| Host Path | Container Path | Purpose |
|-----------|----------------|---------|
| `/proc` | `/proc` | Process info, CPU, memory stats |
| `/sys` | `/sys` | System devices, sensors, hardware info |
| `/` | `/rootfs` | Root filesystem for disk usage |

## How It Works

### 1. Configuration on Startup

```typescript
// systeminformation automatically reads from /proc and /sys
// No configuration needed when mounted directly
import * as si from 'systeminformation';

const cpuLoad = await si.currentLoad();
const mem = await si.mem();
const fsSize = await si.fsSize();
```

### 2. System Metrics API

**Endpoint:** `GET /api/metrics/system`

Returns:
```json
{
  "cpu": 45,           // Percentage (0-100)
  "ramUsed": 12.4,     // GB used
  "ramTotal": 32.0,    // GB total
  "diskUsed": 842,     // GB used
  "diskTotal": 2000,   // GB total
  "timestamp": 1234567890
}
```

### 3. Network Metrics API

**Endpoint:** `GET /api/metrics/network`

Returns:
```json
{
  "downloadSpeed": 45.2,    // Mbps
  "uploadSpeed": 12.8,      // Mbps
  "timestamp": 1234567890
}
```

### 4. Client-Side Polling

Components fetch metrics every 1.5-2 seconds:

```typescript
$effect(() => {
  fetchMetrics();
  const interval = setInterval(fetchMetrics, 2000);
  return () => clearInterval(interval);
});
```

## Troubleshooting

### App Status Not Updating

**Cause:** Apps are not reachable from the container

**Solutions:**
1. Check network connectivity from container: `docker exec zamos-dashboard curl -I <app-url>`
2. Use host.docker.internal instead of localhost for apps on the host
3. Ensure apps are on the same Docker network if containerized
4. Check firewall rules

### Metrics Show Container Resources Instead of Host

**Cause:** Host volumes not mounted correctly

**Solutions:**
1. Verify volumes are mounted: `docker exec zamos-dashboard ls -la /proc`
2. Ensure privileged mode is enabled
3. Restart container after modifying docker-compose.yml: `docker-compose restart`

### Network Stats Not Updating

**Cause:** Network interface not detected or no traffic

**Solutions:**
1. Check available interfaces: `docker exec zamos-dashboard cat /proc/net/dev`
2. The first active interface is used by default
3. Generate some network traffic to see stats change
4. Network stats are calculated as deltas between polling intervals

### Permission Denied Errors

**Cause:** Insufficient container permissions

**Solutions:**
1. Use `privileged: true` mode
2. Alternatively, add specific capabilities:
   ```yaml
   cap_add:
     - SYS_ADMIN
     - NET_ADMIN
     - SYS_RAWIO
   ```

## Security Considerations

### Privileged Mode Risks

Running with `privileged: true` gives the container nearly full access to the host:

- ✅ **Acceptable for home servers** - If you control the hardware
- ⚠️ **Use with caution** - Only run trusted code
- ❌ **Not recommended for production** - In multi-tenant environments

### Alternative: Limited Capabilities

If you want to reduce risk, use specific capabilities instead:

```yaml
services:
  zamos:
    # Remove: privileged: true
    cap_add:
      - SYS_ADMIN    # Access to /sys
      - NET_ADMIN    # Network statistics
    volumes:
      - /proc:/proc:ro
      - /sys:/sys:ro
      - /:/rootfs:ro
```

**Note:** Some features may not work without `privileged: true`.

## Performance Impact

The monitoring system is designed to be lightweight:

- **CPU overhead:** < 1% (polling every 2 seconds)
- **Memory overhead:** ~5-10MB for systeminformation library
- **Network overhead:** Negligible (local API calls only)
- **Disk I/O:** Read-only access to virtual filesystems

## Alternative Approaches

If you don't want to use privileged mode or host mounts:

### 1. Host-Side Agent
Run a separate monitoring agent on the host that exposes metrics via HTTP:
- Prometheus Node Exporter
- Netdata
- Telegraf

zamOS would then query this external agent instead of reading directly.

### 2. Docker Stats API
Use Docker's own stats API for container-specific metrics:
```bash
docker stats --no-stream --format json
```

**Limitation:** Only shows container resources, not host resources.

### 3. SSH/Remote Execution
SSH into the host and execute commands:
- Requires SSH key setup
- Higher latency
- More complex error handling

## Recommended Setup

For a home server dashboard, the current setup (privileged + host mounts) is recommended because:

1. ✅ Most accurate host metrics
2. ✅ No external dependencies
3. ✅ Real-time updates
4. ✅ Simple configuration
5. ✅ Works offline

For production/cloud environments, consider using a dedicated monitoring solution like Prometheus + Grafana.

## Testing Metrics

### Verify System Metrics
```bash
# From host
curl http://localhost:3000/api/metrics/system | jq

# Expected output:
# {
#   "cpu": 45,
#   "ram": 68,
#   "disk": 42,
#   "temperature": 52,
#   "timestamp": 1234567890
# }
```

### Verify Network Metrics
```bash
curl http://localhost:3000/api/metrics/network | jq

# Expected output:
# {
#   "downloadSpeed": 45.2,
#   "uploadSpeed": 12.8,
#   "timestamp": 1234567890
# }
```

### Check App Status
```bash
curl -X POST http://localhost:3000/api/apps/status \
  -H "Content-Type: application/json" \
  -d '{"url":"http://localhost:8080"}' | jq

# Expected output:
# {
#   "url": "http://localhost:8080",
#   "status": "online",
#   "responseTime": 45,
#   "timestamp": 1234567890
# }
```

### Generate Load for Testing
```bash
# CPU load
stress --cpu 4 --timeout 30s

# Network traffic
curl -O https://speed.hetzner.de/100MB.bin

# Disk I/O
dd if=/dev/zero of=/tmp/test.img bs=1M count=1000
```

## Further Reading

- [systeminformation Documentation](https://systeminformation.io/)
- [Docker Security Best Practices](https://docs.docker.com/engine/security/)
- [Linux /proc Filesystem](https://www.kernel.org/doc/html/latest/filesystems/proc.html)
- [Linux /sys Filesystem](https://www.kernel.org/doc/html/latest/admin-guide/sysfs-rules.html)