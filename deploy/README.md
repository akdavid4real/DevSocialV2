# Coursework deployment

Jenkins runs the root `Jenkinsfile`; it is separate from GitHub Actions.
The pipeline builds the Spring Boot API in `backend-spring/` and the existing web
frontend. It runs the complete Maven/JUnit 5 suite in a Java 17 container, archives
Surefire XML results in Jenkins, pushes versioned Docker images to GHCR, and
optionally deploys to Kubernetes and requests Render deployments. Java and Maven
do not need to be installed on the Jenkins controller; Maven Wrapper is included.
The legacy NestJS backend is not built or deployed by this pipeline.

## Zero-cost, no-card route

Use local Jenkins, public GHCR images, Render Free services, and a
[Killercoda Kubernetes playground](https://killercoda.com/playgrounds/scenario/kubernetes)
for the hosted Kubernetes demonstration. Killercoda's free sessions last at most
one hour and are deleted when closed. It is a hosted lab, not persistent hosting;
confirm that this satisfies the lecturer's assessment before relying on it.
No cloud resources have been provisioned by these files.

The `lab` overlay runs two frontend replicas and connects them to the Render API.
It keeps production database and Supabase service-role credentials out of the
disposable playground. The full `base` overlay supports both apps when you have
a suitable persistent cluster and a dedicated test database.

## Local Jenkins

The Jenkins image includes Docker CLI, kubectl, and Pipeline/Git plugins. The
controller uses the host Docker daemon for this single-user coursework setup.
The Jenkins image includes the JUnit plugin. For an existing controller, install
that plugin through Manage Jenkins → Plugins if it is not already installed.
Jobs therefore have control of Docker on your machine: only run trusted code.
The web interface is bound to localhost, and Jenkins data persists in its volume.

```bash
export DOCKER_GID=$(stat -c '%g' /var/run/docker.sock)
docker compose -f deploy/jenkins/compose.yaml up -d --build
docker compose -f deploy/jenkins/compose.yaml exec jenkins \
  cat /var/jenkins_home/secrets/initialAdminPassword
```

Open http://localhost:8081, unlock Jenkins, and finish its setup wizard yourself.
Create a **Pipeline** job using **Pipeline script from SCM**, Git repository
`https://github.com/akdavid4real/DevSocialV2.git`, branch specifier `*/main`, and
`Jenkinsfile` as the script path. Push the updated main branch before running the
SCM job: local commits alone are not available to Jenkins checkout.
For a local single-user demo, give the built-in node
one executor. Builds use the host's CPU and memory; leave sufficient headroom.

This repository is private. The local Jenkins controller now has a read-only
SSH deploy key scoped to DevSocialV2. Its private key and verified GitHub host
keys stay in the persistent Jenkins home volume. Configure Git with
`git@github.com:akdavid4real/DevSocialV2.git`; the system SSH configuration uses
this key over port 443. No separate repository token is needed on this controller.
On another controller, configure a project-specific read-only deploy key or a
fine-grained token restricted to this repository with Contents read permission.

Start with deployment/publish checkboxes disabled. Fill the public Supabase URL
and public anon key in **Build with Parameters**. These values enter the browser
bundle; never put the Supabase service-role key there. Images are built for the
Jenkins host's architecture; this setup assumes amd64 for Render and the lab.
Keep `GITHUB_USERNAME` set to the GitHub account that owns the registry token.
Public frontend values are prefilled for this project's existing Supabase
configuration. Change them when using a different project.

Add Jenkins credentials only for stages you intend to use:

| Credential ID | Type | Purpose |
| --- | --- | --- |
| `github-registry` | Username with password | GitHub username + PAT with `write:packages` for GHCR |
| `devsocial-kubeconfig` | Secret file | A restricted kubeconfig for your configured cluster |
| `render-backend-hook` | Secret text | Existing backend service deploy-hook URL |
| `render-frontend-hook` | Secret text | Existing frontend service deploy-hook URL |

Published tags look like `git-COMMIT-BUILDNUMBER`. Set GHCR package visibility to
public for anonymous Render/lab pulls. Credentials stay in Jenkins, not Git.
Keep deployment credentials out of jobs building untrusted pull requests.
The publish stage also updates `latest` to bootstrap the Render blueprint;
deployment hooks and Kubernetes use the versioned tags.

## Render

Publish the images first. Replace the two `:latest` references in root
`render.yaml` with the actual versioned tags from Jenkins before creating the
Blueprint. Both services explicitly use Free plans. Set the backend database,
Supabase service-role configuration and frontend URL in Render. Set the web
service's `API_UPSTREAM` to the backend's full HTTPS origin, with no trailing
slash (for example `https://devsocial-api-EXAMPLE.onrender.com`).

The API image runs Java 17 on port 3001; its heap is bounded relative to container
memory. Health checks use `/api/v2/actuator/health/readiness`. Set `FRONTEND_URL`
and `CORS_ORIGINS` to the web origin. `NODE_ENV=production` is retained because
Spring's cookie handling uses it to require secure cookies. Spring does not
provide the old development email-verification bypass. Free services can sleep,
so the first request may be slow.

After both services exist, save their deploy hooks in Jenkins. Enabling
`DEPLOY_RENDER` sends the same versioned image tags to Render; a successful hook
request means accepted, not that the app is healthy. Verify completion on Render.

## Hosted lab

Sign into Killercoda and open the playground. The repository is private, so
generate a standalone manifest locally instead of sharing GitHub credentials
with the playground. Substitute your published tag and Render backend address:

```bash
bash scripts/render-k8s-lab.sh \
  ghcr.io/akdavid4real/devsocial-frontend:YOUR_TAG \
  https://YOUR_BACKEND.onrender.com > /tmp/devsocial-lab.yaml
```

Copy the contents of that YAML file into the lab editor as `devsocial-lab.yaml`.
It contains deployment configuration and a public backend URL, without database
credentials. In the lab terminal, run `kubectl apply -f devsocial-lab.yaml`, then
`kubectl -n devsocial rollout status deployment/frontend --timeout=180s`.

Open port **30080** through Killercoda's traffic/port access controls. Add that
frontend origin to the backend's `CORS_ORIGINS` allowlist if needed. Lab URLs are
ephemeral. Do not upload production credentials or kubeconfigs to Killercoda.

Demonstrate deployments, services, replicas and recovery:

```bash
kubectl -n devsocial get deployments,pods,services
kubectl -n devsocial scale deployment/frontend --replicas=3
kubectl -n devsocial rollout status deployment/frontend
kubectl -n devsocial get pods -o wide
```

This lab deployment is invoked inside the lab, rather than by local Jenkins:
the browser playground does not automatically supply a remotely reachable API
and kubeconfig. Jenkins builds/publishes the image and deploys Render. The
optional Jenkins Kubernetes stage targets a separately accessible cluster.

## Full cluster deployment

On a configured cluster, use a dedicated test environment file, containing the
backend variables described in `backend-spring/.env.example` and its HTTPS frontend URL:

```bash
bash scripts/deploy-k8s.sh YOUR_CONTEXT \
  ghcr.io/akdavid4real/devsocial-backend:YOUR_TAG \
  ghcr.io/akdavid4real/devsocial-frontend:YOUR_TAG \
  /path/to/test-backend.env base
```

This creates the `backend-env` Secret and waits for both deployments. Subsequent
Jenkins deployments reuse that Secret. If migrating an existing Nest deployment,
refresh the Secret using a Spring environment file before the first Spring rollout;
do not assume the existing Secret contains the right CORS/cookie configuration.
The frontend proxies to `http://backend:3001`. Readiness includes PostgreSQL health;
liveness checks only application health, not database availability.
To expose the full app with an Ingress,
configure the domain, installed ingress class, and TLS secret in
`k8s/hosted/ingress.yaml`, then use `hosted` instead of `base`. Kubernetes Secrets
need restricted access and suitable cluster encryption; never commit them.

For local testing, use overlay `local` and port-forward the frontend service:
`kubectl -n devsocial port-forward service/frontend 5174:8080`.
This overlay sets the HTTP frontend/CORS origin and development cookie behavior.
No schema migration or database seeding runs automatically.

## Verify without deploying

```bash
docker compose --env-file .env.docker config --quiet
kubectl kustomize deploy/k8s/base > /dev/null
kubectl kustomize deploy/k8s/local > /dev/null
kubectl kustomize deploy/k8s/hosted > /dev/null
kubectl kustomize deploy/k8s/lab --load-restrictor=LoadRestrictionsNone > /dev/null
cd backend-spring
./mvnw verify
```

In Jenkins, leave all publish/deploy parameters disabled for the first validation
build. The Maven stage copies test reports out even on a test failure; missing
reports fail the job instead of silently hiding a broken test stage. The production
Docker build also runs Maven verification before producing the runtime image.

References: [Jenkins Docker installation](https://www.jenkins.io/doc/book/installing/docker/),
[Render image deployment](https://render.com/docs/deploying-an-image),
[Render deploy hooks](https://render.com/docs/deploy-hooks),
[Killercoda session limits](https://killercoda.com/faq).
