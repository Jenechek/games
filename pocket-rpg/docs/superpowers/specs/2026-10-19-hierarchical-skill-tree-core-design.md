# Pocket RPG — Hierarchical Skill Tree Core

Date: 2026-10-19
Status: Implemented core rules

## Scope

This stage implements the agreed generic rules shared by weapon, profession, magic, social and future class skill trees without inventing missing class content.

It deliberately does not migrate every existing subsystem into one centralized persisted skill-state object yet.

## Tree constraints

- maximum visible hierarchy: 4 levels total, represented as depth 0 through 3;
- maximum direct children per node: 8;
- every non-root node must reference an existing parent;
- child depth must equal parent depth + 1;
- duplicate ids and cycles are invalid;
- the full authored tree is visible from the start.

The current content tree includes existing implemented professions:
- Crafting;
- Alchemy;
- Trading;
- Diplomacy;
- Fishing;
- Gathering;
- Farming.

No new class, magic school or combat branch is invented in this stage.

## XP rules

Baseline action XP is 20 before modifiers.

A failed action grants 25% of normal XP.

One action may train multiple eligible skills.

Each eligible skill receives a weight from 50% to 100% of action XP before hierarchy depth scaling.

Direct usage should receive the highest weight.

Depth scaling uses the existing rule:

- depth 0: 1.00×;
- depth 1: 1.65×;
- depth 2: 1.65²×;
- depth 3: 1.65³×.

Fractional XP is preserved internally by the existing SkillState number fields.

## Skill effects

Each skill level grants +0.2% primary effect.

Maximum primary bonus at level 100 is +20%.

A direct sibling receives 10% of the primary bonus as spillover.

Applicable skill bonuses across the relevant hierarchy combine multiplicatively rather than additively.

Example:

- +20% node;
- +10% applicable node;

combined multiplier = 1.20 × 1.10 = 1.32.

## Fixed unlock thresholds

The only generic fixed milestone thresholds are:

10, 20, 35, 50, 70, 85, 100.

The core exposes these as one canonical constant.

Content may decide what a specific threshold unlocks, but arbitrary generic milestone levels are rejected.

Level 100 remains a single final fixed unlock; “Mastery” is only a label and does not add a second generic effect.

## Abilities

Abilities:

- belong to a specific skill node;
- unlock at one of the seven fixed thresholds;
- have their own SkillState from 0 to 100;
- use the same XP progression function as normal skills;
- become automatically available once their parent skill reaches the required threshold.

There is no “choose one ability” mechanic in the core.

Equipment or branch scope restrictions remain content/runtime rules.

## UI

The Skill Tree panel is visible from the start.

It shows:

- the complete currently authored hierarchy;
- +0.2% per skill level;
- 10% sibling spillover;
- fixed unlock thresholds;
- multiplicative stacking;
- 25% XP on failed actions.

The panel intentionally does not fabricate levels for nodes whose existing subsystem is not yet connected to a unified persisted skill-state map.

## Deferred migration

A later stage should unify actual progression storage for existing systems.

In particular:

- Farming and Gathering already persist SkillState;
- Crafting and Alchemy already persist SkillState;
- Trading and Diplomacy already persist SkillState;
- Fishing currently tracks runtime fishing XP separately and needs durable integration;
- weapon nodes are authored but not yet wired to persistent skill progression;
- class skill progression currently remains in classState.

That migration should preserve all existing saves through a new schema version and use this core rather than duplicate formulas in each subsystem.
