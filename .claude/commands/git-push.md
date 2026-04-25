Review all uncommitted changes and push them to GitHub with a proper commit message.

Steps:
1. Run: git status
2. Run: git diff to see what changed
3. Summarise the changes to the user in plain English
4. Ask: "Does this commit message look right?" and suggest one based on the changes
5. Once confirmed:
   - Stage relevant files (never stage .env files or venv/)
   - Commit with the agreed message
   - Push to origin master
6. Confirm the push succeeded and remind the user:
   - Railway will auto-redeploy the backend in ~2 minutes
   - Vercel will auto-redeploy the frontend in ~1 minute
