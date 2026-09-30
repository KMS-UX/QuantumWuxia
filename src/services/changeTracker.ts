import { database, ChangeLogEntry } from './database';
import { GameState, Character } from '../types/game';

// Change tracker - automatically logs all game state changes
class ChangeTracker {
  private gameId: string = '';
  private previousState: GameState | null = null;
  private trackingEnabled: boolean = true;

  setGameId(id: string) {
    this.gameId = id;
  }

  enable() {
    this.trackingEnabled = true;
  }

  disable() {
    this.trackingEnabled = false;
  }

  // Track state changes between turns
  async trackStateChange(oldState: GameState, newState: GameState, turnNumber: number): Promise<void> {
    if (!this.trackingEnabled || !this.gameId) return;

    const changes: Omit<ChangeLogEntry, 'id'>[] = [];

    // Detect location change
    if (oldState.location !== newState.location) {
      changes.push({
        timestamp: Date.now(),
        type: 'location_changed',
        description: `Moved to ${newState.location}`,
        details: { from: oldState.location, to: newState.location },
        turnNumber,
        gameId: this.gameId,
      });
    }

    // Detect character changes
    if (oldState.character && newState.character) {
      const oldChar = oldState.character;
      const newChar = newState.character;

      // Level up
      if (newChar.level > oldChar.level) {
        changes.push({
          timestamp: Date.now(),
          type: 'level_up',
          description: `Reached level ${newChar.level}`,
          details: { oldLevel: oldChar.level, newLevel: newChar.level },
          turnNumber,
          gameId: this.gameId,
        });
      }

      // XP gained
      if (newChar.experience > oldChar.experience) {
        const xpGained = newChar.experience - oldChar.experience;
        changes.push({
          timestamp: Date.now(),
          type: 'state_change',
          description: `Gained ${xpGained} XP`,
          details: { xpGained },
          turnNumber,
          gameId: this.gameId,
        });
      }

      // Gold change
      if (newChar.gold !== oldChar.gold) {
        const goldDiff = newChar.gold - oldChar.gold;
        changes.push({
          timestamp: Date.now(),
          type: goldDiff > 0 ? 'state_change' : 'state_change',
          description: goldDiff > 0 ? `Gained ${goldDiff} gold` : `Lost ${Math.abs(goldDiff)} gold`,
          details: { goldChange: goldDiff },
          turnNumber,
          gameId: this.gameId,
        });
      }

      // HP change
      if (newChar.stats.currentHp !== oldChar.stats.currentHp) {
        const hpDiff = newChar.stats.currentHp - oldChar.stats.currentHp;
        changes.push({
          timestamp: Date.now(),
          type: 'state_change',
          description: hpDiff > 0 ? `Healed ${hpDiff} HP` : `Took ${Math.abs(hpDiff)} damage`,
          details: { hpChange: hpDiff },
          turnNumber,
          gameId: this.gameId,
        });
      }

      // Items gained
      const oldItems = new Set(oldChar.inventory.map(i => `${i.name}-${i.quantity}`));
      const newItems = new Set(newChar.inventory.map(i => `${i.name}-${i.quantity}`));
      
      for (const item of newChar.inventory) {
        const oldItem = oldChar.inventory.find(i => i.name === item.name);
        if (!oldItem || item.quantity > oldItem.quantity) {
          const gained = oldItem ? item.quantity - oldItem.quantity : item.quantity;
          changes.push({
            timestamp: Date.now(),
            type: 'item_gained',
            description: `Acquired ${gained}x ${item.name}`,
            details: { itemName: item.name, quantity: gained, itemType: item.type },
            turnNumber,
            gameId: this.gameId,
          });
        }
      }

      // Items lost
      for (const item of oldChar.inventory) {
        const newItem = newChar.inventory.find(i => i.name === item.name);
        if (!newItem || item.quantity > newItem.quantity) {
          const lost = newItem ? item.quantity - newItem.quantity : item.quantity;
          changes.push({
            timestamp: Date.now(),
            type: 'item_lost',
            description: `Lost ${lost}x ${item.name}`,
            details: { itemName: item.name, quantity: lost, itemType: item.type },
            turnNumber,
            gameId: this.gameId,
          });
        }
      }

      // Skills gained
      for (const skill of newChar.skills) {
        if (!oldChar.skills.includes(skill)) {
          changes.push({
            timestamp: Date.now(),
            type: 'state_change',
            description: `Learned new skill: ${skill}`,
            details: { skillName: skill },
            turnNumber,
            gameId: this.gameId,
          });
        }
      }
    }

    // Quest changes
    for (const quest of newState.questLog) {
      const oldQuest = oldState.questLog.find(q => q.id === quest.id);
      if (!oldQuest) {
        changes.push({
          timestamp: Date.now(),
          type: 'quest_started',
          description: `Started quest: ${quest.title}`,
          details: { questId: quest.id, questTitle: quest.title },
          turnNumber,
          gameId: this.gameId,
        });
      } else if (oldQuest.status !== quest.status) {
        changes.push({
          timestamp: Date.now(),
          type: quest.status === 'completed' ? 'quest_completed' : 'state_change',
          description: `Quest "${quest.title}" ${quest.status}`,
          details: { questId: quest.id, questTitle: quest.title, newStatus: quest.status },
          turnNumber,
          gameId: this.gameId,
        });
      }
    }

    // Relationship changes
    for (const rel of newState.relationships) {
      const oldRel = oldState.relationships.find(r => r.id === rel.id);
      if (!oldRel) {
        changes.push({
          timestamp: Date.now(),
          type: 'relationship_changed',
          description: `Met ${rel.name} (${rel.type})`,
          details: { name: rel.name, type: rel.type, disposition: rel.disposition },
          turnNumber,
          gameId: this.gameId,
        });
      } else if (oldRel.disposition !== rel.disposition) {
        const diff = rel.disposition - oldRel.disposition;
        changes.push({
          timestamp: Date.now(),
          type: 'relationship_changed',
          description: `${rel.name} disposition ${diff > 0 ? 'improved' : 'declined'} (${diff > 0 ? '+' : ''}${diff})`,
          details: { name: rel.name, oldDisposition: oldRel.disposition, newDisposition: rel.disposition },
          turnNumber,
          gameId: this.gameId,
        });
      }
    }

    // Log all changes
    for (const change of changes) {
      await database.logChange(change);
    }

    this.previousState = newState;
  }

  // Track player action
  async trackPlayerAction(action: string, isIntent: boolean, turnNumber: number): Promise<void> {
    if (!this.trackingEnabled || !this.gameId) return;

    await database.logChange({
      timestamp: Date.now(),
      type: isIntent ? 'intent_used' : 'choice_made',
      description: isIntent ? `Custom action: ${action}` : `Chose: ${action}`,
      details: { action, isIntent },
      turnNumber,
      gameId: this.gameId,
    });
  }

  // Track combat
  async trackCombat(enemyName: string, result: 'victory' | 'defeat', xpGained: number, goldGained: number, turnNumber: number): Promise<void> {
    if (!this.trackingEnabled || !this.gameId) return;

    await database.logChange({
      timestamp: Date.now(),
      type: 'combat',
      description: `${result === 'victory' ? 'Defeated' : 'Lost to'} ${enemyName}`,
      details: { enemyName, result, xpGained, goldGained },
      turnNumber,
      gameId: this.gameId,
    });
  }

  // Track achievement
  async trackAchievement(achievementName: string, achievementIcon: string, turnNumber: number): Promise<void> {
    if (!this.trackingEnabled || !this.gameId) return;

    await database.logChange({
      timestamp: Date.now(),
      type: 'achievement_unlocked',
      description: `Unlocked achievement: ${achievementName}`,
      details: { achievementName, achievementIcon },
      turnNumber,
      gameId: this.gameId,
    });
  }

  // Track spell cast
  async trackSpellCast(spellName: string, manaCost: number, turnNumber: number): Promise<void> {
    if (!this.trackingEnabled || !this.gameId) return;

    await database.logChange({
      timestamp: Date.now(),
      type: 'spell_cast',
      description: `Cast ${spellName} (${manaCost} mana)`,
      details: { spellName, manaCost },
      turnNumber,
      gameId: this.gameId,
    });
  }

  // Track crafting
  async trackCraft(recipeName: string, ingredients: string[], result: string, turnNumber: number): Promise<void> {
    if (!this.trackingEnabled || !this.gameId) return;

    await database.logChange({
      timestamp: Date.now(),
      type: 'craft',
      description: `Crafted ${result}`,
      details: { recipeName, ingredients, result },
      turnNumber,
      gameId: this.gameId,
    });
  }

  // Track purchase
  async trackPurchase(itemName: string, price: number, turnNumber: number): Promise<void> {
    if (!this.trackingEnabled || !this.gameId) return;

    await database.logChange({
      timestamp: Date.now(),
      type: 'purchase',
      description: `Purchased ${itemName} for ${price}g`,
      details: { itemName, price },
      turnNumber,
      gameId: this.gameId,
    });
  }

  // Track sale
  async trackSale(itemName: string, price: number, turnNumber: number): Promise<void> {
    if (!this.trackingEnabled || !this.gameId) return;

    await database.logChange({
      timestamp: Date.now(),
      type: 'sale',
      description: `Sold ${itemName} for ${price}g`,
      details: { itemName, price },
      turnNumber,
      gameId: this.gameId,
    });
  }

  // Track faction change
  async trackFactionChange(factionName: string, change: number, newReputation: number, turnNumber: number): Promise<void> {
    if (!this.trackingEnabled || !this.gameId) return;

    await database.logChange({
      timestamp: Date.now(),
      type: 'faction_change',
      description: `${factionName} reputation ${change > 0 ? 'improved' : 'declined'} (${change > 0 ? '+' : ''}${change})`,
      details: { factionName, change, newReputation },
      turnNumber,
      gameId: this.gameId,
    });
  }

  // Track survival change
  async trackSurvivalChange(stat: string, oldValue: number, newValue: number, turnNumber: number): Promise<void> {
    if (!this.trackingEnabled || !this.gameId) return;

    await database.logChange({
      timestamp: Date.now(),
      type: 'survival_change',
      description: `${stat} changed from ${Math.round(oldValue)}% to ${Math.round(newValue)}%`,
      details: { stat, oldValue, newValue },
      turnNumber,
      gameId: this.gameId,
    });
  }

  // Track journal entry
  async trackJournalEntry(title: string, turnNumber: number): Promise<void> {
    if (!this.trackingEnabled || !this.gameId) return;

    await database.logChange({
      timestamp: Date.now(),
      type: 'journal_entry',
      description: `Wrote journal entry: ${title}`,
      details: { title },
      turnNumber,
      gameId: this.gameId,
    });
  }
}

// Export singleton instance
export const changeTracker = new ChangeTracker();
