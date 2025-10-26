# Changelog

All notable changes to zamOS will be documented in this file.

## [Unreleased]

### Added

#### Real System Monitoring in Docker
- **True host metrics monitoring** when running in Docker containers
- Configured Docker Compose with privileged mode and volume mounts (`/proc`, `/sys`, `/rootfs`)
- System metrics now show real host CPU, RAM, and disk usage (not just container stats)
- Metrics API endpoints:
  - `GET /api/metrics/system` - CPU %, RAM (GB), Disk (GB)
  - `GET /api/metrics/network` - Download/Upload speeds (Mbps)

#### App Status Checking
- **Real-time app status** by pinging URLs with GET requests
- Apps automatically checked every 30 seconds
- Status indicators:
  - 🟢 Online (with response time in ms)
  - 🔴 Offline
  - 🟡 Checking...
- Status endpoint: `POST /api/apps/status` with JSON body `{"url": "..."}`
- 5-second timeout for status checks
- Handles network failures, timeouts, and HTTP errors gracefully

#### Enhanced Icon Support
- **Emoji icons**: Use any emoji (🎬, 🏠, ☁️, etc.)
- **Image URL icons**: Support for full URLs, CDN links, and local paths
  - Example: `https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/plex.png`
- Icon preview in Add/Edit modal
- Auto-detection of icon type (emoji vs URL)
- Icons displayed at 64x64px in app cards

#### UI Improvements
- **Smaller, more compact cards** for metrics and apps
- **Two-column layout** for metrics section on larger screens
- System Status (3 cards) and Network Activity (2 cards) side-by-side
- Reduced padding and font sizes throughout
- Improved visual hierarchy with section headings

### Changed

#### Metrics Display
- **RAM**: Changed from percentage to actual usage (e.g., "12.4 GB / 32.0 GB")
- **Disk**: Changed from percentage to actual usage (e.g., "842 GB / 2000 GB")
- **CPU**: Still displayed as percentage (0-100%)
- **Removed**: Temperature monitoring (unreliable in Docker)
- **Removed**: Total network upload/download stats (simplified to speeds only)

#### App Management
- Removed manual status field from Add/Edit modal
- Status is now determined automatically by URL pinging
- Apps are checked continuously in the background
- Response time displayed for online apps

#### Technical Stack
- Added `systeminformation` package (v5.21.20) for system metrics
- Updated Docker Compose configuration for host monitoring
- Improved API error handling and fallbacks
- Better TypeScript types throughout

### Fixed
- Import statements for `systeminformation` (using `import * as si`)
- Accessibility warnings in modal backdrop
- Unused variable warnings in error handlers
- Apps state management using `$derived` instead of `$state` + `$effect`

### Documentation

#### New Documentation Files
- `docs/DOCKER_MONITORING.md` - Complete guide to Docker host monitoring
  - Volume mount explanations
  - Troubleshooting guide
  - Security considerations
  - Performance impact analysis
  - Testing and verification steps

- `docs/APP_ICONS.md` - Guide to using icons and app status
  - Emoji icon usage
  - Image URL icon sources and recommendations
  - App status checking internals
  - Docker networking tips
  - Troubleshooting connectivity issues
  - API reference for status checking

### Security
- Docker privileged mode required for full host metrics access
- Alternative: Limited capabilities (SYS_ADMIN, NET_ADMIN) for reduced risk
- Status checks use 5-second timeout to prevent hanging
- Icons from external URLs may expose network requests

### Performance
- Metrics polling: Every 2 seconds (system), 1.5 seconds (network)
- App status checks: Every 30 seconds per app
- CPU overhead: <1% for monitoring
- Memory overhead: ~5-10MB for systeminformation library

## [0.0.1] - Initial Release

### Added
- SvelteKit-based dashboard application
- System metrics display (CPU, RAM, Disk, Temperature - dummy data)
- Network statistics (Download/Upload speeds and totals - dummy data)
- Application management (CRUD operations)
- SQLite database with Drizzle ORM
- Docker containerization with multi-stage builds
- Tailwind CSS v4 styling with glass-morphism effects
- 6 pre-seeded applications:
  - Plex
  - Home Assistant
  - Nextcloud
  - Pi-hole
  - Portainer
  - Jellyfin

### Technical Features
- @sveltejs/adapter-node for production builds
- SQLite with WAL journaling mode
- Data persistence via Docker volumes
- Responsive design (mobile, tablet, desktop)
- Real-time UI updates with Svelte 5 runes
- Glass-morphism UI components
- Add/Edit/Delete app functionality

---

## Migration Guide

### From Dummy to Real Metrics

If you were running an earlier version with dummy metrics:

1. **Update docker-compose.yml**:
   ```bash
   docker-compose down
   # Update docker-compose.yml with new volume mounts
   docker-compose up -d
   ```

2. **Verify metrics**:
   ```bash
   curl http://localhost:3000/api/metrics/system | jq
   curl http://localhost:3000/api/metrics/network | jq
   ```

3. **Update app icons** (optional):
   - Edit each app in the UI
   - Replace emoji with image URLs if desired
   - Or keep existing emoji icons

4. **Check app URLs**:
   - Ensure URLs are reachable from Docker container
   - Use `host.docker.internal` for apps on host
   - Test with: `docker exec zamos-dashboard curl -I <app-url>`

### Breaking Changes
- None (fully backward compatible)
- Existing apps will continue to work
- Status will be automatically checked for existing apps

---

## Roadmap

### Planned Features
- [ ] User authentication and access control
- [ ] Configurable status check intervals
- [ ] Custom timeout values per app
- [ ] Health check endpoints (beyond simple GET)
- [ ] Status history/uptime tracking
- [ ] Notification on status changes
- [ ] Icon library browser in the UI
- [ ] Bulk icon updates
- [ ] App categories/groups
- [ ] Drag-and-drop dashboard customization
- [ ] Dark/light theme toggle
- [ ] System alerts and notifications
- [ ] Docker container management integration
- [ ] Backup/restore configuration

### Under Consideration
- Multi-user support
- LDAP/OAuth integration
- Mobile app (PWA)
- Widget system for custom metrics
- Plugin architecture for extensions
- Kubernetes support

---

## Contributors

- Andres Zamora (@zamora) - Creator and maintainer

## License

[Add license information here]