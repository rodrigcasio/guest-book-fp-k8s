Kubernetes Guestbook: Build, Push, Deploy, Update, and Scale

This guide documents the lifecycle of a containerized Node.js application deployed on a Kubernetes (Minikube) cluster, featuring a Redis backend, Rolling Updates, and Horizontal Pod Autoscaling (HPA).

Phase 1: Build & Fix (v1.2)

Goal: Containerize the application and ensure static assets (CSS/JS) are served correctly.

Code Correction: Ensure server.js uses a simplified Express configuration without restrictive security headers (like Helmet).

Containerization: Build the image locally using (docker build -t rodrigocasio/guestbook-js:v1.2 .).

Image Distribution: Push to Docker Hub using (docker push rodrigocasio/guestbook-js:v1.2).

Phase 2: Namespace & Database Setup

Goal: Prepare the environment and launch the Redis backend.

Create Namespace: Create the project space using (kubectl create namespace guestbook-js-project).

Deploy Redis: Apply the database master and its service using (kubectl apply -f redis-master-deployment.yaml -n guestbook-js-project) and (kubectl apply -f redis-master-service.yaml -n guestbook-js-project).

Deploy Guestbook: Launch the frontend and its service using (kubectl apply -f deployment-v1.yml) and (kubectl apply -f service.yml).

Verify Connection: Check logs to ensure the server says "Connected to Redis" (or simply "Server running") without "Redis not ready" errors using (kubectl logs deployment/guestbook -n guestbook-js-project).

Phase 3: Rolling Update (v2) & Scaling

Goal: Update the app version and configure autoscaling.

Execute Update: Apply the v2 manifest (with resource limits) using (kubectl apply -f deployment-v2.yml).

Create Autoscale Rule: Define the HPA logic using (kubectl autoscale deployment guestbook --cpu-percent=50 --min=1 --max=5 -n guestbook-js-project).

Stress Test: Generate load to trigger scaling using (while true; do curl -s http://192.168.49.2:30000 > /dev/null; done).

Observation: Monitor the HPA targets and replica count using (kubectl get hpa -n guestbook-js-project -w).

Phase 4: Functional Testing

Goal: Verify the app works as a "Full-Stack" system.

Access App: Open the tunnel via (minikube service guestbook -n guestbook-js-project).

Submit Message: Type a message and hit "Submit".

Persistence Test: If the message appears instantly (no ... dots), the connection to Redis is successful.

Resilience Test: Delete a pod using (kubectl delete pod <pod-name> -n guestbook-js-project). Kubernetes will start a new one, and your message will still be there!

Phase 5: Cleanup

Goal: Remove all resources to free up system memory and CPU.

Delete Namespace: Remove all project traces (App, Redis, HPA) using (kubectl delete namespace guestbook-js-project).

Clean Docker Images: Free up disk space using (docker rmi rodrigocasio/guestbook-js:v1.2 rodrigocasio/guestbook-js:v2).

Stop Infrastructure: Shut down the cluster using (minikube stop).

Key Takeaways

Service Discovery: The app finds the database via the redis-master service name.

Rolling Updates: Kubernetes replaces pods one-by-one with zero downtime.

Elasticity: HPA scales the infrastructure automatically based on real-time CPU demand.
