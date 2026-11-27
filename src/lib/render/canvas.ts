import { GRID_COLUMNS, GRID_ROWS } from '@/lib/game/constants';
import type { GameState } from '@/lib/game/types';

/** Fixed drawing resolution; CSS scales the element, so resizing never touches game state. */
export const CELL_PX = 32;
export const CANVAS_WIDTH = GRID_COLUMNS * CELL_PX;
export const CANVAS_HEIGHT = GRID_ROWS * CELL_PX;

const BACKGROUND = '#0b1a12';
const GRID_LINE = '#12281c';
const COLOURS = { 1: '#42a5f5', 2: '#ff9800' } as const;

export function drawGame(ctx: CanvasRenderingContext2D, state: GameState): void {
  ctx.fillStyle = BACKGROUND;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  ctx.strokeStyle = GRID_LINE;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x <= GRID_COLUMNS; x++) {
    ctx.moveTo(x * CELL_PX + 0.5, 0);
    ctx.lineTo(x * CELL_PX + 0.5, CANVAS_HEIGHT);
  }
  for (let y = 0; y <= GRID_ROWS; y++) {
    ctx.moveTo(0, y * CELL_PX + 0.5);
    ctx.lineTo(CANVAS_WIDTH, y * CELL_PX + 0.5);
  }
  ctx.stroke();

  for (const snake of state.snakes) {
    ctx.fillStyle = COLOURS[snake.player];
    snake.segments.forEach((p, i) => {
      ctx.fillRect(p.x * CELL_PX + 2, p.y * CELL_PX + 2, CELL_PX - 4, CELL_PX - 4);
      if (i === 0) {
        // The head gets a white border and the player number, so colour is not the only cue.
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(p.x * CELL_PX + 2, p.y * CELL_PX + 2, CELL_PX - 4, CELL_PX - 4);
      }
    });
    const head = snake.segments[0];
    ctx.fillStyle = '#000000';
    ctx.font = 'bold ' + CELL_PX * 0.6 + 'px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(snake.player), (head.x + 0.5) * CELL_PX, (head.y + 0.55) * CELL_PX);
  }
}
