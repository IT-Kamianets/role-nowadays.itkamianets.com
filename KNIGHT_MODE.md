# Knight Mode

Knight Mode is a fast tactical multiplayer game mode where players choose actions each round to attack, protect, or heal. The goal is to survive and eliminate other players. Each player controls a role with unique abilities, and actions are resolved simultaneously at the end of each round.

Players must predict the actions of others and manage their health carefully. The last player alive wins.

---

# Players

Recommended number of players:

- Minimum: 3
- Ideal: 4
- Maximum: 5

Role distribution:

- 1 Defender
- 1 Healer
- Remaining players are Attackers

---

# Player Health

Each role starts with different health:

- Attacker: 7 HP
- Healer: 8 HP
- Defender: 10 HP

If a player's health reaches **0 HP**, the player dies and is removed from the game.

---

# Game Rounds

The game progresses in rounds.

Each round follows this flow:

1. All players choose an action.
2. Actions are locked.
3. The server resolves all actions simultaneously.
4. Damage and healing are applied.
5. The next round begins.

---

# Roles

## Attacker

Goal: eliminate other players.

Abilities:

### Mark
The attacker selects a target.

If the same target is selected **two rounds in a row**, the attack triggers.

### Strike
When the attack triggers, the target receives:

**4 damage**

Rules:

- Changing target resets the mark progress.
- Attack requires two consecutive rounds on the same target.

---

## Healer

Goal: keep players alive and outlast enemies.

Health: 8 HP

Abilities:

### Heal
Restore **2 HP** to yourself or another player.

### Overheal
Restore **3 HP** to a target.

Cost:

- Healer loses **1 HP** when using Overheal.

Rules:

- Healing cannot exceed the target's maximum health.

---

## Defender

Goal: protect players from incoming attacks.

Health: 10 HP

Abilities:

### Guard
Protect yourself or another player.

Effect:

- Absorbs **3 damage** from attacks.

Cost:

- Defender loses **1 HP** when using Guard.

### Counter Guard
If a guarded player is attacked:

- The attacker receives **1 damage**.

---

# Action Commitment Rule

To increase strategy and prediction:

When a player targets someone with an action, the target becomes **locked for 2 rounds**.

If a player changes their target before the lock finishes:

Penalty:

- The player loses **1 HP**.

This encourages commitment and strategic planning.

---

# Victory Condition

The match continues until only **one player remains alive**.

That player is declared the winner.

---

# Typical Match Length

A match usually lasts:

**5–10 rounds**
