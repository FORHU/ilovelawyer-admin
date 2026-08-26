# Deploy via direct SSH + PM2, not Docker/ECR

The sibling repos (`ilovelawyer-app`, `ilovelawyer-api`) deploy by building a Docker image, pushing it to ECR via an AWS OIDC role, then SSHing into EC2 to `docker run` it. ilovelawyer-admin deploys by SSHing into EC2, `git reset --hard`-ing to the latest `main`, running `pnpm build` on the box itself, and restarting a PM2 process — no Dockerfile, no ECR repo, no AWS OIDC role.

This was a deliberate choice to avoid setting up ECR/OIDC infrastructure for a small internal admin tool, not an oversight — the GitHub secrets it uses (`EC2_HOST`, `EC2_USERNAME`, `EC2_SSH_KEY`, `NEXT_PUBLIC_API_URL`) are a strict subset of what the Docker-based repos need. If ilovelawyer-admin later needs the same reproducibility/rollback guarantees Docker gives the other two apps, revisit this — but don't assume it should match them by default.
