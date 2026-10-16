# Pocket RPG — University Retraining Design

Date: 2026-10-16
Status: Implemented

## Goals

Universities let a developed character redirect specialization without erasing the history of normal leveling.

The system must preserve the previously agreed rules:
- unlock around level 10;
- not every city has a university;
- retraining takes 1 real hour;
- 20% of specialization is locked;
- 80% is potentially retrainable;
- donor-based percentage;
- total attribute sum is preserved;
- each attribute keeps a 5% specialization floor;
- no manual free allocation of ordinary level-up points.

## University locations

Current universities:
- Tillanium — University of Tillanium.
- Ellaria — Arcane University of Ellaria.

Karnholm, Rivermark and Greenwald do not currently have retraining universities.

## Unlock

Retraining requires character level 10 or higher.

The university UI may be visible before level 10, but starting retraining is disabled.

## What can be retrained

Attributes start at 10.

For every level above 1, the mandatory baseline increases by +1 in every attribute.

Therefore the protected baseline for a level L character is:

10 + (L - 1)

Only points above that baseline are specialization points.

The universal +1-per-level portion is never retrainable.

## Retrainable share

For a selected donor attribute:
- 20% of its specialization is always protected;
- at most the remaining 80% can be considered transferable.

A second protection applies:
- after the transfer, the donor must retain at least 5% of the character's total specialization pool.

The effective minimum remaining specialization is the larger of:
- 20% of donor specialization;
- 5% of total specialization.

Transferable points are donor specialization minus that minimum.

## Donor-based percentage

The player chooses:
- donor attribute;
- recipient attribute;
- 25%, 50%, 75% or 100% of the transferable portion.

This percentage is applied after both protection rules.

Example:
- donor specialization: 20;
- total specialization: 63;
- 20% donor protection: 4;
- 5% total floor: 3.15;
- effective donor minimum: 4;
- transferable: 16;
- choosing 50% moves 8 points.

## Duration

A retraining session lasts exactly 1 real hour.

Only one retraining can be active at a time.

The character can continue playing while retraining is active.

The transfer is applied automatically when the timer completes, including after the game was closed.

There is no cancel action and no instant-completion action in this stage.

## Attribute invariants

On completion:
- transferred amount is subtracted from the donor;
- the same amount is added to the recipient;
- total attribute sum remains unchanged;
- mandatory baseline remains untouched;
- no other attribute changes.

Fractional values are rounded to two decimal places.

## Legacy saves

Before schema v8, attributes were runtime-only and not persisted.

Schema v8 stores:
- character level;
- character XP;
- current attributes;
- pending university retraining.

When migrating v1–v7, attributes are reconstructed deterministically.

The reconstruction preserves the established total progression:
- level 1 total = 80;
- each additional level adds exactly 15 total attribute points;
- of those 15, 8 are mandatory +1-to-each-attribute points;
- 7 are reconstructed as a balanced specialization distribution.

The migration does not invent historical XP-source specialization because that source history was not persisted.

## Character XP scope

This stage makes level, XP and attributes durable.

It does not introduce a new character-XP earning formula.

The general character XP source/reward model remains a separate progression task so it can be designed explicitly instead of being inferred from skill XP or gold rewards.
