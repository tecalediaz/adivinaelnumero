import {
  Direction,
  Point,
  PublicViboritaState,
  RoomState,
  SNAKE_FOOD_COUNT,
  SNAKE_HEIGHT,
  SNAKE_POINTS_PER_FOOD,
  SNAKE_START_LENGTH,
  SNAKE_TARGET_MAX,
  SNAKE_TARGET_MIN,
  SNAKE_WIDTH,
  SnakePlayerState,
  ViboritaState,
} from "../lib/types";

const OPPOSITE: Record<Direction, Direction> = {
  up: "down",
  down: "up",
  left: "right",
  right: "left",
};

const DELTA: Record<Direction, Point> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

function pointKey(p: Point): string {
  return `${p.x},${p.y}`;
}

function randomTargetScore(): number {
  const min = SNAKE_TARGET_MIN / 100;
  const max = SNAKE_TARGET_MAX / 100;
  const value = Math.floor(Math.random() * (max - min + 1)) + min;
  return value * 100;
}

function occupiedSet(snakes: SnakePlayerState[], foods: Point[] = []): Set<string> {
  const set = new Set<string>();
  for (const snake of snakes) {
    for (const segment of snake.body) {
      set.add(pointKey(segment));
    }
  }
  for (const food of foods) {
    set.add(pointKey(food));
  }
  return set;
}

function randomEmptyCell(
  width: number,
  height: number,
  blocked: Set<string>
): Point | null {
  const free: Point[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!blocked.has(pointKey({ x, y }))) {
        free.push({ x, y });
      }
    }
  }
  if (free.length === 0) return null;
  return free[Math.floor(Math.random() * free.length)];
}

function spawnSnake(
  playerId: string,
  width: number,
  height: number,
  blocked: Set<string>,
  preferredSide: "left" | "right"
): SnakePlayerState {
  const direction: Direction = preferredSide === "left" ? "right" : "left";
  const startX =
    preferredSide === "left"
      ? Math.floor(width * 0.2)
      : Math.floor(width * 0.8);
  const startY = Math.floor(height / 2) + (preferredSide === "left" ? -2 : 2);

  let head: Point = {
    x: Math.min(width - 4, Math.max(3, startX)),
    y: Math.min(height - 3, Math.max(2, startY)),
  };
  if (blocked.has(pointKey(head))) {
    head = randomEmptyCell(width, height, blocked) ?? head;
  }

  const body: Point[] = [head];
  const back = DELTA[OPPOSITE[direction]];
  for (let i = 1; i < SNAKE_START_LENGTH; i++) {
    const segment = {
      x: Math.min(width - 1, Math.max(0, head.x + back.x * i)),
      y: Math.min(height - 1, Math.max(0, head.y + back.y * i)),
    };
    body.push(segment);
  }

  for (const segment of body) {
    blocked.add(pointKey(segment));
  }

  return {
    playerId,
    body,
    direction,
    pendingDirection: direction,
    score: 0,
    alive: true,
  };
}

function fillFoods(state: ViboritaState): void {
  while (state.foods.length < SNAKE_FOOD_COUNT) {
    const cell = randomEmptyCell(
      state.width,
      state.height,
      occupiedSet(state.snakes, state.foods)
    );
    if (!cell) break;
    state.foods.push(cell);
  }
}

export function createViboritaState(playerIds: [string, string]): ViboritaState {
  const blocked = new Set<string>();
  const snakes = [
    spawnSnake(playerIds[0], SNAKE_WIDTH, SNAKE_HEIGHT, blocked, "left"),
    spawnSnake(playerIds[1], SNAKE_WIDTH, SNAKE_HEIGHT, blocked, "right"),
  ];

  const state: ViboritaState = {
    width: SNAKE_WIDTH,
    height: SNAKE_HEIGHT,
    snakes,
    foods: [],
    targetScore: randomTargetScore(),
  };

  fillFoods(state);
  return state;
}

export function toPublicViborita(state: ViboritaState): PublicViboritaState {
  return {
    width: state.width,
    height: state.height,
    foods: state.foods.map((f) => ({ ...f })),
    targetScore: state.targetScore,
    snakes: state.snakes.map((snake) => ({
      playerId: snake.playerId,
      body: snake.body.map((p) => ({ ...p })),
      direction: snake.direction,
      score: snake.score,
    })),
  };
}

export function setSnakeDirection(
  room: RoomState,
  playerId: string,
  direction: Direction
): void {
  if (!room.viborita || room.status !== "playing") return;
  const snake = room.viborita.snakes.find((s) => s.playerId === playerId);
  if (!snake || !snake.alive) return;
  if (OPPOSITE[snake.direction] === direction) return;
  snake.pendingDirection = direction;
}

function respawnSnake(state: ViboritaState, snake: SnakePlayerState): void {
  const keptScore = snake.score;
  const blocked = occupiedSet(
    state.snakes.filter((s) => s.playerId !== snake.playerId),
    state.foods
  );
  const side = Math.random() < 0.5 ? "left" : "right";
  const fresh = spawnSnake(
    snake.playerId,
    state.width,
    state.height,
    blocked,
    side
  );
  snake.body = fresh.body;
  snake.direction = fresh.direction;
  snake.pendingDirection = fresh.pendingDirection;
  snake.alive = true;
  snake.score = keptScore;
}

function headsCollide(a: Point, b: Point): boolean {
  return a.x === b.x && a.y === b.y;
}

/** Returns winner playerId if someone reached target, else null */
export function tickViborita(room: RoomState): string | null {
  const state = room.viborita;
  if (!state || room.status !== "playing") return null;

  const nextHeads: Point[] = state.snakes.map((snake) => {
    snake.direction = snake.pendingDirection;
    const delta = DELTA[snake.direction];
    const head = snake.body[0];
    return { x: head.x + delta.x, y: head.y + delta.y };
  });

  const die = new Set<string>();

  // Walls
  state.snakes.forEach((snake, i) => {
    const head = nextHeads[i];
    if (
      head.x < 0 ||
      head.y < 0 ||
      head.x >= state.width ||
      head.y >= state.height
    ) {
      die.add(snake.playerId);
    }
  });

  // Head-to-head
  if (
    state.snakes.length === 2 &&
    headsCollide(nextHeads[0], nextHeads[1])
  ) {
    die.add(state.snakes[0].playerId);
    die.add(state.snakes[1].playerId);
  }

  // Self bite / bite other body (using current bodies; tails move unless eating)
  state.snakes.forEach((snake, i) => {
    if (die.has(snake.playerId)) return;
    const head = nextHeads[i];

    // Self: check against body without last segment (will move)
    const selfBody = snake.body.slice(0, -1);
    if (selfBody.some((p) => p.x === head.x && p.y === head.y)) {
      die.add(snake.playerId);
      return;
    }

    // Other snake body
    for (let j = 0; j < state.snakes.length; j++) {
      if (i === j) continue;
      const other = state.snakes[j];
      const otherBody =
        die.has(other.playerId) ? other.body : other.body.slice(0, -1);
      // Also collide with other's next head if not already head-to-head handled
      if (otherBody.some((p) => p.x === head.x && p.y === head.y)) {
        die.add(snake.playerId);
      }
      if (headsCollide(head, nextHeads[j]) && i !== j) {
        die.add(snake.playerId);
        die.add(other.playerId);
      }
    }
  });

  // Apply moves / deaths
  for (let i = 0; i < state.snakes.length; i++) {
    const snake = state.snakes[i];
    if (die.has(snake.playerId)) {
      respawnSnake(state, snake);
      continue;
    }

    const newHead = nextHeads[i];
    const foodIndex = state.foods.findIndex(
      (f) => f.x === newHead.x && f.y === newHead.y
    );
    const ate = foodIndex >= 0;

    snake.body = [newHead, ...snake.body];
    if (ate) {
      state.foods.splice(foodIndex, 1);
      // 100 por comida; al crecer sumás más puntos al comer más
      snake.score += SNAKE_POINTS_PER_FOOD;
    } else {
      snake.body.pop();
    }
  }

  fillFoods(state);

  for (const snake of state.snakes) {
    if (snake.score >= state.targetScore) {
      return snake.playerId;
    }
  }

  return null;
}

export function resetViboritaForRematch(room: RoomState): void {
  if (room.players.length < 2) return;
  room.viborita = createViboritaState([
    room.players[0].id,
    room.players[1].id,
  ]);
}
