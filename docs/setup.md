# One-time setup after merging the pipeline

Do these in order in your browser, after the pipeline pull request is merged. Each takes a minute or two.

## 1. Tell the pipeline your staging address

1. Open your project on [vercel.com](https://vercel.com) and copy its main address under **Domains** (it looks like `https://testauto-something.vercel.app`).
2. On GitHub, open the repo, then **Settings** → **Secrets and variables** → **Actions**.
3. Click the **Variables** tab, then **New repository variable**.
4. Name: `STAGING_URL`. Value: the address you copied, starting with `https://`. Click **Add variable**.

## 2. Delete branches after merge

1. **Settings** → **General**, scroll to **Pull Requests**.
2. Tick **Automatically delete head branches**.

## 3. Protect main (the merge gate)

1. **Settings** → **Rules** → **Rulesets** → **New ruleset** → **New branch ruleset**.
2. Ruleset name: `main`. Enforcement status: **Active**.
3. Under **Target branches**, click **Add target** → **Include default branch**.
4. Under **Rules**, make sure these are ticked:
   - **Restrict deletions**
   - **Require a pull request before merging** (leave required approvals at 0)
   - **Require status checks to pass**. Click **Add checks** and add each of these, typing the name and picking it from the list:
     `build`, `unit`, `e2e`, `docs-check`, `size-check`, `protected-files`, `adversary-verdict`
   - **Block force pushes**
5. Leave the bypass list empty. Click **Create**.

If a check name doesn't appear in the list, it hasn't run yet; they all run on the pipeline pull request,
so they should be there once it has been open for a few minutes.

## 4. Get the alerts by email

1. On the repo's main page, click **Watch** → **Custom**, tick **Issues** and **Pull requests**, and click **Apply**.
2. The first alert creates an issue called **System alerts** and mentions you, which emails you.

## 5. Write the spec and start

1. Open `spec/app.md` on GitHub and click the pencil icon.
2. Fill in the app's goals, user stories and acceptance criteria.
3. Change `status: draft` at the top to `status: ready`.
4. Click **Commit changes**, choose **Create a new branch for this commit and start a pull request**, then **Propose changes** and **Create pull request**.
5. When the checks are green, click **Squash and merge**. The planner starts within a minute and creates the tasks; then the rest runs by itself.

You can watch it under the **Actions** tab and on the **Issues** tab (each task is an issue).
To stop everything, open an issue and add the label `pause`. Close it to carry on.
