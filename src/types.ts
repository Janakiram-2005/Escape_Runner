export interface SaveData {
  unlockedLevel: number;
  coins: number;
  inventory: {
    vision: number;
    exit: number;
    clue: number;
    speed: number;
  };
  controls: {
    up: string;
    down: string;
    left: string;
    right: string;
    p1: string;
    p2: string;
    p3: string;
    p4: string;
  };
  mobileLayout: {
    joystickSide: 'left' | 'right' | 'center';
    joystickOffset: number;
    powerupsSide: 'center' | 'left' | 'right';
    powerupsOffset: number;
  };
}

export const defaultSaveData: SaveData = {
  unlockedLevel: 1,
  coins: 0,
  inventory: {
    vision: 1,
    exit: 1,
    clue: 1,
    speed: 1
  },
  controls: {
    up: 'w',
    down: 's',
    left: 'a',
    right: 'd',
    p1: '1',
    p2: '2',
    p3: '3',
    p4: '4'
  },
  mobileLayout: {
    joystickSide: 'left',
    joystickOffset: 10,
    powerupsSide: 'center',
    powerupsOffset: 10,
  }
};
