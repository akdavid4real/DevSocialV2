# DevSocialV2: Wallet / Hedera Removal Report

Date: 2026-05-29

## Scope

Remove all remaining Hedera and wallet-related backend/frontend references from the active
`DevSocialV2` migration effort, with no behavior/API fields related to wallet connection
remaining in the codebase.

## Changes made

### Backend
- Removed wallet endpoints from user settings API:
  - Deleted `POST /users/connect-wallet`
  - Deleted `DELETE /users/connect-wallet`
- Removed wallet service methods from `UsersService`:
  - `connectWallet`
  - `disconnectWallet`
- Removed wallet-related user model fields from Prisma schema:
  - `hederaAccountId`
  - `publicKey`
  - `walletConnected`
- Removed wallet fields from account/profile DTO/flows:
  - Deleted `src/users/dto/connect-wallet.dto.ts`
  - Removed wallet selection from `auth.service.ts` and `users.service.ts` payloads
- Removed migration artifact for the wallet column additions:
  - Deleted `backend/prisma/migrations/20260523000000_add_user_wallet_fields/migration.sql`
- Regenerated Prisma Client after schema change to refresh generated typings.

### Frontend / Docs checks
- Re-ran frontend/backend cleanup validation for remaining references:
  - No `hedera` or `wallet` string matches remain in source files under `backend/` and `frontend/` after migration.

## Verification

- `rg -n --glob "*.ts" --glob "*.tsx" "hedera|wallet" backend/src frontend/src` returns no matches.
- `corepack pnpm prisma generate` (backend) completed successfully.
- `corepack pnpm build` (backend) completed successfully.
- `corepack pnpm lint` (backend) did not complete in environment due existing repo-wide formatting and lint debt; build remains passing after the cleanup.

## Notes

- This report covers current code removal only. No React/Vite conversion work was changed in
  this pass.
