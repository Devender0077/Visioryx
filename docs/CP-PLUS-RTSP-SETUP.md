# CP Plus DVR – RTSP Setup for Visioryx

## Your Device

- **Model:** CP-UVR-0801E1-CV4 (8-channel DVR)
- **IP:** 192.168.0.3
- **Username:** admin
- **Password:** avks@2605 *(encode @ as %40 in RTSP URL)*

---

## RTSP URL (from DVR Port settings)

Format from your DVR: `rtsp://<Username>:<Password>@<IP Address>:<Port>/cam/realmonitor?channel=1&subtype=0`

**Use this exact URL** (password `@` → `%40`):

```
rtsp://admin:avks%402605@192.168.0.3:554/cam/realmonitor?channel=1&subtype=0
```

**Other channels** (channel 2, 3, etc.):

```
rtsp://admin:avks%402605@192.168.0.3:554/cam/realmonitor?channel=2&subtype=0
rtsp://admin:avks%402605@192.168.0.3:554/cam/realmonitor?channel=3&subtype=0
```

- **channel:** 1–8 (camera channel)
- **subtype:** 0 = main stream, 1 = sub stream

> **Note:** If your password contains `@`, `:`, or `/`, encode them in the URL: `@` → `%40`, `:` → `%3A`, `/` → `%2F`

---

## Add in Visioryx

1. Open **Cameras** in the dashboard.
2. Click **Add Camera**.
3. Enter:
   - **Camera Name:** Office Cam 1
   - **RTSP URL:** one of the URLs above (copy exactly, including `%40`)

4. Go to **Live Monitoring** → **Start Stream**.

---

## Test with VLC

1. Open VLC → Media → Open Network Stream.
2. Paste the RTSP URL.
3. If it plays, use the same URL in Visioryx.

---

## Find the Exact Path in KVMS Pro

1. In KVMS Pro, select device `192.168.0.3`.
2. Click **Link to WEB** to open the DVR web interface.
3. Go to **Network** → look for RTSP port (often 554).
4. Go to **Camera** → look for stream path or RTSP settings.
5. Check the manual for your model for the exact RTSP path.

---

## Remote Access (Cameras at Office, You at Home)

**RTSP uses local IPs (192.168.x.x)** — they are not reachable from the internet. To view cameras remotely:

1. **Deploy Visioryx at the office** — Run the backend on a machine on the same network as the DVR (e.g. 192.168.0.x). Then:
   - Access the dashboard from home via **VPN** to the office network, or
   - Expose the dashboard (port 3000) and API (port 8000) through a reverse proxy with HTTPS and strong auth.

2. **VPN from home** — Connect to the office VPN. Your home PC will appear on the office network. Run Visioryx locally; RTSP URLs will work because you're effectively on the same network.

3. **Port forwarding** (not recommended) — Forward RTSP port 554 from the DVR to a public IP. Security risk; use only with caution.

**Summary:** The Visioryx backend must be able to reach the DVR's IP. Deploy at the office or use VPN.

---

## Network Checklist

- [ ] Visioryx backend and DVR are on the same network (or reachable).
- [ ] Firewall allows port 554 (RTSP) to 192.168.0.3.
- [ ] If using Docker, the container can reach 192.168.0.3.

---

## Troubleshooting: Black Screen / No Feed

### 401 Unauthorized (check terminal logs)

If you see `method OPTIONS failed: 401 Unauthorized` or `Camera X: failed to open rtsp://...`:

1. **Verify credentials** – The DVR is rejecting the username/password.
2. **Test in VLC first** – Open VLC → Media → Open Network Stream → paste your RTSP URL. If VLC fails, fix the URL/credentials.
3. **Try alternate password** – If your DVR web login uses `avks@2605`, use `avks%402605` in the RTSP URL (encode `@` as `%40`):
   ```
   rtsp://admin:avks%402605@192.168.0.3:554/cam/realmonitor?channel=1&subtype=0
   ```
4. **Confirm in KVMS PRO** – Use the same credentials that work in the DVR web interface or KVMS PRO.

### OpenCV "Couldn't read video stream"

- Ensure backend and DVR are on the same network (e.g. both on 192.168.0.x).
- Ping the DVR: `ping 192.168.0.3`
- Try a different RTSP path from the list above (e.g. `/stream1` or `/VideoInput/1/mpeg4/1`).
