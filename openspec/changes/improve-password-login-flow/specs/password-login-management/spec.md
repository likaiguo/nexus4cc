## ADDED Requirements

### Requirement: Consistent password source
The system SHALL use the same configured password hash for login regardless of whether Nexus is started with `npm start`, `start.sh`, or a service manager that already has an `ACC_PASSWORD_HASH` environment variable.

#### Scenario: Local env file wins at startup
- **WHEN** a repo-local `.env` file contains `ACC_PASSWORD_HASH`
- **THEN** the server SHALL use that hash for login checks even if `process.env.ACC_PASSWORD_HASH` was already set before startup

#### Scenario: External environment remains supported
- **WHEN** no repo-local `.env` file is present and the required auth environment variables are provided externally
- **THEN** the server SHALL start and use the externally provided password hash

#### Scenario: Non-auth startup overrides remain supported
- **WHEN** a user starts Nexus with a non-auth environment override such as `PORT=59001 npm start`
- **THEN** the server SHALL preserve that explicit non-auth override instead of replacing it with the repo-local `.env` value

### Requirement: Default password status
The system SHALL expose unauthenticated auth status for the login page that reveals the default password only when the current password hash matches `nexus123`.

#### Scenario: Current password is default
- **WHEN** the configured password hash verifies `nexus123`
- **THEN** the auth status response SHALL report that the default password is active and MAY include `nexus123` for login-page prefill

#### Scenario: Current password is custom
- **WHEN** the configured password hash does not verify `nexus123`
- **THEN** the auth status response SHALL report that the default password is not active and MUST NOT include any password value

### Requirement: Default password login page assistance
The login page SHALL prefill the password field and display the default password only while the auth status reports that the default password is active.

#### Scenario: Default password is active
- **WHEN** an unauthenticated user opens the login page and auth status reports the default password is active
- **THEN** the login page SHALL prefill `nexus123`, show default-password guidance, and provide an eye control that toggles between hidden and visible password text

#### Scenario: Custom password is active
- **WHEN** an unauthenticated user opens the login page and auth status reports a custom password is active
- **THEN** the login page SHALL leave the password field empty and MUST NOT display the default password

### Requirement: Authenticated password reset
The settings UI SHALL allow an authenticated user to replace the login password after confirming the current password.

#### Scenario: Password reset succeeds
- **WHEN** an authenticated user submits the correct current password and a valid new password
- **THEN** the server SHALL bcrypt-hash the new password, persist it to `.env`, update the running login hash immediately, and allow future login with the new password

#### Scenario: Current password is wrong
- **WHEN** an authenticated user submits an incorrect current password while changing password
- **THEN** the server SHALL reject the reset and keep the existing password hash unchanged

#### Scenario: New password is invalid
- **WHEN** an authenticated user submits an empty new password or a new password shorter than the minimum accepted length
- **THEN** the server SHALL reject the reset and keep the existing password hash unchanged

#### Scenario: Password persistence fails
- **WHEN** the new password hash cannot be persisted to `.env`
- **THEN** the server SHALL reject the reset, keep the existing runtime password hash unchanged, and return a clear error
