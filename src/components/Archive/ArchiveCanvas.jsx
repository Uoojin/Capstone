import { useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase.js';
import './ArchiveCanvas.css';

async function incrementSyncInDB(id) {
  if (!id) return;
  try {
    const { error } = await supabase.rpc('increment_artifact_sync', { artifact_id: id });
    if (error) throw error;
  } catch (rpcErr) {
    try {
      const { data } = await supabase.from('artifacts').select('sync_count').eq('id', id).single();
      const current = data?.sync_count || 0;
      await supabase.from('artifacts').update({ sync_count: current + 1 }).eq('id', id);
    } catch (updateErr) {
      console.warn('Sync update failed:', rpcErr || updateErr);
    }
  }
}

function formatSyncCount(count) {
  if (!count || count < 0) return '0';
  if (count < 1000) return `${count}`;
  return `${(count / 1000).toFixed(1).replace(/\.0$/, '')}K`;
}

function formatDate(dateString) {
  if (!dateString) return '';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return '';
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yy}.${mm}.${dd}`;
}

function getCroppedImageUrl(imgElement) {
  if (!imgElement || !imgElement.complete) return imgElement?.src || '';
  try {
    const tempCanvas = document.createElement('canvas');
    const w = imgElement.naturalWidth || imgElement.width;
    const h = imgElement.naturalHeight || imgElement.height;
    tempCanvas.width = w;
    tempCanvas.height = h;

    const ctx = tempCanvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(imgElement, 0, 0);

    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;

    let minX = w, minY = h, maxX = 0, maxY = 0;
    let found = false;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const alpha = data[(y * w + x) * 4 + 3];
        if (alpha > 15) {
          found = true;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    if (!found) return imgElement.src;

    const pad = 12;
    minX = Math.max(0, minX - pad);
    minY = Math.max(0, minY - pad);
    maxX = Math.min(w, maxX + pad);
    maxY = Math.min(h, maxY + pad);

    const cropW = maxX - minX;
    const cropH = maxY - minY;

    const croppedCanvas = document.createElement('canvas');
    croppedCanvas.width = cropW;
    croppedCanvas.height = cropH;
    croppedCanvas.getContext('2d').drawImage(
      tempCanvas,
      minX, minY, cropW, cropH,
      0, 0, cropW, cropH
    );

    return croppedCanvas.toDataURL();
  } catch {
    return imgElement.src;
  }
}

// ----------------------------------------------------------------------------
class Artifact {
  constructor(id, x, y, imgElement, color, message, createdAt, syncCount) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.imgElement = imgElement;
    this.color = color || '#38BDF8';
    this.message = message || '';
    this.createdAt = createdAt || new Date().toISOString();
    this.syncCount = typeof syncCount === 'number' ? syncCount : 0;

    this.directionX = Math.random() < 0.5 ? -1 : 1;
    this.baseSpeed = 2.35 + Math.random() * 0.95;
    this.minSpeed = 2.0 + Math.random() * 0.35;
    this.maxSpeed = 3.45 + Math.random() * 0.35;
    this.vx = this.directionX * this.baseSpeed;

    this.verticalSeed = Math.random() * Math.PI * 2;
    this.verticalStrength = 0.14 + Math.random() * 0.28;
    this.verticalFrequency = 0.38 + Math.random() * 0.34;
    this.vy = (Math.random() - 0.5) * 0.18;

    this.flipX = this.directionX < 0;
    this.releaseEnergy = 0;

    // 최소 크기 200x200 
    this.radius = 100;

    this.scale = 1;
    this.tilt = 0;
    this.clusterCount = 0;

    this.alphaHull = null;
    this.visualDominantColor = this.color;
    this.buildAlphaHull();
  }

  addSync() {
    this.syncCount = (this.syncCount || 0) + 1;
    incrementSyncInDB(this.id);
  }

  buildAlphaHull() {
    try {
      const sampleSize = 72;
      const maskCanvas = document.createElement('canvas');
      maskCanvas.width = sampleSize;
      maskCanvas.height = sampleSize;

      const maskCtx = maskCanvas.getContext('2d', {
        willReadFrequently: true,
      });

      maskCtx.clearRect(0, 0, sampleSize, sampleSize);
      maskCtx.drawImage(this.imgElement, 0, 0, sampleSize, sampleSize);

      const pixels = maskCtx.getImageData(0, 0, sampleSize, sampleSize).data;
      const colorBuckets = new Map();
      const bucketSize = 28;

      for (let i = 0; i < pixels.length; i += 4) {
        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];
        const a = pixels[i + 3];

        if (a < 48) continue;

        const maxC = Math.max(r, g, b);
        const minC = Math.min(r, g, b);
        const brightness = (r + g + b) / 3;
        const saturation = maxC === 0 ? 0 : (maxC - minC) / maxC;

        if (brightness < 58) continue;
        if (brightness < 92 && saturation < 0.18) continue;
        if (r > 242 && g > 242 && b > 242) continue;

        const qr = Math.round(r / bucketSize) * bucketSize;
        const qg = Math.round(g / bucketSize) * bucketSize;
        const qb = Math.round(b / bucketSize) * bucketSize;
        const key = `${qr},${qg},${qb}`;

        const existing = colorBuckets.get(key) || { count: 0, r: 0, g: 0, b: 0 };
        const weight = (a / 255) * (0.9 + saturation * 0.22);
        existing.count += weight;
        existing.r += r * weight;
        existing.g += g * weight;
        existing.b += b * weight;
        colorBuckets.set(key, existing);
      }

      let bestBucket = null;
      for (const bucket of colorBuckets.values()) {
        if (!bestBucket || bucket.count > bestBucket.count) {
          bestBucket = bucket;
        }
      }

      if (bestBucket && bestBucket.count > 0) {
        const r = Math.round(bestBucket.r / bestBucket.count);
        const g = Math.round(bestBucket.g / bestBucket.count);
        const b = Math.round(bestBucket.b / bestBucket.count);
        this.visualDominantColor = `rgb(${r}, ${g}, ${b})`;
      }

      const points = [];
      const alphaThreshold = 24;

      for (let y = 0; y < sampleSize; y++) {
        for (let x = 0; x < sampleSize; x++) {
          const alpha = pixels[(y * sampleSize + x) * 4 + 3];
          if (alpha > alphaThreshold) {
            points.push({ x, y });
          }
        }
      }

      if (points.length < 3) return;

      points.sort((a, b) => (a.x === b.x ? a.y - b.y : a.x - b.x));

      const cross = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);

      const lower = [];
      for (let i = 0; i < points.length; i++) {
        const p = points[i];
        while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
          lower.pop();
        }
        lower.push(p);
      }

      const upper = [];
      for (let i = points.length - 1; i >= 0; i--) {
        const p = points[i];
        while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
          upper.pop();
        }
        upper.push(p);
      }

      lower.pop();
      upper.pop();

      const hull = lower.concat(upper);
      const half = sampleSize / 2;

      this.alphaHull = hull.map((p) => ({
        x: ((p.x + 0.5 - half) / half) * this.radius,
        y: ((p.y + 0.5 - half) / half) * this.radius,
      }));
    } catch {
      this.alphaHull = null;
    }

  }

  getOuterEdgePointToward(targetX, targetY) {
    const worldDX = targetX - this.x;
    const worldDY = targetY - this.y;
    const worldDist = Math.hypot(worldDX, worldDY) || 1;

    const cos = Math.cos(-this.tilt);
    const sin = Math.sin(-this.tilt);

    let localDX = (worldDX / worldDist) * cos - (worldDY / worldDist) * sin;
    let localDY = (worldDX / worldDist) * sin + (worldDY / worldDist) * cos;

    if (this.flipX) localDX *= -1;

    let localX;
    let localY;

    if (this.alphaHull && this.alphaHull.length > 0) {
      let bestPoint = this.alphaHull[0];
      let bestDot = -Infinity;

      for (let i = 0; i < this.alphaHull.length; i++) {
        const p = this.alphaHull[i];
        const dot = p.x * localDX + p.y * localDY;
        if (dot > bestDot) {
          bestDot = dot;
          bestPoint = p;
        }
      }

      localX = bestPoint.x;
      localY = bestPoint.y;
    } else {
      const fallbackRadius = this.radius * 0.82;
      localX = localDX * fallbackRadius;
      localY = localDY * fallbackRadius;
    }

    if (this.flipX) localX *= -1;

    localX *= this.scale;
    localY *= this.scale;

    const forwardCos = Math.cos(this.tilt);
    const forwardSin = Math.sin(this.tilt);

    return {
      x: this.x + localX * forwardCos - localY * forwardSin,
      y: this.y + localX * forwardSin + localY * forwardCos,
    };
  }

  update(bounds, mouseState) {
    const dx = mouseState.x - this.x;
    const dy = mouseState.y - this.y;
    const distSq = dx * dx + dy * dy;
    const distToMouse = Math.sqrt(distSq) || 1;

    if (mouseState.isDown && mouseState.holdProgress > 0.05) {
      const idealOrbit = 160;
      const pullForce = (distToMouse - idealOrbit) * 0.008 * mouseState.holdProgress;

      this.vx += (dx / distToMouse) * pullForce;
      this.vy += (dy / distToMouse) * pullForce;
      this.vx += (-dy / distToMouse) * 0.45 * mouseState.holdProgress;
      this.vy += (dx / distToMouse) * 0.45 * mouseState.holdProgress;
      this.vx *= 0.94;
      this.vy *= 0.94;
      this.angle = Math.atan2(this.vy, this.vx);
      this.targetAngle = this.angle;
    } else {
      const AVOID_RADIUS = 160;

      if (distToMouse < AVOID_RADIUS) {
        const force = (1 - distToMouse / AVOID_RADIUS) * 0.22;
        this.vx -= (dx / distToMouse) * force;
        this.vy -= (dy / distToMouse) * force;
      }

      const desiredVx = this.directionX * this.baseSpeed;
      const horizontalRecovery = this.releaseEnergy > 0.08 ? 0.01 : 0.055;
      this.vx += (desiredVx - this.vx) * horizontalRecovery;

      const now = performance.now() * 0.001;
      const desiredVy = Math.sin(now * this.verticalFrequency + this.verticalSeed) * this.verticalStrength;
      const verticalRecovery = this.releaseEnergy > 0.08 ? 0.008 : 0.03;
      this.vy += (desiredVy - this.vy) * verticalRecovery;

      if (this.releaseEnergy > 0) {
        this.releaseEnergy *= 0.96;
        if (this.releaseEnergy < 0.01) this.releaseEnergy = 0;
      }

      if (Math.abs(this.vx) < this.minSpeed) {
        this.vx += this.directionX * (this.minSpeed - Math.abs(this.vx)) * 0.12;
      }

      const speed = Math.hypot(this.vx, this.vy);
      const allowedMaxSpeed = this.maxSpeed + this.releaseEnergy * 5.0;
      if (speed > allowedMaxSpeed) {
        const ratio = allowedMaxSpeed / speed;
        this.vx *= ratio;
        this.vy *= ratio;
      }
    }

    this.x += this.vx;
    this.y += this.vy;

    const pad = this.radius + 4;
    let bounced = false;

    if (this.x <= pad) {
      this.x = pad;
      this.directionX = 1;
      this.vx = Math.max(Math.abs(this.vx), this.baseSpeed);
      this.flipX = false;
      this.vy += (Math.random() - 0.5) * 0.22;
      bounced = true;
    } else if (this.x >= bounds.width - pad) {
      this.x = bounds.width - pad;
      this.directionX = -1;
      this.vx = -Math.max(Math.abs(this.vx), this.baseSpeed);
      this.flipX = true;
      this.vy += (Math.random() - 0.5) * 0.22;
      bounced = true;
    }

    if (this.y <= pad) {
      this.y = pad;
      this.vy = Math.abs(this.vy);
      bounced = true;
    } else if (this.y >= bounds.height - pad) {
      this.y = bounds.height - pad;
      this.vy = -Math.abs(this.vy);
      bounced = true;
    }

    if (bounced) {
      const horizontalSpeed = Math.max(this.minSpeed, Math.min(this.maxSpeed, Math.abs(this.vx)));
      this.vx = this.directionX * horizontalSpeed;
    }

    if (!mouseState.isDown && this.clusterCount === 0) {
      this.scale += (1 - this.scale) * 0.1;
      this.tilt += (0 - this.tilt) * 0.1;
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.tilt);
    ctx.scale(this.flipX ? -this.scale : this.scale, this.scale);

    const size = Math.max(200, this.radius * 2);

    ctx.drawImage(
      this.imgElement,
      -size / 2,
      -size / 2,
      size,
      size
    );
    ctx.restore();
  }
}

// ---------------------------------------------------------------------------
export default function ArchiveCanvas({ onNavigateToEditor }) {
  const canvasRef = useRef(null);
  const artifactsRef = useRef([]);
  const cameraRef = useRef({ x: 0, y: 0 });
  const activeHoldPairsRef = useRef(new Set());

  const dragStateRef = useRef({
    target: null,
    offsetX: 0,
    offsetY: 0,
    moved: false,
    connected: [],
    lastConnectTime: 0,
    dragVX: 0,
    dragVY: 0,
  });

  const [selectedMessage, setSelectedMessage] = useState(null);

  const mouseStateRef = useRef({
    x: -9999,
    y: -9999,
    screenX: -9999,
    screenY: -9999,
    isDown: false,
    holdProgress: 0,
    downX: 0,
    downY: 0,
    downTime: 0,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);
    let worldWidth = width * 2.15;
    let worldHeight = height * 1.65;

    cameraRef.current.x = Math.max(0, (worldWidth - width) / 2);
    cameraRef.current.y = Math.max(0, (worldHeight - height) / 2);

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      worldWidth = width * 2.15;
      worldHeight = height * 1.65;

      cameraRef.current.x = Math.min(
        Math.max(0, cameraRef.current.x),
        Math.max(0, worldWidth - width)
      );
      cameraRef.current.y = Math.min(
        Math.max(0, cameraRef.current.y),
        Math.max(0, worldHeight - height)
      );
    };

    window.addEventListener('resize', handleResize);

    const getSpreadPosition = () => {
      const pad = 100;
      const existing = artifactsRef.current;

      if (existing.length === 0) {
        return {
          x: Math.random() * Math.max(1, worldWidth - pad * 2) + pad,
          y: Math.random() * Math.max(1, worldHeight - pad * 2) + pad,
        };
      }

      let best = null;
      let bestDistance = -1;

      for (let i = 0; i < 14; i++) {
        const x = Math.random() * Math.max(1, worldWidth - pad * 2) + pad;
        const y = Math.random() * Math.max(1, worldHeight - pad * 2) + pad;
        let nearest = Infinity;

        for (let j = 0; j < existing.length; j++) {
          const item = existing[j];
          const d = Math.hypot(item.x - x, item.y - y);
          if (d < nearest) nearest = d;
        }

        if (nearest > bestDistance) {
          bestDistance = nearest;
          best = { x, y };
        }
      }
      return best;
    };

    const loadArtifacts = async () => {
      const { data, error } = await supabase.from('artifacts').select('*').limit(28);
      if (error) return;

      data.forEach((row) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = row.image_url;

        img.onload = () => {
          const { x, y } = getSpreadPosition();
          artifactsRef.current.push(
            new Artifact(row.id, x, y, img, row.dominant_color, row.message, row.created_at, row.sync_count)
          );
        };
      });
    };

    loadArtifacts();

    const subscription = supabase
      .channel('artifacts_realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'artifacts' },
        (payload) => {
          const row = payload.new;
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.src = row.image_url;

          img.onload = () => {
            const { x, y } = getSpreadPosition();
            artifactsRef.current.push(
              new Artifact(row.id, x, y, img, row.dominant_color, row.message, row.created_at, row.sync_count)
            );
          };
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'artifacts' },
        (payload) => {
          const updated = payload.new;
          const target = artifactsRef.current.find((a) => a.id === updated.id);
          if (target && typeof updated.sync_count === 'number') {
            target.syncCount = updated.sync_count;
            setSelectedMessage((prev) => {
              if (prev && prev.id === target.id) {
                return { ...prev, syncCount: target.syncCount };
              }
              return prev;
            });
          }
        }
      )
      .subscribe();

    let animationId;

    const loop = (currentTime) => {
      const all = artifactsRef.current;
      const mouse = mouseStateRef.current;
      const bounds = { width: worldWidth, height: worldHeight };

      if (!mouse.isDown) {
        const edgeZone = 125;
        const maxCameraSpeed = 7;
        let cameraVX = 0;
        let cameraVY = 0;

        if (mouse.screenX >= 0 && mouse.screenX < edgeZone) {
          cameraVX = -maxCameraSpeed * (1 - mouse.screenX / edgeZone);
        } else if (mouse.screenX > width - edgeZone) {
          cameraVX = maxCameraSpeed * (1 - (width - mouse.screenX) / edgeZone);
        }

        if (mouse.screenY >= 0 && mouse.screenY < edgeZone) {
          cameraVY = -maxCameraSpeed * (1 - mouse.screenY / edgeZone);
        } else if (mouse.screenY > height - edgeZone) {
          cameraVY = maxCameraSpeed * (1 - (height - mouse.screenY) / edgeZone);
        }

        cameraRef.current.x = Math.min(
          Math.max(0, cameraRef.current.x + cameraVX),
          Math.max(0, worldWidth - width)
        );
        cameraRef.current.y = Math.min(
          Math.max(0, cameraRef.current.y + cameraVY),
          Math.max(0, worldHeight - height)
        );

        if (mouse.screenX >= 0 && mouse.screenY >= 0) {
          mouse.x = mouse.screenX + cameraRef.current.x;
          mouse.y = mouse.screenY + cameraRef.current.y;
        }
      }

      if (mouse.isDown) {
        mouse.holdProgress = Math.min(mouse.holdProgress + 0.04, 1);
      } else {
        mouse.holdProgress = Math.max(mouse.holdProgress - 0.08, 0);
        if (mouse.holdProgress <= 0.05) {
          activeHoldPairsRef.current.clear();
        }
      }

      ctx.clearRect(0, 0, width, height);

      ctx.save();
      ctx.translate(-cameraRef.current.x, -cameraRef.current.y);

      for (let i = 0; i < all.length; i++) {
        all[i].clusterCount = 0;
      }

      const AUTO_SYNC_DIST = 210;
      const AUTO_SYNC_DIST_SQ = AUTO_SYNC_DIST * AUTO_SYNC_DIST;
      const HOLD_NETWORK_DIST = 300;
      const HOLD_NETWORK_DIST_SQ = HOLD_NETWORK_DIST * HOLD_NETWORK_DIST;

      const networkLines = [];
      const sparkDots = [];

      for (let i = 0; i < all.length; i++) {
        const a = all[i];

        for (let j = i + 1; j < all.length; j++) {
          const b = all[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const distSq = dx * dx + dy * dy;

          const separationDistance = mouse.holdProgress > 0.05 ? 172 : 138;
          const separationDistSq = separationDistance * separationDistance;

          if (distSq > 0 && distSq < separationDistSq) {
            const dist = Math.sqrt(distSq);
            const overlap = separationDistance - dist;
            const nx = dx / dist;
            const ny = dy / dist;

            const separationForce =
              mouse.holdProgress > 0.05
                ? overlap * 0.042 * Math.max(0.35, mouse.holdProgress)
                : overlap * 0.0072;

            a.vx -= nx * separationForce;
            a.vy -= ny * separationForce;
            b.vx += nx * separationForce;
            b.vy += ny * separationForce;
          }

          if (mouse.holdProgress > 0.05) {
            if (distSq < HOLD_NETWORK_DIST_SQ && distSq > 4900) {
              networkLines.push(a.x, a.y, b.x, b.y);

              const pairKey = a.id && b.id
                ? (a.id < b.id ? `${a.id}_${b.id}` : `${b.id}_${a.id}`)
                : `${i}_${j}`;

              if (!activeHoldPairsRef.current.has(pairKey)) {
                activeHoldPairsRef.current.add(pairKey);
                a.addSync();
                b.addSync();
              }

              if ((i + j) % 3 === 0) {
                const dist = Math.sqrt(distSq);
                const strength = (1 - dist / HOLD_NETWORK_DIST) * mouse.holdProgress;

                if (strength > 0.4) {
                  const flow = (Math.sin(currentTime * 0.003 + i) + 1) * 0.5;
                  sparkDots.push(a.x + dx * flow, a.y + dy * flow);
                }
              }
            }
          } else {
            if (distSq < AUTO_SYNC_DIST_SQ && distSq > 5600) {
              a.clusterCount++;
              b.clusterCount++;

              const dist = Math.sqrt(distSq);
              const strength = 1 - dist / AUTO_SYNC_DIST;
              const motionType = (i + j) % 3;

              if (motionType === 0) {
                const flow = (Math.sin(currentTime * 0.0035 + i) + 1) * 0.5;
                sparkDots.push(a.x + dx * flow, a.y + dy * flow);
              } else if (motionType === 2) {
                const breath = Math.sin(currentTime * 0.004) * 0.06 * strength;
                a.scale = 1 + breath;
                b.scale = 1 + breath;
                a.tilt = Math.sin(currentTime * 0.003) * 0.08 * strength;
                b.tilt = -a.tilt;
              }
            }
          }
        }
      }

      if (mouse.holdProgress <= 0.05 && !dragStateRef.current.target && all.length > 0) {
        const worldCenterX = worldWidth * 0.5;
        const worldCenterY = worldHeight * 0.5;

        let centerOfMassX = 0;
        let centerOfMassY = 0;

        for (let i = 0; i < all.length; i++) {
          centerOfMassX += all[i].x;
          centerOfMassY += all[i].y;
        }

        centerOfMassX /= all.length;
        centerOfMassY /= all.length;

        const balanceX = worldCenterX - centerOfMassX;
        const balanceY = worldCenterY - centerOfMassY;

        if (Math.abs(balanceX) > worldWidth * 0.055) {
          const signX = Math.sign(balanceX);
          const strengthX = Math.min(0.018, Math.abs(balanceX) * 0.000045);

          for (let i = 0; i < all.length; i++) {
            const item = all[i];
            const onCrowdedSide = signX > 0 ? item.x < worldCenterX : item.x > worldCenterX;
            if (onCrowdedSide) {
              const variation = 0.72 + ((i * 37) % 29) / 100;
              item.vx += signX * strengthX * variation;
            }
          }
        }

        if (Math.abs(balanceY) > worldHeight * 0.065) {
          const signY = Math.sign(balanceY);
          const strengthY = Math.min(0.014, Math.abs(balanceY) * 0.00004);

          for (let i = 0; i < all.length; i++) {
            const item = all[i];
            const onCrowdedSide = signY > 0 ? item.y < worldCenterY : item.y > worldCenterY;
            if (onCrowdedSide) {
              const variation = 0.7 + ((i * 23) % 31) / 100;
              item.vy += signY * strengthY * variation;
            }
          }
        }

        const camX = cameraRef.current.x;
        const camY = cameraRef.current.y;
        const viewMargin = 70;
        const visibleItems = [];
        const outsideItems = [];

        for (let i = 0; i < all.length; i++) {
          const item = all[i];
          const inside =
            item.x >= camX - viewMargin &&
            item.x <= camX + width + viewMargin &&
            item.y >= camY - viewMargin &&
            item.y <= camY + height + viewMargin;

          if (inside) visibleItems.push(item);
          else outsideItems.push(item);
        }

        const minimumVisible = Math.min(5, Math.max(3, Math.ceil(all.length * 0.16)));

        if (visibleItems.length < minimumVisible) {
          const viewCenterX = camX + width * 0.5;
          const viewCenterY = camY + height * 0.5;

          outsideItems.sort((a, b) => {
            const da = Math.hypot(a.x - viewCenterX, a.y - viewCenterY);
            const db = Math.hypot(b.x - viewCenterX, b.y - viewCenterY);
            return da - db;
          });

          const needed = Math.min(minimumVisible - visibleItems.length, outsideItems.length);

          for (let i = 0; i < needed; i++) {
            const item = outsideItems[i];
            const slotX = 0.22 + (((i * 53 + all.indexOf(item) * 19) % 57) / 100);
            const slotY = 0.2 + (((i * 41 + all.indexOf(item) * 23) % 60) / 100);

            const targetX = camX + width * slotX;
            const targetY = camY + height * slotY;
            const dx = targetX - item.x;
            const dy = targetY - item.y;
            const dist = Math.hypot(dx, dy) || 1;

            const pull = Math.min(0.028, dist * 0.000035);
            item.vx += (dx / dist) * pull;
            item.vy += (dy / dist) * pull;
          }
        }
      }

      const draggedArtifact = dragStateRef.current.target;

      if (draggedArtifact) {
        const dragState = dragStateRef.current;
        const DRAG_SYNC_DIST = 292;
        const JOIN_INTERVAL = 125;
        const currentGroup = [draggedArtifact, ...dragState.connected];

        if (currentTime - dragState.lastConnectTime > JOIN_INTERVAL) {
          let bestCandidate = null;
          let bestParent = null;
          let bestDistance = Infinity;

          for (let i = 0; i < all.length; i++) {
            const other = all[i];
            if (other === draggedArtifact || dragState.connected.includes(other)) continue;

            for (let j = 0; j < currentGroup.length; j++) {
              const parent = currentGroup[j];
              const distance = Math.hypot(other.x - parent.x, other.y - parent.y);
              if (distance < DRAG_SYNC_DIST && distance < bestDistance) {
                bestCandidate = other;
                bestParent = parent;
                bestDistance = distance;
              }
            }
          }

          if (bestCandidate && bestParent) {
            bestCandidate._dragParent = bestParent;
            bestCandidate._dragJoinedAt = currentTime;
            bestCandidate._dragRestDistance = Math.max(158, Math.min(230, bestDistance));
            dragState.connected.push(bestCandidate);
            dragState.lastConnectTime = currentTime;

            draggedArtifact.addSync();
            bestCandidate.addSync();
          }
        }

        const dragGroup = [draggedArtifact, ...dragState.connected];
        let avgVX = 0;
        let avgVY = 0;

        for (let i = 0; i < dragGroup.length; i++) {
          avgVX += dragGroup[i].vx || 0;
          avgVY += dragGroup[i].vy || 0;
        }

        avgVX /= Math.max(1, dragGroup.length);
        avgVY /= Math.max(1, dragGroup.length);

        const sharedVX = avgVX + Math.max(-2.2, Math.min(2.2, dragState.dragVX * 0.16));
        const sharedVY = avgVY + Math.max(-1.45, Math.min(1.45, dragState.dragVY * 0.13));

        for (let i = 0; i < dragState.connected.length; i++) {
          const item = dragState.connected[i];
          const parent = item._dragParent || draggedArtifact;

          item.vx += (sharedVX - item.vx) * 0.032;
          item.vy += (sharedVY - item.vy) * 0.028;

          const dx = parent.x - item.x;
          const dy = parent.y - item.y;
          const dist = Math.hypot(dx, dy) || 1;
          const rest = item._dragRestDistance || 190;

          if (dist > rest + 24) {
            const pull = Math.min(0.34, (dist - rest) * 0.0038);
            item.vx += (dx / dist) * pull;
            item.vy += (dy / dist) * pull;
          }

          if (dist < 132) {
            const push = (132 - dist) * 0.0028;
            item.vx -= (dx / dist) * push;
            item.vy -= (dy / dist) * push;
          }
        }

        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        for (let i = 0; i < dragState.connected.length; i++) {
          const item = dragState.connected[i];
          const parent = item._dragParent || draggedArtifact;

          const dx = item.x - parent.x;
          const dy = item.y - parent.y;
          const dist = Math.hypot(dx, dy) || 1;
          const nx = dx / dist;
          const ny = dy / dist;

          const parentEdge = parent.getOuterEdgePointToward(item.x, item.y);
          const itemEdge = item.getOuterEdgePointToward(parent.x, parent.y);

          const startX = parentEdge.x;
          const startY = parentEdge.y;
          const finalEndX = itemEdge.x;
          const finalEndY = itemEdge.y;

          const rawProgress = Math.max(
            0,
            Math.min(1, (currentTime - (item._dragJoinedAt || currentTime)) / 420)
          );
          const progress = 1 - Math.pow(1 - rawProgress, 3);

          const endX = startX + (finalEndX - startX) * progress;
          const endY = startY + (finalEndY - startY) * progress;
          const midX = (startX + endX) * 0.5;
          const midY = (startY + endY) * 0.5;

          const curve =
            Math.sin(currentTime * 0.00115 + i * 1.45) * Math.min(7.5, dist * 0.022);
          const controlX = midX + -ny * curve;
          const controlY = midY + nx * curve;

          const parentLineColor = parent.visualDominantColor || parent.color || '#7DD3FC';
          const itemLineColor = item.visualDominantColor || item.color || '#A5B4FC';

          const connectionGradient = ctx.createLinearGradient(startX, startY, finalEndX, finalEndY);
          connectionGradient.addColorStop(0, parentLineColor);
          connectionGradient.addColorStop(1, itemLineColor);

          ctx.save();
          ctx.globalAlpha = 0.024 + progress * 0.026;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.shadowBlur = 7;
          ctx.shadowColor = 'rgba(255, 255, 255, 0.14)';
          ctx.beginPath();
          ctx.moveTo(startX, startY);
          ctx.quadraticCurveTo(controlX, controlY, endX, endY);
          ctx.strokeStyle = connectionGradient;
          ctx.lineWidth = 4.2;
          ctx.stroke();
          ctx.restore();

          ctx.save();
          ctx.globalAlpha = 0.12 + progress * 0.07;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.beginPath();
          ctx.moveTo(startX, startY);
          ctx.quadraticCurveTo(controlX, controlY, endX, endY);
          ctx.strokeStyle = connectionGradient;
          ctx.lineWidth = 1.55;
          ctx.stroke();
          ctx.restore();

          ctx.save();
          ctx.globalAlpha = 0.17 + progress * 0.06;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.beginPath();
          ctx.moveTo(startX, startY);
          ctx.quadraticCurveTo(controlX, controlY, endX, endY);
          ctx.strokeStyle = connectionGradient;
          ctx.lineWidth = 0.62;
          ctx.stroke();
          ctx.restore();
        }

        ctx.restore();

        const dragBreath = Math.sin(currentTime * 0.0036) * 0.012;
        for (let i = 0; i < dragGroup.length; i++) {
          const item = dragGroup[i];
          item.scale = Math.max(
            item.scale,
            (item === draggedArtifact ? 1.055 : 1.012) + dragBreath
          );
        }
      }

      if (networkLines.length > 0) {
        ctx.beginPath();
        for (let i = 0; i < networkLines.length; i += 4) {
          ctx.moveTo(networkLines[i], networkLines[i + 1]);
          ctx.lineTo(networkLines[i + 2], networkLines[i + 3]);
        }
        ctx.strokeStyle =
          mouse.holdProgress > 0.05
            ? `rgba(186, 230, 253, ${0.25 + mouse.holdProgress * 0.25})`
            : 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }

      if (sparkDots.length > 0) {
        ctx.beginPath();
        for (let i = 0; i < sparkDots.length; i += 2) {
          ctx.moveTo(sparkDots[i] + 2, sparkDots[i + 1]);
          ctx.arc(sparkDots[i], sparkDots[i + 1], 2, 0, Math.PI * 2);
        }
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
      }

      let hoveredArtifact = null;
      let hoveredDistance = Infinity;

      if (!mouse.isDown && !dragStateRef.current.target && mouse.x > 0 && mouse.y > 0) {
        for (let i = 0; i < all.length; i++) {
          const item = all[i];
          const hoverDistance = Math.hypot(item.x - mouse.x, item.y - mouse.y);
          if (hoverDistance < item.radius + 36 && hoverDistance < hoveredDistance) {
            hoveredArtifact = item;
            hoveredDistance = hoverDistance;
          }
        }
      }

      for (let i = 0; i < all.length; i++) {
        const item = all[i];
        const isDragging = dragStateRef.current.target === item;
        const isDragConnected = dragStateRef.current.connected.includes(item);

        if (!isDragging) {
          item.update(bounds, mouse);

          if (item._releaseVisibleUntil && currentTime < item._releaseVisibleUntil) {
            const camera = cameraRef.current;
            const keepMargin = Math.max(72, item.radius * 0.9);
            const left = camera.x + keepMargin;
            const right = camera.x + width - keepMargin;
            const top = camera.y + keepMargin;
            const bottom = camera.y + height - keepMargin;

            if (item.x < left) {
              item.x = left;
              item.vx = Math.abs(item.vx) * 0.92;
              item.directionX = 1;
              item.flipX = false;
            } else if (item.x > right) {
              item.x = right;
              item.vx = -Math.abs(item.vx) * 0.92;
              item.directionX = -1;
              item.flipX = true;
            }

            if (item.y < top) {
              item.y = top;
              item.vy = Math.abs(item.vy) * 0.88;
            } else if (item.y > bottom) {
              item.y = bottom;
              item.vy = -Math.abs(item.vy) * 0.88;
            }
          } else if (item._releaseVisibleUntil) {
            delete item._releaseVisibleUntil;
          }
        } else {
          item.scale += (1.055 - item.scale) * 0.18;
          item.tilt += (0 - item.tilt) * 0.16;
        }

        if (isDragConnected) {
          item.scale += (1.012 - item.scale) * 0.08;
        }

        if (item === hoveredArtifact && !isDragging) {
          item.scale += (1.045 - item.scale) * 0.18;
          const hoverTilt = Math.max(
            -0.035,
            Math.min(0.035, (mouse.x - item.x) * 0.00035)
          );
          item.tilt += (hoverTilt - item.tilt) * 0.12;
        }

        item.draw(ctx);
      }

      if (mouse.x > 0 && mouse.y > 0) {
        ctx.save();
        if (mouse.holdProgress > 0.05) {
          ctx.beginPath();
          ctx.arc(mouse.x, mouse.y, 45 * mouse.holdProgress, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(186, 230, 253, 0.45)';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(mouse.x, mouse.y, 3.5, 0, Math.PI * 2);
          ctx.fillStyle = '#FFFFFF';
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.arc(mouse.x, mouse.y, 16, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
          ctx.lineWidth = 1;
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(mouse.x, mouse.y, 2, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
          ctx.fill();
        }
        ctx.restore();
      }

      ctx.restore();
      animationId = requestAnimationFrame(loop);
    };

    animationId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
      supabase.removeChannel(subscription);
    };
  }, []);

  const handleMouseDown = (e) => {
    const mouse = mouseStateRef.current;
    const worldX = e.clientX + cameraRef.current.x;
    const worldY = e.clientY + cameraRef.current.y;

    mouse.downX = e.clientX;
    mouse.downY = e.clientY;
    mouse.screenX = e.clientX;
    mouse.screenY = e.clientY;
    mouse.x = worldX;
    mouse.y = worldY;
    mouse.downTime = performance.now();

    const grabbed = [...artifactsRef.current].reverse().find((it) => {
      return Math.hypot(it.x - worldX, it.y - worldY) <= it.radius;
    });

    if (grabbed) {
      dragStateRef.current.target = grabbed;
      dragStateRef.current.offsetX = worldX - grabbed.x;
      dragStateRef.current.offsetY = worldY - grabbed.y;
      dragStateRef.current.moved = false;
      dragStateRef.current.connected = [];
      dragStateRef.current.lastConnectTime = 0;
      dragStateRef.current.dragVX = 0;
      dragStateRef.current.dragVY = 0;

      mouse.isDown = false;
      mouse.holdProgress = 0;
    } else {
      mouse.isDown = true;
    }
  };

  const handleMouseMove = (e) => {
    const mouse = mouseStateRef.current;
    mouse.screenX = e.clientX;
    mouse.screenY = e.clientY;
    mouse.x = e.clientX + cameraRef.current.x;
    mouse.y = e.clientY + cameraRef.current.y;

    const dragState = dragStateRef.current;

    if (dragState.target) {
      const nextX = mouse.x - dragState.offsetX;
      const nextY = mouse.y - dragState.offsetY;
      const moveX = nextX - dragState.target.x;
      const moveY = nextY - dragState.target.y;

      dragState.dragVX = dragState.dragVX * 0.68 + moveX * 0.32;
      dragState.dragVY = dragState.dragVY * 0.68 + moveY * 0.32;
      dragState.target.x = nextX;
      dragState.target.y = nextY;

      if (Math.hypot(e.clientX - mouse.downX, e.clientY - mouse.downY) > 4) {
        dragState.moved = true;
      }
    }
  };

  const handleMouseLeave = () => {
    const mouse = mouseStateRef.current;
    mouse.x = -9999;
    mouse.y = -9999;
    mouse.screenX = -9999;
    mouse.screenY = -9999;
    mouse.isDown = false;
    mouse.holdProgress = 0;

    const dragState = dragStateRef.current;

    if (dragState.target) {
      const releasedGroup = [dragState.target, ...dragState.connected];
      releasedGroup.forEach((item) => {
        item.vx = item.directionX * item.baseSpeed;
        item.vy = (Math.random() - 0.5) * 0.18;
        item.flipX = item.directionX < 0;
        item.releaseEnergy = 0;
        delete item._dragParent;
        delete item._dragJoinedAt;
        delete item._dragRestDistance;
      });

      dragState.target = null;
      dragState.moved = false;
      dragState.connected = [];
      dragState.lastConnectTime = 0;
      dragState.dragVX = 0;
      dragState.dragVY = 0;
    }
  };

  const handleMouseUp = (e) => {
    const mouse = mouseStateRef.current;
    const clickDuration = performance.now() - mouse.downTime;
    const moveDist = Math.hypot(e.clientX - mouse.downX, e.clientY - mouse.downY);
    const dragState = dragStateRef.current;

    if (dragState.target) {
      const dragged = dragState.target;
      const wasDragged = dragState.moved || moveDist >= 6;
      const releasedGroup = [dragged, ...dragState.connected];

      releasedGroup.forEach((item) => {
        item.vx = item.directionX * item.baseSpeed;
        item.vy = (Math.random() - 0.5) * 0.22;
        item.flipX = item.directionX < 0;
        item.releaseEnergy = 0;
        delete item._dragParent;
        delete item._dragJoinedAt;
        delete item._dragRestDistance;
      });

      dragState.target = null;
      dragState.moved = false;
      dragState.connected = [];
      dragState.lastConnectTime = 0;
      dragState.dragVX = 0;
      dragState.dragVY = 0;

      if (!wasDragged && dragged.message) {
        setSelectedMessage({
          id: dragged.id,
          text: dragged.message,
          color: dragged.color,
          imageSrc: getCroppedImageUrl(dragged.imgElement),
          createdAt: dragged.createdAt,
          syncCount: dragged.syncCount || 0,
          x: e.clientX,
          y: e.clientY,
        });
      }

      mouse.isDown = false;
      mouse.holdProgress = 0;
      return;
    }

    if (mouse.holdProgress > 0.35 || clickDuration > 260) {
      const camera = cameraRef.current;
      const viewWidth = canvasRef.current?.width || window.innerWidth;
      const viewHeight = canvasRef.current?.height || window.innerHeight;

      const insetX = Math.max(86, viewWidth * 0.08);
      const insetY = Math.max(74, viewHeight * 0.09);
      const safeLeft = camera.x + insetX;
      const safeRight = camera.x + viewWidth - insetX;
      const safeTop = camera.y + insetY;
      const safeBottom = camera.y + viewHeight - insetY;
      const releaseNow = performance.now();

      artifactsRef.current.forEach((a) => {
        let freeAngle = Math.random() * Math.PI * 2;
        const freeSpeed = 0.72 + Math.random() * 0.92;

        let nextVX = Math.cos(freeAngle) * freeSpeed;
        let nextVY = Math.sin(freeAngle) * freeSpeed * 0.78;

        if (a.x < safeLeft && nextVX < 0) {
          nextVX = Math.abs(nextVX) * (0.72 + Math.random() * 0.28);
        } else if (a.x > safeRight && nextVX > 0) {
          nextVX = -Math.abs(nextVX) * (0.72 + Math.random() * 0.28);
        }

        if (a.y < safeTop && nextVY < 0) {
          nextVY = Math.abs(nextVY) * (0.7 + Math.random() * 0.3);
        } else if (a.y > safeBottom && nextVY > 0) {
          nextVY = -Math.abs(nextVY) * (0.7 + Math.random() * 0.3);
        }

        a.vx = nextVX;
        a.vy = nextVY;
        a.directionX = nextVX < 0 ? -1 : 1;
        a.flipX = a.directionX < 0;

        a.verticalSeed = Math.random() * Math.PI * 2;
        a.verticalStrength = 0.14 + Math.random() * 0.28;
        a.verticalFrequency = 0.38 + Math.random() * 0.34;

        a.releaseEnergy = 0.72 + Math.random() * 0.18;
        a.scale = 1.035 + Math.random() * 0.018;
        a._releaseVisibleUntil = releaseNow + 2100 + Math.random() * 500;
      });
    } else if (moveDist < 6) {
      const clickWorldX = e.clientX + cameraRef.current.x;
      const clickWorldY = e.clientY + cameraRef.current.y;

      const clicked = [...artifactsRef.current].reverse().find((it) => {
        return Math.hypot(it.x - clickWorldX, it.y - clickWorldY) <= it.radius;
      });

      if (clicked && clicked.message) {
        setSelectedMessage({
          id: clicked.id,
          text: clicked.message,
          color: clicked.color,
          imageSrc: getCroppedImageUrl(clicked.imgElement),
          createdAt: clicked.createdAt,
          syncCount: clicked.syncCount || 0,
          x: e.clientX,
          y: e.clientY,
        });
      } else {
        setSelectedMessage(null);
      }
    }

    mouse.isDown = false;
    mouse.holdProgress = 0;
  };

  // --------------------------------------------------------------

  return (
    <div className="archive-viewport">
      {/* 상단 버튼 */}
      <button className="archive-back-btn" onClick={onNavigateToEditor}>
        &lt; Back
      </button>

      {/*  좌측 하단 가이드/설명 텍스트 */}
      <div className="archive-bottom-guide">
        <p>설명 내용이 들어가는 자리입니다.</p>
        <p>가이드 내용이 들어가는 자리입니다.</p>
      </div>

      {/* 모달 */}
      {selectedMessage && (
        <div
          className="message-modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setSelectedMessage(null);
            }
          }}
        >
          <div
            className="polaroid-modal-card"
            onMouseDown={(e) => e.stopPropagation()}
          >
            {/* 이미지 */}
            <div className="polaroid-image-area">
              {selectedMessage.imageSrc && (
                <img
                  src={selectedMessage.imageSrc}
                  alt="Selected object"
                  draggable={false}
                  className="polaroid-object-img"
                />
              )}
            </div>

            {/* 하단 텍스트 */}
            <div className="polaroid-text-area">
              <p className="polaroid-caption-text">
                {selectedMessage.text}
              </p>
            </div>

            {/* 싱크 및 날짜 */}
            <div className="polaroid-footer-meta">
              <span className="polaroid-sync-info">
                SYNC 🔗 {formatSyncCount(selectedMessage.syncCount)}
              </span>
              <span className="polaroid-date-info">
                {formatDate(selectedMessage.createdAt)}
              </span>
            </div>
          </div>
        </div>
      )}

      <canvas
        ref={canvasRef}
        className="main-archive-canvas"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onMouseUp={handleMouseUp}
      />
    </div>
  );
}