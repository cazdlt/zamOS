# App Icons and Status Guide

This guide explains how to use icons and how app status checking works in zamOS.

## Icon Support

zamOS supports two types of icons for applications:

### 1. Emoji Icons (Recommended for Simplicity)

The easiest way to add an icon is to use an emoji:

```
🎬  Plex
🏠  Home Assistant
☁️  Nextcloud
🛡️  Pi-hole
🐳  Portainer
📺  Jellyfin
📊  Grafana
🔔  Uptime Kuma
📝  Paperless-ngx
🎵  Navidrome
📚  Calibre
🔐  Vaultwarden
🌐  Nginx Proxy Manager
📡  Transmission
```

**How to use:**
1. In the "Add/Edit App" modal, paste an emoji directly into the "Icon" field
2. The emoji will be displayed at 64px size in the app card

**Tips:**
- Use single emoji only (no combinations)
- Emojis will look different on different devices/browsers
- They scale perfectly at any size

### 2. Image URL Icons (For Custom/Branded Icons)

For more professional or branded looks, you can use image URLs:

**Supported formats:**
- Full URLs: `https://example.com/icons/plex.png`
- Absolute paths: `/icons/plex.svg`
- CDN links: `https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/plex.png`

**How to use:**
1. Host your icon image somewhere accessible
2. Paste the full URL into the "Icon" field
3. The image will be displayed at 64x64px in the app card

**Recommendations:**
- Use PNG or SVG formats
- Square images work best (1:1 aspect ratio)
- Recommended size: 128x128px or larger
- Ensure images are publicly accessible from your network

**Popular icon sources:**
- [Dashboard Icons](https://github.com/walkxcode/dashboard-icons) - 1000+ service icons
  ```
  https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/plex.png
  https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/svg/homeassistant.svg
  ```
- [Simple Icons](https://simpleicons.org/) - Brand icons as SVG
- [Homer Icons](https://github.com/NX211/homer-icons) - Service icons collection
- Your own hosted images

## App Status Checking

zamOS automatically checks if your applications are online by pinging their URLs.

### How It Works

1. **Automatic Checking**: Every app's URL is pinged every 30 seconds
2. **GET Request**: A simple HTTP GET request is sent to the app's URL
3. **Status Determination**:
   - **Online (Green)**: HTTP 2xx or 3xx response received
   - **Offline (Red)**: Connection failed, timeout, or error response
   - **Checking (Yellow)**: Status check in progress

4. **Response Time**: For online apps, the response time in milliseconds is displayed

### Status Indicators

- 🟢 **Online (123ms)** - App is reachable and responding
- 🔴 **Offline** - App is not reachable or returned an error
- 🟡 **Checking...** - Status check in progress

### URL Requirements

For status checking to work properly:

1. **Use full URLs**: `http://192.168.1.10:8080` not just `192.168.1.10:8080`
2. **Include protocol**: Always start with `http://` or `https://`
3. **Accessible from container**: The URL must be reachable from inside the Docker container

### Docker Networking Tips

When running zamOS in Docker, use these URL patterns:

#### Apps on the Same Docker Network
```
http://plex:32400
http://homeassistant:8123
```
Use the container name as the hostname if apps are on the same Docker network.

#### Apps on the Host Machine
```
http://host.docker.internal:8080
http://172.17.0.1:8080
```
- Use `host.docker.internal` (Docker Desktop)
- Or use the Docker bridge IP (usually `172.17.0.1`)
- Avoid `localhost` - it refers to the container, not the host

#### Apps on Network
```
http://192.168.1.10:8080
http://server.local:3000
```
Use the actual IP address or hostname on your network.

### Troubleshooting Status Checks

#### App Shows Offline But Works in Browser

**Possible causes:**
1. **Network isolation**: Container can't reach the app
   - Solution: Use correct hostname/IP for Docker networking
   
2. **Firewall blocking**: Host firewall blocks container
   - Solution: Allow Docker network in firewall rules
   
3. **SSL/Certificate issues**: HTTPS sites with invalid certs
   - Solution: Use HTTP if possible, or fix certificates

4. **Authentication required**: App requires login
   - Solution: Some apps will still return 200/401 (counted as online)

#### Status Check is Slow

**Possible causes:**
1. **Timeout**: App takes >5 seconds to respond
   - Default timeout: 5 seconds
   - Apps responding slower are marked offline

2. **DNS resolution**: Hostname takes time to resolve
   - Solution: Use IP addresses instead

#### Testing URLs from Container

Check if a URL is reachable from inside the container:

```bash
# Test connectivity
docker exec zamos-dashboard curl -I http://192.168.1.10:8080

# Test with timeout
docker exec zamos-dashboard curl -I --max-time 5 http://app:8080
```

If this fails, zamOS won't be able to check status either.

## Examples

### Using Emoji Icon
```
Name: Plex
Description: Media Server
Icon: 🎬
URL: http://192.168.1.10:32400
```

### Using Image URL Icon
```
Name: Plex
Description: Media Server
Icon: https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/plex.png
URL: http://plex:32400
```

### Using Local Path Icon
```
Name: Custom App
Description: My Application
Icon: /static/icons/myapp.png
URL: http://host.docker.internal:3000
```

## Best Practices

1. **Consistent Icon Style**: Use all emojis or all image URLs for visual consistency
2. **Test URLs First**: Verify app URLs work before adding to dashboard
3. **Use HTTPS When Possible**: More secure, but ensure certificates are valid
4. **Monitor Status**: Check the dashboard regularly to spot offline apps
5. **Descriptive Names**: Use clear, recognizable names for quick identification
6. **Keep URLs Updated**: Update URLs if you change ports or hostnames

## API Reference

### Check App Status Programmatically

**Endpoint:** `POST /api/apps/status`

**Request:**
```json
{
  "url": "http://192.168.1.10:8080"
}
```

**Response (Success):**
```json
{
  "url": "http://192.168.1.10:8080",
  "status": "online",
  "responseTime": 45,
  "timestamp": 1234567890
}
```

**Response (Failure):**
```json
{
  "url": "http://192.168.1.10:8080",
  "status": "offline",
  "responseTime": 0,
  "timestamp": 1234567890
}
```

## Security Considerations

1. **Public Icons**: Using CDN URLs means external requests from your browser
2. **Private Icons**: Host icons locally if privacy is a concern
3. **URL Exposure**: App URLs are visible in the UI - ensure network security
4. **Status Checks**: Regular pings to apps - minimal but present network overhead

## Future Enhancements

Potential improvements being considered:

- [ ] Configurable status check intervals
- [ ] Custom timeout values per app
- [ ] Health check endpoints (beyond simple GET)
- [ ] Status history/uptime tracking
- [ ] Notification on status changes
- [ ] Icon library browser in the UI
- [ ] Bulk icon updates