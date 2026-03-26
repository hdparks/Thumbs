const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 400;
const THUMB_SIZE = 80;
const HEALTH_BAR_WIDTH = 120;
const HEALTH_BAR_HEIGHT = 16;

const COLORS = {
  background: '#1a1a2e',
  p1Thumb: '#3b82f6',
  p2Thumb: '#ef4444',
  p1Touching: '#22c55e',
  p2Touching: '#22c55e',
  p1Pinned: '#dc2626',
  p2Pinned: '#dc2626',
  healthBg: '#374151',
  healthFill: '#22c55e',
  healthLow: '#ef4444',
  text: '#ffffff',
  textMuted: '#9ca3af',
};

function clearCanvas(ctx) {
  ctx.fillStyle = COLORS.background;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
}

function drawHealthBar(ctx, health, maxHealth, x, y, label) {
  const healthPercent = Math.max(0, Math.min(1, health / maxHealth));

  ctx.fillStyle = COLORS.healthBg;
  ctx.fillRect(x, y, HEALTH_BAR_WIDTH, HEALTH_BAR_HEIGHT);

  const healthColor = healthPercent > 0.3 ? COLORS.healthFill : COLORS.healthLow;
  ctx.fillStyle = healthColor;
  ctx.fillRect(x, y, HEALTH_BAR_WIDTH * healthPercent, HEALTH_BAR_HEIGHT);

  ctx.strokeStyle = COLORS.textMuted;
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, HEALTH_BAR_WIDTH, HEALTH_BAR_HEIGHT);

  ctx.fillStyle = COLORS.text;
  ctx.font = 'bold 12px system-ui';
  ctx.textAlign = 'center';
  ctx.fillText(`${Math.ceil(health)} / ${maxHealth}`, x + HEALTH_BAR_WIDTH / 2, y + HEALTH_BAR_HEIGHT + 14);

  if (label) {
    ctx.fillStyle = COLORS.textMuted;
    ctx.fillText(label, x + HEALTH_BAR_WIDTH / 2, y - 8);
  }
}

function drawThumb(ctx, x, y, isTouching, isPinned, isLocal, escapeTaps) {
  let bgColor;
  if (isLocal) {
    if (isTouching) {
      bgColor = isPinned ? COLORS.p1Pinned : COLORS.p1Touching;
    } else {
      bgColor = isPinned ? COLORS.p1Pinned : COLORS.p1Thumb;
    }
  } else {
    if (isTouching) {
      bgColor = isPinned ? COLORS.p2Pinned : COLORS.p2Touching;
    } else {
      bgColor = isPinned ? COLORS.p2Pinned : COLORS.p2Thumb;
    }
  }

  ctx.fillStyle = bgColor;
  ctx.beginPath();
  ctx.arc(x, y, THUMB_SIZE / 2, 0, Math.PI * 2);
  ctx.fill();

  if (isTouching) {
    ctx.shadowColor = isPinned ? 'rgba(220, 38, 38, 0.8)' : 'rgba(34, 197, 94, 0.6)';
    ctx.shadowBlur = 20;
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  ctx.fillStyle = COLORS.text;
  ctx.font = 'bold 14px system-ui';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  if (isPinned) {
    const remaining = 5 - escapeTaps;
    ctx.fillText(`ESCAPE! ${remaining}`, x, y);
  } else if (isTouching) {
    ctx.fillText('TOUCHING', x, y);
  } else if (isLocal) {
    ctx.fillText('TAP TO TOUCH', x, y);
  } else {
    ctx.fillText('WAITING', x, y);
  }
}

function drawEscapeIndicator(ctx, x, y, escapeTaps) {
  const dotSize = 8;
  const gap = 4;
  const totalWidth = 5 * dotSize + 4 * gap;

  ctx.fillStyle = COLORS.textMuted;
  ctx.font = '10px system-ui';
  ctx.textAlign = 'center';
  ctx.fillText('ESCAPE PROGRESS', x, y - 20);

  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = i < escapeTaps ? COLORS.healthLow : COLORS.healthBg;
    ctx.beginPath();
    ctx.arc(x - totalWidth / 2 + i * (dotSize + gap) + dotSize / 2, y, dotSize / 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawGameState(ctx, gameState, localPlayer, p1Wins, p2Wins) {
  ctx.fillStyle = COLORS.text;
  ctx.font = 'bold 28px system-ui';
  ctx.textAlign = 'center';

  let statusText = 'READY!';
  let subText = 'Waiting for game to start...';

  if (gameState === 'playing') {
    statusText = 'THUMB WAR!';
    subText = '';
  } else if (gameState === 'p1Win') {
    statusText = localPlayer === 'p1' ? 'YOU WIN!' : 'YOU LOSE!';
    subText = '';
  } else if (gameState === 'p2Win') {
    statusText = localPlayer === 'p2' ? 'YOU WIN!' : 'YOU LOSE!';
    subText = '';
  }

  ctx.fillText(statusText, CANVAS_WIDTH / 2, 40);

  if (subText) {
    ctx.fillStyle = COLORS.textMuted;
    ctx.font = '14px system-ui';
    ctx.fillText(subText, CANVAS_WIDTH / 2, 65);
  }

  ctx.fillStyle = COLORS.textMuted;
  ctx.font = '16px system-ui';
  ctx.fillText(`P1 Wins: ${p1Wins}  |  P2 Wins: ${p2Wins}`, CANVAS_WIDTH / 2, 90);
}

function drawWaitingIndicator(ctx) {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  ctx.fillStyle = COLORS.text;
  ctx.font = 'bold 20px system-ui';
  ctx.textAlign = 'center';
  ctx.fillText('WAITING FOR OPPONENT...', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
}

function render(ctx, state, localPlayer, isConnected) {
  clearCanvas(ctx);

  if (!isConnected) {
    drawWaitingIndicator(ctx);
    return;
  }

  const { gameState, p1, p2, winner } = state;
  const localP1 = localPlayer === 'p1';
  const p1Wins = p1.wins || 0;
  const p2Wins = p2.wins || 0;

  drawGameState(ctx, gameState, localPlayer, p1Wins, p2Wins);

  const p1X = CANVAS_WIDTH / 2 - 150;
  const p2X = CANVAS_WIDTH / 2 + 150;
  const thumbY = CANVAS_HEIGHT / 2 + 20;

  drawHealthBar(ctx, p1.health, 20, p1X - HEALTH_BAR_WIDTH / 2, 120, localP1 ? 'YOU (P1)' : 'P1');
  drawHealthBar(ctx, p2.health, 20, p2X - HEALTH_BAR_WIDTH / 2, 120, localPlayer === 'p2' ? 'YOU (P2)' : 'P2');

  const showP1 = localPlayer === 'p1' || (p1.isTouching || p1.isPinned);
  const showP2 = localPlayer === 'p2' || (p2.isTouching || p2.isPinned);

  if (showP1) {
    const p1EscapeTaps = (localPlayer === 'p1' && p1.isPinned) ? (p1.escapeTaps || 0) : 0;
    drawThumb(ctx, p1X, thumbY, p1.isTouching, p1.isPinned, localP1, p1EscapeTaps);
    if (localP1 && p1.isPinned) {
      drawEscapeIndicator(ctx, p1X, thumbY + THUMB_SIZE / 2 + 30, p1EscapeTaps);
    }
  }

  if (showP2) {
    const p2EscapeTaps = (localPlayer === 'p2' && p2.isPinned) ? (p2.escapeTaps || 0) : 0;
    drawThumb(ctx, p2X, thumbY, p2.isTouching, p2.isPinned, localPlayer === 'p2', p2EscapeTaps);
    if (localPlayer === 'p2' && p2.isPinned) {
      drawEscapeIndicator(ctx, p2X, thumbY + THUMB_SIZE / 2 + 30, p2EscapeTaps);
    }
  }

  if (localPlayer !== 'p1' && !showP1) {
    ctx.fillStyle = COLORS.textMuted;
    ctx.font = '12px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('P1 - Opponent', p1X, thumbY);
  }

  if (localPlayer !== 'p2' && !showP2) {
    ctx.fillStyle = COLORS.textMuted;
    ctx.font = '12px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('P2 - Opponent', p2X, thumbY);
  }
}

function renderDebug(ctx, stats) {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(8, 8, 200, 120);

  ctx.fillStyle = '#00ff00';
  ctx.font = '12px monospace';
  ctx.textAlign = 'left';
  let y = 24;

  ctx.fillText(`Local Frame: ${stats.localFrame}`, 16, y);
  y += 16;
  ctx.fillText(`Remote Frame: ${stats.remoteFrame}`, 16, y);
  y += 16;
  ctx.fillText(`Rollback Count: ${stats.rollbackCount}`, 16, y);
  y += 16;
  ctx.fillText(`Last Rollback: ${stats.lastRollbackFrame || 'none'}`, 16, y);
  y += 16;
  ctx.fillText(`Input Buffer: ${stats.inputBufferDepth}`, 16, y);
  y += 16;
  ctx.fillText(`Latency (est): ${stats.latency}ms`, 16, y);
  y += 16;
  ctx.fillText(`Game State: ${stats.gameState}`, 16, y);
}

export {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  COLORS,
  clearCanvas,
  drawHealthBar,
  drawThumb,
  drawGameState,
  drawWaitingIndicator,
  render,
  renderDebug,
};