import { openDB, IDBPDatabase } from 'idb';
import { GameState, GameSettings, SaveSlot, Achievement } from '../types/game';
import { JournalEntry } from '../components/Journal';

// Database version - increment when schema changes
const DB_VERSION = 1;
const DB_NAME = 'realm-of-echoes-db';

// Database schema
interface RealmOfEchoesDB {
  gameStates: {
    key: string;
    value: {
      id: string;
      timestamp: number;
      gameState: GameState;
      settings: GameSettings;
      version: number;
    };
    indexes: { 'by-timestamp': number };
  };
  saveSlots: {
    key: string;
    value: SaveSlot;
    indexes: { 'by-timestamp': number };
  };
  achievements: {
    key: string;
    value: Achievement;
  };
  journalEntries: {
    key: string;
    value: JournalEntry & { gameId: string };
    indexes: { 'by-game': string; 'by-timestamp': number };
  };
  changeLog: {
    key: string;
    value: ChangeLogEntry;
    indexes: { 'by-timestamp': number; 'by-type': string; 'by-game': string };
  };
  visitedLocations: {
    key: string;
    value: {
      id: string;
      gameId: string;
      location: string;
      timestamp: number;
      turnNumber: number;
    };
    indexes: { 'by-game': string };
  };
  statistics: {
    key: string;
    value: GameStatistics;
  };
  metadata: {
    key: string;
    value: any;
  };
}

// Change log entry
export interface ChangeLogEntry {
  id: string;
  timestamp: number;
  type: 'state_change' | 'item_gained' | 'item_lost' | 'level_up' | 'achievement_unlocked' | 'quest_started' | 'quest_completed' | 'relationship_changed' | 'location_changed' | 'combat' | 'choice_made' | 'intent_used' | 'spell_cast' | 'craft' | 'purchase' | 'sale' | 'survival_change' | 'faction_change' | 'journal_entry';
  description: string;
  details?: any;
  turnNumber: number;
  gameId: string;
}

// Game statistics
export interface GameStatistics {
  totalTurns: number;
  totalChoicesMade: number;
  totalIntentsUsed: number;
  totalCombatEncounters: number;
  totalItemsGained: number;
  totalItemsLost: number;
  totalGoldEarned: number;
  totalGoldSpent: number;
  totalXpGained: number;
  totalDamageDealt: number;
  totalDamageTaken: number;
  totalHealingDone: number;
  totalSpellsCast: number;
  totalCraftsMade: number;
  totalPurchases: number;
  totalSales: number;
  totalLocationsVisited: number;
  totalFactionsMet: number;
  totalDeaths: number;
  totalRevives: number;
  longestSurvivalStreak: number;
  favoriteChoice: string;
  mostUsedIntent: string;
  playTimeSeconds: number;
}

// Database service class
class DatabaseService {
  private db: IDBPDatabase<RealmOfEchoesDB> | null = null;
  private initialized: boolean = false;

  // Initialize database
  async init(): Promise<void> {
    if (this.initialized && this.db) return;

    try {
      this.db = await openDB<RealmOfEchoesDB>(DB_NAME, DB_VERSION, {
        upgrade(db, oldVersion, newVersion, transaction) {
          // Create object stores
          if (!db.objectStoreNames.contains('gameStates')) {
            const gameStore = db.createObjectStore('gameStates', { keyPath: 'id' });
            gameStore.createIndex('by-timestamp', 'timestamp');
          }

          if (!db.objectStoreNames.contains('saveSlots')) {
            const saveStore = db.createObjectStore('saveSlots', { keyPath: 'id' });
            saveStore.createIndex('by-timestamp', 'timestamp');
          }

          if (!db.objectStoreNames.contains('achievements')) {
            db.createObjectStore('achievements', { keyPath: 'id' });
          }

          if (!db.objectStoreNames.contains('journalEntries')) {
            const journalStore = db.createObjectStore('journalEntries', { keyPath: 'id' });
            journalStore.createIndex('by-game', 'gameId');
            journalStore.createIndex('by-timestamp', 'timestamp');
          }

          if (!db.objectStoreNames.contains('changeLog')) {
            const changeStore = db.createObjectStore('changeLog', { keyPath: 'id' });
            changeStore.createIndex('by-timestamp', 'timestamp');
            changeStore.createIndex('by-type', 'type');
            changeStore.createIndex('by-game', 'gameId');
          }

          if (!db.objectStoreNames.contains('visitedLocations')) {
            const locationStore = db.createObjectStore('visitedLocations', { keyPath: 'id' });
            locationStore.createIndex('by-game', 'gameId');
          }

          if (!db.objectStoreNames.contains('statistics')) {
            db.createObjectStore('statistics', { keyPath: 'id' });
          }

          if (!db.objectStoreNames.contains('metadata')) {
            db.createObjectStore('metadata', { keyPath: 'key' });
          }
        },
      });

      this.initialized = true;
      console.log('✅ Database initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize database:', error);
      throw error;
    }
  }

  // Ensure database is initialized
  private async ensureInit(): Promise<IDBPDatabase<RealmOfEchoesDB>> {
    if (!this.db || !this.initialized) {
      await this.init();
    }
    return this.db!;
  }

  // ========== GAME STATE OPERATIONS ==========

  async saveGameState(id: string, gameState: GameState, settings: GameSettings): Promise<void> {
    const db = await this.ensureInit();
    await db.put('gameStates', {
      id,
      timestamp: Date.now(),
      gameState,
      settings,
      version: DB_VERSION,
    });
  }

  async getGameState(id: string): Promise<{ gameState: GameState; settings: GameSettings } | null> {
    const db = await this.ensureInit();
    const result = await db.get('gameStates', id);
    return result ? { gameState: result.gameState, settings: result.settings } : null;
  }

  async getAllGameStates(): Promise<Array<{ id: string; timestamp: number; gameState: GameState }>> {
    const db = await this.ensureInit();
    const results = await db.getAll('gameStates');
    return results.map(r => ({
      id: r.id,
      timestamp: r.timestamp,
      gameState: r.gameState,
    }));
  }

  async deleteGameState(id: string): Promise<void> {
    const db = await this.ensureInit();
    await db.delete('gameStates', id);
  }

  // ========== SAVE SLOT OPERATIONS ==========

  async saveSlot(slot: SaveSlot): Promise<void> {
    const db = await this.ensureInit();
    await db.put('saveSlots', slot);
  }

  async getSaveSlot(id: string): Promise<SaveSlot | null> {
    const db = await this.ensureInit();
    return await db.get('saveSlots', id) || null;
  }

  async getAllSaveSlots(): Promise<SaveSlot[]> {
    const db = await this.ensureInit();
    return await db.getAll('saveSlots');
  }

  async deleteSaveSlot(id: string): Promise<void> {
    const db = await this.ensureInit();
    await db.delete('saveSlots', id);
  }

  // ========== ACHIEVEMENT OPERATIONS ==========

  async saveAchievements(achievements: Achievement[]): Promise<void> {
    const db = await this.ensureInit();
    const tx = db.transaction('achievements', 'readwrite');
    await Promise.all([
      ...achievements.map(a => tx.store.put(a)),
      tx.done,
    ]);
  }

  async getAchievements(): Promise<Achievement[]> {
    const db = await this.ensureInit();
    return await db.getAll('achievements');
  }

  // ========== JOURNAL OPERATIONS ==========

  async saveJournalEntry(entry: JournalEntry, gameId: string): Promise<void> {
    const db = await this.ensureInit();
    await db.put('journalEntries', { ...entry, gameId });
  }

  async getJournalEntries(gameId: string): Promise<JournalEntry[]> {
    const db = await this.ensureInit();
    const results = await db.getAllFromIndex('journalEntries', 'by-game', gameId);
    return results.sort((a, b) => b.timestamp - a.timestamp);
  }

  async deleteJournalEntry(id: string): Promise<void> {
    const db = await this.ensureInit();
    await db.delete('journalEntries', id);
  }

  // ========== CHANGE LOG OPERATIONS ==========

  async logChange(entry: Omit<ChangeLogEntry, 'id'>): Promise<void> {
    const db = await this.ensureInit();
    const id = `change-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    await db.put('changeLog', { ...entry, id });
  }

  async getChangeLog(gameId: string, limit: number = 100): Promise<ChangeLogEntry[]> {
    const db = await this.ensureInit();
    const results = await db.getAllFromIndex('changeLog', 'by-game', gameId);
    return results
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  async getChangeLogByType(type: ChangeLogEntry['type'], limit: number = 50): Promise<ChangeLogEntry[]> {
    const db = await this.ensureInit();
    const results = await db.getAllFromIndex('changeLog', 'by-type', type);
    return results
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  async getAllChangeLogs(limit: number = 500): Promise<ChangeLogEntry[]> {
    const db = await this.ensureInit();
    const results = await db.getAll('changeLog');
    return results
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  // ========== VISITED LOCATIONS ==========

  async logVisitedLocation(gameId: string, location: string, turnNumber: number): Promise<void> {
    const db = await this.ensureInit();
    const id = `loc-${gameId}-${location}-${turnNumber}`;
    await db.put('visitedLocations', {
      id,
      gameId,
      location,
      timestamp: Date.now(),
      turnNumber,
    });
  }

  async getVisitedLocations(gameId: string): Promise<string[]> {
    const db = await this.ensureInit();
    const results = await db.getAllFromIndex('visitedLocations', 'by-game', gameId);
    const uniqueLocations = new Set(results.map(r => r.location));
    return Array.from(uniqueLocations);
  }

  // ========== STATISTICS ==========

  async updateStatistics(stats: Partial<GameStatistics>): Promise<void> {
    const db = await this.ensureInit();
    const existing = await db.get('statistics', 'global');
    const updated: GameStatistics = {
      totalTurns: 0,
      totalChoicesMade: 0,
      totalIntentsUsed: 0,
      totalCombatEncounters: 0,
      totalItemsGained: 0,
      totalItemsLost: 0,
      totalGoldEarned: 0,
      totalGoldSpent: 0,
      totalXpGained: 0,
      totalDamageDealt: 0,
      totalDamageTaken: 0,
      totalHealingDone: 0,
      totalSpellsCast: 0,
      totalCraftsMade: 0,
      totalPurchases: 0,
      totalSales: 0,
      totalLocationsVisited: 0,
      totalFactionsMet: 0,
      totalDeaths: 0,
      totalRevives: 0,
      longestSurvivalStreak: 0,
      favoriteChoice: '',
      mostUsedIntent: '',
      playTimeSeconds: 0,
      ...(existing || {}),
      ...stats,
    };
    await db.put('statistics', { id: 'global', ...updated });
  }

  async getStatistics(): Promise<GameStatistics | null> {
    const db = await this.ensureInit();
    const result = await db.get('statistics', 'global');
    return result || null;
  }

  // ========== METADATA ==========

  async setMetadata(key: string, value: any): Promise<void> {
    const db = await this.ensureInit();
    await db.put('metadata', { key, value });
  }

  async getMetadata(key: string): Promise<any> {
    const db = await this.ensureInit();
    const result = await db.get('metadata', key);
    return result?.value || null;
  }

  // ========== EXPORT/IMPORT ==========

  async exportDatabase(): Promise<string> {
    const db = await this.ensureInit();
    
    const data = {
      version: DB_VERSION,
      exportDate: Date.now(),
      gameStates: await db.getAll('gameStates'),
      saveSlots: await db.getAll('saveSlots'),
      achievements: await db.getAll('achievements'),
      journalEntries: await db.getAll('journalEntries'),
      changeLog: await db.getAll('changeLog'),
      visitedLocations: await db.getAll('visitedLocations'),
      statistics: await db.getAll('statistics'),
      metadata: await db.getAll('metadata'),
    };

    return JSON.stringify(data, null, 2);
  }

  async importDatabase(jsonString: string): Promise<void> {
    const db = await this.ensureInit();
    const data = JSON.parse(jsonString);

    const tx = db.transaction([
      'gameStates',
      'saveSlots',
      'achievements',
      'journalEntries',
      'changeLog',
      'visitedLocations',
      'statistics',
      'metadata',
    ], 'readwrite');

    await Promise.all([
      ...data.gameStates.map((s: any) => tx.objectStore('gameStates').put(s)),
      ...data.saveSlots.map((s: any) => tx.objectStore('saveSlots').put(s)),
      ...data.achievements.map((a: any) => tx.objectStore('achievements').put(a)),
      ...data.journalEntries.map((j: any) => tx.objectStore('journalEntries').put(j)),
      ...data.changeLog.map((c: any) => tx.objectStore('changeLog').put(c)),
      ...data.visitedLocations.map((v: any) => tx.objectStore('visitedLocations').put(v)),
      ...data.statistics.map((s: any) => tx.objectStore('statistics').put(s)),
      ...data.metadata.map((m: any) => tx.objectStore('metadata').put(m)),
      tx.done,
    ]);
  }

  async clearAllData(): Promise<void> {
    const db = await this.ensureInit();
    const tx = db.transaction([
      'gameStates',
      'saveSlots',
      'achievements',
      'journalEntries',
      'changeLog',
      'visitedLocations',
      'statistics',
      'metadata',
    ], 'readwrite');

    await Promise.all([
      tx.objectStore('gameStates').clear(),
      tx.objectStore('saveSlots').clear(),
      tx.objectStore('achievements').clear(),
      tx.objectStore('journalEntries').clear(),
      tx.objectStore('changeLog').clear(),
      tx.objectStore('visitedLocations').clear(),
      tx.objectStore('statistics').clear(),
      tx.objectStore('metadata').clear(),
      tx.done,
    ]);
  }

  // ========== DATABASE INFO ==========

  async getDatabaseInfo(): Promise<{
    size: number;
    gameStates: number;
    saveSlots: number;
    achievements: number;
    journalEntries: number;
    changeLogEntries: number;
    visitedLocations: number;
  }> {
    const db = await this.ensureInit();
    
    const [gameStates, saveSlots, achievements, journalEntries, changeLog, visitedLocations] = await Promise.all([
      db.count('gameStates'),
      db.count('saveSlots'),
      db.count('achievements'),
      db.count('journalEntries'),
      db.count('changeLog'),
      db.count('visitedLocations'),
    ]);

    return {
      size: 0, // IndexedDB doesn't provide easy size calculation
      gameStates,
      saveSlots,
      achievements,
      journalEntries,
      changeLogEntries: changeLog,
      visitedLocations,
    };
  }
}

// Export singleton instance
export const database = new DatabaseService();
export type { RealmOfEchoesDB };
