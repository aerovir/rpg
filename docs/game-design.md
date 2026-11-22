# Game Design Brief — v0.1

## High concept

A cyberpunk role-playing game for Telegram Mini Apps. The player is a mercenary navigating a dense city of corporate districts, street crews, fixers, and ordinary residents. They take short PvE jobs, make tactical choices through their software and implants, and gradually uncover a connected story.

The city is shared online. Players can post contracts for other players, while the actual missions are initially resolved in self-contained PvE instances.

## Design pillars

1. **A complete session in a few minutes.** A mission should fit into a 3–7 minute play session and work well on a phone.
2. **Progression changes the approach.** Software and implants unlock different ways to handle a job: stealth, hacking, combat, or a mix.
3. **The city tells a connected story.** Small jobs reveal factions, characters, and consequences over time.
4. **Player contracts create activity.** Players can offer useful, verifiable jobs to one another without requiring both players to be online at once.
5. **Fair difficulty and rewards.** Better equipment opens harder, more rewarding content; it should not make every mission harder by default.

## Core session loop

1. Review available story missions and player contracts.
2. Choose a job and inspect its objective, risk, and reward.
3. Equip software and implants for the intended approach.
4. Complete a short PvE mission with a small number of meaningful decisions.
5. Receive currency, experience, and faction or fixer reputation.
6. Upgrade the character, unlock new options, and choose the next job.

## Mission structure

A mission is a short sequence of beats rather than a large real-time map:

- **Briefing:** who wants the job done and what is at stake.
- **Approach:** choose an entry method or spend a relevant resource.
- **Encounter:** resolve a hack, stealth check, combat, negotiation, or combination.
- **Outcome:** success, partial success, or failure changes rewards and may affect reputation or later story content.

Initial mission types: retrieve data, deliver or extract an item, disable a system, protect a target, and eliminate or evade a hostile target.

## Character progression

The character has three initial build directions:

- **Netrunner:** intrusion tools, system control, information gathering.
- **Ghost:** concealment, access, evasion, and silent takedowns.
- **Enforcer:** durability, weapons, and direct confrontation.

Software and implants grant abilities, modifiers, and additional choices. They also contribute to a visible **threat rating**. Missions are offered in clear risk bands; higher threat ratings unlock harder contracts and better potential rewards, but players can still choose lower-risk jobs.

## Player-created contracts

For the MVP, a contract is assembled from validated templates rather than arbitrary win conditions. A publisher chooses:

- an objective template;
- a difficulty band and optional constraints;
- an in-world description;
- a reward and expiry time.

The reward is reserved when the contract is published and paid only when the server verifies completion. The contract is asynchronous: the publisher does not need to be online while another player completes it.

The initial objective set should be verifiable by game state, for example: retrieve a marked data shard, complete a mission with a specified approach, defeat a target, or finish without raising an alarm.

## Economy

The MVP uses a closed in-game currency for repairs, mission preparation, and progression unlocks. Currency is not withdrawable or transferable outside the game in the initial version. Rewards should be earned through play; paid advantages and wagering are outside the current scope.

## MVP scope

- One compact city district.
- One introductory story arc with several connected missions.
- Three build directions: Netrunner, Ghost, and Enforcer.
- A small set of software and implants with distinct effects.
- Short, replayable PvE mission instances.
- Basic player contracts from a limited set of templates.
- Server-verified completion and reward reservation.
- Character profile, inventory, currency, reputation, and mission history.

## Out of scope for the first MVP

- Direct PvP combat.
- Open-world real-time movement.
- Player trading or cash-out.
- Unmoderated arbitrary player objectives.
- Large guild, territory-control, or crafting systems.

## Open questions

- Should mission resolution be turn-based choices, lightweight tactical encounters, or a hybrid?
- Should player contracts use the publisher's currency, a system-funded pool, or both?
- Which narrative tone and content rating should guide the city and characters?
- What is the minimum viable persistent online feature beyond contracts and leaderboards?
