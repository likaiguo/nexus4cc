# home-data-directory Specification

## Purpose

Nexus runtime data SHALL live in a dedicated user-controlled directory outside the code checkout so upgrades, rebuilds, and repository cleanup do not delete local state.

## Requirements

### Requirement: Dedicated home data directory
Nexus SHALL store runtime data in a dedicated user-home directory by default and SHALL allow deployments to override that location with `NEXUS_DATA_DIR`.

#### Scenario: Default data directory uses user home
- **WHEN** the backend starts without `NEXUS_DATA_DIR`
- **THEN** it SHALL use `~/.nexus4cc/data` as the runtime data directory
- **AND** SQLite, profile configs, toolbar legacy files, and task legacy files SHALL resolve under that directory

#### Scenario: Environment override selects data directory
- **WHEN** `NEXUS_DATA_DIR` is set to an absolute path before backend startup
- **THEN** the backend SHALL use that path as the runtime data directory
- **AND** it SHALL create the directory if it does not exist

### Requirement: Legacy repository data migration
Nexus SHALL copy existing repository-local runtime data into the resolved runtime data directory without deleting or overwriting user data.

#### Scenario: Missing home data is copied from repository data
- **WHEN** the resolved data directory differs from repository-local `data/`
- **AND** the resolved data directory does not yet contain a legacy file or directory that exists under repository-local `data/`
- **THEN** backend startup SHALL copy that missing item into the resolved data directory
- **AND** the repository-local source SHALL remain in place

#### Scenario: Existing home data wins during migration
- **WHEN** both the resolved data directory and repository-local `data/` contain the same runtime item
- **THEN** backend startup SHALL keep the resolved data directory item unchanged
- **AND** it SHALL NOT overwrite that item from repository-local `data/`

#### Scenario: Migration failure preserves service fallback
- **WHEN** copying a legacy runtime item fails
- **THEN** backend startup SHALL log the failure
- **AND** it SHALL continue using the resolved data directory for all runtime data it can access

### Requirement: Runtime data survives code checkout replacement
Nexus SHALL decouple user runtime data from the code checkout so code upgrades or repository cleanup do not delete the active database or profile configuration.

#### Scenario: Repository data directory is removed after migration
- **WHEN** the backend has previously migrated to the resolved home data directory
- **AND** repository-local `data/` is removed during a code upgrade
- **THEN** backend startup SHALL still open the database and configs from the resolved home data directory
