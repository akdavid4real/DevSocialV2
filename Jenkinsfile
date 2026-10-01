pipeline {
  agent any
  options {
    disableConcurrentBuilds()
    timestamps()
    timeout(time: 45, unit: 'MINUTES')
    buildDiscarder(logRotator(numToKeepStr: '10'))
  }
  parameters {
    string(name: 'IMAGE_PREFIX', defaultValue: 'ghcr.io/akdavid4real/devsocial', description: 'Lowercase GHCR image prefix')
    string(name: 'GITHUB_USERNAME', defaultValue: 'akdavid4real', description: 'GitHub account that owns the registry token')
    string(name: 'SUPABASE_URL', defaultValue: 'https://xuufveufyryiuvogzhoi.supabase.co', description: 'Public project URL for the frontend build')
    string(name: 'SUPABASE_ANON_KEY', defaultValue: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh1dWZ2ZXVmeXJ5aXV2b2d6aG9pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE2NzgxOTQsImV4cCI6MjA4NzI1NDE5NH0.1jBiQJHge1fv-0n552Qa5GuoYPbC1MoNLNaeUvIMwOg', description: 'Public anon key only; never a service role key')
    booleanParam(name: 'PUBLISH_IMAGES', defaultValue: false, description: 'Push versioned images to GHCR')
    booleanParam(name: 'DEPLOY_K8S', defaultValue: false, description: 'Deploy into an already configured cluster')
    string(name: 'KUBE_CONTEXT', defaultValue: '', description: 'Explicit context from the Jenkins kubeconfig credential')
    booleanParam(name: 'DEPLOY_RENDER', defaultValue: false, description: 'Request deployment of the versioned images on existing Render services')
  }
  stages {
    stage('Validate configuration') {
      steps {
        script {
          if (!(params.IMAGE_PREFIX ==~ /ghcr\.io\/[a-z0-9][a-z0-9._-]*\/[a-z0-9][a-z0-9._-]*/)) {
            error('IMAGE_PREFIX must be ghcr.io/owner/name in lowercase')
          }
          if (!params.SUPABASE_URL.startsWith('https://') || !params.SUPABASE_ANON_KEY.trim()) {
            error('Set the public Supabase URL and anon key before building')
          }
          if (!(params.GITHUB_USERNAME ==~ /[A-Za-z0-9-]+/)) {
            error('GITHUB_USERNAME must be a GitHub account name')
          }
          if ((params.DEPLOY_K8S || params.DEPLOY_RENDER) && !params.PUBLISH_IMAGES) {
            error('Deployment requires PUBLISH_IMAGES')
          }
          if (params.DEPLOY_K8S && !params.KUBE_CONTEXT.trim()) {
            error('Set KUBE_CONTEXT explicitly')
          }
          env.IMAGE_TAG = 'git-' + sh(script: 'git rev-parse --short=12 HEAD', returnStdout: true).trim() + '-' + env.BUILD_NUMBER
          env.BACKEND_IMAGE = params.IMAGE_PREFIX + '-backend:' + env.IMAGE_TAG
          env.FRONTEND_IMAGE = params.IMAGE_PREFIX + '-frontend:' + env.IMAGE_TAG
        }
        sh 'docker version && kubectl kustomize deploy/k8s/base > /dev/null'
      }
    }
    stage('Spring Maven and JUnit 5 checks') {
      steps {
        dir('backend-spring/target/ci-reports') { deleteDir() }
        sh '''
          set -eu
          docker build --target build-env -t "devsocial-ci-tests:$IMAGE_TAG" backend-spring
          TEST_CONTAINER=$(docker create "devsocial-ci-tests:$IMAGE_TAG" \
            ./mvnw -B -ntp verify)
          trap 'docker rm -f "$TEST_CONTAINER" >/dev/null 2>&1 || true' EXIT
          # Preserve XML reports even when Maven reports failing tests.
          docker start --attach "$TEST_CONTAINER" || true
          test "$(docker inspect --format '{{.State.Status}}' "$TEST_CONTAINER")" = exited
          mkdir -p backend-spring/target/ci-reports
          docker cp "$TEST_CONTAINER:/app/target/surefire-reports/." backend-spring/target/ci-reports/
          exit "$(docker inspect --format '{{.State.ExitCode}}' "$TEST_CONTAINER")"
        '''
      }
      post {
        always {
          junit testResults: 'backend-spring/target/ci-reports/TEST-*.xml', allowEmptyResults: false
        }
      }
    }
    stage('Build application images') {
      steps {
        withEnv(["VITE_SUPABASE_URL=${params.SUPABASE_URL}", "VITE_SUPABASE_ANON_KEY=${params.SUPABASE_ANON_KEY}"]) {
          sh '''
            set -eu
            docker build -t "$BACKEND_IMAGE" backend-spring
            docker build -t "$FRONTEND_IMAGE" \
              --build-arg VITE_API_URL=/api/v2 \
              --build-arg VITE_SUPABASE_URL --build-arg VITE_SUPABASE_ANON_KEY frontend
          '''
        }
      }
    }
    stage('Publish versioned images') {
      when { expression { params.PUBLISH_IMAGES } }
      steps {
        withCredentials([usernamePassword(credentialsId: 'github-registry', usernameVariable: 'REGISTRY_USER', passwordVariable: 'REGISTRY_TOKEN')]) {
          withEnv(["GHCR_USERNAME=${params.GITHUB_USERNAME}"]) {
          sh '''
            set +x
            set -eu
            DOCKER_CONFIG=$(mktemp -d)
            export DOCKER_CONFIG
            trap 'rm -rf "$DOCKER_CONFIG"' EXIT
            printf '%s' "$REGISTRY_TOKEN" | docker login ghcr.io --username "$GHCR_USERNAME" --password-stdin
            docker push "$BACKEND_IMAGE"
            docker push "$FRONTEND_IMAGE"
            # Bootstrap the Render blueprint; actual deployments use immutable tags.
            docker tag "$BACKEND_IMAGE" "${BACKEND_IMAGE%:*}:latest"
            docker tag "$FRONTEND_IMAGE" "${FRONTEND_IMAGE%:*}:latest"
            docker push "${BACKEND_IMAGE%:*}:latest"
            docker push "${FRONTEND_IMAGE%:*}:latest"
          '''
          }
        }
      }
    }
    stage('Deploy Kubernetes') {
      when { expression { params.DEPLOY_K8S } }
      steps {
        withCredentials([file(credentialsId: 'devsocial-kubeconfig', variable: 'KUBECONFIG')]) {
          withEnv(["DEPLOY_CONTEXT=${params.KUBE_CONTEXT}"]) {
            sh 'bash scripts/deploy-k8s.sh "$DEPLOY_CONTEXT" "$BACKEND_IMAGE" "$FRONTEND_IMAGE"'
          }
        }
      }
    }
    stage('Request Render deployments') {
      when { expression { params.DEPLOY_RENDER } }
      steps {
        withCredentials([string(credentialsId: 'render-backend-hook', variable: 'BACKEND_HOOK'), string(credentialsId: 'render-frontend-hook', variable: 'FRONTEND_HOOK')]) {
          sh '''
            set +x
            set -eu
            curl --fail --silent --show-error --get --data-urlencode "imgURL=$BACKEND_IMAGE" "$BACKEND_HOOK" > /dev/null
            curl --fail --silent --show-error --get --data-urlencode "imgURL=$FRONTEND_IMAGE" "$FRONTEND_HOOK" > /dev/null
            echo 'Render accepted the requests. Check its dashboard for deployment completion.'
          '''
        }
      }
    }
  }
  post {
    always {
      sh 'if [ -n "${IMAGE_TAG:-}" ]; then docker image rm "devsocial-ci-tests:$IMAGE_TAG" >/dev/null 2>&1 || true; fi'
    }
  }
}
